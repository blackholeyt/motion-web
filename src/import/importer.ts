import { decodeWebBackup, isWebBackup, type WebBackupSource } from './webBackup'
import { db, syncedTables } from '../data/db'
import { derivedID, stableID } from '../data/ids'
import { enqueue, live, stamp, transaction, update, type Draft } from '../data/repo'
import type {
  Blueprint,
  BlueprintExercise,
  BodyWeight,
  EditSnapshot,
  Exercise,
  Guidance,
  LegacyImport,
  Measurement,
  Profile,
  RestTimerState,
  SetLog,
  SyncedRecord,
  SyncedTable,
  TrainingPlanRecord,
  TrainingPlanTicket,
  WeightReward,
  Workout,
  WorkoutAward,
  WorkoutExercise,
  Progression,
  CatalogueMeasurement,
  SupersetGroup,
  WeightUnit,
} from '../data/types'
import type { TrainingSchedule } from '../domain/schedule'
import { updateSettings, type Appearance } from '../settings/deviceSettings'
import { ensureProfile } from '../store/profile'
import { csvKind, decodeCompleteCSV, parseCSV } from './csv'
import { decodeOlderCSV, decodeWorkoutCSV } from './olderCSV'
import { ImportError, type ImportIssue } from './errors'
import {
  appleEpochOffset,
  decodeBackup,
  isLegacyDay,
  type LegacyBackup,
  type LegacyGuidance,
  type LegacyRestTimer,
  type LegacySchedule,
  type LegacySession,
  type LegacyTicket,
  type LegacyEditSnapshot,
} from './legacyBackup'

/*
 * Import of the iOS app's full backup (JSON "Export Backup" or CSV v18 "Export CSV"), and since
 * phase 5b of the older CSV formats converted to the same backup (olderCSV.ts), following
 * MotionBackupRestore.swift: missing records are added, existing ones stay untouched (matched by id,
 * or by day for daily records), no XP is calculated, profile and preferences are applied.
 * Health and Strava workouts are skipped and counted (decision of 02.11.2026), drafts are kept.
 * A receipt in legacy_imports remembers the file's fingerprint so a repeated import is pointed out.
 */

const maximumJSONBytes = 32 * 1024 * 1024
const maximumCSVBytes = 64 * 1024 * 1024

/** Which file the backup came from: the full backup, a Motion CSV before version 18, or the plain workout CSV. */
export type ImportOrigin = { kind: 'backup' } | { kind: 'olderCSV'; version: number } | { kind: 'workoutCSV' } | { kind: 'webBackup' }

export interface ImportSource {
  fileName: string
  format: 'json' | 'csv'
  origin: ImportOrigin
  backup: LegacyBackup
  fingerprint: string
}

export interface ImportCounts {
  workouts: number
  drafts: number
  sets: number
  exercises: number
  routines: number
  bodyWeights: number
  xpReceipts: number
  records: number
  xp: number
  healthWorkouts: number
}

export interface SampleWorkout {
  name: string
  performedAt: string
  completed: boolean
  exercises: { name: string; measurement: Measurement; sets: { weight: number; reps: number | null; duration: number | null; warmUp: boolean; completed: boolean }[] }[]
}

export interface ImportSummary {
  fileName: string
  format: 'json' | 'csv'
  origin: ImportOrigin
  /** For older CSV files, which carry no export date, the newest date in the file. */
  exportedAt: string
  /** What the file holds; healthWorkouts are the ones that are skipped. */
  file: ImportCounts
  /** What is new on this device; the rest already exists and stays unchanged. */
  added: ImportCounts
  samples: SampleWorkout[]
  previous: LegacyImport | null
}

// Reading the file ------------------------------------------------------------------------------

/** JSON or CSV, recognised by content; every CSV format turns into the same backup object. */
/** A file for the import sheet: a backup of the iOS app or Motion Web's own backup. */
export type BackupFile = { kind: 'ios'; source: ImportSource } | { kind: 'web'; source: WebBackupSource }

