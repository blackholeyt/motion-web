import { db } from '../data/db'
import { insertOne, live, transaction, update } from '../data/repo'
import type { Blueprint, BlueprintExercise, Exercise, Guidance } from '../data/types'
import { sameName, type CatalogueMovement } from '../domain/catalogue'
import { planMovements, type StarterPlan } from '../domain/starterPlans'

export async function libraryExercises(): Promise<Exercise[]> {
  return live(await db.exercises.toArray()).sort((a, b) => a.name.localeCompare(b.name))
}

/** A custom library exercise starts as "history only", as in ExerciseLibraryView.swift. */
export async function createExercise(name: string, trackProgress = false): Promise<Exercise> {
  return insertOne<Exercise>('exercises', {
    name,
    goal_weight_kg: null,
    is_pr_tracked: false,
    rest_seconds: null,
    catalogue_id: null,
    equipment: 'Other',
    muscle: 'Other',
    measurement: 'Load & reps',
    guidance: '',
    track_progress: trackProgress,
  })
}

const movementFields = (movement: CatalogueMovement) => ({
  catalogue_id: movement.id,
  equipment: movement.equipment,
  muscle: movement.muscle,
  measurement: movement.measurement,
  guidance: movement.guidance,
})

/** ExerciseBrowser.use: attach catalogue metadata to an existing or new exercise, keeping its tracking choice. */
export async function adoptMovement(movement: CatalogueMovement, existing?: Exercise): Promise<Exercise> {
  if (existing) {
    await update<Exercise>('exercises', existing.id, movementFields(movement))
    return { ...existing, ...movementFields(movement) }
  }
  return insertOne<Exercise>('exercises', {
    name: movement.name,
    goal_weight_kg: null,
    is_pr_tracked: false,
    rest_seconds: null,
    track_progress: true,
    ...movementFields(movement),
  })
}

/** "Add as a new movement": reuse a single match by catalogue ID or name, otherwise create. */
export async function addCatalogueMovement(movement: CatalogueMovement): Promise<Exercise | 'ambiguous'> {
  const library = await libraryExercises()
  const matching = library.filter((exercise) => exercise.catalogue_id === movement.id || sameName(exercise.name, movement.name))
  if (matching.length > 1) return 'ambiguous'
  return adoptMovement(movement, matching[0])
}

/** StarterPlans.copy: each invocation creates an independent blueprint; library identity is shared. */
export async function copyStarterPlan(plan: StarterPlan, id: string): Promise<Blueprint> {
  return transaction(async () => {
    const existing = await db.blueprints.get(id)
    if (existing && existing.deleted_at === null) return existing
    const library = await libraryExercises()
    const blueprint = await insertOne<Blueprint>('blueprints', { id, name: plan.name, cardio_type: null, cardio_minutes: null, cardio_distance_km: null })
    let order = 0
    for (const movement of planMovements(plan)) {
      const exercise =
        library.find((candidate) => candidate.catalogue_id === movement.id && candidate.measurement === movement.measurement) ??
        (await adoptMovement(movement))
      const duration = movement.measurement === 'Duration'
      const guidance: Guidance = {
        measurement: movement.measurement === 'Distance & duration' ? null : movement.measurement,
        minimumReps: duration ? null : 8,
        maximumReps: duration ? null : 12,
        restSeconds: 90,
        notes:
          movement.guidance +
          (duration
            ? ' Choose a comfortable hold duration; no fixed target is supplied.'
            : ' Choose a manageable effort; no starting weight is prescribed.'),
        progression: 'Not selected',
      }
      await insertOne<BlueprintExercise>('blueprint_exercises', {
        blueprint_id: blueprint.id,
        exercise_id: exercise.id,
        sort_order: order++,
        target_sets: plan.sets,
        warm_up_sets: 0,
        superset_group: null,
        guidance,
      })
    }
    return blueprint
  })
}
