import type { Exercise } from '../data/types'
import { identityKey, type StoredWorkout } from './progress'
import { addDays, startOfDay } from './measurement'
import { isWeightComparable } from './sets'

/* DashboardStatistics.swift: calendar weeks and recorded load bests. */

export interface TrainingWeek {
  start: Date
  end: Date
  number: number
  workouts: number
  isCurrent: boolean
}

export interface LoadBest {
  id: string
  name: string
  weight: number
  reps: number | null
  date: string
}

/** ISO 8601 week number. */
export function isoWeek(date: Date): number {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const weekday = day.getUTCDay() || 7
  day.setUTCDate(day.getUTCDate() + 4 - weekday)
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1))
  return Math.ceil(((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Monday–Sunday: five full weeks and this week. */
export function trainingWeeks(performed: string[], now: Date): TrainingWeek[] {
  const today = startOfDay(now)
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  const dates = performed.map((value) => new Date(value)).filter((date) => date <= now)
  return [-5, -4, -3, -2, -1, 0].map((offset) => {
    const start = addDays(monday, offset * 7)
    const next = addDays(start, 7)
    return {
      start,
      end: addDays(next, -1),
      number: isoWeek(start),
      workouts: dates.filter((date) => date >= start && date < next).length,
      isCurrent: offset === 0,
    }
  })
}

/** Heaviest completed external-load working set per PR-tracked exercise; ties prefer more reps. */
export function loadBests(history: StoredWorkout[], library: Exercise[], now: Date): LoadBest[] {
  const tracked = library.filter((exercise) => exercise.is_pr_tracked && exercise.deleted_at === null)
  const bests = new Map<string, LoadBest>()
  for (const { workout, exercises, sets } of history) {
    if (!workout.is_completed || new Date(workout.performed_at) > now) continue
    for (const exercise of exercises) {
      if (exercise.is_history_only) continue
      const key = identityKey(exercise)
      const owner = tracked.find((candidate) => candidate.id === key)
      if (!owner) continue
      for (const set of sets) {
        if (set.workout_exercise_id !== exercise.id || !isWeightComparable(set, exercise)) continue
        const current = bests.get(key)
        const better = !current || set.weight_kg > current.weight || (set.weight_kg === current.weight && (set.reps ?? 0) > (current.reps ?? 0))
        if (better) bests.set(key, { id: key, name: owner.name, weight: set.weight_kg, reps: set.reps, date: workout.performed_at })
      }
    }
  }
  return [...bests.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}
