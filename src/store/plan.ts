import { db } from '../data/db'
import { insertOne, live, update } from '../data/repo'
import type { Blueprint, TrainingPlanRecord, Workout } from '../data/types'
import { isCardioActivity } from '../domain/cardio'
import { dayKey } from '../domain/measurement'
import { consume, nextTicket, structurallyValid, type TrainingSchedule } from '../domain/schedule'
import { entriesFor, isStartable } from './blueprints'

export async function currentPlan(): Promise<TrainingPlanRecord | undefined> {
  return live(await db.training_plans.toArray())[0]
}

export async function savePlan(schedule: TrainingSchedule) {
  if (!structurallyValid(schedule)) throw new Error('Review the training plan settings.')
  const existing = await currentPlan()
  if (existing) await update<TrainingPlanRecord>('training_plans', existing.id, { schedule })
  else await insertOne<TrainingPlanRecord>('training_plans', { schedule })
}

/** TrainingPlanStore.problem with the same messages. */
export async function planProblem(schedule: TrainingSchedule, blueprints: Blueprint[]): Promise<string | null> {
  if (!structurallyValid(schedule)) return 'Review the training plan settings.'
  if (schedule.entries.length === 0) return 'Add a blueprint to your training plan.'
  for (const entry of schedule.entries) {
    const blueprint = blueprints.find((candidate) => candidate.id === entry.blueprintID)
    if (!blueprint) return 'A planned blueprint was deleted. Edit your training plan to replace it.'
    if (!isStartable(blueprint, await entriesFor(blueprint.id))) return 'A planned blueprint is not ready to start. Review its exercises and targets.'
  }
  return null
}

/**
 * TrainingPlanStore.prepareCompletion, called inside the finishing transaction. Sessions started
 * from the plan advance it; retrospective sessions never do. A same-day cardio session without a
 * ticket completes a due rotation slot whose blueprint has the same activity, once per day.
 */
export async function advancePlanFor(workout: Workout, now: Date) {
  if (workout.is_retrospective) return
  const plan = await currentPlan()
  if (!plan) return
  const state = plan.schedule
  const cardioDay = `cardio/${dayKey(new Date(workout.performed_at))}`
  let ticket = workout.plan_ticket
  if (!ticket) {
    if (state.mode !== 'rotation' || !isCardioActivity(workout.cardio_type) || dayKey(new Date(workout.performed_at)) !== dayKey(now)) return
    if (state.consumed.includes(cardioDay)) return
    const due = nextTicket(state, now)
    if (!due || due.dayKey !== dayKey(new Date(workout.performed_at))) return
    const entry = state.entries.find((candidate) => candidate.id === due.entryID)
    const blueprint = entry ? await db.blueprints.get(entry.blueprintID) : undefined
    if (!blueprint || blueprint.deleted_at !== null || blueprint.cardio_type !== workout.cardio_type) return
    ticket = due
  }
  const next = consume(state, ticket, now)
  if (!next) return
  // Record explicit cardio completion so the same day's activity cannot complete a second slot.
  if (workout.cardio_type && !next.consumed.includes(cardioDay)) next.consumed = [...next.consumed, cardioDay]
  await update<TrainingPlanRecord>('training_plans', plan.id, { schedule: next })
}
