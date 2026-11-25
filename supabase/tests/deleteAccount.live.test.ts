// @vitest-environment node
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/*
 * Acceptance of phase 6 against the real Supabase project. Run with `npm run test:delete-live`
 * after filling .env.test.local (see .env.example). It creates a temporary account and a second one
 * as a bystander, fills every table, deletes the first account through delete_account() exactly as
 * the app does, and then checks with the secret key that no row of that account is left anywhere
 * and that its login is gone. The bystander's rows must survive. Both accounts are removed at the end.
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

const time = '2026-11-03T10:00:00.000Z'
const other = '11111111-1111-4111-8111-111111111111'
const columns: Record<(typeof tables)[number], Record<string, unknown>> = {
  profiles: { name: 'Delete test', body_weight_unit: 'kg', load_unit: 'kg', distance_unit: 'km', body_weight_goal: 'maintain', celebrated_weight_goals: [], preferences: {} },
  exercises: { name: 'Squat', is_pr_tracked: false, equipment: 'Barbell', muscle: 'Legs', measurement: 'Load & reps', guidance: '', track_progress: true },
  blueprints: { name: 'Push' },
  blueprint_exercises: { blueprint_id: other, exercise_id: other, sort_order: 0, target_sets: 3, warm_up_sets: 0 },
  workouts: { name: 'Push', performed_at: time, is_completed: true, is_freestyle: false, is_retrospective: false },
  workout_exercises: { workout_id: other, exercise_name: 'Squat', measurement: 'Load & reps', is_history_only: false, is_removed: false, sort_order: 0 },
  set_logs: { workout_id: other, workout_exercise_id: other, set_index: 1, weight_kg: 100, is_completed: true, is_warm_up: false, is_skipped: false, is_removed: false },
  training_plans: { schedule: { mode: 'rotation' } },
  body_weights: { day: '2026-11-03', recorded_at: time, kilograms: 67 },
  weight_rewards: { day: '2026-11-03', awarded_at: time, earned_xp: 25 },
  workout_awards: { workout_id: other, earned_xp: 100 },
  sleep_scores: { day: '2026-11-03', score: 80 },
  legacy_imports: { fingerprint: 'abc', file_name: 'Motion-Backup.json', source_format: 'json', exported_at: time, imported_at: time, counts: {} },
}

const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
let admin: SupabaseClient
const accounts: { id: string; client: SupabaseClient }[] = []

async function temporaryAccount(label: string) {
  const email = `motion-delete-${label}-${crypto.randomUUID().slice(0, 8)}@example.com`
  const created = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (created.error) throw created.error
  // Temporary accounts skip the access code; the secret key may unlock them directly.
  const unlocked = await admin.from('access_grants').insert({ user_id: created.data.user.id })
  if (unlocked.error) throw unlocked.error
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (link.error) throw link.error
  const client = createClient(url!, publishable!, { auth })
  const signedIn = await client.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'magiclink' })
  if (signedIn.error) throw signedIn.error
  const account = { id: created.data.user.id, client }
  accounts.push(account)
  for (const table of tables) {
    const { error } = await client.from(table).insert({ id: crypto.randomUUID(), user_id: account.id, created_at: time, updated_at: time, ...columns[table] })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  return account
}

const rowsOf = async (user: string) => {
  const counts: Record<string, number> = {}
  for (const table of tables) {
    const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true }).eq('user_id', user)
    if (error) throw new Error(`${table}: ${error.message}`)
    counts[table] = count ?? -1
  }
  return counts
}

describe.skipIf(!configured)('deleting an account in the Supabase project', () => {
  let doomed: { id: string; client: SupabaseClient }
  let bystander: { id: string; client: SupabaseClient }

  beforeAll(async () => {
    admin = createClient(url!, secret!, { auth })
    doomed = await temporaryAccount('a')
    bystander = await temporaryAccount('b')
  }, 60_000)

  afterAll(async () => {
    if (!admin) return
    const ids = accounts.map((account) => account.id)
    for (const table of tables) await admin.from(table).delete().in('user_id', ids)
    for (const id of ids) await admin.auth.admin.deleteUser(id).catch(() => undefined)
  }, 60_000)

  it('removes every row and the login of the account, and nothing of anyone else', async () => {
    expect(Object.values(await rowsOf(doomed.id)).every((count) => count === 1)).toBe(true)
    const { data, error } = await doomed.client.rpc('delete_account')
    expect(error).toBeNull()
    expect(data).toEqual(Object.fromEntries(tables.map((table) => [table, 1])))

    expect(await rowsOf(doomed.id)).toEqual(Object.fromEntries(tables.map((table) => [table, 0])))
    const login = await admin.auth.admin.getUserById(doomed.id)
    expect(login.data.user).toBeNull()
    expect(await rowsOf(bystander.id)).toEqual(Object.fromEntries(tables.map((table) => [table, 1])))
  })

  it('refuses uploads from the deleted account’s still valid token', async () => {
    const { error } = await doomed.client
      .from('workouts')
      .upsert({ id: crypto.randomUUID(), user_id: doomed.id, created_at: time, updated_at: time, ...columns.workouts }, { onConflict: 'user_id,id' })
    expect(error?.message).toMatch(/account deleted/)
    expect((await rowsOf(doomed.id)).workouts).toBe(0)
  })
})
