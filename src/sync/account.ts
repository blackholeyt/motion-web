import type { User } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { MotionDatabase, db, setDatabase, syncedTables } from '../data/db'
import { live } from '../data/repo'
import { ensureProfile } from '../store/profile'
import { cloudConfigured, supabase } from './client'
import { pull, requestSync, startSync, stopSync } from './engine'
import { mergeGuest } from './merge'

/*
 * Which local database is active. The guest uses "motion-local"; each account has its own
 * "motion-<user id>", so after a logout the next person never sees someone else's training.
 *
 * The signed-in account is remembered in localStorage, not derived from the auth token: an expired
 * token while offline must never switch the app back to the guest database mid-workout.
 */

export interface Account {
  id: string
  email: string | null
}

interface AccountState {
  account: Account | null
  /** First login on a device whose guest database holds training: the user decides what happens to it. */
  guestDecision: Account | null
  /** A Google sign-in that came back with an error instead of a session. */
  signInError: string | null
}

const storageKey = 'motion.account.v1'
const guestName = 'motion-local'
export const accountDatabaseName = (id: string) => `motion-${id}`

let state: AccountState = { account: readStored(), guestDecision: null, signInError: null }
const listeners = new Set<() => void>()

function setState(change: Partial<AccountState>) {
  state = { ...state, ...change }
  listeners.forEach((listener) => listener())
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => state,
  )
}

function readStored(): Account | null {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored ? (JSON.parse(stored) as Account) : null
  } catch {
    return null
  }
}

function store(account: Account | null) {
  try {
    if (account) localStorage.setItem(storageKey, JSON.stringify(account))
    else localStorage.removeItem(storageKey)
  } catch {
    // Without storage the account lasts for this session; the auth session restores it next time.
  }
}

/** At launch, before anything reads the database. */
export function restoreAccount() {
  if (state.account) setDatabase(new MotionDatabase(accountDatabaseName(state.account.id)))
}

/** Follows the auth session: sign-in by e-mail code, by Google redirect, or a session restored at launch. */
export function startAccount() {
  if (!cloudConfigured) return
  takeRedirectError()
  if (state.account) startSync(db, state.account.id)
  supabase().auth.onAuthStateChange((event, session) => {
    // Supabase must not be called from inside this callback, so the work runs right after it.
    if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) setTimeout(() => void signedIn(session.user))
  })
}

/** Supabase reports a failed Google sign-in in the address; it is shown once and removed from the address. */
function takeRedirectError() {
  const query = new URLSearchParams(location.search)
  const description = query.get('error_description')
  if (!description) return
  setState({ signInError: description })
  history.replaceState(history.state, '', `${location.pathname}${location.hash}`)
}

export function dismissSignInError() {
  setState({ signInError: null })
}

const onboardingKey = (name: string) => `motion.onboarding.v1.${name}`

/** The introduction was completed on this device already; a new account database must not repeat it. */
function carryOnboarding(from: string, to: string) {
  try {
    const progress = localStorage.getItem(onboardingKey(from))
    if (progress && !localStorage.getItem(onboardingKey(to))) localStorage.setItem(onboardingKey(to), progress)
  } catch {
    // The introduction may show once more; nothing is lost.
  }
}

export async function hasGuestData(guest: MotionDatabase): Promise<boolean> {
  const counts = await Promise.all(
    syncedTables.filter((table) => table !== 'profiles').map((table) => guest.table(table).filter((record) => record.deleted_at === null).count()),
  )
  const profiles = live(await guest.profiles.toArray())
  return counts.some((count) => count > 0) || profiles.some((profile) => profile.updated_at !== new Date(0).toISOString())
}

async function signedIn(user: User) {
  const account: Account = { id: user.id, email: user.email ?? null }
  if (state.account?.id === account.id) return void requestSync()
  // Signing in again with another account after the session expired: the previous one is closed first.
  if (state.account) await closeAccount()
  if (state.guestDecision || db.name !== guestName) return
  if (await hasGuestData(db)) setState({ guestDecision: account })
  else await activate(account, false)
}

/** Answer to the first-login question: take the guest's training into the account or leave it on the device. */
export async function decideGuestData(take: boolean) {
  const account = state.guestDecision
  if (!account) return
  await activate(account, take)
  setState({ guestDecision: null })
}

async function activate(account: Account, takeGuestData: boolean) {
  const guest = db
  const database = new MotionDatabase(accountDatabaseName(account.id))
  await database.open()
  if (takeGuestData) {
    // The cloud first, so records the account already has are compared against the guest's.
    try {
      await pull(database)
    } catch {
      // Offline: the comparison happens on the server instead (last change wins).
    }
    await mergeGuest(guest, database, syncedTables)
    await guest.transaction('rw', [...syncedTables.map((table) => guest.table(table)), guest.outbox], async () => {
      await Promise.all([...syncedTables, 'outbox' as const].map((table) => guest.table(table).clear()))
    })
  }
  carryOnboarding(guest.name, database.name)
  store(account)
  setDatabase(database)
  setState({ account })
  await ensureProfile()
  startSync(database, account.id)
}

/** Ends the session on this device. The account's database stays here for the next login but is closed. */
export async function signOut() {
  try {
    await supabase().auth.signOut({ scope: 'local' })
  } catch {
    // Offline: the local session is removed anyway.
  }
  await closeAccount()
}

async function closeAccount() {
  stopSync()
  const previous = db
  store(null)
  setDatabase(new MotionDatabase(guestName))
  setState({ account: null, guestDecision: null, signInError: null })
  previous.close()
  await ensureProfile()
}

export async function unsyncedChanges(): Promise<number> {
  return state.account ? db.outbox.count() : 0
}

/* Sign-in: a 6-digit code by e-mail (no magic link, which would open outside the installed app) or Google. */

export async function sendCode(email: string) {
  const { error } = await supabase().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
  if (error) throw error
}

export async function verifyCode(email: string, code: string) {
  const { error } = await supabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
  if (error) throw error
}

export async function signInWithGoogle() {
  const { error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}${location.pathname}` },
  })
  if (error) throw error
}
