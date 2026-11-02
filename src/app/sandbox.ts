import { useSyncExternalStore } from 'react'
import { MotionDatabase, db, setDatabase } from '../data/db'
import { forgetOnboarding } from '../features/onboarding/state'

/*
 * DemoSession.swift / OnboardingTestView.swift: a disposable IndexedDB, never a second view of
 * the personal database. Leaving deletes it and restores the personal database.
 */

export type SandboxKind = 'demo' | 'onboardingTest'
interface Sandbox {
  kind: SandboxKind
  database: MotionDatabase
  personal: MotionDatabase
}

let current: Sandbox | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

export async function enterSandbox(kind: SandboxKind, seed?: () => Promise<void>) {
  if (current) return
  const personal = db
  const database = new MotionDatabase(`motion-${kind}-${crypto.randomUUID()}`)
  await database.open()
  setDatabase(database)
  try {
    await seed?.()
  } catch (error) {
    setDatabase(personal)
    await database.delete()
    throw error
  }
  current = { kind, database, personal }
  notify()
}

export async function exitSandbox() {
  if (!current) return
  const { database, personal } = current
  setDatabase(personal)
  current = null
  notify()
  forgetOnboarding(database.name)
  database.close()
  await database.delete()
}

/** Leftovers from a closed tab are removed on the next launch. */
export async function removeStaleSandboxes() {
  if (!('databases' in indexedDB)) return
  const names = (await indexedDB.databases()).map((info) => info.name ?? '').filter((name) => /^motion-(demo|onboardingTest)-/.test(name))
  await Promise.all(names.map((name) => MotionDatabase.delete(name).then(() => forgetOnboarding(name))))
}

const read = () => current
export function useSandbox() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    read,
  )
}
