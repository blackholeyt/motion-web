import { db } from '../../data/db'
import { insert, insertOne, live, nowISO, softDelete, transaction, update } from '../../data/repo'
import type { Blueprint, EditSnapshot, Exercise, SetLog, SupersetGroup, TrainingPlanTicket, WeightUnit, Workout, WorkoutExercise } from '../../data/types'
import { entryMeasurement } from '../../domain/guidance'
import { isMeasurement, loadInput, needsReps, quantityLabel } from '../../domain/measurement'
import * as timer from '../../domain/restTimer'
import { parseWeightText, quantityText, repsText, setIsValid, setUnit, startsRest, valuesForInput, type HistoricalSet, type Row } from '../../domain/sets'
import { sameName, supportsLogging } from '../../domain/catalogue'
import { entriesFor, isStartable } from '../../store/blueprints'
import { advancePlanFor } from '../../store/plan'
import { buildRecap, topWeights, type RecordAchievement } from '../../domain/progress'
import { improves } from '../../domain/measurement'
import { completedHistory, prepareStrengthReward, storedWorkout, type FinishReward } from '../../store/progress'
import { loadSession, type Session } from './session'

/*
 * ActiveWorkoutEngine.swift, written as transactions on the local database.
 * Every edit is saved immediately, so a reload or crash never loses a set.
 */

export interface WorkoutContext {
  trackReps: boolean
  globalRestSeconds: number
  unit: WeightUnit
  locale: string
  now?: () => Date
}

export class WorkoutError extends Error {}

const clock = (context: WorkoutContext) => (context.now ?? (() => new Date()))()

function emptyWorkout(name: string, date: Date, retrospective: boolean): Omit<Workout, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'> {
  return {
    name,
    performed_at: date.toISOString(),
    is_completed: false,
    is_freestyle: false,
    is_retrospective: retrospective,
    blueprint_id: null,
    notes: null,
    earned_xp: 0,
    draft_updated_at: nowISO(),
    plan_ticket: null,
    rest_timer: null,
    undo_history: null,
    cardio_type: null,
    cardio_seconds: null,
    cardio_distance_km: null,
    cardio_pace_s_per_km: null,
    source: 'motion',
  }
}

function emptySet(workoutID: string, exerciseID: string, index: number, warmUp = false): Omit<SetLog, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'> {
  return {
    workout_id: workoutID,
    workout_exercise_id: exerciseID,
    set_index: index,
    weight_kg: 0,
    reps: null,
    duration_seconds: null,
    is_completed: false,
    is_warm_up: warmUp,
    is_skipped: false,
    is_removed: false,
    draft_weight_text: null,
    draft_weight_unit: null,
    draft_reps_text: null,
    draft_duration_text: null,
  }
}

export async function latestDraft(): Promise<Workout | undefined> {
  const drafts = live(await db.workouts.toArray()).filter((workout) => !workout.is_completed)
  return drafts.sort((a, b) => (b.draft_updated_at ?? b.performed_at).localeCompare(a.draft_updated_at ?? a.performed_at))[0]
}

export async function startFromBlueprint(blueprint: Blueprint, options: { retrospectiveDate?: Date; planTicket?: TrainingPlanTicket; now?: Date } = {}): Promise<string> {
  const entries = await entriesFor(blueprint.id)
  if (entries.length === 0 || !entries.every(({ entry }) => entry.target_sets >= 1 && entry.target_sets <= 1000 && entry.warm_up_sets >= 0 && entry.warm_up_sets <= 20)) {
    throw new WorkoutError('Add exercises with at least one target set before starting.')
  }
  if (!isStartable(blueprint, entries)) throw new WorkoutError('Review this routine’s targets and measurement types before starting.')
  return transaction(async () => {
    const retrospective = options.retrospectiveDate !== undefined
    const workout = await insertOne<Workout>('workouts', {
      ...emptyWorkout(blueprint.name, options.retrospectiveDate ?? options.now ?? new Date(), retrospective),
      blueprint_id: blueprint.id,
      plan_ticket: retrospective ? null : (options.planTicket ?? null),
    })
    for (const [order, { entry, exercise }] of entries.entries()) {
      const snapshot = await insertOne<WorkoutExercise>('workout_exercises', {
        workout_id: workout.id,
        exercise_id: entry.exercise_id,
        exercise_name: exercise?.name ?? '',
        measurement: entryMeasurement(entry, exercise),
        guidance: entry.guidance,
        superset_group: entry.superset_group,
        rest_seconds: entry.guidance?.restSeconds ?? exercise?.rest_seconds ?? null,
        acknowledged_record_kg: null,
        is_history_only: !(exercise?.track_progress ?? false),
        is_removed: false,
        sort_order: order,
      })
      const count = entry.target_sets + entry.warm_up_sets
      await insert<SetLog>(
        'set_logs',
        Array.from({ length: count }, (_, index) => emptySet(workout.id, snapshot.id, index + 1, index < entry.warm_up_sets)),
      )
    }
    return workout.id
  })
}