export async function readImportFile(file: File): Promise<BackupFile> {
  return readBackupText(await file.text(), file.name, file.size)
}

export async function readBackupText(text: string, fileName: string, size = new TextEncoder().encode(text).length): Promise<BackupFile> {
  const json = text.replace(/^\uFEFF/, '')
  if (json.trimStart().startsWith('{') && size <= maximumJSONBytes) {
    let object: unknown = null
    try {
      object = JSON.parse(json)
    } catch {
      // Reported by readImportText below.
    }
    if (isWebBackup(object)) return { kind: 'web', source: decodeWebBackup(object, fileName) }
  }
  return { kind: 'ios', source: await readImportText(text, fileName, size) }
}

export async function readImportText(text: string, fileName: string, size = new TextEncoder().encode(text).length): Promise<ImportSource> {
  const isJSON = text.replace(/^﻿/, '').trimStart().startsWith('{')
  if (size > (isJSON ? maximumJSONBytes : maximumCSVBytes)) throw new ImportError('tooLarge')
  let object: unknown
  let origin: ImportOrigin = { kind: 'backup' }
  if (isJSON) {
    try {
      object = JSON.parse(text.replace(/^﻿/, ''))
    } catch {
      throw new ImportError('unreadable')
    }
  } else {
    const rows = parseCSV(text)
    const kind = csvKind(rows)
    if (kind === 'unknown') throw new ImportError('unreadable')
    if (kind === 'olderBackup') {
      const older = decodeOlderCSV(rows)
      object = older.backup
      origin = { kind: 'olderCSV', version: older.version }
    } else if (kind === 'workoutCSV') {
      object = decodeWorkoutCSV(rows)
      origin = { kind: 'workoutCSV' }
    } else object = decodeCompleteCSV(rows)
  }
  const backup = decodeBackup(object, { fromOlderCSV: origin.kind !== 'backup' })
  return { fileName, format: isJSON ? 'json' : 'csv', origin, backup, fingerprint: await fingerprint(object) }
}

/** SHA-256 of the backup with sorted keys, so the JSON and CSV export of one backup match. */
async function fingerprint(object: unknown): Promise<string> {
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical((value as Record<string, unknown>)[key])]))
        : value
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(object)))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Conversion ------------------------------------------------------------------------------------

