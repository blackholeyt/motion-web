// @vitest-environment node
import 'fake-indexeddb/auto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { PGlite } from '@electric-sql/pglite'
import Dexie from 'dexie'
import { MotionDatabase, db, setDatabase, syncedTables } from '../data/db'
import { grantWorkoutAward } from '../store/progress'
import { stableID, uuidV5 } from '../data/ids'
import { update } from '../data/repo'
import type { SetLog, SyncedTable } from '../data/types'
import { seedDemo } from '../features/demo/seed'
import * as engine from '../features/workout/engine'
import { loadSession } from '../features/workout/session'
import { addEntry, createBlueprint } from '../store/blueprints'
import { checkIn, correctWeight } from '../store/body'
import { createExercise } from '../store/library'
import { savePlan } from '../store/plan'
import { ensureProfile, updateProfile } from '../store/profile'
import { deleteWorkout } from '../store/history'
import { newSchedule } from '../domain/schedule'
import { addUsers, migratedDatabase, pgSupabase } from '../../supabase/tests/pgSupabase'
import { setSupabase } from './client'
import { hasGuestData } from './account'
import { syncOnce } from './engine'
import { mergeGuest } from './merge'
import { applyCloudVersion } from './conflicts'
import { readImportText, runImport } from '../import/importer'
import { legacyBackup } from '../test/legacyBackup'
import { buildBackup } from '../store/backup'
import { buildCSVRows } from '../store/csvExport'

const userA = '00000000-0000-4000-8000-00000000000a'
const context: engine.WorkoutContext = { trackReps: true, globalRestSeconds: 90, unit: 'kg', locale: 'en-US', now: () => new Date() }

let pg: PGlite

beforeAll(async () => {
  pg = await migratedDatabase()
  await addUsers(pg, userA)
}, 60_000)

beforeEach(async () => {
  for (const table of syncedTables) await pg.exec(`delete from public.${table}`)
  vi.useRealTimers()
})

/** A phone or laptop: its own IndexedDB and its own connection, signed in as the same account. */
async function device(user = userA) {
  const database = new MotionDatabase(`motion-${user}-${crypto.randomUUID()}`)
  await database.open()
  const client = pgSupabase(pg, user)
  return {
    database,
    /** Runs app code against this device's database. */
    use: async <T,>(work: () => Promise<T>) => {
      setDatabase(database)
      return work()
    },
    sync: async () => {
      setSupabase(client)
      await syncOnce(database, user)
    },
  }
}

const serverCount = async (table: SyncedTable) => (await pg.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0]!.n
const at = (time: string) => vi.setSystemTime(new Date(time))

async function pushWorkout() {
  const blueprint = await createBlueprint('Push')
  const bench = await createExercise('Bench Press', true)
  await addEntry(blueprint.id, bench, 2)
  return engine.startFromBlueprint(blueprint)
}