export async function startFreestyle(options: { retrospectiveDate?: Date; now?: Date } = {}): Promise<string> {
  const retrospective = options.retrospectiveDate !== undefined
  const workout = await insertOne<Workout>('workouts', {
    ...emptyWorkout('Freestyle', options.retrospectiveDate ?? options.now ?? new Date(), retrospective),
    is_freestyle: true,
  })
  return workout.id
}

export async function discardDraft(workoutID: string) {
  await transaction(async () => {
    const exercises = await db.workout_exercises.where('workout_id').equals(workoutID).toArray()
    const sets = await db.set_logs.where('workout_id').equals(workoutID).toArray()
    await softDelete('set_logs', sets.map((set) => set.id))
    await softDelete('workout_exercises', exercises.map((exercise) => exercise.id))
    await softDelete('workouts', [workoutID])
  })
}

// MARK: - Undo

function snapshot(session: Session, context: WorkoutContext): EditSnapshot {
  return {
    freestyle: session.workout.is_freestyle,
    exercises: session.all.map(({ exercise, rows }) => ({
      id: exercise.id,
      order: exercise.sort_order,
      group: exercise.superset_group,
      removed: exercise.is_removed,
      sets: rows.map(({ set }) => ({
        id: set.id,
        unit: setUnit(set, context.unit),
        warmUp: set.is_warm_up,
        weight: quantityText(set, exercise.measurement, context.unit, context.locale),
        reps: repsText(set),
        completed: set.is_completed,
        skipped: set.is_skipped,
        removed: set.is_removed,
      })),
    })),
  }
}

async function checkpoint(session: Session, context: WorkoutContext) {
  const history = [...(session.workout.undo_history ?? []), snapshot(session, context)].slice(-100)
  await update<Workout>('workouts', session.workout.id, { undo_history: history })
  session.workout = { ...session.workout, undo_history: history }
}

async function restore(session: Session, state: EditSnapshot, context: WorkoutContext) {
  await update<Workout>('workouts', session.workout.id, { is_freestyle: state.freestyle })
  for (const { exercise, rows } of session.all) {
    const saved = state.exercises.find((candidate) => candidate.id === exercise.id)
    await update<WorkoutExercise>('workout_exercises', exercise.id, {
      is_removed: saved?.removed ?? true,
      ...(saved ? { sort_order: saved.order, superset_group: saved.group } : {}),
    })
    for (const { set } of rows) {
      const values = saved?.sets.find((candidate) => candidate.id === set.id)
      const unit = values?.unit ?? context.unit
      const input = values ? valuesForInput(set, exercise.measurement, values.weight, values.reps, unit, context.trackReps, context.locale) : {}
      await update<SetLog>('set_logs', set.id, {
        ...input,
        is_removed: values?.removed ?? true,
        is_skipped: values?.skipped ?? false,
        is_warm_up: values?.warmUp ?? false,
        is_completed: values?.completed ?? false,
      })
    }
  }
}

export async function undo(workoutID: string, context: WorkoutContext): Promise<boolean> {
  return transaction(async () => {
    const session = await requireDraft(workoutID)
    const history = session.workout.undo_history ?? []
    const previous = history.at(-1)
    if (!previous) return false
    await restore(session, previous, context)
    await update<Workout>('workouts', workoutID, { undo_history: history.slice(0, -1) })
    await normalize(workoutID, context)
    return true
  })
}

