import { db, syncedTables } from './db'
import type { SyncedRecord, SyncedTable } from './types'

/*
 * Every write goes through these helpers: it stamps updated_at and queues the
 * record for sync in the same transaction, so phase 4 can upload it idempotently.
 */

export const nowISO = () => new Date().toISOString()
export const newID = () => crypto.randomUUID()

export type Draft<T extends SyncedRecord> = Omit<T, keyof SyncedRecord> & Partial<SyncedRecord>

export function stamp<T extends SyncedRecord>(draft: Draft<T>): T {
  const time = nowISO()
  return {
    user_id: null,
    created_at: time,
    deleted_at: null,
    ...draft,
    id: draft.id ?? newID(),
    updated_at: time,
  } as T
}

async function enqueue(table: SyncedTable, ids: string[]) {
  const queued_at = nowISO()
  await db.outbox.bulkPut(ids.map((record_id) => ({ key: `${table}:${record_id}`, table, record_id, queued_at })))
}

export async function insert<T extends SyncedRecord>(table: SyncedTable, drafts: Draft<T>[]): Promise<T[]> {
  const records = drafts.map((draft) => stamp<T>(draft))
  await db.table(table).bulkPut(records)
  await enqueue(
    table,
    records.map((record) => record.id),
  )
  return records
}

export async function insertOne<T extends SyncedRecord>(table: SyncedTable, draft: Draft<T>): Promise<T> {
  const [record] = await insert<T>(table, [draft])
  return record!
}

export async function update<T extends SyncedRecord>(table: SyncedTable, id: string, change: Partial<T>) {
  await db.table(table).update(id, { ...change, updated_at: nowISO() })
  await enqueue(table, [id])
}

/** Soft delete keeps a tombstone so other devices learn about the deletion. */
export async function softDelete(table: SyncedTable, ids: string[]) {
  if (ids.length === 0) return
  const time = nowISO()
  await db.table(table).bulkUpdate(ids.map((key) => ({ key, changes: { deleted_at: time, updated_at: time } })))
  await enqueue(table, ids)
}

export function live<T extends SyncedRecord>(records: T[]): T[] {
  return records.filter((record) => record.deleted_at === null)
}

/** Runs several writes atomically; a failure rolls every table back. */
export function transaction<T>(work: () => Promise<T>): Promise<T> {
  return db.transaction('rw', [...syncedTables.map((name) => db.table(name)), db.outbox], work)
}
