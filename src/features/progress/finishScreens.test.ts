import type { WorkoutRecap } from '../../domain/progress'
import { xpAward } from '../../domain/progress'
import type { TrainingWeek } from '../../domain/statistics'
import { finishScreens, highlightsFor, showsWeek, visibleHighlights } from './finishScreens'

const recap = (overrides: Partial<WorkoutRecap> = {}): WorkoutRecap => ({
  name: 'Push', setCount: 6, warmUpCount: 1, improvements: [], records: [], repImprovements: [],
  comparableCount: 2, consistencyDays: null, improvedExerciseCount: 0, bonusExerciseCount: 0, ...overrides,
})
const week = (workouts: number, isCurrent = false): TrainingWeek => ({ start: new Date(), end: new Date(), number: 1, workouts, isCurrent })

describe('finish screens', () => {
  it('skips screens without content', () => {
    expect(finishScreens({ award: null, recap: recap(), weeks: [week(1, true)] })).toEqual(['summary'])
    expect(finishScreens({ award: xpAward(0, 0), recap: null, weeks: [week(0), week(1, true)] })).toEqual(['summary', 'xp'])
    const gained = recap({ improvements: [{ id: 'b', name: 'Bench', previous: 60, weight: 62.5 }] })
    expect(finishScreens({ award: xpAward(1, 0), recap: gained, weeks: [week(2), week(1, true)] })).toEqual(['summary', 'xp', 'highlights', 'week'])
  })

  it('shows the week only once there is more than this session', () => {
    expect(showsWeek([week(0), week(1, true)])).toBe(false)
    expect(showsWeek([week(1), week(1, true)])).toBe(true)
    expect(showsWeek([week(0), week(2, true)])).toBe(true)
  })

  it('lists records first and never repeats a record as a load gain', () => {
    const highlights = highlightsFor(
      recap({
        improvements: [
          { id: 'a', name: 'Bench', previous: 60, weight: 65 },
          { id: 'b', name: 'Row', previous: 40, weight: 42.5 },
        ],
        records: [{ id: 'a', name: 'Bench', previous: 60, weight: 65, goal: 80 }],
        repImprovements: [{ id: 'c', name: 'Dip', previous: 20, reps: 24, measurement: 'Bodyweight reps' }],
      }),
    )
    expect(highlights.map((highlight) => [highlight.kind, highlight.name])).toEqual([
      ['record', 'Bench'],
      ['load', 'Row'],
      ['reps', 'Dip'],
    ])
  })

  it('caps the list and counts the rest', () => {
    const many = highlightsFor(recap({ repImprovements: ['A', 'B', 'C', 'D', 'E'].map((name) => ({ id: name, name, previous: 10, reps: 12, measurement: 'Bodyweight reps' as const })) }))
    expect(visibleHighlights(many)).toMatchObject({ hidden: 2 })
    expect(visibleHighlights(many).shown).toHaveLength(3)
    expect(visibleHighlights(many.slice(0, 2)).hidden).toBe(0)
  })
})
