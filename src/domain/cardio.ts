import type { DistanceUnit } from '../data/types'
import { distanceToKm, formatNumber, kilometersPerMile, kmToDistance, paceLabel, parseNumber } from './measurement'

/* CardioSession.swift: activities and the draft that validates time, distance and pace. */

export const cardioActivities = ['Running', 'Bicycle', 'Swimming', 'Walking', 'Rowing', 'Elliptical', 'Other cardio'] as const
export type CardioActivity = (typeof cardioActivities)[number]
export const isCardioActivity = (value: string | null | undefined): value is CardioActivity => cardioActivities.includes(value as CardioActivity)

export interface CardioDraft {
  activity: string
  minutes: string
  distance: string
  pace: string
  unit: DistanceUnit
  /** Exact stored values, kept while their display text is unchanged. */
  originalSeconds: number | null
  originalMinutesText: string | null
  originalDistance: number | null
  originalDistanceText: string | null
}

export function newCardioDraft(unit: DistanceUnit, activity: string = 'Running'): CardioDraft {
  return { activity, minutes: '', distance: '', pace: '', unit, originalSeconds: null, originalMinutesText: null, originalDistance: null, originalDistanceText: null }
}

const positive = (text: string) => {
  const value = parseNumber(text)
  return value !== null && value > 0 ? value : null
}

export function withSeconds(draft: CardioDraft, seconds: number | null, locale = 'en-US'): CardioDraft {
  const minutes = seconds === null ? '' : formatNumber(seconds / 60, locale)
  return { ...draft, originalSeconds: seconds, minutes, originalMinutesText: minutes }
}

export function withDistance(draft: CardioDraft, kilometers: number | null, locale = 'en-US'): CardioDraft {
  const distance = kilometers === null ? '' : formatNumber(kmToDistance(draft.unit, kilometers), locale)
  return { ...draft, originalDistance: kilometers, distance, originalDistanceText: distance }
}

export function draftSeconds(draft: CardioDraft): number | null {
  if (draft.minutes === draft.originalMinutesText && draft.originalSeconds !== null) return draft.originalSeconds
  const minutes = positive(draft.minutes)
  return minutes === null ? null : minutes * 60
}

export function draftKilometers(draft: CardioDraft): number | null {
  if (draft.distance === draft.originalDistanceText && draft.originalDistance !== null) return draft.originalDistance
  const value = positive(draft.distance)
  return value === null ? null : distanceToKm(draft.unit, value)
}

const perUnit = (unit: DistanceUnit) => (unit === 'km' ? 1 : kilometersPerMile)

/** Input pace follows the distance unit (min:sec or decimal minutes); the result is seconds per km. */
export function draftPace(draft: CardioDraft): number | null {
  const input = draft.pace.trim()
  const seconds = draftSeconds(draft)
  const kilometers = draftKilometers(draft)
  if (input === '') return seconds !== null && kilometers !== null ? seconds / kilometers : null
  if (!input.includes(':')) {
    const minutes = positive(input)
    return minutes === null ? null : (minutes * 60) / perUnit(draft.unit)
  }
  const parts = input.split(':')
  if (parts.length !== 2 || !/^\d+$/.test(parts[0]!) || !/^\d+$/.test(parts[1]!)) return null
  const m = Number(parts[0])
  const s = Number(parts[1])
  if (m > 1_000_000 || s >= 60 || m * 60 + s <= 0) return null
  return (m * 60 + s) / perUnit(draft.unit)
}

export const paceInvalid = (draft: CardioDraft) => draft.pace.trim() !== '' && draftPace(draft) === null

/** Blueprint editing: pace and distance set the target time. */
export function timeFromPace(draft: CardioDraft, locale = 'en-US'): CardioDraft {
  const pace = draftPace(draft)
  const kilometers = draftKilometers(draft)
  if (draft.pace.trim() === '' || pace === null || kilometers === null) return draft
  return withSeconds(draft, pace * kilometers, locale)
}

export function draftValid(draft: CardioDraft): boolean {
  const seconds = draftSeconds(draft)
  const kilometers = draftKilometers(draft)
  const pace = draftPace(draft)
  if (!isCardioActivity(draft.activity) || seconds === null || kilometers === null || pace === null) return false
  if (seconds > 604800 || kilometers > 10000) return false
  return Math.abs(pace - seconds / kilometers) <= Math.max(1, (seconds / kilometers) * 0.01)
}

/** Workout.cardioSummary: "Running · 30 min · 5 km · 6:00 /km". */
export function cardioSummary(
  workout: { cardio_type: string | null; cardio_seconds: number | null; cardio_distance_km: number | null; cardio_pace_s_per_km: number | null },
  unit: DistanceUnit,
  locale: string,
  t: (text: string) => string,
): string {
  const parts = [t(workout.cardio_type ?? 'Cardio')]
  if (workout.cardio_seconds != null) parts.push(`${formatNumber(workout.cardio_seconds / 60, locale, 1)} min`)
  parts.push(workout.cardio_distance_km != null ? `${formatNumber(kmToDistance(unit, workout.cardio_distance_km), locale)} ${unit}` : t('Distance unavailable'))
  if (workout.cardio_pace_s_per_km != null) parts.push(paceLabel(unit, workout.cardio_pace_s_per_km))
  return parts.join(' · ')
}
