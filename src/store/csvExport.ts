import { db } from '../data/db'
import { live } from '../data/repo'
import type { BodyWeight, SetLog, Workout, WorkoutExercise } from '../data/types'

/*
 * CSV export for spreadsheets (phase 6): one row per completed workout, set, cardio session and body
 * weight, filterable by the first column. Units are always kg, km and seconds.
 * Open workouts, plans, routines and the profile are only in the JSON backup, which stays the
 * complete copy of all data (docs/DATENSCHUTZ.md, section 4).
 */

export const csvColumns = [
  'type',
  'date',
  'time',
  'workout',
  'exercise',
  'set',
  'set_type',
  'weight_kg',
  'reps',
  'duration_seconds',
  'distance_km',
  'pace_s_per_km',
  'value',
  'completed',
  'notes',
] as const

type Row = Partial<Record<(typeof csvColumns)[number], string | number | boolean | null>>

const pad = (value: number) => String(value).padStart(2, '0')
/** Date and time on this device's clock, as the app shows them. */
const localDate = (iso: string) => {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const localTime = (iso: string) => {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** RFC 4180 quoting; text that a spreadsheet would run as a formula gets a leading apostrophe. */
function cell(value: Row[keyof Row], text: boolean): string {
  if (value === null || value === undefined) return ''
  let output = typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value)
  if (text && /^[=+\-@\t\r]/.test(output)) output = `'${output}`
  return /[",\n\r]/.test(output) ? `"${output.replace(/"/g, '""')}"` : output
}

const textColumns = new Set(['workout', 'exercise', 'notes'])

export function toCSV(rows: Row[]): string {
  const lines = [csvColumns.join(','), ...rows.map((row) => csvColumns.map((column) => cell(row[column], textColumns.has(column))).join(','))]
  return lines.join('\r\n') + '\r\n'
}

export async function buildCSVRows(): Promise<Row[]> {
  const workouts = live(await db.workouts.toArray())
    .filter((workout: Workout) => workout.is_completed)
    .sort((a, b) => a.performed_at.localeCompare(b.performed_at))
  const exercises = live(await db.workout_exercises.toArray()).filter((exercise: WorkoutExercise) => !exercise.is_removed)
  const sets = live(await db.set_logs.toArray()).filter((set: SetLog) => !set.is_removed)
  const rows: { at: string; row: Row }[] = []
  for (const workout of workouts) {
    const when = { date: localDate(workout.performed_at), time: localTime(workout.performed_at), workout: workout.name }
    rows.push({ at: workout.performed_at, row: { type: 'workout', ...when, value: workout.earned_xp, completed: true, notes: workout.notes } })
    if (workout.cardio_type) {
      rows.push({
        at: workout.performed_at,
        row: {
          type: 'cardio',
          ...when,
          exercise: workout.cardio_type,
          duration_seconds: workout.cardio_seconds,
          distance_km: workout.cardio_distance_km,
          pace_s_per_km: workout.cardio_pace_s_per_km,
          completed: true,
        },
      })
    }
    const own = exercises.filter((exercise) => exercise.workout_id === workout.id).sort((a, b) => a.sort_order - b.sort_order)
    for (const exercise of own) {
      const logged = sets.filter((set) => set.workout_exercise_id === exercise.id).sort((a, b) => a.set_index - b.set_index)
      for (const set of logged) {
        rows.push({
          at: workout.performed_at,
          row: {
            type: 'set',
            ...when,
            exercise: exercise.exercise_name,
            set: set.set_index,
            set_type: set.is_warm_up ? 'warm-up' : 'working',
            weight_kg: set.weight_kg,
            reps: set.reps,
            duration_seconds: set.duration_seconds,
            completed: set.is_completed && !set.is_skipped,
          },
        })
      }
    }
  }
  for (const weight of live(await db.body_weights.toArray()) as BodyWeight[]) {
    rows.push({ at: weight.recorded_at, row: { type: 'body_weight', date: weight.day, time: localTime(weight.recorded_at), value: weight.kilograms } })
  }
  // Stable sort: a workout's own rows keep their order.
  return rows.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).map((entry) => entry.row)
}

export async function exportCSV(now = new Date()): Promise<File> {
  const csv = toCSV(await buildCSVRows())
  // The byte order mark makes Excel read the file as UTF-8 (umlauts in exercise names).
  return new File(['﻿' + csv], `Motion-Export-${now.toISOString().slice(0, 10)}.csv`, { type: 'text/csv' })
}
