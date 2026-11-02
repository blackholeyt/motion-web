import { db } from '../data/db'
import { live } from '../data/repo'
import { freshDatabase } from '../test/db'
import { checkIn, correctWeight, deleteWeight, saveSleepScore } from './body'
import { updateProfile } from './profile'
import { totalXP } from './progress'

describe('body weight and sleep', () => {
  beforeEach(freshDatabase)

  it('awards 25 XP once per day, replaces the day’s weight and keeps the award on delete', async () => {
    const morning = new Date('2026-11-02T07:00:00')
    expect((await checkIn(72, morning)).earnedXP).toBe(25)
    expect((await checkIn(71.5, new Date('2026-11-02T20:00:00'))).earnedXP).toBe(0)
    const entries = live(await db.body_weights.toArray())
    expect(entries).toHaveLength(1)
    expect(entries[0]!.kilograms).toBe(71.5)
    expect((await correctWeight(entries[0]!, 71)).earnedXP).toBe(0)
    await deleteWeight(entries[0]!)
    expect(await totalXP()).toBe(25)
    expect((await checkIn(72, morning)).earnedXP).toBe(0)
  })

  it('celebrates a reached weight goal once, never in quiet mode', async () => {
    await updateProfile({ target_weight_kg: 70, body_weight_goal: 'lose' })
    expect((await checkIn(69.5, new Date('2026-11-01T07:00:00'))).achievedTarget).toBe(70)
    expect((await checkIn(69, new Date('2026-11-02T07:00:00'))).achievedTarget).toBeNull()
    await updateProfile({ target_weight_kg: 68 })
    const profile = (await db.profiles.toArray())[0]!
    await updateProfile({ preferences: { ...profile.preferences, quietMode: true } })
    expect((await checkIn(67, new Date('2026-11-03T07:00:00'))).achievedTarget).toBeNull()
  })

  it('stores one sleep score per day and rejects future dates', async () => {
    const now = new Date('2026-11-02T09:00:00')
    await saveSleepScore(80, new Date('2026-11-01T12:00:00'), now)
    await saveSleepScore(84, new Date('2026-11-01T23:00:00'), now)
    expect(live(await db.sleep_scores.toArray()).map((entry) => entry.score)).toEqual([84])
    await expect(saveSleepScore(70, new Date('2026-11-03T08:00:00'), now)).rejects.toThrow('past or current date')
    await saveSleepScore(null, new Date('2026-11-01T12:00:00'), now)
    expect(live(await db.sleep_scores.toArray())).toEqual([])
  })
})