describe('sync between two devices of one account', () => {
  it('shows changes from one device on the other', async () => {
    const phone = await device()
    const laptop = await device()
    const id = await phone.use(async () => {
      const id = await pushWorkout()
      const session = (await loadSession(id))!
      await engine.updateSetInput(id, session.rows[0]!.set.id, '60', '8', context)
      await engine.toggleCompletion(id, session.rows[0]!.set.id, context)
      await engine.finishWorkout(id, context)
      return id
    })
    await phone.sync()
    await laptop.sync()
    const workout = await laptop.database.workouts.get(id)
    expect(workout).toMatchObject({ name: 'Push', is_completed: true })
    expect(await laptop.database.set_logs.where('workout_id').equals(id).count()).toBe(2)
    expect(await laptop.database.workout_awards.count()).toBe(1)
    expect(await phone.database.outbox.count()).toBe(0)
    expect(await laptop.database.outbox.count()).toBe(0)
    // Applied records are stored exactly as the app writes them.
    expect(workout!.updated_at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/)
  })

  it('merges offline entries without duplicates, also after repeated syncs', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    at('2026-11-02T07:00:00Z')
    const phone = await device()
    const laptop = await device()
    await phone.use(async () => {
      await checkIn(67.1)
      await savePlan({ ...newSchedule(), enabled: true })
      await pushWorkout()
    })
    at('2026-11-02T07:05:00Z')
    await laptop.use(async () => {
      await checkIn(67.3)
      await pushWorkout()
    })
    for (let round = 0; round < 3; round++) {
      await phone.sync()
      await laptop.sync()
    }
    expect(await serverCount('body_weights')).toBe(1)
    expect(await serverCount('weight_rewards')).toBe(1)
    expect(await serverCount('profiles')).toBe(1)
    expect(await serverCount('training_plans')).toBe(1)
    expect(await serverCount('workouts')).toBe(2)
    for (const { database } of [phone, laptop]) {
      expect((await database.body_weights.toArray()).map((entry) => entry.kilograms)).toEqual([67.3])
      expect(await database.workouts.count()).toBe(2)
      expect(await database.weight_rewards.count()).toBe(1)
    }
  })

  it('carries deletions to the other device as tombstones', async () => {
    const phone = await device()
    const laptop = await device()
    const id = await phone.use(pushWorkout)
    await phone.sync()
    await laptop.sync()
    await laptop.use(() => deleteWorkout(id))
    await laptop.sync()
    await phone.sync()
    expect((await phone.database.workouts.get(id))?.deleted_at).not.toBeNull()
  })

  it('keeps the newest change when an older one arrives later', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    at('2026-11-02T08:00:00Z')
    const phone = await device()
    const laptop = await device()
    await phone.use(() => ensureProfile())
    await phone.sync()
    await laptop.sync()
    at('2026-11-02T09:00:00Z')
    await phone.use(() => updateProfile({ name: 'Phone, offline' }))
    at('2026-11-02T10:00:00Z')
    await laptop.use(() => updateProfile({ name: 'Laptop, newer' }))
    await laptop.sync()
    await phone.sync()
    expect((await phone.database.profiles.toArray()).map((profile) => profile.name)).toEqual(['Laptop, newer'])
    expect((await pg.query<{ name: string }>('select name from public.profiles')).rows).toEqual([{ name: 'Laptop, newer' }])
  })

  it('never lets the default profile of a new device replace the account’s profile', async () => {
    const phone = await device()
    await phone.use(() => updateProfile({ name: 'Mathis' }))
    await phone.sync()
    const tablet = await device()
    await tablet.use(() => ensureProfile())
    await tablet.sync()
    expect((await tablet.database.profiles.toArray()).map((profile) => profile.name)).toEqual(['Mathis'])
  })
})

describe('an open workout on two devices', () => {
  it('keeps this device’s state and the other version as a conflict copy', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    at('2026-11-02T10:00:00Z')
    const phone = await device()
    const laptop = await device()
    const id = await phone.use(pushWorkout)
    await phone.sync()
    await laptop.sync()
    const setID = (await phone.database.set_logs.where('workout_id').equals(id).first())!.id
    at('2026-11-02T10:01:00Z')
    await phone.use(() => engine.updateSetInput(id, setID, '80', '5', context))
    at('2026-11-02T10:02:00Z')
    await laptop.use(() => engine.updateSetInput(id, setID, '60', '10', context))
    await laptop.sync()
    at('2026-11-02T10:03:00Z')
    await phone.sync()

    const kept = (await phone.database.set_logs.get(setID)) as SetLog
    expect(kept.draft_weight_text).toBe('80')
    // The set and the workout's draft time changed on both devices.
    const conflicts = await phone.database.conflicts.toArray()
    expect(conflicts.map((conflict) => conflict.table).sort()).toEqual(['set_logs', 'workouts'])
    expect(new Set(conflicts.map((conflict) => conflict.workout_id))).toEqual(new Set([id]))
    const set = conflicts.find((conflict) => conflict.record_id === setID)!
    expect((set.remote as SetLog).draft_weight_text).toBe('60')
    // The device's state is now the newest version and reaches the other device too.
    await laptop.sync()
    expect(((await laptop.database.set_logs.get(setID)) as SetLog).draft_weight_text).toBe('80')

    at('2026-11-02T10:04:00Z')
    await phone.use(() => applyCloudVersion(id))
    expect(((await phone.database.set_logs.get(setID)) as SetLog).draft_weight_text).toBe('60')
    expect(await phone.database.conflicts.count()).toBe(0)
  })

  it('applies newer changes from another device when nothing here is waiting to upload', async () => {
    const phone = await device()
    const laptop = await device()
    const id = await phone.use(pushWorkout)
    await phone.sync()
    await laptop.sync()
    const setID = (await laptop.database.set_logs.where('workout_id').equals(id).first())!.id
    await laptop.use(() => engine.updateSetInput(id, setID, '70', '6', context))
    await laptop.sync()
    await phone.sync()
    expect(((await phone.database.set_logs.get(setID)) as SetLog).draft_weight_text).toBe('70')
    expect(await phone.database.conflicts.count()).toBe(0)
  })
})

