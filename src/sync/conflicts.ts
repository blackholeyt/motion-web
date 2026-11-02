import { db } from '../data/db'
import { nowISO } from '../data/repo'

/*
 * Conflict copies (sync/merge.ts): a workout that was open on this device kept its state while
 * another device changed it too. The user picks one version per workout.
 */

/** Replaces this device's records of the workout with the kept cloud version, as a new change. */
export async function applyCloudVersion(workoutID: string) {
  await db.transaction('rw', [db.conflicts, db.outbox, db.workouts, db.workout_exercises, db.set_logs], async () => {
    const conflicts = await db.conflicts.filter((conflict) => conflict.workout_id === workoutID).toArray()
    const time = nowISO()
    for (const conflict of conflicts) {
      await db.table(conflict.table).put({ ...conflict.remote, updated_at: time })
      await db.outbox.put({ key: conflict.key, table: conflict.table, record_id: conflict.record_id, queued_at: time })
    }
    await db.conflicts.bulkDelete(conflicts.map((conflict) => conflict.key))
  })
}

/** Keeps this device's state; it is already the newest version in the cloud. */
export async function keepDeviceVersion(workoutID: string) {
  const keys = (await db.conflicts.toArray()).filter((conflict) => conflict.workout_id === workoutID).map((conflict) => conflict.key)
  await db.conflicts.bulkDelete(keys)
}
