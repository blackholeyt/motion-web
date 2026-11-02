import { db } from '../data/db'
import { insertOne, live, softDelete, transaction, update } from '../data/repo'
import type { Blueprint, BlueprintExercise, Exercise } from '../data/types'
import { guidanceIsValid } from '../domain/guidance'
import { supportsLogging } from '../domain/catalogue'

export interface BlueprintEntry {
  entry: BlueprintExercise
  exercise: Exercise | undefined
}

export async function entriesFor(blueprintID: string): Promise<BlueprintEntry[]> {
  const entries = live(await db.blueprint_exercises.where('blueprint_id').equals(blueprintID).toArray())
  const exercises = await db.exercises.bulkGet(entries.map((entry) => entry.exercise_id))
  return entries
    .map((entry, index) => ({ entry, exercise: exercises[index] ?? undefined }))
    .filter(({ exercise }) => exercise && exercise.deleted_at === null)
    .sort((a, b) =>
      a.entry.sort_order === b.entry.sort_order ? (a.exercise?.name ?? '').localeCompare(b.exercise?.name ?? '') : a.entry.sort_order - b.entry.sort_order,
    )
}

export async function createBlueprint(name: string, id: string = crypto.randomUUID()): Promise<Blueprint> {
  const existing = await db.blueprints.get(id)
  if (existing && existing.deleted_at === null) return existing
  return insertOne<Blueprint>('blueprints', { id, name: name.trim(), cardio_type: null, cardio_minutes: null, cardio_distance_km: null })
}

export async function renameBlueprint(blueprint: Blueprint, name: string) {
  const trimmed = name.trim()
  if (!trimmed || trimmed === blueprint.name) return
  await update<Blueprint>('blueprints', blueprint.id, { name: trimmed })
}

/** Deleting a blueprint removes its entries; workout history keeps its own snapshots. */
export async function deleteBlueprint(blueprint: Blueprint) {
  await transaction(async () => {
    const entries = live(await db.blueprint_exercises.where('blueprint_id').equals(blueprint.id).toArray())
    await softDelete('blueprint_exercises', entries.map((entry) => entry.id))
    await softDelete('blueprints', [blueprint.id])
  })
}

export class DuplicateEntryError extends Error {
  constructor() {
    super('This exercise is already in the blueprint. Adjust its target sets in the exercise list.')
  }
}

export async function addEntry(blueprintID: string, exercise: Exercise, sets = 3) {
  await transaction(async () => {
    const entries = await entriesFor(blueprintID)
    if (entries.some(({ entry }) => entry.exercise_id === exercise.id)) throw new DuplicateEntryError()
    await insertOne<BlueprintExercise>('blueprint_exercises', {
      blueprint_id: blueprintID,
      exercise_id: exercise.id,
      sort_order: Math.max(-1, ...entries.map(({ entry }) => entry.sort_order)) + 1,
      target_sets: sets,
      warm_up_sets: 0,
      superset_group: null,
      guidance: null,
    })
  })
}

export async function updateEntry(entry: BlueprintExercise, change: Partial<BlueprintExercise>) {
  await update<BlueprintExercise>('blueprint_exercises', entry.id, change)
}

export async function removeEntry(entry: BlueprintExercise) {
  await softDelete('blueprint_exercises', [entry.id])
}

export async function moveEntry(entries: BlueprintEntry[], index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= entries.length) return
  const reordered = [...entries]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(target, 0, moved!)
  await transaction(async () => {
    for (const [order, { entry }] of reordered.entries()) {
      if (entry.sort_order !== order) await update<BlueprintExercise>('blueprint_exercises', entry.id, { sort_order: order })
    }
  })
}

/** TrainingPlanStore.isStartable: valid targets and loggable measurements. */
export function isStartable(blueprint: Blueprint, entries: BlueprintEntry[]): boolean {
  if (blueprint.cardio_type) return true
  return (
    entries.length > 0 &&
    entries.every(
      ({ entry, exercise }) =>
        entry.target_sets >= 1 &&
        entry.target_sets <= 1000 &&
        entry.warm_up_sets >= 0 &&
        entry.warm_up_sets <= 20 &&
        guidanceIsValid(entry, exercise) &&
        (entry.guidance?.measurement != null || (exercise !== undefined && supportsLogging(exercise))),
    )
  )
}

export async function allBlueprints(): Promise<Blueprint[]> {
  return live(await db.blueprints.toArray()).sort((a, b) => a.name.localeCompare(b.name))
}
