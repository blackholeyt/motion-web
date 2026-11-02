import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { stableID } from '../data/ids'
import { enqueue, stamp, update } from '../data/repo'
import type { Preferences, Profile } from '../data/types'

export const defaultPreferences: Preferences = {
  quietMode: false,
  bodyWeightTrackingVisible: true,
  haptics: true,
  trackReps: true,
  restTimerSeconds: 90,
  restNotifications: false,
}

/** The internal profile the iOS app creates when onboarding is skipped: "Motion", kg, km. */
export async function ensureProfile(): Promise<Profile> {
  const existing = (await db.profiles.toArray()).find((profile) => profile.deleted_at === null)
  if (existing) return existing
  // Dated to the epoch so that any profile the account already has in the cloud wins the first sync.
  const profile: Profile = {
    ...stamp<Profile>({
      id: stableID('profiles'),
      name: 'Motion',
      body_weight_unit: 'kg',
      load_unit: 'kg',
      distance_unit: 'km',
      target_weight_kg: null,
      celebrated_weight_goals: [],
      body_weight_goal: 'maintain',
      preferences: defaultPreferences,
    }),
    created_at: epoch,
    updated_at: epoch,
  }
  await db.profiles.put(profile)
  await enqueue('profiles', [profile.id])
  return profile
}

const epoch = new Date(0).toISOString()

export async function currentProfile(): Promise<Profile> {
  return ensureProfile()
}

export function useProfile(): Profile | undefined {
  return useLiveQuery(async () => (await db.profiles.toArray()).find((profile) => profile.deleted_at === null))
}

/** Preferences with defaults while the profile loads. */
export function usePreferences(): Preferences {
  const profile = useProfile()
  return { ...defaultPreferences, ...profile?.preferences }
}

export async function updateProfile(change: Partial<Profile>) {
  const profile = await ensureProfile()
  await update<Profile>('profiles', profile.id, change)
}

export async function updatePreferences(change: Partial<Preferences>) {
  const profile = await ensureProfile()
  await update<Profile>('profiles', profile.id, { preferences: { ...defaultPreferences, ...profile.preferences, ...change } })
}
