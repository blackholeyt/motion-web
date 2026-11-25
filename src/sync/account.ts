import type { User } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { MotionDatabase, db, setDatabase, syncedTables } from '../data/db'
import { live } from '../data/repo'
import { ensureProfile } from '../store/profile'
import { cloudConfigured, supabase } from './client'
import { pull, requestSync, startSync, stopSync } from './engine'
import { mergeGuest } from './merge'
import { forgetOnboarding } from '../features/onboarding/state'
import { clearCloudConsent, getConsent, resetConsent } from '../privacy/consent'

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
  /** A login that has not redeemed the access code yet (docs/DATENSCHUTZ.md, section 5). Nothing syncs until it does. */
  accessNeeded: Account | null
}

const storageKey = 'motion.account.v1'
const guestName = 'motion-local'
export const accountDatabaseName = (id: string) => `motion-${id}`

let state: AccountState = { account: readStored(), guestDecision: null, signInError: null, accessNeeded: null }
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
  if (state.account) {
    startSync(db, state.account.id)
    void verifyAccess(state.account)
  }
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
  if (state.guestDecision || state.accessNeeded || db.name !== guestName) return
  if (!(await accessOrRetry())) return setState({ accessNeeded: account })
  await continueSignIn(account)
}

async function continueSignIn(account: Account) {
  if (await hasGuestData(db)) setState({ guestDecision: account })
  else await activate(account, false)
}

/** Whether the signed-in account redeemed the access code. Throws when the server cannot be asked. */
export async function hasAccess(): Promise<boolean> {
  const { data, error } = await supabase().rpc('has_access')
  if (error) throw error
  return data === true
}

/**
 * Right after a sign-in the answer should come; one retry covers a short network hiccup. If the server
 * still cannot be asked, the access code prompt shows: for an unlocked account any input passes there.
 */
async function accessOrRetry(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await hasAccess()
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }
  return false
}

/** An account signed in on this device before the access code existed and never unlocked: sync stops until it is. */
async function verifyAccess(account: Account) {
  try {
    if (await hasAccess()) return
  } catch {
    // Offline or the session is not restored yet: nothing to decide now.
    return
  }
  if (state.account?.id !== account.id) return
  stopSync()
  setState({ accessNeeded: account })
}

export type AccessCodeResult = 'ok' | 'wrong' | 'locked'

/** Redeems the access code for the waiting login; on success the sign-in continues where it stopped. */
export async function redeemAccessCode(code: string): Promise<AccessCodeResult> {
  const account = state.accessNeeded
  if (!account) throw new Error('Not signed in.')
  const { data, error } = await supabase().rpc('redeem_access_code', { code })
  if (error) throw error
  const result = data as AccessCodeResult
  if (result !== 'ok') return result
  setState({ accessNeeded: null })
  if (state.account?.id === account.id) startSync(db, account.id)
  else await continueSignIn(account)
  return result
}

/** Gives up on the access code: the login is signed out on this device. */
export async function cancelAccessCode() {
  const activated = state.account !== null
  setState({ accessNeeded: null })
  if (activated) return signOut()
  try {
    await supabase().auth.signOut({ scope: 'local' })
  } catch {
    // Offline: the local session is removed anyway.
  }
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
  void recordCloudConsent()
}

/**
 * The consent to the cloud (given in the sign-in sheet or at first start) is also kept with the
 * login itself, in the user metadata of auth.users, so it is provable and leaves with the account.
 */
export async function recordCloudConsent() {
  const consent = getConsent()
  if (!consent?.cloud_accepted_at) return
  try {
    const { data } = await supabase().auth.getUser()
    const stored = data.user?.user_metadata?.privacy_consent as { version?: number } | undefined
    if (stored?.version === consent.version) return
    await supabase().auth.updateUser({ data: { privacy_consent: { version: consent.version, accepted_at: consent.cloud_accepted_at } } })
  } catch {
    // Offline: recorded at the next sign-in on this device.
  }
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
  setState({ account: null, guestDecision: null, signInError: null, accessNeeded: null })
  previous.close()
  await ensureProfile()
}

/**
 * Deletes the account in the cloud (delete_account removes every row and the login) and then its
 * database on this device. The guest data of this device is not the account's and stays.
 * Returns how many cloud rows were removed per table.
 */
export async function deleteAccount(): Promise<Record<string, number>> {
  const account = state.account
  if (!account) throw new Error('Not signed in.')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('You are offline. Connect to the internet to delete your account.')
  const { data: session } = await supabase().auth.getSession()
  if (session.session?.user.id !== account.id) throw new Error('Your session has expired. Sign in again, then delete your account.')
  // No upload may run while the rows disappear; the server refuses them anyway (account deleted).
  stopSync()
  const { data, error } = await supabase().rpc('delete_account')
  if (error) {
    startSync(db, account.id)
    throw error
  }
  await removeAccountFromDevice()
  return (data ?? {}) as Record<string, number>
}

/** Closes and deletes the account's database here, also when the account was deleted on another device. */
export async function removeAccountFromDevice() {
  const previous = db
  try {
    await supabase().auth.signOut({ scope: 'local' })
  } catch {
    // The login no longer exists; the local session is removed anyway.
  }
  await closeAccount()
  clearCloudConsent()
  forgetOnboarding(previous.name)
  await previous.delete()
}

/**
 * Without an account: deletes all training, body weight and settings on this device
 * and withdraws the consent, so Motion starts over with the consent screen.
 */
export async function deleteDeviceData() {
  if (state.account) throw new Error('Delete your account instead.')
  // Emptied in place instead of deleted, so no open screen reads a closed database meanwhile.
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
  forgetOnboarding(db.name)
  resetConsent()
  await ensureProfile()
}

export async function unsyncedChanges(): Promise<number> {
  return state.account ? db.outbox.count() : 0
}

/*
 * Sign-in: a 6-digit code by e-mail (no magic link, which would open outside the installed app) or Google.
 * Sign-up is open (decision of 24.11.2026): the first code or Google sign-in creates the account.
 */

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
