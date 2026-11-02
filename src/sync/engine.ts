import { liveQuery } from 'dexie'
import { useSyncExternalStore } from 'react'
import { syncedTables, type MotionDatabase } from '../data/db'
import type { OutboxEntry, SyncedRecord, SyncedTable } from '../data/types'
import { supabase } from './client'
import { applyRemote, fromServer, isOpenWorkout, keepConflict, workoutOf } from './merge'

/*
 * Background sync between one account database and Supabase. The app never waits for it: every
 * change is already saved on the device and queued in the outbox (data/repo.ts).
 *
 * 1. Push: queued records are uploaded with an idempotent upsert on (user_id, id). The server skips
 *    uploads older than its row (last change wins) and reports only the rows it accepted.
 * 2. Pull: per table everything with a newer server synced_at than last time, with a short overlap so
 *    a slow concurrent upload is not missed. Repeated rows are harmless because applying is idempotent.
 */

export type SyncState = 'off' | 'syncing' | 'synced' | 'offline' | 'signedOut' | 'error'

export interface SyncStatus {
  state: SyncState
  pending: number
  lastSyncedAt: string | null
  error: string | null
}

const batchSize = 200
const pageSize = 1000
const overlapMilliseconds = 2 * 60 * 1000

let status: SyncStatus = { state: 'off', pending: 0, lastSyncedAt: null, error: null }
const listeners = new Set<() => void>()

function setStatus(change: Partial<SyncStatus>) {
  status = { ...status, ...change }
  listeners.forEach((listener) => listener())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => status,
    () => status,
  )
}

export const syncStatus = () => status

const isOffline = (error: unknown) =>
  (typeof navigator !== 'undefined' && navigator.onLine === false) || (error instanceof TypeError && /fetch|network|load failed/i.test(error.message))

export async function push(database: MotionDatabase, userID: string) {
  const entries = await database.outbox.toArray()
  for (const table of syncedTables) {
    const queued = entries.filter((entry) => entry.table === table)
    for (let start = 0; start < queued.length; start += batchSize) await pushBatch(database, userID, table, queued.slice(start, start + batchSize))
  }
}

async function pushBatch(database: MotionDatabase, userID: string, table: SyncedTable, entries: OutboxEntry[]) {
  const records = await database.table<SyncedRecord, string>(table).bulkGet(entries.map((entry) => entry.record_id))
  const present = records.filter((record): record is SyncedRecord => Boolean(record))
  if (present.length > 0) {
    const { data, error } = await supabase()
      .from(table)
      .upsert(
        present.map((record) => ({ ...record, user_id: userID })),
        { onConflict: 'user_id,id' },
      )
      .select('id')
    if (error) throw error
    const accepted = new Set((data ?? []).map((row: { id: string }) => row.id))
    const rejected = present.filter((record) => !accepted.has(record.id))
    await protectOpenWorkouts(database, table, rejected)
  }
  // Uploaded (or superseded) entries leave the outbox unless the record changed again meanwhile.
  await database.transaction('rw', database.outbox, async () => {
    for (const entry of entries) {
      const current = await database.outbox.get(entry.key)
      if (current && current.queued_at === entry.queued_at) await database.outbox.delete(entry.key)
    }
  })
}

/**
 * The server kept a newer version than this device's upload. Normally the next pull simply brings
 * it in. For a workout that is still open here the device keeps its state instead: the cloud version
 * becomes a conflict copy, and the device's state is uploaded again as the newest change.
 */
