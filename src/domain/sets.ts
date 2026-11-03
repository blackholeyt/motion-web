import type { Measurement, SetLog, WeightUnit, WorkoutExercise } from '../data/types'
import { formatNumber, fromKilograms, loadInput, loadLabel, needsReps, parseLoad, parseNumber, supportsWeightComparisons } from './measurement'

/*
 * Set rules from TrainingStructure.swift and WorkoutSetInput.swift, written against
 * stored records: the draft text fields are the source of truth for unfinished input.
 */

export interface Row {
  set: SetLog
  exercise: WorkoutExercise
}

export interface ExerciseRows {
  exercise: WorkoutExercise
  rows: Row[]
}

export const isPerformed = (set: SetLog, exercise?: WorkoutExercise) =>
  set.is_completed && !set.is_skipped && !set.is_removed && exercise?.is_removed !== true

export const isWorkingResult = (set: SetLog, exercise?: WorkoutExercise) => isPerformed(set, exercise) && !set.is_warm_up

export const isWeightComparable = (set: SetLog, exercise: WorkoutExercise) =>
  isWorkingResult(set, exercise) && supportsWeightComparisons(exercise.measurement) && Number.isFinite(set.weight_kg) && set.weight_kg >= 0

export interface SetBadge {
  kind: 'warmUp' | 'working' | 'superset'
  /** Short text on the badge: "W", the working-set number, or the superset slot such as "A1". */
  text: string
  /** Position among the exercise's working sets; null for warm-ups. */
  number: number | null
}

/**
 * The marker in front of a set row. Superset slots follow the exercise order inside the group
 * (A1, A2 …); warm-ups stay "W" because they are done outside the superset rounds.
 */
export function setBadge(row: Row, exercises: ExerciseRows[]): SetBadge {
  if (row.set.is_warm_up) return { kind: 'warmUp', text: 'W', number: null }
  const owner = exercises.find((candidate) => candidate.exercise.id === row.exercise.id)
  const working = (owner?.rows ?? [row]).filter((candidate) => !candidate.set.is_warm_up)
  const number = working.findIndex((candidate) => candidate.set.id === row.set.id) + 1 || working.length + 1
  const group = row.exercise.superset_group
  if (!group) return { kind: 'working', text: String(number), number }
  const members = exercises.filter((candidate) => candidate.exercise.superset_group === group)
  const slot = members.findIndex((candidate) => candidate.exercise.id === row.exercise.id) + 1 || 1
  return { kind: 'superset', text: `${group}${slot}`, number }
}

export function setUnit(set: SetLog, fallback: WeightUnit): WeightUnit {
  return set.draft_weight_unit ?? fallback
}

/** The text shown in the quantity field: weight in the set's unit, or seconds for duration. */
export function quantityText(set: SetLog, measurement: Measurement, unit: WeightUnit, locale: string): string {
  if (measurement === 'Duration') {
    return set.draft_duration_text ?? (set.duration_seconds != null ? formatNumber(set.duration_seconds, locale) : '')
  }
  if (set.draft_weight_text !== null) return set.draft_weight_text
  return set.is_completed || set.weight_kg !== 0 ? loadInput(setUnit(set, unit), set.weight_kg, locale) : ''
}

export function repsText(set: SetLog): string {
  return set.draft_reps_text ?? (set.reps != null ? String(set.reps) : '')
}

export function parseDuration(text: string): number | null {
  const seconds = parseNumber(text)
  return seconds !== null && seconds > 0 && seconds <= 604800 ? seconds : null
}

