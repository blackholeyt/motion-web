import type { Exercise, Guidance, SetLog, Workout, WorkoutExercise } from '../data/types'
import { buildRecap, levelCost, levelThreshold, progressFor, ranks, rewardDuration, rewardFrame, xpAward, type StoredWorkout } from './progress'

// Ported from WorkoutProgressTests, WorkoutRecapTests and RecordedProgressTests (iOS).
const base = { user_id: null, created_at: '', updated_at: '', deleted_at: null }
const loadTargets: Guidance = { minimumReps: 8, maximumReps: 12, progression: 'Build external load', notes: '' }
const repTargets: Guidance = { minimumReps: 8, maximumReps: 12, progression: 'Build repetitions first', notes: '' }
let counter = 0

function session(day: number, entries: Record<string, { load: number; reps?: number; sets?: number; guidance?: Guidance }>): StoredWorkout {
  const id = `w${++counter}`
  const workout = { ...base, id, name: 'Session', performed_at: new Date(Date.UTC(2026, 0, day, 12)).toISOString(), is_completed: true } as Workout
  const exercises: WorkoutExercise[] = []
  const sets: SetLog[] = []
  for (const [name, entry] of Object.entries(entries)) {
    const exercise = { ...base, id: `${id}-${name}`, workout_id: id, exercise_id: name, exercise_name: name, measurement: 'Load & reps', guidance: entry.guidance ?? loadTargets, is_history_only: false, is_removed: false, sort_order: 0 } as WorkoutExercise
    exercises.push(exercise)
    for (let index = 1; index <= (entry.sets ?? 1); index++) {
      sets.push({ ...base, id: `${exercise.id}-${index}`, workout_id: id, workout_exercise_id: exercise.id, set_index: index, weight_kg: entry.load, reps: entry.reps ?? 8, duration_seconds: null, is_completed: true, is_warm_up: false, is_skipped: false, is_removed: false } as SetLog)
    }
  }
  return { workout, exercises, sets }
}

const tracked = (id: string, goal: number | null = null) => ({ ...base, id, name: id, is_pr_tracked: true, goal_weight_kg: goal }) as Exercise

describe('levels and XP', () => {
  it('matches level boundaries and stacked bonuses', () => {
    expect(progressFor(0).level).toBe(1)
    expect(progressFor(199).remainingXP).toBe(1)
    expect(progressFor(200).level).toBe(2)
    expect(progressFor(200).levelXP).toBe(0)
    expect(progressFor(1575).level).toBe(6)
    expect(xpAward(4, 2).total).toBe(350)
  })

  it('checks every level boundary and rank threshold', () => {
    for (let level = 2; level <= 200; level++) {
      const threshold = levelThreshold(level)
      expect(progressFor(threshold - 1).level).toBe(level - 1)
      expect(progressFor(threshold - 1).remainingXP).toBe(1)
      expect(progressFor(threshold).levelXP).toBe(0)
      expect(progressFor(threshold).remainingXP).toBe(levelCost(level))
      expect(levelThreshold(level + 1) - threshold).toBe(progressFor(threshold).requiredXP)
    }
    expect(ranks.map((rank) => rank.minimumXP)).toEqual([0, 1500, 4200, 7200, 10200, 13200])
    for (const rank of ranks) {
      expect(progressFor(rank.minimumXP).rank.index).toBe(rank.index)
      if (rank.minimumXP > 0) expect(progressFor(rank.minimumXP - 1).rank.index).toBe(rank.index - 1)
    }
    expect(progressFor(-50).totalXP).toBe(0)
    expect(progressFor(20000).rank.name).toBe('Legend')
    expect(progressFor(20000).nextRankXP).toBeNull()
    expect(levelCost(1000)).toBe(600)
  })

  it('settles the reward timeline exactly across several levels', () => {
    expect(progressFor(700).level).toBe(3)
    expect(rewardFrame(1700, 1000, 0).creditedXP).toBe(0)
    let last = 0
    for (let step = 0; step <= 280; step++) {
      const frame = rewardFrame(1700, 1000, step / 100)
      expect(frame.creditedXP).toBeGreaterThanOrEqual(last)
      expect(frame.progress.fraction).toBeGreaterThanOrEqual(0)
      expect(frame.progress.fraction).toBeLessThan(1)
      last = frame.creditedXP
    }
    const end = rewardFrame(1700, 1000, rewardDuration)
    expect(end).toMatchObject({ creditedXP: 1000, rankedUp: true, pulse: 0 })
    expect(end.progress.level).toBe(6)
    const reduced = rewardFrame(1700, 1000, 0, true)
    expect(reduced.creditedXP).toBe(1000)
    expect(reduced.progress.rank.name).toBe('Momentum')
    expect(rewardFrame(100, 100, 3).leveledUp).toBe(false)
    const exact = rewardFrame(200, 100, 3)
    expect(exact.leveledUp).toBe(true)
    expect(exact.progress.fraction).toBe(0)
  })
})

