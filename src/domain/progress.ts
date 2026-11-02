import type { Exercise, Guidance, Measurement, SetLog, Workout, WorkoutExercise } from '../data/types'
import { validationError } from './guidance'
import { addDays, improves, loadTolerance, startOfDay } from './measurement'
import { isPerformed, isWeightComparable, isWorkingResult } from './sets'

/*
 * WorkoutRecap.swift, RecordedComparison.swift and WorkoutProgress.swift.
 * Conservative recorded-result comparison, not an estimate of strength or effort.
 */

export interface StoredWorkout {
  workout: Workout
  exercises: WorkoutExercise[]
  sets: SetLog[]
}

export const identityKey = (exercise: WorkoutExercise) => exercise.exercise_id ?? `unlinked-${exercise.id}`

const visibleExercises = (stored: StoredWorkout) => stored.exercises.filter((exercise) => exercise.deleted_at === null)
const setsOf = (stored: StoredWorkout, exercise: WorkoutExercise) =>
  stored.sets.filter((set) => set.workout_exercise_id === exercise.id && set.deleted_at === null)

// MARK: - Comparison

export interface ComparedSet {
  load: number
  reps: number
}

export interface RecordedComparison {
  identity: string
  measurement: Measurement
  guidance: Guidance
  sets: ComparedSet[]
}

export function contextKey(comparison: RecordedComparison): string {
  const { guidance } = comparison
  return [
    comparison.identity,
    comparison.measurement,
    String(comparison.sets.length),
    String(guidance.minimumReps ?? 0),
    String(guidance.maximumReps ?? 0),
    guidance.progression,
    guidance.notes,
  ].join('|')
}

/** RecordedComparison.init?: explicit targets, a load or rep progression and complete working sets. */
export function comparisonFor(exercise: WorkoutExercise, sets: SetLog[]): RecordedComparison | null {
  const { exercise_id: identity, measurement, guidance } = exercise
  if (!identity || exercise.is_history_only || exercise.is_removed) return null
  if (measurement !== 'Load & reps' && measurement !== 'Bodyweight reps') return null
  if (!guidance || validationError(guidance, measurement) !== null) return null
  if (guidance.measurement != null && guidance.measurement !== measurement) return null
  if (guidance.minimumReps == null || guidance.maximumReps == null) return null
  if (guidance.progression !== 'Build external load' && guidance.progression !== 'Build repetitions first') return null
  const working = sets.filter((set) => !set.is_warm_up).sort((a, b) => a.set_index - b.set_index)
  if (working.length === 0) return null
  const complete = working.every((set) => isWorkingResult(set, exercise) && Number.isFinite(set.weight_kg) && set.weight_kg >= 0 && (set.reps ?? 0) > 0)
  if (!complete || new Set(working.map((set) => set.set_index)).size !== working.length) return null
  return { identity, measurement, guidance, sets: working.map((set) => ({ load: set.weight_kg, reps: set.reps! })) }
}

const top = (sets: ComparedSet[]) => Math.max(0, ...sets.map((set) => set.load))

export function gains(current: RecordedComparison, old: RecordedComparison): { load: boolean; reps: boolean } {
  if (contextKey(current) !== contextKey(old) || current.sets.length === 0) return { load: false, reps: false }
  const pairs = current.sets.map((set, index) => [set, old.sets[index]!] as const)
  const noRepLoss = pairs.every(([a, b]) => a.reps >= b.reps)
  const sameLoads = pairs.every(([a, b]) => Math.abs(a.load - b.load) <= loadTolerance)
  const noLoadLoss = pairs.every(([a, b]) => a.load + loadTolerance >= b.load)
  const higherTop = improves(top(current.sets), top(old.sets))
  const load = higherTop && current.measurement === 'Load & reps' && noRepLoss && noLoadLoss && pairs.some(([a, b]) => improves(a.load, b.load))
  const reps = sameLoads && noRepLoss && pairs.some(([a, b]) => a.reps > b.reps)
  return { load, reps }
}

// MARK: - Recap

export interface RecordAchievement {
  id: string
  name: string
  previous: number
  weight: number
  goal: number | null
}

export interface WeightImprovement {
  id: string
  name: string
  previous: number
  weight: number
}

export interface RepImprovement {
  id: string
  name: string
  previous: number
  reps: number
  measurement: Measurement
}