// MARK: - Shared save step

async function requireDraft(workoutID: string): Promise<Session> {
  const session = await loadSession(workoutID)
  if (!session || session.workout.is_completed) throw new WorkoutError('Workout unavailable')
  return session
}

/**
 * saveDraft: unfinished, skipped, removed or invalid sets are never completed, and a rest
 * timer whose source set was undone is cancelled.
 */
async function normalize(workoutID: string, context: WorkoutContext) {
  const session = await loadSession(workoutID)
  if (!session || session.workout.is_completed) return
  for (const { exercise, rows } of session.all) {
    for (const { set } of rows) {
      const broken = set.is_skipped || set.is_removed || exercise.is_removed || !setIsValid(set, exercise.measurement, context.unit, context.trackReps, context.locale)
      if (set.is_completed && broken) await update<SetLog>('set_logs', set.id, { is_completed: false })
    }
  }
  const fresh = (await loadSession(workoutID))!
  let rest = timer.restored(fresh.workout.rest_timer)
  if (rest.sourceSetID && !fresh.rows.some(({ set }) => set.id === rest.sourceSetID && set.is_completed && !set.is_skipped)) {
    rest = timer.cancel(rest)
  }
  await update<Workout>('workouts', workoutID, { rest_timer: rest, draft_updated_at: nowISO() })
}

/**
 * The steps every undoable edit shares: load the draft, decide whether the edit applies,
 * save an undo point, write the change and clean up (normalize).
 * `plan` returns the write, or nothing when the edit does not apply (then nothing is saved).
 */
async function undoableEdit(workoutID: string, context: WorkoutContext, plan: (session: Session) => (() => Promise<unknown>) | undefined) {
  await transaction(async () => {
    const session = await requireDraft(workoutID)
    const write = plan(session)
    if (!write) return
    await checkpoint(session, context)
    await write()
    await normalize(workoutID, context)
  })
}

/** An undoable edit of one set; `plan` also gets the set's row. */
function undoableSetEdit(workoutID: string, setID: string, context: WorkoutContext, plan: (row: Row, session: Session) => (() => Promise<unknown>) | undefined) {
  return undoableEdit(workoutID, context, (session) => plan(findRow(session, setID), session))
}

function findRow(session: Session, setID: string): Row {
  for (const { rows } of session.all) {
    const row = rows.find((candidate) => candidate.set.id === setID)
    if (row) return row
  }
  throw new WorkoutError('Workout unavailable')
}

// MARK: - Set input

export function updateSetInput(workoutID: string, setID: string, quantity: string, reps: string, context: WorkoutContext) {
  return undoableSetEdit(workoutID, setID, context, (row, session) => {
    if (row.set.is_skipped || row.set.is_removed) return
    const unchanged = quantity === quantityText(row.set, row.exercise.measurement, context.unit, context.locale) && reps === repsText(row.set)
    if (unchanged) return
    const unit = setUnit(row.set, context.unit)
    return async () => {
      await update<SetLog>('set_logs', setID, { ...valuesForInput(row.set, row.exercise.measurement, quantity, reps, unit, context.trackReps, context.locale), is_completed: false })
      // Changed values invalidate a rest timer that this set started.
      if (session.workout.rest_timer?.sourceSetID === setID) await update<Workout>('workouts', workoutID, { rest_timer: timer.cancel(timer.restored(session.workout.rest_timer)) })
    }
  })
}

