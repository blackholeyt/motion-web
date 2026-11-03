// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { addUsers, migratedDatabase } from './pgSupabase'

/*
 * Acceptance of phase 6 on the real migrations: after delete_account() no row of the account is
 * left in any table, the login is gone, other accounts keep everything, and a device of the deleted
 * account that still holds a valid token cannot bring rows back. deleteAccount.live.test.ts repeats
 * this against the real Supabase project.
 */

const tables = [
  'profiles', 'exercises', 'blueprints', 'blueprint_exercises', 'workouts', 'workout_exercises',
  'set_logs', 'training_plans', 'body_weights', 'weight_rewards', 'workout_awards', 'sleep_scores', 'legacy_imports',
] as const

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const time = '2026-11-03T10:00:00.000Z'
const other = '11111111-1111-4111-8111-111111111111'

const columns: Record<(typeof tables)[number], string> = {
  profiles: `name, body_weight_unit, load_unit, distance_unit, body_weight_goal) values ($1, $2, '${time}', '${time}', 'A', 'kg', 'kg', 'km', 'maintain'`,
  exercises: `name, is_pr_tracked, equipment, muscle, measurement, guidance, track_progress) values ($1, $2, '${time}', '${time}', 'Squat', false, 'Barbell', 'Legs', 'Load & reps', '', true`,
  blueprints: `name) values ($1, $2, '${time}', '${time}', 'Push'`,
  blueprint_exercises: `blueprint_id, exercise_id, sort_order, target_sets, warm_up_sets) values ($1, $2, '${time}', '${time}', '${other}', '${other}', 0, 3, 0`,
  workouts: `name, performed_at, is_completed, is_freestyle, is_retrospective) values ($1, $2, '${time}', '${time}', 'Push', '${time}', true, false, false`,
  workout_exercises: `workout_id, exercise_name, measurement, is_history_only, is_removed, sort_order) values ($1, $2, '${time}', '${time}', '${other}', 'Squat', 'Load & reps', false, false, 0`,
  set_logs: `workout_id, workout_exercise_id, set_index, weight_kg, is_completed, is_warm_up, is_skipped, is_removed) values ($1, $2, '${time}', '${time}', '${other}', '${other}', 1, 100, true, false, false, false`,
  training_plans: `schedule) values ($1, $2, '${time}', '${time}', '{"mode":"rotation"}'`,
  body_weights: `day, recorded_at, kilograms) values ($1, $2, '${time}', '${time}', '2026-11-03', '${time}', 67`,
  weight_rewards: `day, awarded_at, earned_xp) values ($1, $2, '${time}', '${time}', '2026-11-03', '${time}', 25`,
  workout_awards: `workout_id, earned_xp) values ($1, $2, '${time}', '${time}', '${other}', 100`,
  sleep_scores: `day, score) values ($1, $2, '${time}', '${time}', '2026-11-03', 80`,
  legacy_imports: `fingerprint, file_name, source_format, exported_at, imported_at) values ($1, $2, '${time}', '${time}', 'abc', 'Motion-Backup.json', 'json', '${time}', '${time}'`,
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

const insert = (table: (typeof tables)[number], user: string, id = crypto.randomUUID()) =>
  as(user, () => pg.query(`insert into public.${table} (id, user_id, created_at, updated_at, ${columns[table]})`, [id, user]))

/** Counted as the database owner, past Row Level Security. */
const rowsOf = async (user: string) => {
  const counts: Record<string, number> = {}
  for (const table of tables) counts[table] = (await pg.query<{ n: number }>(`select count(*)::int as n from public.${table} where user_id = $1`, [user])).rows[0]!.n
  return counts
}
const exists = async (user: string) => (await pg.query('select 1 from auth.users where id = $1', [user])).rows.length === 1

beforeAll(async () => {
  pg = await migratedDatabase()
  await addUsers(pg, A, B)
  for (const table of tables) {
    await insert(table, A)
    await insert(table, A)
    await insert(table, B)
  }
}, 60_000)

describe('delete_account', () => {
  it('refuses visitors who are not signed in', async () => {
    await expect(as(null, () => pg.query('select public.delete_account()'))).rejects.toThrow(/permission denied/)
  })

  it('removes every row of the account and its login, and reports what it removed', async () => {
    expect(Object.values(await rowsOf(A)).every((count) => count === 2)).toBe(true)
    const result = await as(A, () => pg.query<{ counts: Record<string, number> }>('select public.delete_account() as counts'))
    expect(result.rows[0]!.counts).toEqual(Object.fromEntries(tables.map((table) => [table, 2])))
    expect(await rowsOf(A)).toEqual(Object.fromEntries(tables.map((table) => [table, 0])))
    expect(await exists(A)).toBe(false)
  })

  it('leaves other accounts untouched', async () => {
    expect(await rowsOf(B)).toEqual(Object.fromEntries(tables.map((table) => [table, 1])))
    expect(await exists(B)).toBe(true)
  })

  it.each(tables)('stops a device with a still valid token from writing %s for the deleted account', async (table) => {
    await expect(insert(table, A)).rejects.toThrow(/account deleted/)
    expect((await rowsOf(A))[table]).toBe(0)
  })
})