const lower = (value: string) => value.toLowerCase()
const lowerOrNull = (value: string | null | undefined) => (value ? value.toLowerCase() : null)
const iso = (seconds: number) => new Date((seconds + appleEpochOffset) * 1000).toISOString()
const isoOrNull = (seconds: number | null | undefined) => (seconds === null || seconds === undefined ? null : iso(seconds))
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** "1-2026-11-2" → "2026-11-02". Only Gregorian days of the common era exist in the web app. */
export function webDay(key: string): string | null {
  if (!isLegacyDay(key)) return null
  const [era, year, month, day] = key.split('-').map(Number) as [number, number, number, number]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (era !== 1 || month > 12 || date.getUTCDate() !== day) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function guidance(value: LegacyGuidance | null | undefined): Guidance | null {
  if (!value) return null
  return {
    measurement: (value.measurement as Measurement | null | undefined) ?? null,
    minimumReps: value.minimumReps ?? null,
    maximumReps: value.maximumReps ?? null,
    durationSeconds: value.durationSeconds ?? null,
    restSeconds: value.restSeconds ?? null,
    notes: value.notes ?? '',
    progression: (value.progression as Progression | null | undefined) ?? 'Not selected',
  }
}

function ticket(value: LegacyTicket, day: string): TrainingPlanTicket {
  return {
    planID: lower(value.planID),
    revision: lower(value.revision),
    entryID: lower(value.entryID),
    rotationToken: lowerOrNull(value.rotationToken),
    date: iso(value.date),
    dayKey: day,
  }
}

function restTimer(value: LegacyRestTimer): RestTimerState {
  return {
    deadline: isoOrNull(value.deadline),
    noticeUntil: isoOrNull(value.noticeUntil),
    duration: value.duration ?? 90,
    remaining: value.remaining ?? 0,
    sourceSetID: lowerOrNull(value.sourceSetID),
    exerciseName: value.exerciseName ?? null,
  }
}

function undoHistory(value: LegacyEditSnapshot[]): EditSnapshot[] {
  return value.map((snapshot) => ({
    freestyle: snapshot.freestyle,
    exercises: snapshot.exercises.map((exercise) => ({
      id: lower(exercise.id),
      order: exercise.order,
      group: (exercise.group as SupersetGroup | null | undefined) ?? null,
      removed: exercise.removed,
      sets: exercise.sets.map((set) => ({
        id: lower(set.id),
        unit: (set.unit as WeightUnit | null | undefined) ?? 'kg',
        warmUp: set.warmUp ?? false,
        weight: set.weight,
        reps: set.reps,
        completed: set.completed,
        skipped: set.skipped,
        removed: set.removed,
      })),
    })),
  }))
}

/** Consumed plan slots ("<entry>/<token or day>", "cardio/<day>") with web days and lower-case ids. */
function consumedKey(key: string): string {
  return key
    .split('/')
    .map((part) => (isLegacyDay(part) ? (webDay(part) ?? part) : uuidPattern.test(part) ? lower(part) : part))
    .join('/')
}

function schedule(value: LegacySchedule): TrainingSchedule {
  return {
    id: lower(value.id),
    revision: lower(value.revision),
    enabled: value.enabled,
    mode: value.mode as TrainingSchedule['mode'],
    startDate: iso(value.startDate),
    entries: value.entries.map((entry) => ({ id: lower(entry.id), blueprintID: lower(entry.blueprintID), weekday: entry.weekday ?? null })),
    weekdays: [...value.weekdays].sort((a, b) => a - b),
    cursor: value.cursor,
    rotationToken: lower(value.rotationToken),
    notBefore: isoOrNull(value.notBefore),
    consumed: value.consumed.map(consumedKey),
  }
}

const isHealth = (session: LegacySession) => Boolean(session.healthWorkoutID)

// Counting --------------------------------------------------------------------------------------

const emptyCounts = (): ImportCounts => ({
  workouts: 0,
  drafts: 0,
  sets: 0,
  exercises: 0,
  routines: 0,
  bodyWeights: 0,
  xpReceipts: 0,
  records: 0,
  xp: 0,
  healthWorkouts: 0,
})

/** Completed sets that count in the old app's history: not removed, not skipped, in a live exercise. */
const doneSets = (session: LegacySession) =>
  session.isCompleted ? session.exercises.flatMap((exercise) => (exercise.isRemoved ? [] : exercise.sets.filter((set) => set.isCompleted && !set.isRemoved))) : []

function countSessions(counts: ImportCounts, sessions: LegacySession[]) {
  for (const session of sessions) {
    if (session.isCompleted) counts.workouts++
    else counts.drafts++
    counts.sets += doneSets(session).length
    if (session.isCompleted) counts.xp += session.earnedXP
  }
}

/** Crowned exercises with at least one completed working set with load: the ones that show a record. */
function countRecords(backup: LegacyBackup, sessions: LegacySession[]): number {
  const crowned = new Set(backup.library.filter((exercise) => exercise.isPRTracked).map((exercise) => lower(exercise.id)))
  const withRecord = new Set<string>()
  for (const session of sessions.filter((candidate) => candidate.isCompleted)) {
    for (const exercise of session.exercises) {
      const id = lowerOrNull(exercise.exerciseID)
      if (!id || !crowned.has(id) || exercise.isRemoved || exercise.isHistoryOnly || exercise.measurementType !== 'Load & reps') continue
      if (exercise.sets.some((set) => set.isCompleted && !set.isRemoved && !set.isWarmUp && set.weight > 0)) withRecord.add(id)
    }
  }
  return withRecord.size
}

function samples(sessions: LegacySession[]): SampleWorkout[] {
  return [...sessions]
    .sort((a, b) => b.date - a.date)
    .slice(0, 3)
    .map((session) => ({
      name: session.name,
      performedAt: iso(session.date),
      completed: session.isCompleted,
      exercises: [...session.exercises]
        .filter((exercise) => !exercise.isRemoved)
        .sort((a, b) => a.draftOrder - b.draftOrder)
        .map((exercise) => ({
          name: exercise.exerciseName,
          measurement: exercise.measurementType as Measurement,
          sets: [...exercise.sets]
            .filter((set) => !set.isRemoved)
            .sort((a, b) => a.setIndex - b.setIndex)
            .map((set) => ({ weight: set.weight, reps: set.reps ?? null, duration: set.durationSeconds ?? null, warmUp: set.isWarmUp, completed: set.isCompleted })),
        })),
    }))
}

// Planning and writing --------------------------------------------------------------------------

type Writes = Partial<Record<SyncedTable, SyncedRecord[]>>

interface Prepared {
  summary: ImportSummary
  writes: Writes
  profile: Partial<Profile> | null
}

async function keys(table: SyncedTable): Promise<Set<string>> {
  return new Set((await db.table(table).toCollection().primaryKeys()) as string[])
}

/**
 * Reads only the local database, so it can run inside the import transaction and again for the
 * preview. Throws when a day cannot be converted or a new workout reuses ids of another workout.
 */
async function prepare(source: ImportSource): Promise<Prepared> {
  const { backup } = source
  const issues: ImportIssue[] = []
  const day = (key: string, path: string) => {
    const converted = webDay(key)
    if (!converted) issues.push({ path, reason: 'unsupported calendar day' })
    return converted ?? ''
  }
  const writes: Writes = {}
  const add = <T extends SyncedRecord>(table: SyncedTable, draft: Draft<T>) => {
    const record = stamp<T>(draft)
    ;(writes[table] ??= []).push(record)
    return record
  }
  const sessions = backup.workouts.filter((session) => !isHealth(session))
  const file = emptyCounts()
  countSessions(file, sessions)
  file.exercises = backup.library.length
  file.routines = backup.routines.length
  file.bodyWeights = backup.weights.length
  file.xpReceipts = backup.workoutAwards.length + backup.weightRewards.length
  file.records = countRecords(backup, sessions)
  file.xp += backup.weightRewards.reduce((sum, reward) => sum + reward.earnedXP, 0)
  file.healthWorkouts = backup.workouts.length - sessions.length
  const added = emptyCounts()
  added.healthWorkouts = file.healthWorkouts

  // Library
  const exerciseIDs = await keys('exercises')
  for (const exercise of backup.library) {
    const id = lower(exercise.id)
    if (exerciseIDs.has(id)) continue
    const metadata = exercise.metadata
    add<Exercise>('exercises', {
      id,
      name: exercise.name,
      goal_weight_kg: exercise.goalWeight ?? null,
      is_pr_tracked: exercise.isPRTracked,
      rest_seconds: exercise.restSeconds ?? null,
      catalogue_id: metadata?.catalogueID ?? null,
      equipment: metadata?.equipment ?? 'Other',
      muscle: metadata?.muscle ?? 'Other',
      // The catalogue also contains browse-only measurement types; they are kept unchanged.
      measurement: (metadata?.measurement as CatalogueMeasurement | null | undefined) ?? 'Load & reps',
      guidance: metadata?.guidance ?? '',
      track_progress: metadata?.trackProgress ?? true,
    })
    exerciseIDs.add(id)
    added.exercises++
  }

  // Routines with their entries; an entry id derives from routine and exercise.
  const blueprintIDs = await keys('blueprints')
  const entryIDs = await keys('blueprint_exercises')
  for (const routine of backup.routines) {
    const id = lower(routine.id)
    if (blueprintIDs.has(id)) continue
    add<Blueprint>('blueprints', {
      id,
      name: routine.name,
      cardio_type: routine.cardioType ?? null,
      cardio_minutes: routine.cardioMinutes ?? null,
      cardio_distance_km: routine.cardioDistance ?? null,
    })
    for (const entry of routine.exercises) {
      const exerciseID = lower(entry.exerciseID)
      let entryID = derivedID(`blueprint_exercises/${id}/${exerciseID}`)
      for (let copy = 2; entryIDs.has(entryID); copy++) entryID = derivedID(`blueprint_exercises/${id}/${exerciseID}/${copy}`)
      entryIDs.add(entryID)
      add<BlueprintExercise>('blueprint_exercises', {
        id: entryID,
        blueprint_id: id,
        exercise_id: exerciseID,
        sort_order: entry.sortOrder,
        target_sets: entry.targetSets,
        warm_up_sets: entry.warmUpSets,
        superset_group: (entry.supersetGroup as SupersetGroup | null | undefined) ?? null,
        guidance: guidance(entry.guidance),
      })
    }
    blueprintIDs.add(id)
    added.routines++
  }

  const workouts = new Map((await db.workouts.toArray()).map((workout) => [workout.id, workout]))
  // Older CSV files have no ids for most workouts. Like MotionBackupCSV.restore, a workout with the
  // same name, completion and second as one on this device is the same workout and stays unchanged.
  const sameWorkout = new Set<string>()
  if (source.origin.kind !== 'backup') {
    const second = (completed: boolean, name: string, unix: number) => `${completed}\u001f${name}\u001f${Math.floor(unix)}`
    const existing = new Set([...workouts.values()].map((workout) => second(workout.is_completed, workout.name, Date.parse(workout.performed_at) / 1000)))
    for (const session of backup.workouts) {
      if (!workouts.has(lower(session.id)) && existing.has(second(session.isCompleted, session.name, session.date + appleEpochOffset))) sameWorkout.add(lower(session.id))
    }
  }

  // XP receipts: an existing receipt wins; never calculate fresh import XP.
  const awards = new Map((await db.workout_awards.toArray()).map((award) => [award.workout_id, award.earned_xp]))
  const addAward = (workoutID: string, xp: number) => {
    add<WorkoutAward>('workout_awards', { id: stableID('workout_awards', workoutID), workout_id: workoutID, earned_xp: xp })
    awards.set(workoutID, xp)
    added.xpReceipts++
  }
  for (const award of backup.workoutAwards) {
    const workoutID = lower(award.sessionID)
    if (awards.has(workoutID) || sameWorkout.has(workoutID)) continue
    const existing = workouts.get(workoutID)
    addAward(workoutID, existing?.is_completed ? existing.earned_xp : award.earnedXP)
  }

  // Workouts and drafts
  const snapshotIDs = await keys('workout_exercises')
  const setIDs = await keys('set_logs')
  const newSessions: LegacySession[] = []
  for (const [index, session] of backup.workouts.entries()) {
    const id = lower(session.id)
    if (isHealth(session) || workouts.has(id) || sameWorkout.has(id)) continue
    const path = `workouts[${index}]`
    for (const exercise of session.exercises) {
      if (snapshotIDs.has(lower(exercise.id))) issues.push({ path, reason: 'exercise snapshot already belongs to another workout' })
      snapshotIDs.add(lower(exercise.id))
      for (const set of exercise.sets) {
        if (setIDs.has(lower(set.id))) issues.push({ path, reason: 'set already belongs to another workout' })
        setIDs.add(lower(set.id))
      }
    }
    const earnedXP = session.isCompleted ? (awards.get(id) ?? session.earnedXP) : session.earnedXP
    const plan = session.trainingPlanTicket
    const workout = add<Workout>('workouts', {
      id,
      name: session.name,
      performed_at: iso(session.date),
      is_completed: session.isCompleted,
      is_freestyle: session.isFreestyle,
      is_retrospective: session.isRetrospective ?? false,
      blueprint_id: lowerOrNull(session.blueprintID),
      notes: session.notes ?? null,
      earned_xp: earnedXP,
      draft_updated_at: isoOrNull(session.draftUpdatedAt),
      plan_ticket: plan ? ticket(plan, day(plan.dayKey, `${path}.trainingPlanTicket`)) : null,
      rest_timer: session.restTimer ? restTimer(session.restTimer) : null,
      undo_history: session.undoHistory ? undoHistory(session.undoHistory) : null,
      cardio_type: session.cardioType ?? null,
      cardio_seconds: session.cardioSeconds ?? null,
      cardio_distance_km: session.cardioDistance ?? null,
      cardio_pace_s_per_km: session.cardioPace ?? null,
      source: 'motion',
    })
    for (const exercise of session.exercises) {
      const snapshot = add<WorkoutExercise>('workout_exercises', {
        id: lower(exercise.id),
        workout_id: id,
        exercise_id: lowerOrNull(exercise.exerciseID),
        exercise_name: exercise.exerciseName,
        measurement: exercise.measurementType as Measurement,
        guidance: guidance(exercise.guidance),
        superset_group: (exercise.supersetGroup as SupersetGroup | null | undefined) ?? null,
        rest_seconds: exercise.restSeconds ?? null,
        acknowledged_record_kg: exercise.acknowledgedRecordWeight ?? null,
        is_history_only: exercise.isHistoryOnly,
        is_removed: exercise.isRemoved,
        sort_order: exercise.draftOrder,
      })
      for (const set of exercise.sets) {
        add<SetLog>('set_logs', {
          id: lower(set.id),
          workout_id: id,
          workout_exercise_id: snapshot.id,
          set_index: set.setIndex,
          weight_kg: set.weight,
          reps: set.reps ?? null,
          duration_seconds: set.durationSeconds ?? null,
          is_completed: set.isCompleted,
          is_warm_up: set.isWarmUp,
          is_skipped: set.isSkipped,
          is_removed: set.isRemoved,
          draft_weight_text: set.draftWeightText ?? null,
          draft_weight_unit: (set.draftWeightUnit as WeightUnit | null | undefined) ?? null,
          draft_reps_text: set.draftRepsText ?? null,
          draft_duration_text: set.draftDurationText ?? null,
        })
      }
    }
    if (session.isCompleted && !awards.has(id)) addAward(id, workout.earned_xp)
    workouts.set(id, workout)
    newSessions.push(session)
  }
  countSessions(added, newSessions)
  added.records = countRecords(backup, newSessions)

  // Daily records: one per day, an existing day stays unchanged.
  const weightIDs = await keys('body_weights')
  backup.weights.forEach((weight, index) => {
    const key = day(weight.dayKey, `weights[${index}]`)
    const id = stableID('body_weights', key)
    if (!key || weightIDs.has(id)) return
    add<BodyWeight>('body_weights', { id, day: key, recorded_at: iso(weight.recordedAt), kilograms: weight.kilograms })
    added.bodyWeights++
  })
  const rewardIDs = await keys('weight_rewards')
  backup.weightRewards.forEach((reward, index) => {
    const key = day(reward.dayKey, `weightRewards[${index}]`)
    const id = stableID('weight_rewards', key)
    if (!key || rewardIDs.has(id)) return
    add<WeightReward>('weight_rewards', { id, day: key, awarded_at: iso(reward.awardedAt), earned_xp: reward.earnedXP })
    added.xpReceipts++
    added.xp += reward.earnedXP
  })

  // The plan is only adopted when this device has none.
  if (backup.trainingPlan && live(await db.training_plans.toArray()).length === 0) {
    add<TrainingPlanRecord>('training_plans', { id: stableID('training_plans'), schedule: schedule(backup.trainingPlan) })
  }

  if (issues.length > 0) throw new ImportError(issues.some((issue) => issue.reason.includes('belongs')) ? 'conflict' : 'invalid', { issues: issues.slice(0, 50) })

  const profile = await profileChange(backup)
  const previous = (await db.legacy_imports.where('fingerprint').equals(source.fingerprint).first()) ?? null
  return {
    summary: { fileName: source.fileName, format: source.format, origin: source.origin, exportedAt: iso(backup.exportedAt), file, added, samples: samples(sessions), previous },
    writes,
    profile,
  }
}

/** LocalProfile and allowlisted preferences from the backup; goals already celebrated are merged. */
async function profileChange(backup: LegacyBackup): Promise<Partial<Profile> | null> {
  const current = live(await db.profiles.toArray())[0]
  const preferences = backup.preferences
  const change: Partial<Profile> = {}
  if (preferences) {
    change.preferences = {
      quietMode: preferences.quietMode,
      bodyWeightTrackingVisible: preferences.bodyWeightTrackingVisible,
      haptics: preferences.xpHapticsEnabled,
      trackReps: preferences.isRepTrackingEnabled,
      restTimerSeconds: preferences.restTimerSeconds,
      restNotifications: current?.preferences.restNotifications ?? false,
    }
  }
  if (preferences?.bodyWeightGoal) change.body_weight_goal = preferences.bodyWeightGoal as Profile['body_weight_goal']
  const profile = backup.profile
  if (profile) {
    change.name = profile.name
    change.body_weight_unit = profile.weightUnit as WeightUnit
    change.load_unit = profile.exerciseLoadUnit as WeightUnit
    change.distance_unit = profile.distanceUnitPreference as Profile['distance_unit']
    change.target_weight_kg = profile.targetWeightKilograms ?? null
    change.celebrated_weight_goals = [...new Set([...(current?.celebrated_weight_goals ?? []), ...(profile.celebratedWeightGoals ?? [])])]
    change.created_at = iso(profile.createdAt)
  }
  return Object.keys(change).length > 0 ? change : null
}

/** Counts, samples and a possible earlier import, without writing anything. */
export async function previewImport(source: ImportSource): Promise<ImportSummary> {
  return (await db.transaction('r', syncedTables.map((name) => db.table(name)), () => prepare(source))).summary
}

/** One transaction: either everything new is written and queued for sync, or nothing. */
export async function runImport(source: ImportSource, now = new Date()): Promise<ImportSummary> {
  const summary = await transaction(async () => {
    const prepared = await prepare(source)
    for (const [table, records] of Object.entries(prepared.writes) as [SyncedTable, SyncedRecord[]][]) {
      await db.table(table).bulkPut(records)
      await enqueue(
        table,
        records.map((record) => record.id),
      )
    }
    if (prepared.profile) {
      const profile = await ensureProfile()
      await update<Profile>('profiles', profile.id, prepared.profile)
    }
    if (!prepared.summary.previous) {
      const receipt = stamp<LegacyImport>({
        id: derivedID(`legacy_imports/${source.fingerprint}`),
        fingerprint: source.fingerprint,
        file_name: source.fileName,
        source_format: source.format,
        exported_at: prepared.summary.exportedAt,
        imported_at: now.toISOString(),
        counts: { file: { ...prepared.summary.file }, added: { ...prepared.summary.added } },
      })
      await db.legacy_imports.put(receipt)
      await enqueue('legacy_imports', [receipt.id])
    }
    return prepared.summary
  })
  // Device-bound preferences are applied after the save succeeded, as in MotionBackupRestore.swift.
  const preferences = source.backup.preferences
  if (preferences) updateSettings({ appearance: preferences.appearance as Appearance, openingAnimation: preferences.launchAnimationEnabled })
  return summary
}
