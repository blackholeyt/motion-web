import { db } from '../../data/db'
import { live } from '../../data/repo'
import type { SetLog, Workout, WorkoutExercise } from '../../data/types'
import { isWorkingResult, orderedRows, type ExerciseRows, type HistoricalSet, type Row } from '../../domain/sets'

/** A workout with its exercises and sets, in display order. Removed items stay for undo. */
export interface Session {
  workout: Workout
  all: ExerciseRows[]
  /** Visible exercises and sets (not removed). */
  exercises: ExerciseRows[]
  rows: Row[]
}

export const identityKey = (exercise: WorkoutExercise) => exercise.exercise_id ?? `unlinked-${exercise.id}`

export async function loadSession(workoutID: string): Promise<Session | null> {
  const workout = await db.workouts.get(workoutID)
  if (!workout || workout.deleted_at !== null) return null
  const exercises = live(await db.workout_exercises.where('workout_id').equals(workoutID).toArray())
  const sets = live(await db.set_logs.where('workout_id').equals(workoutID).toArray())
  return buildSession(workout, exercises, sets)
}

export function buildSession(workout: Workout, exercises: WorkoutExercise[], sets: SetLog[]): Session {
  const all = exercises
    .sort((a, b) => (a.sort_order === b.sort_order ? a.exercise_name.localeCompare(b.exercise_name) : a.sort_order - b.sort_order))
    .map((exercise) => ({
      exercise,
      rows: sets
        .filter((set) => set.workout_exercise_id === exercise.id)
        .sort((a, b) => a.set_index - b.set_index)
        .map((set) => ({ set, exercise })),
    }))
  const visible = all
    .filter(({ exercise }) => !exercise.is_removed)
    .map(({ exercise, rows }) => ({ exercise, rows: rows.filter((row) => !row.set.is_removed) }))
  return { workout, all, exercises: visible, rows: orderedRows(visible) }
}

export type History = Map<string, Map<number, HistoricalSet>>

/**
 * One pass over completed history: the latest session per exercise identity supplies the
 * "previous" values by working-set position. Retrospective sessions only see older workouts.
 */
export async function loadHistory(identities: Set<string>, before: string | null, excludeWorkoutID?: string): Promise<History> {
  const workouts = live(await db.workouts.orderBy('performed_at').reverse().toArray()).filter(
    (workout) => workout.is_completed && workout.id !== excludeWorkoutID && (!before || workout.performed_at < before),
  )
  const latest: History = new Map()
  for (const workout of workouts) {
    if (latest.size === identities.size) break
    const exercises = live(await db.workout_exercises.where('workout_id').equals(workout.id).toArray()).filter(
      (exercise) => !exercise.is_history_only && !exercise.is_removed && identities.has(identityKey(exercise)) && !latest.has(identityKey(exercise)),
    )
    if (exercises.length === 0) continue
    const sets = live(await db.set_logs.where('workout_id').equals(workout.id).toArray())
    for (const exercise of exercises) {
      const own = sets.filter((set) => set.workout_exercise_id === exercise.id)
      if (!own.some((set) => isWorkingResult(set, exercise))) continue
      const snapshots = new Map<number, HistoricalSet>()
      own
        .filter((set) => !set.is_warm_up && !set.is_removed)
        .sort((a, b) => a.set_index - b.set_index)
        .forEach((set, index) => {
          if (isWorkingResult(set, exercise)) {
            snapshots.set(index + 1, {
              weight: set.weight_kg,
              reps: set.reps,
              date: workout.performed_at,
              measurement: exercise.measurement,
              durationSeconds: set.duration_seconds,
            })
          }
        })
      latest.set(identityKey(exercise), snapshots)
    }
  }
  return latest
}

/** Working-set position of a set within its exercise (warm-ups and removed sets excluded). */
export function workingPosition(row: Row, exerciseRows: Row[]): number {
  return exerciseRows.filter((candidate) => !candidate.set.is_warm_up && !candidate.set.is_removed && candidate.set.set_index <= row.set.set_index).length
}

export function previousFor(row: Row, session: Session, history: History): HistoricalSet | undefined {
  if (row.set.is_warm_up) return undefined
  const exerciseRows = session.all.find(({ exercise }) => exercise.id === row.exercise.id)?.rows ?? []
  const previous = history.get(identityKey(row.exercise))?.get(workingPosition(row, exerciseRows))
  return previous?.measurement === row.exercise.measurement ? previous : undefined
}
