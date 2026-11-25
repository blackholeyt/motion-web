// @vitest-environment node
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { addUsers, addUsersWithoutAccess, migratedDatabase } from './pgSupabase'

/*
 * The access code on the real migrations: a login without the code gets nothing from any table,
 * the right code unlocks it once, wrong codes lock after ten tries, the code itself is out of reach
 * for the signed-in role, and the unlock leaves with the account.
 */

const tables = [
  'profiles', 'exercises', 'blueprints', 'blueprint_exercises', 'workouts', 'workout_exercises',
  'set_logs', 'training_plans', 'body_weights', 'weight_rewards', 'workout_awards', 'sleep_scores', 'legacy_imports',
] as const

const existing = '00000000-0000-4000-8000-0000000000e1'
const unlocked = '00000000-0000-4000-8000-0000000000a1'
const stranger = '00000000-0000-4000-8000-0000000000b1'
const friend = '00000000-0000-4000-8000-0000000000c1'
const guesser = '00000000-0000-4000-8000-0000000000d1'
const time = '2026-11-25T10:00:00.000Z'

let pg: PGlite

async function as<T>(user: string | null, work: () => Promise<T>): Promise<T> {
  await pg.exec(user ? `set role authenticated; set request.jwt.claims = '{"sub":"${user}","role":"authenticated"}'` : `set role anon; set request.jwt.claims = '{"role":"anon"}'`)
  try {
    return await work()
  } finally {
    await pg.exec('reset role; reset request.jwt.claims')
  }
}

const redeem = (user: string, code: string) => as(user, () => pg.query<{ r: string }>('select public.redeem_access_code($1) as r', [code])).then((result) => result.rows[0]!.r)
const hasAccess = (user: string) => as(user, () => pg.query<{ r: boolean }>('select public.has_access() as r')).then((result) => result.rows[0]!.r)
const insertBlueprint = (user: string) =>
  as(user, () => pg.query(`insert into public.blueprints (id, user_id, created_at, updated_at, name) values ($1, $2, '${time}', '${time}', 'Push')`, [crypto.randomUUID(), user]))

beforeAll(async () => {
  // `existing` had an account before the access code migration ran.
  pg = await migratedDatabase({ migration: 'access_code', run: (db) => addUsersWithoutAccess(db, existing) })
  await addUsers(pg, unlocked)
  await addUsersWithoutAccess(pg, stranger, friend, guesser)
  await insertBlueprint(unlocked)
  await pg.query("select private.set_access_code('Bank Drücken 24')")
}, 60_000)

describe('access code', () => {
  it('gives a login without the code nothing to read and nothing to write', async () => {
    expect(await hasAccess(stranger)).toBe(false)
    for (const table of tables) {
      expect((await as(stranger, () => pg.query<{ n: number }>(`select count(*)::int as n from public.${table}`))).rows[0]!.n).toBe(0)
    }
    await expect(insertBlueprint(stranger)).rejects.toThrow(/row-level security/)
  })

  it('keeps the code and its hash out of reach of signed-in accounts', async () => {
    await expect(as(stranger, () => pg.query('select * from private.access_code'))).rejects.toThrow(/permission denied/)
    await expect(as(stranger, () => pg.query("select private.set_access_code('my-own-code')"))).rejects.toThrow(/permission denied/)
    await expect(as(stranger, () => pg.query('insert into public.access_grants (user_id) values ($1)', [stranger]))).rejects.toThrow(/permission denied/)
    await expect(as(null, () => pg.query("select public.redeem_access_code('Bank Drücken 24')"))).rejects.toThrow(/permission denied/)
  })

  it('stores only a salted hash and refuses codes shorter than six characters', async () => {
    const stored = await pg.query<{ salt: string; code_hash: string }>('select salt, code_hash from private.access_code')
    expect(stored.rows).toHaveLength(1)
    expect(stored.rows[0]!.code_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(stored.rows[0]!.code_hash).not.toContain('Bank')
    await expect(pg.query("select private.set_access_code('abc')")).rejects.toThrow(/at least 6 characters/)
  })

  it('unlocks an account with the right code, ignoring case and surrounding spaces', async () => {
    expect(await redeem(friend, 'bank drücken')).toBe('wrong')
    expect(await hasAccess(friend)).toBe(false)
    expect(await redeem(friend, '  BANK DRÜCKEN 24 ')).toBe('ok')
    expect(await hasAccess(friend)).toBe(true)
    await insertBlueprint(friend)
    expect((await as(friend, () => pg.query<{ n: number }>('select count(*)::int as n from public.blueprints'))).rows[0]!.n).toBe(1)
    expect(await redeem(friend, 'anything')).toBe('ok')
  })

  it('locks an account after ten wrong codes, even for the right one', async () => {
    for (let attempt = 1; attempt <= 10; attempt++) expect(await redeem(guesser, `guess-${attempt}`)).toBe('wrong')
    expect(await redeem(guesser, 'Bank Drücken 24')).toBe('locked')
    expect(await hasAccess(guesser)).toBe(false)
  })

  it('keeps every account that existed before the code unlocked', async () => {
    expect(await hasAccess(existing)).toBe(true)
    await insertBlueprint(existing)
    expect((await as(existing, () => pg.query<{ n: number }>('select count(*)::int as n from public.blueprints'))).rows[0]!.n).toBe(1)
    expect((await as(unlocked, () => pg.query<{ n: number }>('select count(*)::int as n from public.blueprints'))).rows[0]!.n).toBe(1)
  })

  it('removes the unlock together with the account', async () => {
    await as(friend, () => pg.query('select public.delete_account()'))
    expect((await pg.query('select 1 from public.access_grants where user_id = $1', [friend])).rows).toHaveLength(0)
  })
})