export function parseReps(text: string): number | null {
  const trimmed = text.trim()
  if (!/^[0-9]+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return value > 0 ? value : null
}

/**
 * Parsed load in kg. An unchanged display keeps the exact stored value, so rounding
 * for display never loses precision (e.g. 100 kg shown as 220.46 lb).
 */
export function parseWeightText(text: string, measurement: Measurement, unit: WeightUnit, storedKg: number, locale: string): number | null {
  if (measurement === 'Duration') return null
  if (measurement === 'Bodyweight reps' && text.trim() === '') return 0
  if (text !== '' && text === loadInput(unit, storedKg, locale)) return storedKg
  return parseLoad(unit, text)
}

export function setIsValid(set: SetLog, measurement: Measurement, unit: WeightUnit, trackReps: boolean, locale: string): boolean {
  const text = quantityText(set, measurement, unit, locale)
  if (measurement === 'Duration') return parseDuration(text) !== null
  return (
    parseWeightText(text, measurement, setUnit(set, unit), set.weight_kg, locale) !== null &&
    (!needsReps(measurement, trackReps) || parseReps(repsText(set)) !== null)
  )
}

/** Values to store for a given input, mirroring copyValuesToModel. */
export function valuesForInput(
  set: SetLog,
  measurement: Measurement,
  quantity: string,
  reps: string,
  unit: WeightUnit,
  trackReps: boolean,
  locale: string,
): Partial<SetLog> {
  if (measurement === 'Duration') {
    return { draft_duration_text: quantity, draft_weight_text: null, duration_seconds: parseDuration(quantity), weight_kg: 0, draft_reps_text: reps, reps: null, draft_weight_unit: unit }
  }
  const weight = parseWeightText(quantity, measurement, unit, set.weight_kg, locale)
  return {
    draft_weight_text: quantity,
    draft_weight_unit: unit,
    draft_duration_text: null,
    duration_seconds: null,
    weight_kg: weight ?? 0,
    draft_reps_text: reps,
    reps: needsReps(measurement, trackReps) ? parseReps(reps) : null,
  }
}

/** Independent exercise IDs remain intact. The superset group only determines traversal and rest. */
export function orderedRows(exercises: ExerciseRows[]): Row[] {
  const visited = new Set<string>()
  const result: Row[] = []
  for (const { exercise, rows } of exercises) {
    const group = exercise.superset_group
    if (!group) {
      result.push(...rows)
      continue
    }
    if (visited.has(group)) continue
    visited.add(group)
    const members = exercises.filter((candidate) => candidate.exercise.superset_group === group)
    // Warm-ups precede the working rounds, retaining their own order and rest.
    result.push(...members.flatMap((member) => member.rows.filter((row) => row.set.is_warm_up)))
    const rounds = members.map((member) => member.rows.filter((row) => !row.set.is_warm_up))
    const longest = Math.max(0, ...rounds.map((round) => round.length))
    for (let index = 0; index < longest; index++) {
      for (const round of rounds) if (round[index]) result.push(round[index]!)
    }
  }
  return result
}

/** Rest once every remaining member of this round is resolved, even with uneven set counts. */
export function startsRest(row: Row, exercises: ExerciseRows[]): boolean {
  const group = row.exercise.superset_group
  if (row.set.is_warm_up || !group) return true
  const members = exercises.filter((candidate) => candidate.exercise.superset_group === group)
  const owner = members.find((member) => member.rows.some((candidate) => candidate.set.id === row.set.id))
  const round = owner?.rows.filter((candidate) => !candidate.set.is_warm_up).findIndex((candidate) => candidate.set.id === row.set.id) ?? -1
  if (!owner || round < 0) return true
  return members.every((member) => {
    const working = member.rows.filter((candidate) => !candidate.set.is_warm_up)
    const candidate = working[round]
    return !candidate || candidate.set.id === row.set.id || candidate.set.is_completed || candidate.set.is_skipped
  })
}

export interface HistoricalSet {
  weight: number
  reps: number | null
  date: string
  measurement: Measurement
  durationSeconds: number | null
}

/** "Previous: …" line from WorkoutSetInput.comparison. */
export function comparisonText(
  set: SetLog,
  measurement: Measurement,
  previous: HistoricalSet | undefined,
  unit: WeightUnit,
  trackReps: boolean,
  locale: string,
  t: (text: string, values?: (string | number)[]) => string,
): string {
  if (set.is_warm_up) return t('Warm-up · excluded from working totals and progression')
  if (!previous) return t('Baseline · no comparable previous working set')
  if (measurement === 'Duration') {
    return t('Previous: {0} seconds · no load-based progression', [formatNumber(previous.durationSeconds ?? 0, locale)])
  }
  const weight = Number.isFinite(previous.weight) && previous.weight >= 0 ? loadLabel(unit, previous.weight, locale) : '—'
  const reps = previous.reps && previous.reps > 0 ? String(previous.reps) : '—'
  const date = ' · ' + new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(previous.date))
  const qualifier = measurement === 'Assisted reps' ? t(' assistance') : measurement === 'Bodyweight reps' ? t(' added') : ''
  const baseline = supportsWeightComparisons(measurement) ? '' : t(' · no load-based progression')
  return t('Previous: {0}', [weight]) + qualifier + (needsReps(measurement, trackReps) ? t(' × {0} reps', [reps]) : '') + date + baseline
}

export function resultLabel(set: SetLog, measurement: Measurement, unit: WeightUnit, locale: string, t: (text: string, values?: (string | number)[]) => string): string {
  if (measurement === 'Duration') return t('{0} seconds', [formatNumber(set.duration_seconds ?? 0, locale)])
  const load = `${formatNumber(fromKilograms(unit, set.weight_kg), locale)} ${unit}`
  const repetitions = set.reps != null ? t('{0} reps', [set.reps]) : t('Reps not tracked')
  if (measurement === 'Bodyweight reps') return t('{0} · {1} added', [repetitions, load])
  if (measurement === 'Assisted reps') return t('{0} · {1} assistance', [repetitions, load])
  return `${load} · ${repetitions}`
}