describe('first login with data from before', () => {
  it('treats a device with only the automatic profile as empty', async () => {
    const guest = await device()
    await guest.use(() => ensureProfile())
    expect(await hasGuestData(guest.database)).toBe(false)
    await guest.use(() => checkIn(70))
    expect(await hasGuestData(guest.database)).toBe(true)
  })

  it('adds the guest’s training to the account and queues it for upload', async () => {
    const guest = await device()
    const account = await device()
    await guest.use(async () => {
      await ensureProfile()
      await pushWorkout()
      await checkIn(70)
    })
    await account.use(() => updateProfile({ name: 'Account profile' }))
    const merged = await mergeGuest(guest.database, account.database, syncedTables)
    expect(merged).toBeGreaterThan(0)
    expect((await account.database.profiles.toArray()).map((profile) => profile.name)).toEqual(['Account profile'])
    expect(await account.database.workouts.count()).toBe(1)
    await account.sync()
    expect(await serverCount('workouts')).toBe(1)
    expect(await serverCount('body_weights')).toBe(1)
  })
})

describe('database version 2', () => {
  it('gives daily and single records their stable ids and drops local duplicates', async () => {
    const name = `upgrade-${crypto.randomUUID()}`
    const old = new Dexie(name)
    old.version(1).stores({
      profiles: 'id', exercises: 'id, name, catalogue_id', blueprints: 'id, name', blueprint_exercises: 'id, blueprint_id, exercise_id',
      workouts: 'id, performed_at, blueprint_id', workout_exercises: 'id, workout_id, exercise_id', set_logs: 'id, workout_id, workout_exercise_id',
      training_plans: 'id', body_weights: 'id, day', weight_rewards: 'id, day', workout_awards: 'id, workout_id', sleep_scores: 'id, day', outbox: 'key, table, queued_at',
    })
    const base = { user_id: null, created_at: '2026-11-01T08:00:00.000Z', deleted_at: null }
    await old.table('body_weights').bulkPut([
      { ...base, id: 'a', day: '2026-11-01', recorded_at: base.created_at, kilograms: 67, updated_at: '2026-11-01T08:00:00.000Z', deleted_at: '2026-11-01T08:30:00.000Z' },
      { ...base, id: 'b', day: '2026-11-01', recorded_at: base.created_at, kilograms: 68, updated_at: '2026-11-01T08:10:00.000Z' },
    ])
    await old.table('profiles').put({ ...base, id: 'p', name: 'Mathis', updated_at: base.created_at })
    await old.table('outbox').bulkPut([{ key: 'body_weights:a', table: 'body_weights', record_id: 'a', queued_at: base.created_at }])
    old.close()

    const upgraded = new MotionDatabase(name)
    await upgraded.open()
    expect(await upgraded.body_weights.toArray()).toEqual([expect.objectContaining({ id: stableID('body_weights', '2026-11-01'), kilograms: 68, deleted_at: null })])
    expect((await upgraded.profiles.toArray()).map((profile) => [profile.id, profile.name])).toEqual([[stableID('profiles'), 'Mathis']])
    const queued = (await upgraded.outbox.toArray()).map((entry) => entry.key).sort()
    expect(queued).toEqual([`body_weights:${stableID('body_weights', '2026-11-01')}`, `profiles:${stableID('profiles')}`].sort())
  })
})

