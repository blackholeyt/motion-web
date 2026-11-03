import { db } from '../data/db'
import { checkIn } from '../store/body'
import { deleteDeviceData } from '../sync/account'
import { freshDatabase } from '../test/db'
import { acceptCloudConsent, acceptConsent, clearCloudConsent, consentVersion, getConsent, needsConsent } from './consent'

describe('consent and deleting the data on this device', () => {
  beforeEach(freshDatabase)

  it('records the consent with its version and the cloud consent separately', () => {
    expect(needsConsent(null)).toBe(true)
    acceptConsent({ cloud: false }, new Date('2026-11-03T09:00:00Z'))
    expect(getConsent()).toEqual({ version: consentVersion, accepted_at: '2026-11-03T09:00:00.000Z', cloud_accepted_at: null })
    expect(needsConsent(getConsent())).toBe(false)
    acceptCloudConsent(new Date('2026-11-03T10:00:00Z'))
    expect(getConsent()?.cloud_accepted_at).toBe('2026-11-03T10:00:00.000Z')
    clearCloudConsent()
    expect(getConsent()?.cloud_accepted_at).toBeNull()
    expect(needsConsent({ version: consentVersion - 1, accepted_at: '', cloud_accepted_at: null })).toBe(true)
  })

  it('empties every table and withdraws the consent', async () => {
    acceptConsent({ cloud: false })
    await checkIn(70)
    expect(await db.body_weights.count()).toBe(1)
    await deleteDeviceData()
    expect(await db.body_weights.count()).toBe(0)
    expect(await db.weight_rewards.count()).toBe(0)
    // Only the fresh default profile is left.
    expect((await db.outbox.toArray()).map((entry) => entry.table)).toEqual(['profiles'])
    expect(getConsent()).toBeNull()
    expect(localStorage.getItem('motion.consent.v1')).toBeNull()
  })
})