export interface WorkoutRecap {
  name: string
  setCount: number
  warmUpCount: number
  improvements: WeightImprovement[]
  records: RecordAchievement[]
  repImprovements: RepImprovement[]
  /** null: first recorded session. */
  comparableCount: number | null
  consistencyDays: number | null
  improvedExerciseCount: number
  bonusExerciseCount: number
}

/** Highest comparable working load per exercise identity. */
export function topWeights(stored: StoredWorkout): Map<string, number> {
  const result = new Map<string, number>()
  for (const exercise of visibleExercises(stored)) {
    if (exercise.is_history_only) continue
    for (const set of setsOf(stored, exercise)) {
      if (!isWeightComparable(set, exercise)) continue
      const key = identityKey(exercise)
      result.set(key, Math.max(result.get(key) ?? set.weight_kg, set.weight_kg))
    }
  }
  return result
}

const byName = <T extends { name: string }>(a: T, b: T) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)

export function buildRecap(current: StoredWorkout, history: StoredWorkout[], library: Exercise[]): WorkoutRecap {
  const { workout } = current
  const performed = visibleExercises(current).flatMap((exercise) => setsOf(current, exercise).map((set) => ({ set, exercise })))
  const earlier = history
    .filter((other) => other.workout.id !== workout.id && other.workout.is_completed && other.workout.deleted_at === null && other.workout.performed_at < workout.performed_at)
    .sort((a, b) => b.workout.performed_at.localeCompare(a.workout.performed_at))

  const improvements: WeightImprovement[] = []
  const repImprovements: RepImprovement[] = []
  let comparable = 0
  const groups = new Map<string, WorkoutExercise[]>()
  for (const exercise of visibleExercises(current)) groups.set(identityKey(exercise), [...(groups.get(identityKey(exercise)) ?? []), exercise])
  for (const [key, entries] of groups) {
    if (entries.length !== 1) continue
    const entry = entries[0]!
    const now = comparisonFor(entry, setsOf(current, entry))
    if (!now) continue
    // Only the most recent occurrence is considered, never a more flattering baseline.
    const session = earlier.find((other) => visibleExercises(other).some((exercise) => identityKey(exercise) === key))
    if (!session) continue
    const previous = visibleExercises(session).filter((exercise) => identityKey(exercise) === key)
    if (previous.length !== 1) continue
    const old = comparisonFor(previous[0]!, setsOf(session, previous[0]!))
    if (!old || contextKey(old) !== contextKey(now)) continue
    comparable += 1
    const result = gains(now, old)
    if (result.load) improvements.push({ id: key, name: entry.exercise_name, previous: top(old.sets), weight: top(now.sets) })
    if (result.reps) {
      const total = (sets: ComparedSet[]) => sets.reduce((sum, set) => sum + set.reps, 0)
      repImprovements.push({ id: key, name: entry.exercise_name, previous: total(old.sets), reps: total(now.sets), measurement: now.measurement })
    }
  }
  const improvedExerciseCount = new Set([...improvements, ...repImprovements].map((gain) => gain.id)).size

  const start = addDays(startOfDay(new Date(workout.performed_at)), -27)
  const days = new Set(
    [...earlier.filter((other) => new Date(other.workout.performed_at) >= start), current]
      .filter((stored) => visibleExercises(stored).some((exercise) => setsOf(stored, exercise).some((set) => isWorkingResult(set, exercise))))
      .map((stored) => startOfDay(new Date(stored.workout.performed_at)).getTime()),
  ).size

  const allTime = new Map<string, number>()
  for (const session of earlier) for (const [key, weight] of topWeights(session)) allTime.set(key, Math.max(allTime.get(key) ?? weight, weight))
  const records: RecordAchievement[] = []
  for (const [key, weight] of topWeights(current)) {
    const exercise = library.find((candidate) => candidate.id === key && candidate.is_pr_tracked && candidate.deleted_at === null)
    const old = allTime.get(key)
    if (!exercise || !improvements.some((gain) => gain.id === key) || old === undefined || !improves(weight, old)) continue
    records.push({ id: key, name: exercise.name, previous: old, weight, goal: exercise.goal_weight_kg })
  }
  records.sort(byName)

  return {
    name: workout.name,
    setCount: performed.filter(({ set, exercise }) => isWorkingResult(set, exercise)).length,
    warmUpCount: performed.filter(({ set, exercise }) => isPerformed(set, exercise) && set.is_warm_up).length,
    improvements: improvements.sort(byName),
    records,
    repImprovements: repImprovements.sort(byName),
    comparableCount: earlier.length === 0 ? null : comparable,
    consistencyDays: days >= 3 ? days : null,
    improvedExerciseCount,
    bonusExerciseCount: improvedExerciseCount - records.length,
  }
}