/** "Use last" from history, or "Copy previous set" from the row above. */
export function reuseValues(workoutID: string, setID: string, source: { previous?: HistoricalSet; fromRowAbove?: boolean }, context: WorkoutContext) {
  return undoableSetEdit(workoutID, setID, context, (row, session) => {
    if (row.set.is_completed || row.set.is_skipped || row.set.is_removed) return
    const unit = setUnit(row.set, context.unit)
    let quantity = ''
    let reps = repsText(row.set)
    let exactKg: number | null = null
    if (source.fromRowAbove) {
      const above = rowAbove(session, row)
      if (!above) return
      const aboveUnit = setUnit(above.set, context.unit)
      const aboveText = quantityText(above.set, above.exercise.measurement, context.unit, context.locale)
      if (row.exercise.measurement === 'Duration') quantity = aboveText
      else exactKg = parseWeightText(aboveText, above.exercise.measurement, aboveUnit, above.set.weight_kg, context.locale)
      reps = repsText(above.set)
    } else if (source.previous) {
      const previous = source.previous
      if (row.exercise.measurement === 'Duration') quantity = previous.durationSeconds != null ? String(previous.durationSeconds) : ''
      else exactKg = Number.isFinite(previous.weight) && previous.weight >= 0 ? previous.weight : null
      reps = previous.reps && previous.reps > 0 ? String(previous.reps) : ''
    } else return
    if (row.exercise.measurement !== 'Duration') quantity = exactKg === null ? '' : loadInput(unit, exactKg, context.locale)
    if (!needsReps(row.exercise.measurement, context.trackReps)) reps = repsText(row.set)
    const values = valuesForInput(row.set, row.exercise.measurement, quantity, reps, unit, context.trackReps, context.locale)
    // Preserve the exact canonical value even when its display is rounded.
    if (exactKg !== null) values.weight_kg = exactKg
    return () => update<SetLog>('set_logs', setID, { ...values, is_completed: false })
  })
}

export function rowAbove(session: Session, row: Row): Row | undefined {
  const rows = session.exercises.find(({ exercise }) => exercise.id === row.exercise.id)?.rows ?? []
  const index = rows.findIndex((candidate) => candidate.set.id === row.set.id)
  const previous = index > 0 ? rows[index - 1] : undefined
  return previous && !previous.set.is_skipped && previous.set.is_warm_up === row.set.is_warm_up ? previous : undefined
}

export function clearValues(workoutID: string, setID: string, context: WorkoutContext) {
  return undoableSetEdit(workoutID, setID, context, (row) => {
    if (row.set.is_completed || row.set.is_skipped) return
    return () => update<SetLog>('set_logs', setID, valuesForInput(row.set, row.exercise.measurement, '', '', setUnit(row.set, context.unit), true, context.locale))
  })
}

export interface CompletionResult {
  completed: boolean
  startedRest: boolean
  error?: string
  errorValues?: string[]
  record?: RecordAchievement
}

export async function toggleCompletion(workoutID: string, setID: string, context: WorkoutContext): Promise<CompletionResult> {
  return transaction(async () => {
    const session = await requireDraft(workoutID)
    const row = findRow(session, setID)
    if (row.set.is_skipped || row.set.is_removed) return { completed: false, startedRest: false }
    const wasCompleted = row.set.is_completed
    const group = row.exercise.superset_group
    if (!wasCompleted && group) {
      const next = session.rows.find((candidate) => !candidate.set.is_completed && !candidate.set.is_skipped && candidate.exercise.superset_group === group)
      if (next && next.set.id !== setID) {
        return { completed: false, startedRest: false, error: 'Superset order: complete or skip {0} set {1} first.', errorValues: [next.exercise.exercise_name, String(next.set.set_index)] }
      }
    }
    if (!wasCompleted && !setIsValid(row.set, row.exercise.measurement, context.unit, context.trackReps, context.locale)) {
      return row.exercise.measurement === 'Duration'
        ? { completed: false, startedRest: false, error: 'Enter a duration greater than zero, up to 604800 seconds.' }
        : { completed: false, startedRest: false, error: 'Enter a nonnegative {0} and a positive rep count when required.', errorValues: [quantityLabel(row.exercise.measurement).toLowerCase()] }
    }
    await checkpoint(session, context)
    await update<SetLog>('set_logs', setID, { is_completed: !wasCompleted })
    const after = (await loadSession(workoutID))!
    const allDone = after.rows.length > 0 && after.rows.every((candidate) => candidate.set.is_completed)
    const updatedRow = findRow(after, setID)
    const begins = !session.workout.is_retrospective && !wasCompleted && !allDone && startsRest(updatedRow, after.exercises)
    let rest = timer.restored(after.workout.rest_timer)
    const now = clock(context)
    if (begins) rest = timer.start(rest, restSeconds(row.exercise, context), now, setID, row.exercise.exercise_name)
    else if (allDone || !wasCompleted) rest = timer.cancel(rest)
    await update<Workout>('workouts', workoutID, { rest_timer: rest })
    await normalize(workoutID, context)
    const record = wasCompleted ? undefined : await registerRecord(workoutID, setID)
    return { completed: !wasCompleted, startedRest: begins, record }
  })
}

