// @vitest-environment node
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/*
 * The two-account test against the real Supabase project (acceptance of phase 4).
 * Run with `npm run test:rls-live` after filling .env.test.local (see .env.example). It creates two
 * temporary users with the secret key, signs both in without sending e-mails, checks that account B
 * can neither read nor change nor delete account A's rows, and removes both users afterwards.
 * The secret key is only read here, on your computer; it never reaches the app or the repo.
 */

try {
  process.loadEnvFile('.env.test.local')
} catch {
  // Without the file the test is skipped.
}

const url = process.env.SUPABASE_URL
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY
const secret = process.env.SUPABASE_SECRET_KEY
const configured = Boolean(url && publishable && secret)

const tables = [
  'profiles', 'exercises', 'blueprints', 'blueprint_exercises', 'workouts', 'workout_exercises',
  'set_logs', 'training_plans', 'body_weights', 'weight_rewards', 'workout_awards', 'sleep_scores', 'legacy_imports',
] as const

const time = '2026-11-02T10:00:00.000Z'
const other = '11111111-1111-4111-8111-111111111111'
const columns: Record<(typeof tables)[number], Record<string, unknown>> = {
  profiles: { name: 'RLS test', body_weight_unit: 'kg', load_unit: 'kg', distance_unit: 'km', body_weight_goal: 'maintain', celebrated_weight_goals: [], preferences: {} },
  exercises: { name: 'Squat', is_pr_tracked: false, equipment: 'Barbell', muscle: 'Legs', measurement: 'Load & reps', guidance: '', track_progress: true },
  blueprints: { name: 'Push' },
  blueprint_exercises: { blueprint_id: other, exercise_id: other, sort_order: 0, target_sets: 3, warm_up_sets: 0 },
  workouts: { name: 'Push', performed_at: time, is_completed: true, is_freestyle: false, is_retrospective: false },
  workout_exercises: { workout_id: other, exercise_name: 'Squat', measurement: 'Load & reps', is_history_only: false, is_removed: false, sort_order: 0 },
  set_logs: { workout_id: other, workout_exercise_id: other, set_index: 1, weight_kg: 100, is_completed: true, is_warm_up: false, is_skipped: false, is_removed: false },
  training_plans: { schedule: { mode: 'rotation' } },
  body_weights: { day: '2026-11-02', recorded_at: time, kilograms: 67 },
  weight_rewards: { day: '2026-11-02', awarded_at: time, earned_xp: 25 },
  workout_awards: { workout_id: other, earned_xp: 100 },
  sleep_scores: { day: '2026-11-02', score: 80 },
  legacy_imports: { fingerprint: 'abc', file_name: 'Motion-Backup.json', source_format: 'json', exported_at: time, imported_at: time, counts: {} },
}
const idFor = (table: string) => `aaaaaaaa-0000-4000-8000-${String(tables.indexOf(table as never)).padStart(12, '0')}`

const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
let admin: SupabaseClient
const accounts: { id: string; client: SupabaseClient }[] = []

async function temporaryAccount(label: string) {
  const email = `motion-rls-${label}-${crypto.randomUUID().slice(0, 8)}@example.com`
  const created = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (created.error) throw created.error
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (link.error) throw link.error
  const client = createClient(url!, publishable!, { auth })
  const signedIn = await client.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'magiclink' })
  if (signedIn.error) throw signedIn.error
  const account = { id: created.data.user.id, client }
  accounts.push(account)
  return account
}

describe.skipIf(!configured)('row level security in the Supabase project', () => {
  let a: { id: string; client: SupabaseClient }
  let b: { id: string; client: SupabaseClient }

  beforeAll(async () => {
    admin = createClient(url!, secret!, { auth })
    a = await temporaryAccount('a')
    b = await temporaryAccount('b')
    for (const table of tables) {
      const { error } = await a.client.from(table).insert({ id: idFor(table), user_id: a.id, created_at: time, updated_at: time, ...columns[table] })
      if (error) throw new Error(`${table}: ${error.message}`)
    }
  }, 60_000)

  afterAll(async () => {
    if (!admin) return
    const ids = accounts.map((account) => account.id)
    for (const table of tables) await admin.from(table).delete().in('user_id', ids)
    for (const id of ids) await admin.auth.admin.deleteUser(id)
  }, 60_000)

  it.each(tables)('%s: A sees its row, B sees nothing and changes nothing', async (table) => {
    const own = await a.client.from(table).select('id')
    expect(own.data).toEqual([{ id: idFor(table) }])

    const read = await b.client.from(table).select('id').eq('user_id', a.id)
    expect(read.data).toEqual([])

    const changed = await b.client.from(table).update({ deleted_at: time, updated_at: '2027-01-01T00:00:00.000Z' }).eq('id', idFor(table)).select('id')
    expect(changed.data ?? []).toEqual([])
    const deleted = await b.client.from(table).delete().eq('id', idFor(table)).select('id')
    expect(deleted.data ?? []).toEqual([])

    const forged = await b.client
      .from(table)
      .upsert({ id: idFor(table), user_id: a.id, created_at: time, updated_at: '2027-01-01T00:00:00.000Z', ...columns[table] }, { onConflict: 'user_id,id' })
    expect(forged.error?.message).toMatch(/row-level security/)

    const stored = await admin.from(table).select('deleted_at, updated_at').eq('user_id', a.id).eq('id', idFor(table)).single()
    expect(stored.data?.deleted_at).toBeNull()
    expect(new Date(stored.data!.updated_at as string).toISOString()).toBe(time)
  })

  it('shows nothing to visitors who are not signed in', async () => {
    const visitor = createClient(url!, publishable!, { auth })
    for (const table of tables) {
      const { data } = await visitor.from(table).select('id')
      expect(data ?? []).toEqual([])
    }
  })
})
