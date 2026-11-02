import { db } from '../data/db'
import { insertOne, live, update } from '../data/repo'
import type { Blueprint, TrainingPlanRecord, Workout } from '../data/types'
import { consume, structurallyValid, type TrainingSchedule } from '../domain/schedule'
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
 * Called inside the workout's finishing transaction. Sessions started from the plan
 * advance it; retrospective sessions never do. Cardio auto-matching arrives with cardio (phase 3).
 */
export async function advancePlanFor(workout: Workout, now: Date) {
  if (!workout.plan_ticket || workout.is_retrospective) return
  const plan = await currentPlan()
  if (!plan) return
  const next = consume(plan.schedule, workout.plan_ticket, now)
  if (next) await update<TrainingPlanRecord>('training_plans', plan.id, { schedule: next })
}
