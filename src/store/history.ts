import { db } from '../data/db'
import { live, softDelete, transaction, update } from '../data/repo'
import type { SetLog, SupersetGroup, Workout, WorkoutExercise } from '../data/types'

export interface HistorySetEdit {
  id: string
  weight_kg: number
  reps: number | null
  duration_seconds: number | null
  is_warm_up: boolean
}

/** WorkoutHistoryEditor.save: edits update statistics, never earned XP. */
export async function saveHistoryEdit(
  workout: Workout,
  change: { name: string; performed_at: string; notes: string | null; groups: Record<string, SupersetGroup | null>; sets: HistorySetEdit[] },
) {
  await transaction(async () => {
    await update<Workout>('workouts', workout.id, { name: change.name.trim(), performed_at: change.performed_at, notes: change.notes })
    for (const [exerciseID, group] of Object.entries(change.groups)) {
      await update<WorkoutExercise>('workout_exercises', exerciseID, { superset_group: group })
    }
    for (const set of change.sets) {
      const { id, ...values } = set
      await update<SetLog>('set_logs', id, { ...values, draft_weight_text: null, draft_reps_text: null, draft_duration_text: null })
    }
  })
}

/** Deleting a workout removes its XP from the total; the award receipt stays as a tombstone. */
export async function deleteWorkout(workoutID: string) {
  await transaction(async () => {
    const exercises = await db.workout_exercises.where('workout_id').equals(workoutID).toArray()
    const sets = await db.set_logs.where('workout_id').equals(workoutID).toArray()
    await softDelete('set_logs', live(sets).map((set) => set.id))
    await softDelete('workout_exercises', live(exercises).map((exercise) => exercise.id))
    await softDelete('workouts', [workoutID])
  })
}
