import { isoWeek, trainingWeeks } from './statistics'

describe('dashboard statistics', () => {
  it('counts six Monday–Sunday weeks ending with this week', () => {
    const now = new Date(2026, 10, 4, 12) // Wednesday 4 Nov 2026
    const weeks = trainingWeeks([new Date(2026, 10, 2, 8).toISOString(), new Date(2026, 10, 1, 20).toISOString(), new Date(2026, 9, 1).toISOString()], now)
    expect(weeks).toHaveLength(6)
    expect(weeks.at(-1)).toMatchObject({ workouts: 1, isCurrent: true, number: 45 })
    expect(weeks.at(-2)!.workouts).toBe(1)
    expect(weeks[0]!.start.getDay()).toBe(1)
  })

  it('counts every workout in a busy week and ignores the future', () => {
    const now = new Date(2026, 10, 4, 12)
    const times = Array.from({ length: 12 }, () => new Date(now.getTime() - 1000).toISOString())
    expect(trainingWeeks([...times, new Date(2026, 10, 5).toISOString()], now).at(-1)!.workouts).toBe(12)
  })

  it('uses ISO week numbers', () => {
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1)
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53)
  })
})
