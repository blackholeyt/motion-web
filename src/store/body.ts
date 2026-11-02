import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { stableID } from '../data/ids'
import { insertOne, live, softDelete, transaction, update } from '../data/repo'
import type { BodyWeight, Profile, SleepScore, WeightReward } from '../data/types'
import { claimGoal, validName } from '../domain/body'
import { dayKey, startOfDay } from '../domain/measurement'
import { XP } from '../domain/progress'
import { ensureProfile } from './profile'

export class BodyError extends Error {}
const invalidWeight = () => new BodyError('Enter a valid weight between 1 and 700 kg (2.3–1543 lb).')

export const useBodyWeights = () =>
  useLiveQuery(async () => live(await db.body_weights.toArray()).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)), [])
export const useSleepScores = () => useLiveQuery(async () => live(await db.sleep_scores.toArray()).sort((a, b) => b.day.localeCompare(a.day)), [])

export interface CheckInResult {
  kilograms: number
  date: string
  earnedXP: number
  isCorrection: boolean
  achievedTarget: number | null
}

/** Claimed in the same transaction as the measurement; quiet mode and older corrections never celebrate. */
async function claim(profile: Profile, kilograms: number, eligible: boolean): Promise<number | null> {
  if (!eligible || profile.preferences.quietMode) return null
  const result = claimGoal(profile.target_weight_kg, kilograms, profile.body_weight_goal, profile.celebrated_weight_goals)
  if (!result) return null
  await update<Profile>('profiles', profile.id, { celebrated_weight_goals: result.celebrated })
  return result.target
}

/** LocalProfileStore.checkIn: one measurement per day; +25 XP for the first check-in of the day. */
export async function checkIn(kilograms: number, now = new Date()): Promise<CheckInResult> {
  if (!(Number.isFinite(kilograms) && kilograms >= 1 && kilograms <= 700)) throw invalidWeight()
  return transaction(async () => {
    const profile = await ensureProfile()
    const day = dayKey(now)
    const existing = live(await db.body_weights.where('day').equals(day).toArray())[0]
    if (existing) await update<BodyWeight>('body_weights', existing.id, { kilograms, recorded_at: now.toISOString() })
    else await insertOne<BodyWeight>('body_weights', { id: stableID('body_weights', day), day, recorded_at: now.toISOString(), kilograms })
    const rewarded = (await db.weight_rewards.where('day').equals(day).count()) > 0
    if (!rewarded) await insertOne<WeightReward>('weight_rewards', { id: stableID('weight_rewards', day), day, awarded_at: now.toISOString(), earned_xp: XP.weightCheckIn })
    const achievedTarget = await claim(profile, kilograms, true)
    return { kilograms, date: now.toISOString(), earnedXP: rewarded ? 0 : XP.weightCheckIn, isCorrection: false, achievedTarget }
  })
}

/** Corrections keep the date and never earn XP. */
export async function correctWeight(entry: BodyWeight, kilograms: number): Promise<CheckInResult> {
  if (!(Number.isFinite(kilograms) && kilograms >= 1 && kilograms <= 700)) throw invalidWeight()
  return transaction(async () => {
    const profile = await ensureProfile()
    const latest = live(await db.body_weights.toArray()).sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0]
    await update<BodyWeight>('body_weights', entry.id, { kilograms })
    const achievedTarget = await claim(profile, kilograms, latest?.id === entry.id)
    return { kilograms, date: entry.recorded_at, earnedXP: 0, isCorrection: true, achievedTarget }
  })
}

/** Deleting a measurement keeps its daily award, so it cannot be earned twice. */
export const deleteWeight = (entry: BodyWeight) => softDelete('body_weights', [entry.id])

export async function saveProfile(change: Pick<Profile, 'name' | 'body_weight_unit' | 'target_weight_kg' | 'load_unit' | 'distance_unit'>) {
  if (!validName(change.name)) throw new BodyError('Enter a name between 1 and 40 characters.')
  const profile = await ensureProfile()
  await update<Profile>('profiles', profile.id, { ...change, name: change.name.trim() })
}

/** SleepScoreStore.save: one score per day; null deletes it. */
export async function saveSleepScore(score: number | null, date: Date, now = new Date()) {
  if (startOfDay(date) > now || (score !== null && !(Number.isInteger(score) && score >= 0 && score <= 100))) {
    throw new BodyError('Choose a past or current date and a score from 0 to 100.')
  }
  await transaction(async () => {
    const day = dayKey(date)
    const entries = live(await db.sleep_scores.where('day').equals(day).toArray())
    if (score === null) return softDelete('sleep_scores', entries.map((entry) => entry.id))
    if (entries[0]) await update<SleepScore>('sleep_scores', entries[0].id, { score })
    else await insertOne<SleepScore>('sleep_scores', { id: stableID('sleep_scores', day), day, score })
    await softDelete('sleep_scores', entries.slice(1).map((entry) => entry.id))
  })
}