export function toggleWarmUp(workoutID: string, setID: string, context: WorkoutContext) {
  return undoableSetEdit(workoutID, setID, context, (row) => {
    if (row.set.is_completed) return
    return () => update<SetLog>('set_logs', setID, { is_warm_up: !row.set.is_warm_up })
  })
}

export function toggleSkip(workoutID: string, setID: string, context: WorkoutContext) {
  return undoableSetEdit(workoutID, setID, context, (row) => {
    if (row.set.is_removed) return
    return () => update<SetLog>('set_logs', setID, { is_skipped: !row.set.is_skipped, is_completed: false })
  })
}

/** Removal only marks the set, so Undo edit can restore it. */
export function removeSet(workoutID: string, setID: string, context: WorkoutContext) {
  return undoableSetEdit(workoutID, setID, context, (row) => {
    if (row.set.is_removed) return
    return () => update<SetLog>('set_logs', setID, { is_removed: true, is_completed: false })
  })
}

export function addSet(workoutID: string, exerciseID: string, context: WorkoutContext) {
  return undoableEdit(workoutID, context, (session) => {
    const owner = session.all.find(({ exercise }) => exercise.id === exerciseID)
    if (!owner) return
    const nextIndex = Math.max(0, ...owner.rows.map(({ set }) => set.set_index)) + 1
    return () => insertOne<SetLog>('set_logs', emptySet(workoutID, exerciseID, nextIndex))
  })
}

export function setSuperset(workoutID: string, exerciseID: string, group: SupersetGroup | null, context: WorkoutContext) {
  return undoableEdit(workoutID, context, () => () => update<WorkoutExercise>('workout_exercises', exerciseID, { superset_group: group }))
}

export function removeExercise(workoutID: string, exerciseID: string, context: WorkoutContext) {
  return undoableEdit(workoutID, context, (session) => {
    const owner = session.all.find(({ exercise }) => exercise.id === exerciseID)
    if (!owner) return
    return async () => {
      await update<WorkoutExercise>('workout_exercises', exerciseID, { is_removed: true })
      for (const { set } of owner.rows) if (set.is_completed) await update<SetLog>('set_logs', set.id, { is_completed: false })
    }
  })
}

export function moveExercise(workoutID: string, exerciseID: string, offset: number, context: WorkoutContext) {
  return undoableEdit(workoutID, context, (session) => {
    const index = session.exercises.findIndex(({ exercise }) => exercise.id === exerciseID)
    const other = session.exercises[index + offset]
    if (index < 0 || !other) return
    const current = session.exercises[index]!.exercise
    // Swap the two positions.
    return async () => {
      await update<WorkoutExercise>('workout_exercises', current.id, { sort_order: other.exercise.sort_order })
      await update<WorkoutExercise>('workout_exercises', other.exercise.id, { sort_order: current.sort_order })
    }
  })
}

export async function enableFreestyle(workoutID: string, context: WorkoutContext) {
  await transaction(async () => {
    const session = await requireDraft(workoutID)
    if (session.workout.is_freestyle) return
    await checkpoint(session, context)
    await update<Workout>('workouts', workoutID, { is_freestyle: true })
  })
}

export async function updateNotes(workoutID: string, notes: string) {
  await update<Workout>('workouts', workoutID, { notes: notes === '' ? null : notes, draft_updated_at: nowISO() })
}

export interface AddExerciseRequest {
  existing?: Exercise
  customName?: string
  sets: number
}

