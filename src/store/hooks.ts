import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { live } from '../data/repo'
import type { HapticEvent } from '../platform'
import { platform } from '../platform'
import { allBlueprints, entriesFor } from './blueprints'
import { libraryExercises } from './library'
import { currentPlan } from './plan'
import { usePreferences } from './profile'

export const useBlueprints = () => useLiveQuery(allBlueprints, [])
export const useBlueprint = (id: string | undefined) => useLiveQuery(async () => (id ? db.blueprints.get(id) : undefined), [id])
export const useEntries = (id: string | undefined) => useLiveQuery(async () => (id ? entriesFor(id) : []), [id])
export const useLibrary = () => useLiveQuery(libraryExercises, [])
export const usePlan = () => useLiveQuery(currentPlan, [])

export const useDrafts = () =>
  useLiveQuery(async () =>
    live(await db.workouts.toArray())
      .filter((workout) => !workout.is_completed)
      .sort((a, b) => (b.draft_updated_at ?? b.performed_at).localeCompare(a.draft_updated_at ?? a.performed_at)),
  )

export const useCompletedWorkouts = () =>
  useLiveQuery(async () =>
    live(await db.workouts.orderBy('performed_at').reverse().toArray()).filter((workout) => workout.is_completed),
  )

/** Haptics respecting the "App Haptics" preference (MotionHaptics.swift). */
export function useHaptics() {
  const preferences = usePreferences()
  return (event: HapticEvent) => {
    if (preferences.haptics) platform.haptics.play(event)
  }
}
