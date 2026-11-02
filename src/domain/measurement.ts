import type { DistanceUnit, Measurement, WeightUnit } from '../data/types'

/** Canonical storage is kg, km and seconds/km. Presentation never mutates storage (MeasurementUnits.swift). */
export const poundsPerKilogram = 2.2046226218
export const kilometersPerMile = 1.609344

/** Covers rounding a load to 0.01 kg or 0.01 lb, including cross-unit round trips. */
export const loadTolerance = 0.011

export function improves(value: number, previous: number): boolean {
  return value - previous > loadTolerance
}

/** Ungrouped decimal input only: dot or comma, at most two fractional digits. */
export function parseNumber(text: string, fractionDigits = 2): number | null {
  const value = text.trim()
  if (!new RegExp(`^[0-9]+([.,][0-9]{0,${fractionDigits}})?$`).test(value)) return null
  const number = Number(value.replace(',', '.'))
  return Number.isFinite(number) ? number : null
}

export function formatNumber(value: number, locale: string, digits = 2): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0, useGrouping: false }).format(value)
}

export const toKilograms = (unit: WeightUnit, value: number) => (unit === 'kg' ? value : value / poundsPerKilogram)
export const fromKilograms = (unit: WeightUnit, kilograms: number) => (unit === 'kg' ? kilograms : kilograms * poundsPerKilogram)

export function loadLabel(unit: WeightUnit, kilograms: number, locale: string): string {
  return `${formatNumber(fromKilograms(unit, kilograms), locale)} ${unit}`
}

export function loadInput(unit: WeightUnit, kilograms: number, locale: string): string {
  return formatNumber(fromKilograms(unit, kilograms), locale)
}

export function parseLoad(unit: WeightUnit, text: string): number | null {
  const value = parseNumber(text)
  return value === null ? null : toKilograms(unit, value)
}

export const distanceToKm = (unit: DistanceUnit, value: number) => (unit === 'km' ? value : value * kilometersPerMile)
export const kmToDistance = (unit: DistanceUnit, km: number) => (unit === 'km' ? km : km / kilometersPerMile)

export function distanceLabel(unit: DistanceUnit, km: number, locale: string) {
  return `${formatNumber(kmToDistance(unit, km), locale)} ${unit}`
}

export function paceLabel(unit: DistanceUnit, secondsPerKilometer: number): string {
  const value = secondsPerKilometer * (unit === 'km' ? 1 : kilometersPerMile)
  if (!Number.isFinite(value) || value <= 0) return '—'
  const seconds = Math.round(value)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} /${unit}`
}

/** Calendar day in the device's local time zone, replacing the iOS "era-y-m-d" day key. */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds())
}

export const measurements: Measurement[] = ['Load & reps', 'Bodyweight reps', 'Assisted reps', 'Duration']

export function quantityLabel(measurement: Measurement): string {
  switch (measurement) {
    case 'Load & reps':
      return 'Weight'
    case 'Bodyweight reps':
      return 'Added load (optional)'
    case 'Assisted reps':
      return 'Assistance'
    case 'Duration':
      return 'Duration'
  }
}

export const supportsWeightComparisons = (measurement: Measurement) => measurement === 'Load & reps'

/** Duration never takes reps; load & reps only when rep tracking is on; the rest always. */
export function needsReps(measurement: Measurement, trackReps: boolean): boolean {
  return measurement !== 'Duration' && (measurement !== 'Load & reps' || trackReps)
}

export function isMeasurement(value: string | null | undefined): value is Measurement {
  return measurements.includes(value as Measurement)
}
