import { db } from '../data/db'
import { freshDatabase } from '../test/db'
import { ensureProfile, updatePreferences, updateProfile } from './profile'

describe('preferences', () => {
  beforeEach(freshDatabase)

  it('drops settings the app no longer has on the next change', async () => {
    const profile = await ensureProfile()
    await updateProfile({ preferences: { ...profile.preferences, removedSetting: true } as typeof profile.preferences })
    await updatePreferences({ restTimerSeconds: 120 })
    const preferences = (await db.profiles.get(profile.id))!.preferences
    expect(preferences.restTimerSeconds).toBe(120)
    expect(preferences).not.toHaveProperty('removedSetting')
  })
})
