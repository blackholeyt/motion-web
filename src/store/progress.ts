import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { stableID } from '../data/ids'
import { insertOne, live, update } from '../data/repo'
import type { Workout, WorkoutAward } from '../data/types'
import { buildRecap, progressFor, xpAward, type StoredWorkout, type WorkoutRecap, type XPAward } from '../domain/progress'

export async function storedWorkout(workout: Workout): Promise<StoredWorkout> {
  const [exercises, sets] = await Promise.all([
    db.workout_exercises.where('workout_id').equals(workout.id).toArray(),
    db.set_logs.where('workout_id').equals(workout.id).toArray(),
  ])
  return { workout, exercises: live(exercises), sets: live(sets) }
}

/** Completed, live workouts with their exercises and sets. */
export async function completedHistory(): Promise<StoredWorkout[]> {
  const workouts = live(await db.workouts.toArray()).filter((workout) => workout.is_completed)
  return Promise.all(workouts.map(storedWorkout))
}

/** Workout XP plus body-weight check-in rewards. Deleting a measurement keeps its reward. */
export async function totalXP(): Promise<number> {
  const workouts = live(await db.workouts.toArray()).filter((workout) => workout.is_completed)
  const rewards = await db.weight_rewards.toArray()
  return workouts.reduce((sum, workout) => sum + Math.max(0, workout.earned_xp), 0) + rewards.reduce((sum, reward) => sum + Math.max(0, reward.earned_xp), 0)
}

export const useProgress = () => {
  const total = useLiveQuery(totalXP, [])
  return total === undefined ? undefined : progressFor(total)
}

export interface FinishReward {
  recap: WorkoutRecap
  /** null when the award was already granted (a receipt exists) or none applies. */
  award: XPAward | null
  totalXP: number
}

/**
 * WorkoutAwardStore.prepare: a receipt per session makes the award idempotent.
 * Receipts are never deleted, so a re-finished or restored session earns nothing twice.
 * Must run inside the finishing transaction.
 */
export async function grantWorkoutAward(workout: Workout, proposed: XPAward): Promise<{ xp: number; granted: boolean }> {
  const saved = await db.workout_awards.where('workout_id').equals(workout.id).first()
  if (saved) return { xp: saved.earned_xp, granted: false }
  const xp = workout.earned_xp > 0 ? workout.earned_xp : proposed.total
  await insertOne<WorkoutAward>('workout_awards', { id: stableID('workout_awards', workout.id), workout_id: workout.id, earned_xp: xp })
  await update<Workout>('workouts', workout.id, { earned_xp: xp })
  return { xp, granted: workout.earned_xp <= 0 }
}

/** Recap and award for a strength session about to be completed. */
export async function prepareStrengthReward(workout: Workout): Promise<FinishReward> {
  const [current, history, library] = await Promise.all([storedWorkout(workout), completedHistory(), db.exercises.toArray()])
  const recap = buildRecap(current, history, library)
  const award = xpAward(recap.bonusExerciseCount, recap.records.length)
  const result = await grantWorkoutAward(workout, award)
  return { recap, award: result.granted ? award : null, totalXP: (await totalXP()) + result.xp }
}
