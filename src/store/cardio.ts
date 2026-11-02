import { insertOne, transaction } from '../data/repo'
import type { Blueprint, TrainingPlanTicket, Workout } from '../data/types'
import { draftKilometers, draftPace, draftSeconds, draftValid, type CardioDraft } from '../domain/cardio'
import { XP, xpAward, type XPAward } from '../domain/progress'
import { advancePlanFor } from './plan'
import { grantWorkoutAward, totalXP } from './progress'

export class CardioError extends Error {
  constructor() {
    super('Enter a positive duration and distance. Pace must match time divided by distance.')
  }
}

export async function createCardioBlueprint(name: string, draft: CardioDraft): Promise<Blueprint> {
  if (!draftValid(draft)) throw new CardioError()
  const seconds = draftSeconds(draft)!
  return insertOne<Blueprint>('blueprints', { name: name.trim(), cardio_type: draft.activity, cardio_minutes: seconds / 60, cardio_distance_km: draftKilometers(draft) })
}

/**
 * CardioStore.finish: activity and distance alone omit route, conditions and intended effort,
 * so cardio earns completion XP only. Saved, awarded and matched to the plan in one transaction.
 */
export async function finishCardio(
  draft: CardioDraft,
  options: { blueprint?: Blueprint; planTicket?: TrainingPlanTicket | null; notes?: string; now?: Date } = {},
): Promise<{ award: XPAward; totalXP: number; workout: Workout }> {
  if (!draftValid(draft)) throw new CardioError()
  const now = options.now ?? new Date()
  return transaction(async () => {
    const workout = await insertOne<Workout>('workouts', {
      name: options.blueprint?.name ?? draft.activity,
      performed_at: now.toISOString(),
      is_completed: true,
      is_freestyle: !options.blueprint,
      is_retrospective: false,
      blueprint_id: options.blueprint?.id ?? null,
      notes: options.notes?.trim() ? options.notes : null,
      earned_xp: 0,
      draft_updated_at: null,
      plan_ticket: options.planTicket ?? null,
      rest_timer: null,
      undo_history: null,
      cardio_type: draft.activity,
      cardio_seconds: draftSeconds(draft),
      cardio_distance_km: draftKilometers(draft),
      cardio_pace_s_per_km: draftPace(draft),
      source: 'motion',
    })
    const award = xpAward(0, 0, XP.cardio)
    const { xp } = await grantWorkoutAward(workout, award)
    await advancePlanFor(workout, now)
    return { award, totalXP: await totalXP(), workout: { ...workout, earned_xp: xp } }
  })
}