/** Freestyle only. Custom names become history-only exercises, as in ActiveWorkoutEngine.addExercise. */
export async function addExercise(workoutID: string, request: AddExerciseRequest, context: WorkoutContext, options: { replacing?: string } = {}) {
  await transaction(async () => {
    const session = await requireDraft(workoutID)
    if (!(request.sets >= 1 && request.sets <= 100)) return
    if (!session.workout.is_freestyle && !options.replacing) return
    if (request.existing && !supportsLogging(request.existing)) throw new WorkoutError('Logging for this measurement type is not available yet.')
    const name = (request.existing?.name ?? request.customName ?? '').trim()
    if (!name) throw new WorkoutError('Enter an exercise name.')
    if (session.exercises.some(({ exercise }) => sameName(exercise.exercise_name, name))) {
      throw new WorkoutError('This exercise is already in your workout. Use Add Set instead.')
    }
    let source = request.existing
    if (!source) {
      const library = live(await db.exercises.toArray())
      if (library.some((exercise) => sameName(exercise.name, name))) throw new WorkoutError('Choose the existing exercise from the library to retain its tracking.')
      source = await insertOne<Exercise>('exercises', {
        name,
        goal_weight_kg: null,
        is_pr_tracked: false,
        rest_seconds: null,
        catalogue_id: null,
        equipment: 'Other',
        muscle: 'Other',
        measurement: 'Load & reps',
        guidance: '',
        track_progress: false,
      })
    }
    await checkpoint(session, context)
    if (options.replacing) {
      // Replacement is one undo action: performed sets keep their movement, unfinished ones are skipped.
      await update<Workout>('workouts', workoutID, { is_freestyle: true })
      const original = session.exercises.find(({ exercise }) => exercise.id === options.replacing)
      for (const { set } of original?.rows ?? []) if (!set.is_completed) await update<SetLog>('set_logs', set.id, { is_skipped: true })
    }
    const snapshot = await insertOne<WorkoutExercise>('workout_exercises', {
      workout_id: workoutID,
      exercise_id: source.id,
      exercise_name: name,
      measurement: isMeasurement(source.measurement) ? source.measurement : 'Load & reps',
      guidance: null,
      superset_group: null,
      rest_seconds: request.existing?.rest_seconds ?? null,
      acknowledged_record_kg: null,
      is_history_only: !source.track_progress,
      is_removed: false,
      sort_order: Math.max(-1, ...session.all.map(({ exercise }) => exercise.sort_order)) + 1,
    })
    await insert<SetLog>('set_logs', Array.from({ length: request.sets }, (_, index) => emptySet(workoutID, snapshot.id, index + 1)))
    await normalize(workoutID, context)
  })
}

// MARK: - Records

/**
 * ActiveWorkoutEngine.registerRecord: a recorded load above the all-time best of a PR-tracked
 * exercise. The first completed workout only sets the baseline; each new high is acknowledged once.
 */
async function registerRecord(workoutID: string, setID: string): Promise<RecordAchievement | undefined> {
  const session = await loadSession(workoutID)
  if (!session) return undefined
  const row = session.rows.find(({ set }) => set.id === setID)
  if (!row || row.set.is_warm_up || !row.set.is_completed || row.exercise.measurement !== 'Load & reps' || row.exercise.is_history_only) return undefined
  const source = row.exercise.exercise_id ? await db.exercises.get(row.exercise.exercise_id) : undefined
  if (!source?.is_pr_tracked || source.deleted_at !== null) return undefined
  const history = (await completedHistory()).filter((stored) => stored.workout.performed_at < session.workout.performed_at)
  const current = await storedWorkout(session.workout)
  const recap = buildRecap(current, history, [source])
  if (!recap.records.some((record) => record.id === source.id)) return undefined
  let baseline: number | undefined
  for (const stored of history) {
    const weight = topWeights(stored).get(source.id)
    if (weight !== undefined) baseline = Math.max(baseline ?? weight, weight)
  }
  if (baseline === undefined) return undefined
  const previous = Math.max(baseline, row.exercise.acknowledged_record_kg ?? baseline)
  if (!improves(row.set.weight_kg, previous)) return undefined
  await update<WorkoutExercise>('workout_exercises', row.exercise.id, { acknowledged_record_kg: row.set.weight_kg })
  return { id: source.id, name: row.exercise.exercise_name, previous, weight: row.set.weight_kg, goal: source.goal_weight_kg }
}

