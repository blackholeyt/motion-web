import { db } from '../data/db'
import { insertOne, live, softDelete, transaction, update } from '../data/repo'
import type { Blueprint, BlueprintExercise, Exercise, Guidance, Workout, WorkoutExercise } from '../data/types'
import { sameName, supportsLogging, type CatalogueMovement } from '../domain/catalogue'
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

export class LibraryError extends Error {}

/** ExerciseLibraryView "New Exercise": unique names, history only until tracking is turned on. */
export async function createLibraryExercise(name: string): Promise<Exercise> {
  const trimmed = name.trim()
  if ((await libraryExercises()).some((exercise) => sameName(exercise.name, trimmed))) throw new LibraryError('That name already exists.')
  return createExercise(trimmed)
}

export interface HistorySnapshot {
  snapshot: WorkoutExercise
  workout: Workout
}

/** Completed history entries of a workout exercise, newest first. */
async function snapshots(filter: (snapshot: WorkoutExercise) => boolean): Promise<HistorySnapshot[]> {
  const workouts = new Map(live(await db.workouts.toArray()).filter((workout) => workout.is_completed).map((workout) => [workout.id, workout]))
  return live(await db.workout_exercises.toArray())
    .filter((snapshot) => workouts.has(snapshot.workout_id) && filter(snapshot))
    .map((snapshot) => ({ snapshot, workout: workouts.get(snapshot.workout_id)! }))
    .sort((a, b) => b.workout.performed_at.localeCompare(a.workout.performed_at))
}

/** ExerciseEditor candidates: history-only entries that are unlinked or already share this identity. */
export const historyCandidates = (exercise: Exercise) =>
  snapshots((snapshot) => snapshot.is_history_only && (snapshot.exercise_id === exercise.id || snapshot.exercise_id === null))

/** ExerciseHistoryMappingView: progress-tracked entries whose identity can be reviewed. */
export const linkableSnapshots = () => snapshots((snapshot) => !snapshot.is_history_only)

export type ExerciseMetadata = Pick<Exercise, 'equipment' | 'muscle' | 'measurement' | 'guidance' | 'track_progress'>

/**
 * ExerciseEditor.save with ExerciseTracking.promote: only explicitly selected entries join this
 * identity; names and earned XP stay unchanged.
 */
export async function saveExercise(exercise: Exercise, name: string, metadata: ExerciseMetadata, selected: string[]) {
  const trimmed = name.trim()
  if (!trimmed) throw new LibraryError('Enter an exercise name.')
  await transaction(async () => {
    if ((await libraryExercises()).some((other) => other.id !== exercise.id && sameName(other.name, trimmed))) {
      throw new LibraryError('That name is already in your library.')
    }
    await update<Exercise>('exercises', exercise.id, { name: trimmed, ...metadata })
    if (!metadata.track_progress || !supportsLogging(metadata)) return
    const allowed = new Set((await historyCandidates(exercise)).map(({ snapshot }) => snapshot.id))
    for (const id of selected) {
      if (allowed.has(id)) await update<WorkoutExercise>('workout_exercises', id, { exercise_id: exercise.id, is_history_only: false })
    }
  })
}

/** Removes the exercise from the library and every routine; past history is preserved. */
export async function deleteExercise(exercise: Exercise) {
  await transaction(async () => {
    const entries = live(await db.blueprint_exercises.where('exercise_id').equals(exercise.id).toArray())
    await softDelete('blueprint_exercises', entries.map((entry) => entry.id))
    await softDelete('exercises', [exercise.id])
  })
}

/** ExerciseIdentity.map: an explicit choice links a history entry, or leaves it unlinked. */
export async function linkSnapshot(snapshotID: string, exerciseID: string | null) {
  await update<WorkoutExercise>('workout_exercises', snapshotID, { exercise_id: exerciseID })
}
