import { useSyncExternalStore } from 'react'

/*
 * Consent given on this device (docs/DATENSCHUTZ.md, section 2). First start: the privacy policy
 * and the processing of health data on this device. Signing in: the backup in the cloud, which is
 * also recorded with the login (sync/account.ts, recordCloudConsent).
 *
 * Raising consentVersion after a material change of the privacy policy asks everyone again.
 */

export const consentVersion = 1

export interface Consent {
  version: number
  accepted_at: string
  cloud_accepted_at: string | null
}

const key = 'motion.consent.v1'
const listeners = new Set<() => void>()
let current = read()

function read(): Consent | null {
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as Consent) : null
  } catch {
    return null
  }
}

function write(next: Consent | null) {
  current = next
  try {
    if (next) localStorage.setItem(key, JSON.stringify(next))
    else localStorage.removeItem(key)
  } catch {
    // Private browsing can refuse storage; the consent then lasts for this session.
  }
  listeners.forEach((listener) => listener())
}

export const getConsent = () => current

/** True while the current version has not been accepted on this device. */
export const needsConsent = (consent: Consent | null) => !consent || consent.version < consentVersion

export function acceptConsent({ cloud }: { cloud: boolean }, now = new Date()) {
  const time = now.toISOString()
  write({ version: consentVersion, accepted_at: time, cloud_accepted_at: cloud ? time : (current?.cloud_accepted_at ?? null) })
}

export function acceptCloudConsent(now = new Date()) {
  if (!current) return
  write({ ...current, cloud_accepted_at: now.toISOString() })
}

/** After the account was deleted: the cloud consent ends with it. */
export function clearCloudConsent() {
  if (current) write({ ...current, cloud_accepted_at: null })
}

/** Withdrawal together with deleting the data on this device. */
export function resetConsent() {
  write(null)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribe, getConsent, getConsent)
}
