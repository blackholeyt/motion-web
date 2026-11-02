import { useSyncExternalStore } from 'react'
import { db } from '../../data/db'
import { live } from '../../data/repo'

/*
 * OnboardingState.swift: device-local navigation and tips, intentionally absent from backups.
 * Stored per database, so the demo and the onboarding test never touch personal progress.
 */

export type OnboardingStatus = 'notStarted' | 'inProgress' | 'completed' | 'skipped' | 'legacyCompleted'
export type OnboardingIntent = 'template' | 'ownRoutine' | 'freestyle'

export interface OnboardingProgress {
  version: 1
  status: OnboardingStatus
  profileStepDone: boolean
  intent: OnboardingIntent | null
  equipment: string
  minutes: number
  confirmedPlan: string | null
  routineID: string | null
  manualName: string
  firstSetTipDone: boolean
  previousValuesTipDone: boolean
  savedWorkoutTipDone: boolean
}

export const needsIntroduction = (progress: OnboardingProgress) => progress.status === 'notStarted' || progress.status === 'inProgress'

const fresh = (): OnboardingProgress => ({
  version: 1,
  status: 'notStarted',
  profileStepDone: false,
  intent: null,
  equipment: 'Machines & cables',
  minutes: 20,
  confirmedPlan: null,
  routineID: null,
  manualName: '',
  firstSetTipDone: false,
  previousValuesTipDone: false,
  savedWorkoutTipDone: false,
})

const storageKey = () => `motion.onboarding.v1.${db.name}`
const listeners = new Set<() => void>()
const cache = new Map<string, OnboardingProgress | null>()

function read(): OnboardingProgress | null {
  const key = storageKey()
  if (!cache.has(key)) {
    try {
      const stored = localStorage.getItem(key)
      cache.set(key, stored ? { ...fresh(), ...(JSON.parse(stored) as Partial<OnboardingProgress>) } : null)
    } catch {
      cache.set(key, null)
    }
  }
  return cache.get(key) ?? null
}

function write(progress: OnboardingProgress) {
  const key = storageKey()
  cache.set(key, progress)
  try {
    localStorage.setItem(key, JSON.stringify(progress))
  } catch {
    // Storage can be refused in private browsing; progress then lasts for this session.
  }
  listeners.forEach((listener) => listener())
}

export function forgetOnboarding(databaseName: string) {
  const key = `motion.onboarding.v1.${databaseName}`
  cache.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing to clean up.
  }
}

/**
 * OnboardingCoordinator.load: existing training data means the introduction was never needed
 * (the app was used before onboarding existed), so its tips are already done too.
 */
export async function loadOnboarding(): Promise<OnboardingProgress> {
  const stored = read()
  if (stored) return stored
  const counts = await Promise.all([db.workouts, db.blueprints, db.exercises, db.body_weights, db.weight_rewards, db.workout_awards].map((table) => table.count()))
  const named = live(await db.profiles.toArray()).some((profile) => profile.name !== 'Motion')
  const progress = fresh()
  if (named || counts.some((count) => count > 0)) {
    Object.assign(progress, { status: 'legacyCompleted', profileStepDone: true, firstSetTipDone: true, savedWorkoutTipDone: true })
  }
  write(progress)
  return progress
}

export function updateOnboarding(change: Partial<OnboardingProgress>) {
  write({ ...(read() ?? fresh()), ...change })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** null until loadOnboarding has run for the active database. */
export function useOnboarding(): OnboardingProgress | null {
  return useSyncExternalStore(subscribe, read, read)
}