// MARK: - Rest

export function restSeconds(exercise: WorkoutExercise, context: WorkoutContext): number {
  return Math.min(3600, Math.max(5, exercise.rest_seconds ?? context.globalRestSeconds))
}

/** Rest changes made during training belong only to this session. */
export async function setRestDefault(exerciseID: string, seconds: number | null) {
  if (seconds !== null && !(seconds >= 5 && seconds <= 3600)) return
  await update<WorkoutExercise>('workout_exercises', exerciseID, { rest_seconds: seconds })
}

async function changeRest(workoutID: string, change: (state: ReturnType<typeof timer.restored>) => ReturnType<typeof timer.restored>) {
  await transaction(async () => {
    const workout = await db.workouts.get(workoutID)
    if (!workout || workout.is_completed || workout.is_retrospective) return
    await update<Workout>('workouts', workoutID, { rest_timer: change(timer.restored(workout.rest_timer)) })
  })
}

export const startRest = (workoutID: string, exercise: WorkoutExercise, context: WorkoutContext) =>
  changeRest(workoutID, (state) => timer.start(state, restSeconds(exercise, context), clock(context), null, exercise.exercise_name))
export const restartRest = (workoutID: string, now = new Date()) => changeRest(workoutID, (state) => timer.restart(state, now))
export const skipRest = (workoutID: string, now = new Date()) => changeRest(workoutID, (state) => timer.skip(state, now))
export const cancelRest = (workoutID: string) => changeRest(workoutID, timer.cancel)
/** Lengthens or shortens a running rest by `seconds` (±15 s buttons). */
export const adjustRest = (workoutID: string, seconds: number, now = new Date()) => changeRest(workoutID, (state) => timer.adjust(state, seconds, now))

/** Returns true only for an expiry consumed while the timer is being watched. */
export async function tickRest(workoutID: string, announce: boolean, now = new Date()): Promise<boolean> {
  const workout = await db.workouts.get(workoutID)
  if (!workout?.rest_timer || workout.is_completed) return false
  const current = timer.restored(workout.rest_timer)
  const { state, expired } = timer.tick(current, now)
  if (state.deadline !== current.deadline || state.noticeUntil !== current.noticeUntil) {
    await update<Workout>('workouts', workoutID, { rest_timer: state })
    return expired && announce
  }
  return false
}

// MARK: - Finish

export function canFinish(session: Session, context: WorkoutContext): boolean {
  return session.rows.some(({ set, exercise }) => set.is_completed && setIsValid(set, exercise.measurement, context.unit, context.trackReps, context.locale))
}

export function finishCounts(session: Session) {
  const all = session.all.flatMap(({ rows }) => rows)
  return {
    completed: session.rows.filter(({ set }) => set.is_completed).length,
    unfinished: session.rows.filter(({ set }) => !set.is_completed && !set.is_skipped).length,
    skipped: session.rows.filter(({ set }) => set.is_skipped).length,
    removed: all.filter(({ set, exercise }) => set.is_removed || exercise.is_removed).length,
    working: session.rows.filter(({ set }) => set.is_completed && !set.is_warm_up).length,
    warmUp: session.rows.filter(({ set }) => set.is_completed && set.is_warm_up).length,
  }
}

/**
 * Saves the session as completed, grants its XP once and advances the training plan,
 * all in one transaction. Returns null when the session cannot be finished.
 */
export async function finishWorkout(workoutID: string, context: WorkoutContext): Promise<FinishReward | null> {
  return transaction(async () => {
    await normalize(workoutID, context)
    const session = await loadSession(workoutID)
    if (!session || session.workout.is_completed) return null
    if (!canFinish(session, context)) return null
    const reward = await prepareStrengthReward(session.workout, clock(context))
    const completed = { ...session.workout, is_completed: true }
    await advancePlanFor(completed, clock(context))
    await update<Workout>('workouts', workoutID, { is_completed: true, rest_timer: timer.cancel(timer.restored(session.workout.rest_timer)) })
    return reward
  })
}