describe('database version 4', () => {
  it('drops the sleep index with its queued uploads, cursor and conflict copies', async () => {
    const name = `upgrade-${crypto.randomUUID()}`
    const old = new Dexie(name)
    old.version(3).stores({
      profiles: 'id', exercises: 'id, name, catalogue_id', blueprints: 'id, name', blueprint_exercises: 'id, blueprint_id, exercise_id',
      workouts: 'id, performed_at, blueprint_id', workout_exercises: 'id, workout_id, exercise_id', set_logs: 'id, workout_id, workout_exercise_id',
      training_plans: 'id', body_weights: 'id, day', weight_rewards: 'id, day', workout_awards: 'id, workout_id', sleep_scores: 'id, day', outbox: 'key, table, queued_at',
      sync_state: 'table', conflicts: 'key, table, record_id', legacy_imports: 'id, fingerprint',
    })
    const time = '2026-11-01T08:00:00.000Z'
    await old.table('sleep_scores').put({ id: 's', day: '2026-11-01', score: 84, user_id: null, created_at: time, updated_at: time, deleted_at: null })
    await old.table('outbox').bulkPut([
      { key: 'sleep_scores:s', table: 'sleep_scores', record_id: 's', queued_at: time },
      { key: 'body_weights:b', table: 'body_weights', record_id: 'b', queued_at: time },
    ])
    await old.table('sync_state').bulkPut([{ table: 'sleep_scores', synced_at: time }, { table: 'body_weights', synced_at: time }])
    await old.table('conflicts').put({ key: 'sleep_scores:s', table: 'sleep_scores', record_id: 's', workout_id: 'w', remote: {}, detected_at: time })
    old.close()

    const upgraded = new MotionDatabase(name)
    await upgraded.open()
    expect(upgraded.tables.map((table) => table.name)).not.toContain('sleep_scores')
    expect((await upgraded.outbox.toArray()).map((entry) => entry.key)).toEqual(['body_weights:b'])
    expect((await upgraded.sync_state.toArray()).map((cursor) => cursor.table)).toEqual(['body_weights'])
    expect(await upgraded.conflicts.count()).toBe(0)
  })
})