async function protectOpenWorkouts(database: MotionDatabase, table: SyncedTable, rejected: SyncedRecord[]) {
  const guarded: SyncedRecord[] = []
  for (const record of rejected) {
    if (await isOpenWorkout(database, workoutOf(table, record as SyncedRecord & Record<string, unknown>))) guarded.push(record)
  }
  if (guarded.length === 0) return
  const { data, error } = await supabase().from(table).select('*').in('id', guarded.map((record) => record.id))
  if (error) throw error
  const time = new Date().toISOString()
  for (const row of data ?? []) {
    const remote = fromServer(row as Record<string, unknown>)
    await keepConflict(database, table, remote, workoutOf(table, remote)!)
  }
  await database.transaction('rw', [database.table(table), database.outbox], async () => {
    for (const record of guarded) {
      await database.table(table).update(record.id, { updated_at: time })
      await database.outbox.put({ key: `${table}:${record.id}`, table, record_id: record.id, queued_at: time })
    }
  })
}

export async function pull(database: MotionDatabase) {
  for (const table of syncedTables) {
    const cursor = await database.sync_state.get(table)
    let since = cursor ? new Date(new Date(cursor.synced_at).getTime() - overlapMilliseconds).toISOString() : new Date(0).toISOString()
    let newest = cursor?.synced_at ?? null
    for (;;) {
      const { data, error } = await supabase().from(table).select('*').gte('synced_at', since).order('synced_at').order('id').limit(pageSize)
      if (error) throw error
      const rows = (data ?? []) as Record<string, unknown>[]
      if (rows.length === 0) break
      await applyRemote(database, table, rows)
      const last = rows[rows.length - 1]!.synced_at as string
      if (!newest || new Date(last) > new Date(newest)) newest = last
      if (rows.length < pageSize || last === since) break
      since = last
    }
    if (newest) await database.sync_state.put({ table, synced_at: newest })
  }
}

export async function syncOnce(database: MotionDatabase, userID: string) {
  await push(database, userID)
  await pull(database)
  // Uploads queued by the open-workout protection go out right away.
  if ((await database.outbox.count()) > 0) await push(database, userID)
}

/* Scheduling: after local changes (debounced), when the app comes back, when the network returns, and every 30 s while visible. */

interface Session {
  database: MotionDatabase
  userID: string
  stop: () => void
}

let session: Session | null = null
let running: Promise<void> | null = null
let again = false

export function startSync(database: MotionDatabase, userID: string) {
  stopSync()
  let debounce: ReturnType<typeof setTimeout> | undefined
  const soon = () => {
    clearTimeout(debounce)
    debounce = setTimeout(() => void requestSync(), 1500)
  }
  const outbox = liveQuery(() => database.outbox.count()).subscribe((pending) => {
    setStatus({ pending })
    if (pending > 0) soon()
  })
  const visible = () => {
    if (document.visibilityState === 'visible') void requestSync()
  }
  const online = () => void requestSync()
  const offline = () => setStatus({ state: 'offline' })
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') void requestSync()
  }, 30_000)
  document.addEventListener('visibilitychange', visible)
  window.addEventListener('online', online)
  window.addEventListener('offline', offline)
  session = {
    database,
    userID,
    stop: () => {
      clearTimeout(debounce)
      clearInterval(interval)
      outbox.unsubscribe()
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    },
  }
  setStatus({ state: 'syncing', error: null })
  void requestSync()
}

export function stopSync() {
  session?.stop()
  session = null
  setStatus({ state: 'off', pending: 0, error: null })
}

/** Runs one sync now, or once more right after the one in progress. */
export async function requestSync(): Promise<void> {
  if (!session) return
  if (running) {
    again = true
    return running
  }
  const current = session
  running = (async () => {
    do {
      again = false
      try {
        const { data } = await supabase().auth.getSession()
        if (data.session?.user.id !== current.userID) {
          setStatus({ state: 'signedOut' })
          return
        }
        setStatus({ state: 'syncing' })
        await syncOnce(current.database, current.userID)
        if (session === current) setStatus({ state: 'synced', lastSyncedAt: new Date().toISOString(), error: null })
      } catch (error) {
        if (session === current) setStatus(isOffline(error) ? { state: 'offline' } : { state: 'error', error: (error as Error).message ?? String(error) })
      }
    } while (again && session === current)
  })().finally(() => {
    running = null
  })
  return running
}