// MARK: - XP and levels

export const XP = { completion: 100, improvement: 25, record: 75, cardio: 100, weightCheckIn: 25 } as const

/** A load record replaces the ordinary improvement bonus; at most 75 bonus XP per exercise. */
export interface XPAward {
  improvements: number
  records: number
  completionXP: number
  improvementXP: number
  recordXP: number
  total: number
}

export function xpAward(improvements: number, records: number, completion: number = XP.completion): XPAward {
  const improvementXP = Math.max(0, improvements) * XP.improvement
  const recordXP = Math.max(0, records) * XP.record
  return { improvements, records, completionXP: completion, improvementXP, recordXP, total: completion + improvementXP + recordXP }
}

export interface Rank {
  index: number
  name: string
  firstLevel: number
  minimumXP: number
}

export const rankNames = ['Foundation', 'Momentum', 'Vanguard', 'Elite', 'Master', 'Legend'] as const

/** Gentle onboarding; steady effort after level 9. Earned XP is never rewritten. */
export const levelCost = (level: number) => 200 + Math.min(Math.max(level - 1, 0), 8) * 50

export function levelThreshold(level: number): number {
  const steps = Math.max(0, level - 1)
  const rising = Math.min(steps, 8)
  return rising * 200 + rising * (rising - 1) * 25 + Math.max(0, steps - 8) * 600
}

export const ranks: Rank[] = rankNames.map((name, index) => ({ index, name, firstLevel: index * 5 + 1, minimumXP: levelThreshold(index * 5 + 1) }))

export interface Progress {
  totalXP: number
  level: number
  requiredXP: number
  levelXP: number
  remainingXP: number
  fraction: number
  rank: Rank
  nextRank: Rank | null
  nextRankXP: number | null
}

export function progressFor(totalXP: number): Progress {
  const total = Math.max(0, Math.floor(totalXP))
  const steady = levelThreshold(9)
  let level = 1
  if (total >= steady) level = 9 + Math.floor((total - steady) / 600)
  else for (let candidate = 1; candidate <= 8; candidate++) if (levelThreshold(candidate) <= total) level = candidate
  const requiredXP = levelCost(level)
  const levelXP = total - levelThreshold(level)
  const rank = ranks[Math.min(Math.floor((level - 1) / 5), 5)]!
  const nextRank = ranks[rank.index + 1] ?? null
  return {
    totalXP: total,
    level,
    requiredXP,
    levelXP,
    remainingXP: requiredXP - levelXP,
    fraction: levelXP / requiredXP,
    rank,
    nextRank,
    nextRankXP: nextRank ? nextRank.minimumXP - total : null,
  }
}

// MARK: - Reward timeline (presentation only)

export const rewardDuration = 2.8
const chargeStart = 0.25
const chargeDuration = 1.8

export interface RewardFrame {
  progress: Progress
  creditedXP: number
  leveledUp: boolean
  rankedUp: boolean
  pulse: number
}

export function rewardFrame(totalXP: number, earnedXP: number, elapsed: number, reducedMotion = false): RewardFrame {
  const startingXP = Math.max(0, totalXP - earnedXP)
  const previous = progressFor(startingXP)
  const time = Math.min(Math.max((elapsed - chargeStart) / chargeDuration, 0), 1)
  const eased = 1 - Math.pow(1 - time, 3)
  const creditedXP = reducedMotion || time >= 1 ? earnedXP : Math.floor(earnedXP * eased)
  const progress = progressFor(startingXP + creditedXP)
  const leveledUp = progress.level > previous.level
  const ratio = (levelThreshold(progress.level) - startingXP) / Math.max(earnedXP, 1)
  const crossedAt = chargeStart + chargeDuration * (1 - Math.pow(1 - Math.min(Math.max(ratio, 0), 1), 1 / 3))
  const pulse = leveledUp && !reducedMotion ? Math.max(0, 1 - Math.max(0, elapsed - crossedAt) / 0.7) : 0
  return { progress, creditedXP, leveledUp, rankedUp: progress.rank.index !== previous.rank.index, pulse }
}