describe('recap', () => {
  it('compares by exercise identity and matching targets', () => {
    const old = session(1, { A: { load: 20 }, B: { load: 20 }, C: { load: 20 }, D: { load: 20 }, E: { load: 20 } })
    const current = session(3, { A: { load: 30, guidance: repTargets }, B: { load: 50 }, C: { load: 40 }, D: { load: 25 }, E: { load: 15 } })
    const recap = buildRecap(current, [old, current], [])
    expect(recap.improvements.map((gain) => gain.name)).toEqual(['B', 'C', 'D'])
    expect(recap.improvements.map((gain) => gain.weight - gain.previous)).toEqual([30, 20, 5])
    expect(recap.setCount).toBe(5)
  })

  it('records beat the all-time load and carry the goal', () => {
    const library = [tracked('Bench', 100)]
    const old = session(1, { Bench: { load: 60 } })
    const other = session(2, { Bench: { load: 80 } })
    const current = session(3, { Bench: { load: 90 } })
    const recap = buildRecap(current, [old, other], library)
    expect(recap.improvements[0]!.weight - recap.improvements[0]!.previous).toBe(10)
    expect(recap.records[0]).toMatchObject({ previous: 80, goal: 100 })
    const equal = buildRecap(session(4, { Bench: { load: 90 } }), [old, other, current], library)
    expect(equal.records).toEqual([])
    expect(equal.improvements).toEqual([])
    const first = buildRecap(current, [], library)
    expect(first.records).toEqual([])
    expect(first.comparableCount).toBeNull()
  })

  it('awards reps at the same load, and a record replaces the improvement bonus', () => {
    const old = session(1, { Press: { load: 50, sets: 2, guidance: repTargets } })
    const reps = buildRecap(session(2, { Press: { load: 50, reps: 10, sets: 2, guidance: repTargets } }), [old], [])
    expect(reps.repImprovements[0]).toMatchObject({ previous: 16, reps: 20 })
    expect(xpAward(reps.bonusExerciseCount, reps.records.length).total).toBe(125)
    const load = buildRecap(session(2, { Press: { load: 55, reps: 10, sets: 2, guidance: repTargets } }), [old], [tracked('Press')])
    expect(load.records).toHaveLength(1)
    expect(load.bonusExerciseCount).toBe(0)
    expect(xpAward(load.bonusExerciseCount, load.records.length).total).toBe(175)
  })

  it('stays neutral for incomplete or changed context', () => {
    const old = session(1, { Press: { load: 50, sets: 2, guidance: repTargets } })
    const scenarios: ((stored: StoredWorkout) => void)[] = [
      (s) => (s.exercises[0]!.measurement = 'Assisted reps'),
      (s) => (s.exercises[0]!.measurement = 'Duration'),
      (s) => s.sets.forEach((set) => (set.is_warm_up = true)),
      (s) => (s.sets[1]!.is_completed = false),
      (s) => (s.sets[1]!.is_skipped = true),
      (s) => (s.sets[1]!.is_removed = true),
      (s) => (s.exercises[0]!.exercise_id = 'Other'),
      (s) => (s.exercises[0]!.guidance = null),
      (s) => (s.exercises[0]!.guidance = { ...repTargets, minimumReps: 4, maximumReps: 6 }),
      (s) => (s.exercises[0]!.is_history_only = true),
    ]
    for (const change of scenarios) {
      const current = session(2, { Press: { load: 60, reps: 10, sets: 2, guidance: repTargets } })
      change(current)
      const recap = buildRecap(current, [old], [tracked('Press')])
      expect(recap.improvedExerciseCount).toBe(0)
      expect(recap.records).toEqual([])
    }
  })

  it('acknowledges consistency from three distinct days in 28', () => {
    const history = [session(1, { A: { load: 20 } }), session(10, { A: { load: 20 } })]
    expect(buildRecap(session(20, { A: { load: 20 } }), history, []).consistencyDays).toBe(3)
    expect(buildRecap(session(40, { A: { load: 20 } }), history, []).consistencyDays).toBeNull()
  })
})
