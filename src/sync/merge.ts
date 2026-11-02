import type { MotionDatabase } from '../data/db'
import type { SyncConflict, SyncedRecord, SyncedTable, Workout } from '../data/types'

/*
 * Applying records from the cloud (or from the guest database on first login) to a local database.
 * Rule: per record the last change wins. Exception: a workout that is still open on this device keeps
 * its unsaved state; the newer cloud version is kept as a conflict copy and the user is told.
 */

type Row = SyncedRecord & Record<string, unknown>

const timestampColumns = ['created_at', 'updated_at', 'deleted_at', 'performed_at', 'draft_updated_at', 'recorded_at', 'awarded_at', 'exported_at', 'imported_at']

/** Postgres returns "2026-11-02T10:00:00+00:00"; the app compares and sorts "…T10:00:00.000Z" strings. */
export function fromServer(row: Record<string, unknown>): Row {
  const record: Record<string, unknown> = { ...row }
  delete record.synced_at
  for (const column of timestampColumns) {
    const value = record[column]
    if (typeof value === 'string') record[column] = new Date(value).toISOString()
  }
  return record as Row
}

export const changedAt = (record: SyncedRecord) => new Date(record.updated_at).getTime()

/** The workout a record belongs to, for the open-workout protection. */
export function workoutOf(table: SyncedTable, record: Row): string | null {
  if (table === 'workouts') return record.id
  if (table === 'workout_exercises' || table === 'set_logs') return record.workout_id as string
  return null
}

/** Open on this device: started here or pulled earlier, not finished and not deleted. */
export async function isOpenWorkout(database: MotionDatabase, workoutID: string | null): Promise<boolean> {
  if (!workoutID) return false
  const workout: Workout | undefined = await database.workouts.get(workoutID)
  return Boolean(workout && !workout.is_completed && workout.deleted_at === null)
}

export async function keepConflict(database: MotionDatabase, table: SyncedTable, remote: Row, workoutID: string) {
  const conflict: SyncConflict = { key: `${table}:${remote.id}`, table, record_id: remote.id, workout_id: workoutID, remote, detected_at: new Date().toISOString() }
  await database.conflicts.put(conflict)
}

/**
 * Pull side. Older or equal versions are ignored; a newer one replaces the local record unless the
 * record belongs to an open workout and still waits in the outbox. Returns how many were applied.
 */
export async function applyRemote(database: MotionDatabase, table: SyncedTable, rows: Record<string, unknown>[]): Promise<number> {
  const records = rows.map(fromServer)
  return database.transaction('rw', [database.table(table), database.outbox, database.conflicts, database.workouts], async () => {
    const locals = await database.table<Row, string>(table).bulkGet(records.map((record) => record.id))
    const apply: Row[] = []
    for (const [index, remote] of records.entries()) {
      const local = locals[index]
      if (local && changedAt(remote) <= changedAt(local)) continue
      if (local && (await database.outbox.get(`${table}:${remote.id}`))) {
        const workoutID = workoutOf(table, local)
        if (await isOpenWorkout(database, workoutID)) {
          await keepConflict(database, table, remote, workoutID!)
          continue
        }
      }
      apply.push(remote)
    }
    await database.table(table).bulkPut(apply)
    // A newer cloud version supersedes a waiting upload of the same record.
    await database.outbox.bulkDelete(apply.map((record) => `${table}:${record.id}`))
    return apply.length
  })
}

/** First login: the guest's records join the account database and are queued for upload. */
export async function mergeGuest(guest: MotionDatabase, account: MotionDatabase, tables: SyncedTable[]): Promise<number> {
  let merged = 0
  const queued_at = new Date().toISOString()
  for (const table of tables) {
    const records = await guest.table<Row, string>(table).toArray()
    if (records.length === 0) continue
    await account.transaction('rw', [account.table(table), account.outbox], async () => {
      const locals = await account.table<Row, string>(table).bulkGet(records.map((record) => record.id))
      const newer = records.filter((record, index) => !locals[index] || changedAt(record) > changedAt(locals[index]!))
      await account.table(table).bulkPut(newer)
      await account.outbox.bulkPut(newer.map((record) => ({ key: `${table}:${record.id}`, table, record_id: record.id, queued_at })))
      merged += newer.length
    })
  }
  return merged
}
