// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { addUsers, migratedDatabase } from './pgSupabase'

/*
 * Runs the real migrations in an embedded Postgres with the pieces Supabase provides (roles anon and
 * authenticated, auth.uid() reading the JWT claims) and proves with two accounts that account B can
 * neither read nor change nor delete account A's rows. rls.live.test.ts repeats this against the
 * real Supabase project.
 */

const tables = [
  'profiles', 'exercises', 'blueprints', 'blueprint_exercises', 'workouts', 'workout_exercises',
  'set_logs', 'training_plans', 'body_weights', 'weight_rewards', 'workout_awards', 'sleep_scores', 'legacy_imports',
] as const

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const time = '2026-11-02T10:00:00.000Z'

/** One row per table with only the required columns filled. */
function row(table: (typeof tables)[number], id: string, user: string, extra: Record<string, unknown> = {}) {
  const id2 = '11111111-1111-4111-8111-111111111111'
  const columns: Record<(typeof tables)[number], Record<string, unknown>> = {
    profiles: { name: 'A', body_weight_unit: 'kg', load_unit: 'kg', distance_unit: 'km', body_weight_goal: 'maintain' },
    exercises: { name: 'Squat', is_pr_tracked: false, equipment: 'Barbell', muscle: 'Legs', measurement: 'Load & reps', guidance: '', track_progress: true },
    blueprints: { name: 'Push' },
    blueprint_exercises: { blueprint_id: id2, exercise_id: id2, sort_order: 0, target_sets: 3, warm_up_sets: 0 },
    workouts: { name: 'Push', performed_at: time, is_completed: true, is_freestyle: false, is_retrospective: false },
    workout_exercises: { workout_id: id2, exercise_name: 'Squat', measurement: 'Load & reps', is_history_only: false, is_removed: false, sort_order: 0 },
    set_logs: { workout_id: id2, workout_exercise_id: id2, set_index: 1, weight_kg: 100, is_completed: true, is_warm_up: false, is_skipped: false, is_removed: false },
    training_plans: { schedule: { mode: 'rotation' } },
    body_weights: { day: '2026-11-02', recorded_at: time, kilograms: 67 },
    weight_rewards: { day: '2026-11-02', awarded_at: time, earned_xp: 25 },
    workout_awards: { workout_id: id2, earned_xp: 100 },
    sleep_scores: { day: '2026-11-02', score: 80 },
    legacy_imports: { fingerprint: 'abc', file_name: 'Motion-Backup.json', source_format: 'json', exported_at: time, imported_at: time },
  }
  return { id, user_id: user, created_at: time, updated_at: time, deleted_at: null, ...columns[table], ...extra }
}

function insertSQL(table: string, values: Record<string, unknown>, upsert = false) {
  const keys = Object.keys(values)
  const literal = (value: unknown) =>
    value === null ? 'null' : typeof value === 'object' ? `'${JSON.stringify(value)}'::jsonb` : typeof value === 'string' ? `'${value}'` : String(value)
  const conflict = upsert ? ` on conflict (user_id, id) do update set ${keys.map((key) => `${key} = excluded.${key}`).join(', ')}` : ''
  return `insert into public.${table} (${keys.join(', ')}) values (${keys.map((key) => literal(values[key])).join(', ')})${conflict}`
}

let pg: PGlite

async function as<T>(user: string | null, work: () => Promise<T>): Promise<T> {
  await pg.exec(user ? `set role authenticated; set request.jwt.claims = '{"sub":"${user}","role":"authenticated"}'` : `set role anon; set request.jwt.claims = '{"role":"anon"}'`)
  try {
    return await work()
  } finally {
    await pg.exec('reset role; reset request.jwt.claims')
  }
}

const count = async (table: string) => (await pg.query<{ n: number }>(`select count(*)::int as n from public.${table}`)).rows[0]!.n

beforeAll(async () => {
  pg = await migratedDatabase()
  await addUsers(pg, A, B)
  for (const [index, table] of tables.entries()) {
    const id = `aaaaaaaa-0000-4000-8000-${String(index).padStart(12, '0')}`
    await as(A, () => pg.exec(insertSQL(table, row(table, id, A))))
  }
}, 60_000)

describe.each(tables)('row level security on %s', (table) => {
  const id = () => `aaaaaaaa-0000-4000-8000-${String(tables.indexOf(table)).padStart(12, '0')}`

  it('lets account A read its own row', async () => {
    expect(await as(A, () => count(table))).toBe(1)
  })

  it('hides account A’s rows from account B and from signed-out visitors', async () => {
    expect(await as(B, () => count(table))).toBe(0)
    await expect(as(null, () => count(table))).rejects.toThrow(/permission denied/)
  })

  it('stops account B from changing or deleting account A’s rows', async () => {
    const changed = await as(B, () => pg.query(`update public.${table} set deleted_at = now(), updated_at = now() + interval '1 day' where id = '${id()}'`))
    const deleted = await as(B, () => pg.query(`delete from public.${table} where id = '${id()}'`))
    expect(changed.affectedRows).toBe(0)
    expect(deleted.affectedRows).toBe(0)
    const stored = await pg.query<{ deleted_at: string | null }>(`select deleted_at from public.${table} where id = '${id()}'`)
    expect(stored.rows).toEqual([{ deleted_at: null }])
  })

  it('refuses rows that account B writes in account A’s name', async () => {
    const forged = row(table, '22222222-2222-4222-8222-222222222222', A)
    await expect(as(B, () => pg.exec(insertSQL(table, forged)))).rejects.toThrow(/row-level security/)
    await expect(as(B, () => pg.exec(insertSQL(table, row(table, id(), A, { updated_at: '2027-01-01T00:00:00.000Z' }), true)))).rejects.toThrow(
      /row-level security/,
    )
  })

  it('keeps account A’s row when account B uses the same id for its own row', async () => {
    await as(B, () => pg.exec(insertSQL(table, row(table, id(), B, { updated_at: '2027-01-01T00:00:00.000Z' }), true)))
    expect(await as(B, () => count(table))).toBe(1)
    const own = await as(A, () => pg.query<{ updated_at: Date }>(`select updated_at from public.${table} where id = '${id()}'`))
    expect(own.rows.map((stored) => stored.updated_at.toISOString())).toEqual([time])
  })
})

describe('last change wins on the server', () => {
  const id = 'cccccccc-0000-4000-8000-000000000001'
  const read = () => pg.query<{ name: string; synced_at: Date }>(`select name, synced_at from public.blueprints where id = '${id}'`).then((result) => result.rows[0]!)

  it('skips an upload that is older than the stored row and accepts a newer one', async () => {
    await as(A, () => pg.exec(insertSQL('blueprints', row('blueprints', id, A, { name: 'New', updated_at: '2026-11-02T12:00:00.000Z' }), true)))
    const first = await read()
    await as(A, () => pg.exec(insertSQL('blueprints', row('blueprints', id, A, { name: 'Stale', updated_at: '2026-11-02T11:00:00.000Z' }), true)))
    expect((await read()).name).toBe('New')
    await as(A, () => pg.exec(insertSQL('blueprints', row('blueprints', id, A, { name: 'Newer', updated_at: '2026-11-02T13:00:00.000Z' }), true)))
    const latest = await read()
    expect(latest.name).toBe('Newer')
    expect(latest.synced_at.getTime()).toBeGreaterThan(first.synced_at.getTime())
  })

  it('lets signed-out visitors call only the keep-alive check', async () => {
    const result = await as(null, () => pg.query<{ keep_alive: string }>('select public.keep_alive()'))
    expect(result.rows[0]!.keep_alive).toBe('ok')
  })
})
