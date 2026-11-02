import type { BlueprintExercise, Exercise, Guidance, Measurement, Progression } from '../data/types'
import { isMeasurement } from './measurement'

/** Ported from RoutineGuidance.swift: no load is ever prescribed or prefilled. */
export const emptyGuidance = (): Guidance => ({ notes: '', progression: 'Not selected' })

export function preferences(measurement: Measurement): Progression[] {
  switch (measurement) {
    case 'Duration':
      return ['Not selected', 'Keep targets steady', 'Build duration']
    case 'Load & reps':
      return ['Not selected', 'Keep targets steady', 'Build repetitions first', 'Build external load']
    default:
      return ['Not selected', 'Keep targets steady', 'Build repetitions first']
  }
}

export function validationError(guidance: Guidance, fallback: Measurement): string | null {
  const type = guidance.measurement ?? fallback
  const { minimumReps: low, maximumReps: high, durationSeconds, restSeconds } = guidance
  if (guidance.notes.length > 2000) return 'Keep notes within 2,000 characters.'
  if (restSeconds != null && !(restSeconds >= 5 && restSeconds <= 3600)) return 'Rest must be 5–3,600 seconds.'
  if (type === 'Duration') {
    if (low != null || high != null) return 'Timed exercises cannot have rep targets.'
    if (durationSeconds != null && !(durationSeconds >= 1 && durationSeconds <= 604800)) return 'Duration must be 1–604,800 seconds.'
  } else {
    if (durationSeconds != null) return 'Rep exercises cannot have duration targets.'
    if (low != null || high != null) {
      if (low == null || high == null || low < 1 || low > 1000 || high < low || high > 1000) {
        return 'Enter both rep bounds, from 1–1,000, with minimum no greater than maximum.'
      }
    }
  }
  if (!preferences(type).includes(guidance.progression)) return 'Choose a progression preference compatible with this measurement.'
  return null
}

export function targetLabel(guidance: Guidance, t: (text: string, values?: (string | number)[]) => string): string | null {
  if (guidance.durationSeconds != null) return t('Target: {0} seconds per working set', [guidance.durationSeconds])
  if (guidance.minimumReps != null && guidance.maximumReps != null) {
    return t('Target: {0}–{1} reps per working set', [guidance.minimumReps, guidance.maximumReps])
  }
  return null
}

/** Routine measurement: explicit guidance first, then the library exercise, then load & reps. */
export function entryMeasurement(entry: BlueprintExercise, exercise: Exercise | undefined): Measurement {
  if (entry.guidance?.measurement) return entry.guidance.measurement
  return isMeasurement(exercise?.measurement) ? exercise.measurement : 'Load & reps'
}

export function guidanceIsValid(entry: BlueprintExercise, exercise: Exercise | undefined): boolean {
  return validationError(entry.guidance ?? emptyGuidance(), entryMeasurement(entry, exercise)) === null
}
