import type { Profile, WeightUnit } from '../data/types'
import { parseNumber, toKilograms } from './measurement'

/* LocalProfile.swift and WeightGoalAchievement.swift. */

export type BodyWeightGoal = Profile['body_weight_goal']
export const bodyWeightGoals: { value: BodyWeightGoal; title: string }[] = [
  { value: 'lose', title: 'Lose Weight' },
  { value: 'gain', title: 'Gain Weight' },
  { value: 'maintain', title: 'Maintain Weight' },
]

/** 1–700 kg, entered in the profile's unit. */
export function parseBodyWeight(text: string, unit: WeightUnit): number | null {
  const value = parseNumber(text)
  if (value === null) return null
  const kg = toKilograms(unit, value)
  return Number.isFinite(kg) && kg >= 1 && kg <= 700 ? kg : null
}

export const validName = (name: string) => name.trim().length >= 1 && name.trim().length <= 40

export function goalReached(weight: number, target: number, goal: BodyWeightGoal): boolean {
  if (![weight, target].every((value) => Number.isFinite(value) && value >= 1 && value <= 700)) return false
  if (goal === 'lose') return weight <= target + 0.000001
  if (goal === 'gain') return weight >= target - 0.000001
  return Math.abs(weight - target) < 0.000001
}

/** Goal identity uses kilograms and direction, independent of the display unit; celebrated once. */
export function claimGoal(target: number | null, weight: number, goal: BodyWeightGoal, celebrated: string[]): { target: number; celebrated: string[] } | null {
  if (target === null || !goalReached(weight, target, goal)) return null
  const key = `${goal}:${Math.round(target * 1000)}`
  if (celebrated.includes(key)) return null
  return { target, celebrated: [...celebrated, key] }
}
