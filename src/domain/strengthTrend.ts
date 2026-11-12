import type { Exercise } from '../data/types'
import { identityKey, type StoredWorkout } from './progress'
import { addDays, startOfDay } from './measurement'
import { isWeightComparable } from './sets'

/*
 * Strength trend for the dashboard: the heaviest recorded working load per session,
 * followed over time for one exercise or for every exercise of a muscle group.
 * Recorded results only, no estimate of a one-repetition maximum.
 */

export const trendWeeks = 12

export interface TrendPoint {
  /** ISO timestamp of the session. */
  date: string
  /** Exercise series: top working load in kg. Muscle series: change in percent against the baseline. */
  value: number
}

export interface TrendSeries {
  id: string
  name: string
  points: TrendPoint[]
  /** Last value minus the first value of the window: kg for exercises, percent points for muscles. */
  change: number
  /** Relative change between the first and the last value, in percent. */
  percent: number
  /** Muscle series only: how many exercises contribute. */
  exerciseCount: number
}

export interface StrengthTrend {
  exercises: TrendSeries[]
  muscles: TrendSeries[]
}

interface Session {
  date: string
  top: number
}

const byDate = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date)

/** Series are sorted by the size of their change, largest first, ties alphabetically. */
const byChange = (a: TrendSeries, b: TrendSeries) => Math.abs(b.percent) - Math.abs(a.percent) || a.name.localeCompare(b.name)

const roundTenth = (value: number) => Math.round(value * 10) / 10

/** Top comparable working load per session for every tracked library exercise, oldest first. */
function sessionsByExercise(history: StoredWorkout[], library: Exercise[], now: Date): Map<string, Session[]> {
  const tracked = new Map(library.filter((exercise) => exercise.deleted_at === null && exercise.track_progress).map((exercise) => [exercise.id, exercise]))
  const start = addDays(startOfDay(now), -trendWeeks * 7)
  const result = new Map<string, Session[]>()
  for (const { workout, exercises, sets } of history) {
    if (!workout.is_completed || workout.deleted_at !== null) continue
    const performed = new Date(workout.performed_at)
    if (performed > now || performed < start) continue
    const tops = new Map<string, number>()
    for (const exercise of exercises) {
      if (exercise.deleted_at !== null || exercise.is_history_only) continue
      const key = identityKey(exercise)
      if (!tracked.has(key)) continue
      for (const set of sets) {
        if (set.workout_exercise_id !== exercise.id || set.deleted_at !== null || !isWeightComparable(set, exercise)) continue
        tops.set(key, Math.max(tops.get(key) ?? 0, set.weight_kg))
      }
    }
    for (const [key, top] of tops) result.set(key, [...(result.get(key) ?? []), { date: workout.performed_at, top }])
  }
  for (const sessions of result.values()) sessions.sort(byDate)
  return result
}

/** A series needs two sessions and a baseline above zero so that a percentage is meaningful. */
function exerciseSeries(exercise: Exercise, sessions: Session[]): TrendSeries | null {
  if (sessions.length < 2) return null
  const first = sessions[0]!.top
  const last = sessions.at(-1)!.top
  if (first <= 0) return null
  return {
    id: exercise.id,
    name: exercise.name,
    points: sessions.map((session) => ({ date: session.date, value: session.top })),
    change: last - first,
    percent: roundTenth(((last - first) / first) * 100),
    exerciseCount: 1,
  }
}

/**
 * A muscle's index is the mean relative change of its exercises. On each training day the
 * most recent session of every exercise trained so far counts, so a lift that is trained less
 * often does not drop out between its sessions.
 */
function muscleSeries(muscle: string, members: { exercise: Exercise; sessions: Session[] }[]): TrendSeries | null {
  const usable = members.filter(({ sessions }) => sessions.length >= 2 && sessions[0]!.top > 0)
  if (usable.length === 0) return null
  const dates = [...new Set(usable.flatMap(({ sessions }) => sessions.map((session) => session.date)))].sort()
  const points = dates.map((date) => {
    const changes = usable.flatMap(({ sessions }) => {
      const latest = sessions.filter((session) => session.date <= date).at(-1)
      return latest ? [((latest.top - sessions[0]!.top) / sessions[0]!.top) * 100] : []
    })
    return { date, value: roundTenth(changes.reduce((sum, change) => sum + change, 0) / changes.length) }
  })
  const change = roundTenth(points.at(-1)!.value - points[0]!.value)
  return { id: muscle, name: muscle, points, change, percent: change, exerciseCount: usable.length }
}

/** Both views of the last {trendWeeks} weeks; the first entry of each list changed the most. */
export function strengthTrend(history: StoredWorkout[], library: Exercise[], now: Date): StrengthTrend {
  const sessions = sessionsByExercise(history, library, now)
  const exercises: TrendSeries[] = []
  const groups = new Map<string, { exercise: Exercise; sessions: Session[] }[]>()
  for (const exercise of library) {
    const own = sessions.get(exercise.id)
    if (!own) continue
    const series = exerciseSeries(exercise, own)
    if (series) exercises.push(series)
    const muscle = exercise.muscle || 'Other'
    groups.set(muscle, [...(groups.get(muscle) ?? []), { exercise, sessions: own }])
  }
  const muscles = [...groups].flatMap(([muscle, members]) => {
    const series = muscleSeries(muscle, members)
    return series ? [series] : []
  })
  return { exercises: exercises.sort(byChange), muscles: muscles.sort(byChange) }
}