describe('ids and schema', () => {
  it('computes RFC 9562 UUIDv5 values', () => {
    expect(uuidV5('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'www.example.com')).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2')
    expect(stableID('body_weights', '2026-11-02')).toBe(stableID('body_weights', '2026-11-02'))
    expect(stableID('body_weights', '2026-11-02')).not.toBe(stableID('weight_rewards', '2026-11-02'))
  })

  it('has a cloud column for every field the app stores', async () => {
    const folder = join(import.meta.dirname, '../../supabase/migrations')
    const sql = readdirSync(folder)
      .sort()
      .map((file) => readFileSync(join(folder, file), 'utf8'))
      .join('\n')
    const columns = new Map<string, Set<string>>()
    for (const [, table, body] of sql.matchAll(/create table public\.(\w+) \(([\s\S]*?)\n\);/g)) {
      columns.set(table!, new Set([...body!.matchAll(/^\s+(\w+) /gm)].map((match) => match[1]!)))
    }
    const sample = await device()
    await sample.use(async () => {
      await seedDemo()
      await ensureProfile()
      await checkIn(70)
      await savePlan({ ...newSchedule(), enabled: true })
      const id = await engine.startFreestyle()
      await update('workouts', id, {})
      await grantWorkoutAward((await db.workouts.get(id))!, { base: 100, bonus: 0, records: 0, total: 100 } as never)
      await runImport(await readImportText(JSON.stringify(legacyBackup()), 'Motion-Backup.json'))
    })
    for (const table of syncedTables) {
      const records = await sample.database.table(table).toArray()
      expect(records.length, table).toBeGreaterThan(0)
      for (const record of records) for (const key of Object.keys(record)) expect(columns.get(table)?.has(key), `${table}.${key}`).toBe(true)
    }
  })
})

describe('deleting the account (phase 6)', () => {
  const userD = '00000000-0000-4000-8000-00000000000d'

  it('removes the account’s rows in the cloud, and its other device can no longer upload', async () => {
    await addUsers(pg, userD)
    const phone = await device(userD)
    const laptop = await device(userD)
    await phone.use(async () => {
      await pushWorkout()
      await checkIn(70, new Date())
    })
    await phone.sync()
    await laptop.sync()
    const counted = async () => (await pg.query<{ n: number }>(`select count(*)::int as n from public.workouts where user_id = '${userD}'`)).rows[0]!.n
    expect(await counted()).toBe(1)

    const result = await pgSupabase(pg, userD).rpc('delete_account')
    expect(result.error).toBeNull()
    for (const table of syncedTables) {
      const rows = await pg.query<{ n: number }>(`select count(*)::int as n from public.${table} where user_id = '${userD}'`)
      expect(rows.rows[0]!.n).toBe(0)
    }

    // The laptop still holds a valid token and a queued change; the server refuses it.
    await laptop.use(() => checkIn(71, new Date()))
    await expect(laptop.sync()).rejects.toThrow(/account deleted/)
    expect(await counted()).toBe(0)
  })
})

describe('complete run-through (phase 7)', () => {
  const userJ = '00000000-0000-4000-8000-0000000000aa'
  const offline = {
    auth: { getSession: async () => ({ data: { session: { user: { id: userJ } } }, error: null }) },
    from: () => {
      throw new TypeError('Failed to fetch')
    },
    rpc: async () => {
      throw new TypeError('Failed to fetch')
    },
  } as unknown as Parameters<typeof setSupabase>[0]

  it('goes from guest to account, trains offline, syncs to a second device, exports and deletes everything', async () => {
    await addUsers(pg, userJ)
    const rowsOfJ = async () => {
      let total = 0
      for (const table of syncedTables) total += (await pg.query<{ n: number }>(`select count(*)::int as n from public.${table} where user_id = '${userJ}'`)).rows[0]!.n
      return total
    }

    // 1. Before any account: training as a guest on the phone.
    const guest = await device(userJ)
    await guest.use(async () => {
      await ensureProfile()
      await checkIn(67.4, new Date())
    })
    expect(await hasGuestData(guest.database)).toBe(true)

    // 2. New account on the phone, the guest data is taken along.
    const phone = await device(userJ)
    await phone.use(() => ensureProfile())
    expect(await mergeGuest(guest.database, phone.database, syncedTables)).toBeGreaterThan(0)
    await phone.sync()
    expect(await serverCount('body_weights')).toBe(1)

    // 3. A whole workout without a connection: it waits in the outbox, nothing is lost.
    const workoutID = await phone.use(async () => {
      const id = await pushWorkout()
      const session = (await loadSession(id))!
      for (const row of session.rows) {
        await engine.updateSetInput(id, row.set.id, '62,5', '8', context)
        await engine.toggleCompletion(id, row.set.id, context)
      }
      await engine.finishWorkout(id, context)
      return id
    })
    setSupabase(offline)
    await expect(syncOnce(phone.database, userJ)).rejects.toThrow(/fetch/)
    expect(await phone.database.outbox.count()).toBeGreaterThan(0)
    expect(await serverCount('workouts')).toBe(0)

    // 4. Back online: uploaded once, also after repeated syncs.
    await phone.sync()
    await phone.sync()
    expect(await phone.database.outbox.count()).toBe(0)
    expect(await serverCount('workouts')).toBe(1)
    expect(await serverCount('set_logs')).toBe(2)

    // 5. Second device: everything arrives, and its changes go back to the phone.
    const laptop = await device(userJ)
    await laptop.sync()
    expect(await laptop.database.workouts.get(workoutID)).toMatchObject({ is_completed: true })
    expect((await laptop.database.set_logs.where('workout_id').equals(workoutID).toArray()).map((set) => set.weight_kg)).toEqual([62.5, 62.5])
    expect(await laptop.database.body_weights.count()).toBe(1)
    await laptop.use(async () => correctWeight((await db.body_weights.toArray())[0]!, 68))
    await laptop.sync()
    await phone.sync()
    expect((await phone.database.body_weights.toArray()).map((entry) => entry.kilograms)).toEqual([68])

    // 6. Export on the second device holds the workout in both formats.
    const backup = await laptop.use(() => buildBackup())
    expect(backup.tables.workouts).toHaveLength(1)
    expect(backup.tables.set_logs).toHaveLength(2)
    expect(backup.tables.body_weights).toHaveLength(1)
    expect((await laptop.use(() => buildCSVRows())).length).toBeGreaterThan(0)

    // 7. Delete the account from the phone: no row and no login left, the laptop cannot bring anything back.
    expect(await rowsOfJ()).toBeGreaterThan(0)
    const deleted = await pgSupabase(pg, userJ).rpc('delete_account')
    expect(deleted.error).toBeNull()
    expect(await rowsOfJ()).toBe(0)
    expect((await pg.query('select 1 from auth.users where id = $1', [userJ])).rows).toHaveLength(0)
    await laptop.use(() => checkIn(68, new Date()))
    await expect(laptop.sync()).rejects.toThrow(/account deleted/)
    expect(await rowsOfJ()).toBe(0)

    // 8. The device copies go with it.
    await phone.database.delete()
    await laptop.database.delete()
    expect(await Dexie.exists(phone.database.name)).toBe(false)
    expect(await Dexie.exists(laptop.database.name)).toBe(false)
  })
})
