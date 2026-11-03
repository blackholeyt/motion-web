import { withDistance, withSeconds, newCardioDraft } from '../domain/cardio'
import { newSchedule } from '../domain/schedule'
import { freshDatabase } from '../test/db'
import { createCardioBlueprint, finishCardio } from './cardio'
import { currentPlan, savePlan } from './plan'
import { totalXP } from './progress'
import { db } from '../data/db'

const run = () => withDistance(withSeconds(newCardioDraft('km'), 1800), 5)

describe('cardio', () => {
  beforeEach(freshDatabase)

  it('saves a session with 100 XP exactly once', async () => {
    const { award, workout } = await finishCardio(run(), { now: new Date('2026-11-02T10:00:00') })
    expect(award.total).toBe(100)
    expect(workout).toMatchObject({ cardio_type: 'Running', cardio_seconds: 1800, cardio_distance_km: 5, cardio_pace_s_per_km: 360, is_completed: true })
    expect(await totalXP()).toBe(100)
    expect(await db.workout_awards.count()).toBe(1)
  })

  it('returns the calendar weeks including the new session', async () => {
    await finishCardio(run(), { now: new Date('2026-10-28T10:00:00') })
    const { weeks } = await finishCardio(run(), { now: new Date('2026-11-02T10:00:00') })
    expect(weeks).toHaveLength(6)
    expect(weeks.at(-1)).toMatchObject({ isCurrent: true, workouts: 1 })
    expect(weeks.at(-2)!.workouts).toBe(1)
  })

  it('rejects invalid input', async () => {
    await expect(finishCardio({ ...run(), pace: '4:00' })).rejects.toThrow('Pace must match')
  })

  it('matches a same-day cardio session to the due rotation slot once', async () => {
    const blueprint = await createCardioBlueprint('Easy run', run())
    await savePlan({ ...newSchedule(new Date('2026-11-01')), enabled: true, entries: [{ id: 'a', blueprintID: blueprint.id }, { id: 'b', blueprintID: blueprint.id }] })
    const now = new Date('2026-11-02T18:00:00')
    await finishCardio(run(), { now })
    expect((await currentPlan())!.schedule.cursor).toBe(1)
    await finishCardio(run(), { now })
    expect((await currentPlan())!.schedule.cursor).toBe(1)
    await finishCardio({ ...run(), activity: 'Walking' }, { now: new Date('2026-11-03T18:00:00') })
    expect((await currentPlan())!.schedule.cursor).toBe(1)
  })
})
