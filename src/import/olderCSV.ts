import { derivedID } from '../data/ids'
import { ImportError, type ImportIssue } from './errors'
import { cardioActivities, maximumIssues, measurements, uuidPattern } from './shared'
import {
  appleEpochOffset,
  type LegacyBackup,
  type LegacyEditSnapshot,
  type LegacyGuidance,
  type LegacyLibraryExercise,
  type LegacyMetadata,
  type LegacyRestTimer,
  type LegacyRoutine,
  type LegacySession,
  type LegacySessionExercise,
  type LegacySet,
} from './legacyBackup'

/*
 * Phase 5b: the CSV formats the iOS app wrote before version 18. "motion_backup_v1" to "v17"
 * (MotionBackupCSV.swift) hold one row per record, linked by keys within the file; the plain
 * workout CSV (WorkoutCSV.swift) holds one row per set. Both are turned into the same backup object
 * as "Export Backup", so the rules and the importer of phase 5a apply unchanged. Row checks follow
 * MotionBackupCSV.restore and WorkoutCSVImporter, collecting every problem with its row number.
 *
 * Differences to the full backup: dates are Unix seconds, not seconds since 2001. Workouts without a
 * draft id, exercises without a snapshot id and sets without a set id get ids derived from their
 * content, so importing the same file again finds them. Preferences and the training plan do not
 * exist in these files. Sample workouts are left out like in the full backup.
 */

const versionAdditions: string[][] = [
  ['key', 'date', 'name', 'parent_key', 'set_index', 'weight_kg', 'reps', 'completed', 'earned_xp', 'is_sample', 'weight_unit'],
  ['is_freestyle', 'history_only'],
  ['cardio_type', 'cardio_seconds', 'cardio_km', 'cardio_pace'],
  ['health_workout_id'],
  ['exercise_id', 'snapshot_id', 'pr_tracked', 'goal_kg'],
  ['draft_id', 'draft_updated', 'draft_order', 'draft_weight', 'draft_reps', 'blueprint_id'],
  ['edit_undo', 'removed', 'set_id', 'skipped'],
  ['exercise_load_unit', 'distance_unit', 'draft_weight_unit'],
  ['rest_seconds', 'rest_timer', 'acknowledged_record_kg'],
  ['exercise_metadata'],
  ['measurement_type', 'duration_seconds', 'warm_up', 'superset_group', 'draft_duration', 'warm_up_sets', 'working_sets'],
  ['routine_guidance'],
  [],
  ['health_details'],
  ['is_retrospective'],
  ['target_weight_kg', 'nutrition_snapshot_json'],
  ['workout_notes'],
]

/** The header of each version: "motion_backup_v<n>" followed by every column added up to it. */
export const olderHeaders: string[][] = versionAdditions.map((_, index) => [
  `motion_backup_v${index + 1}`,
  ...versionAdditions.slice(0, index + 1).flat(),
])

export const workoutCSVHeader = ['workout_date', 'workout_name', 'exercise', 'set_index', 'weight_kg', 'reps', 'set_completed']

/** Column positions of the newest older format (v17); earlier files are padded with empty values. */
const C = {
  type: 0, key: 1, date: 2, name: 3, parent: 4, setIndex: 5, weight: 6, reps: 7, completed: 8, xp: 9, sample: 10, weightUnit: 11,
  freestyle: 12, historyOnly: 13, cardioType: 14, cardioSeconds: 15, cardioKm: 16, cardioPace: 17, healthID: 18, exerciseID: 19,
  snapshotID: 20, prTracked: 21, goal: 22, draftID: 23, draftUpdated: 24, order: 25, draftWeight: 26, draftReps: 27, blueprintID: 28,
  undo: 29, removed: 30, setID: 31, skipped: 32, loadUnit: 33, distanceUnit: 34, draftUnit: 35, rest: 36, restTimer: 37,
  acknowledged: 38, metadata: 39, measurement: 40, duration: 41, warmUp: 42, superset: 43, draftDuration: 44, warmUpSets: 45,
  workingSets: 46, guidance: 47, healthDetails: 48, retrospective: 49, targetWeight: 50, nutrition: 51, notes: 52,
} as const
const columnCount = olderHeaders[olderHeaders.length - 1]!.length

/** The columns each record type may fill (MotionBackupCSV.restore); every other column must be empty. */
const allowedColumns: Record<string, number[]> = {
  workout: [0, 1, 2, 3, 8, 9, 10, 12, 14, 15, 16, 17, 18, 23, 24, 28, 29, 37, 48, 49, 52],
  exercise: [0, 1, 3, 4, 13, 19, 20, 25, 30, 36, 38, 40, 43, 47],
  library_exercise: [0, 3, 19, 21, 22, 36, 39],
  set: [0, 4, 5, 6, 7, 8, 26, 27, 30, 31, 32, 35, 41, 42, 44],
  blueprint: [0, 1, 3, 14, 15, 16],
  blueprint_exercise: [0, 4, 19, 25, 43, 45, 46, 47],
  profile: [0, 2, 3, 11, 33, 34, 50],
  nutrition: [0, 51],
  body_weight: [0, 1, 2, 6],
  weight_reward: [0, 1, 2, 9],
  workout_award: [0, 1, 9],
}

const numberPattern = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/

const sameRow = (row: string[], header: string[]) => row.length === header.length && row.every((value, index) => value === header[index])

/** 1–17 for an older Motion backup header, null otherwise. */
export function olderVersion(header: string[]): number | null {
  const index = olderHeaders.findIndex((candidate) => sameRow(header, candidate))
  return index < 0 ? null : index + 1
}

export const isWorkoutCSV = (header: string[]) => sameRow(header, workoutCSVHeader)

// Values ---------------------------------------------------------------------------------------

const decimal = (value: string) => (numberPattern.test(value) ? Number(value) : NaN)
const integer = (value: string) => (/^[+-]?\d+$/.test(value) ? Number(value) : NaN)
const optionalDecimal = (value: string) => (value === '' ? null : decimal(value))
const optionalInteger = (value: string) => (value === '' ? null : integer(value))
const isBool = (value: string) => value === 'true' || value === 'false'
/** Unix seconds inside Swift's date range (years 1–9999). */
const isUnixDate = (value: number) => Number.isFinite(value) && value >= -62_135_596_800 && value <= 253_402_300_799
const toApple = (unix: number) => unix - appleEpochOffset
/** Names and draft texts carry a leading apostrophe as formula protection. */
const unquoted = (value: string) => (value === '' ? null : value.slice(1))

function jsonValue(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function base64JSON(text: string): unknown {
  try {
    const bytes = Uint8Array.from(atob(text), (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    return undefined
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Ids derived from content stay the same when the same file is imported again. */
function uniqueID(name: string, used: Set<string>): string {
  let id = derivedID(name)
  for (let copy = 2; used.has(id); copy++) id = derivedID(`${name}/${copy}`)
  used.add(id)
  return id
}

class Issues {
  readonly list: ImportIssue[] = []
  /** Rows are numbered like in a spreadsheet: the header is row 1. */
  require(condition: boolean, line: number, reason: string): boolean {
    if (!condition && this.list.length < maximumIssues) this.list.push({ path: `rows[${line - 1}]`, reason })
    return condition
  }
  throwIfAny() {
    if (this.list.length > 0) throw new ImportError('invalid', { issues: this.list })
  }
}

function emptyBackup(): LegacyBackup {
  return {
    format: 'motion.full-backup',
    version: 1,
    exportedAt: 0,
    library: [],
    routines: [],
    workouts: [],
    profile: null,
    weights: [],
    weightRewards: [],
    workoutAwards: [],
    healthReceipts: [],
    healthArchive: null,
    nutrition: null,
    trainingPlan: null,
    preferences: null,
  }
}

/** The newest date in the file stands in for the export date these formats do not have. */
function newestDate(backup: LegacyBackup): number {
  const dates = [
    ...backup.workouts.flatMap((session) => [session.date, session.draftUpdatedAt ?? -Infinity]),
    ...backup.weights.map((weight) => weight.recordedAt),
    ...backup.weightRewards.map((reward) => reward.awardedAt),
  ]
  const newest = Math.max(...dates, -Infinity)
  return Number.isFinite(newest) ? newest : 0
}

// motion_backup_v1 … v17 ------------------------------------------------------------------------

interface Row {
  line: number
  values: string[]
}

/** Checks one row like MotionBackupCSV.restore; returns false when it cannot be converted. */
function checkRow(row: Row, issues: Issues): boolean {
  const { values, line } = row
  const type = values[C.type]!
  const allowed = allowedColumns[type]
  if (!issues.require(Boolean(allowed), line, 'unknown record type')) return false
  const ok = (condition: boolean, reason = 'malformed value') => issues.require(condition, line, reason)
  const filled = (index: number) => values[index] !== ''
  let valid = ok(values.every((value, index) => value === '' || allowed!.includes(index)), 'value in a column this record does not use')
  const check = (condition: boolean, reason?: string) => {
    if (!ok(condition, reason)) valid = false
  }
  const has = (index: number) => allowed!.includes(index)

  for (const index of [C.weightUnit, C.loadUnit, C.draftUnit]) if (filled(index)) check(['kg', 'lb'].includes(values[index]!))
  if (filled(C.distanceUnit)) check(['km', 'mi'].includes(values[C.distanceUnit]!))
  for (const index of [C.completed, C.freestyle, C.historyOnly, C.removed, C.skipped, C.warmUp, C.retrospective]) if (filled(index)) check(isBool(values[index]!))
  for (const index of [C.exerciseID, C.snapshotID, C.draftID, C.blueprintID, C.setID, C.healthID]) if (filled(index)) check(uuidPattern.test(values[index]!))
  if (filled(C.draftUpdated)) check(isUnixDate(decimal(values[C.draftUpdated]!)))
  if (filled(C.order)) check(integer(values[C.order]!) >= 0)
  for (const index of [C.draftWeight, C.draftReps, C.draftDuration, C.notes]) if (filled(index)) check(values[index]!.startsWith("'"))
  if (filled(C.rest)) check(integer(values[C.rest]!) >= 5 && integer(values[C.rest]!) <= 3600)
  if (filled(C.acknowledged)) check(decimal(values[C.acknowledged]!) >= 0)
  check(!(values[C.completed] === 'true' && (values[C.removed] === 'true' || values[C.skipped] === 'true')), 'invalid set')
  if (filled(C.measurement)) check(measurements.includes(values[C.measurement]!))
  if (filled(C.duration)) check(decimal(values[C.duration]!) > 0 && decimal(values[C.duration]!) <= 604_800)
  if (filled(C.superset)) check(['A', 'B', 'C', 'D'].includes(values[C.superset]!))
  if (filled(C.metadata)) check(isObject(jsonValue(values[C.metadata]!)), 'invalid exercise metadata')
  if (filled(C.guidance)) check(new TextEncoder().encode(values[C.guidance]!).length <= 16_384 && isObject(jsonValue(values[C.guidance]!)), 'invalid routine targets')
  if (filled(C.targetWeight)) check(decimal(values[C.targetWeight]!) >= 1 && decimal(values[C.targetWeight]!) <= 700, 'invalid target weight')
  if (has(C.date)) check(isUnixDate(decimal(values[C.date]!)))
  if (has(C.name)) check(values[C.name]!.startsWith("'") && values[C.name]!.slice(1).trim() !== '', 'missing value')
  if (has(C.key)) check(filled(C.key), 'missing value')
  if (has(C.xp)) check(integer(values[C.xp]!) >= 0 && integer(values[C.xp]!) <= 1_000_000)

  switch (type) {
    case 'workout': {
      check(isBool(values[C.sample]!))
      if (filled(C.healthID)) check(filled(C.cardioType) || filled(C.healthDetails), 'invalid Health workout summary')
      if (filled(C.healthDetails)) check(filled(C.healthID), 'invalid Health workout details')
      if (filled(C.cardioType)) {
        const seconds = decimal(values[C.cardioSeconds]!)
        check(cardioActivities.includes(values[C.cardioType]!) && seconds > 0 && seconds <= 604_800, 'invalid cardio result')
        // Health workouts can contain a duration without a measured distance.
        if (!(filled(C.healthID) && !filled(C.cardioKm) && !filled(C.cardioPace))) {
          const distance = decimal(values[C.cardioKm]!)
          const pace = decimal(values[C.cardioPace]!)
          check(distance > 0 && distance <= 10_000 && pace > 0 && Math.abs(pace - seconds / distance) <= Math.max(1, (seconds / distance) * 0.01), 'invalid cardio result')
        }
      } else check(!filled(C.cardioSeconds) && !filled(C.cardioKm) && !filled(C.cardioPace), 'invalid cardio result')
      break
    }
    case 'blueprint':
      check(uuidPattern.test(values[C.key]!), 'invalid routine')
      check(!filled(C.cardioType) || cardioActivities.includes(values[C.cardioType]!), 'invalid routine')
      for (const index of [C.cardioSeconds, C.cardioKm]) if (filled(index)) check(decimal(values[index]!) > 0, 'invalid routine')
      break
    case 'blueprint_exercise': {
      const warmUps = integer(values[C.warmUpSets]!)
      const working = integer(values[C.workingSets]!)
      check(
        uuidPattern.test(values[C.parent]!) && uuidPattern.test(values[C.exerciseID]!) && warmUps >= 0 && warmUps <= 20 && working >= 1 && working <= 1000 && integer(values[C.order]!) >= 0,
        'invalid routine targets',
      )
      break
    }
    case 'set': {
      const index = integer(values[C.setIndex]!)
      check(index > 0 && decimal(values[C.weight]!) >= 0 && (!filled(C.reps) || integer(values[C.reps]!) > 0) && isBool(values[C.completed]!), 'invalid set')
      break
    }
    case 'library_exercise':
      check(uuidPattern.test(values[C.exerciseID]!) && isBool(values[C.prTracked]!) && (!filled(C.goal) || decimal(values[C.goal]!) > 0), 'invalid library exercise')
      break
    case 'profile':
      check([...values[C.name]!.slice(1)].length <= 40 && ['kg', 'lb'].includes(values[C.weightUnit]!), 'invalid profile')
      break
    case 'body_weight': {
      const kilograms = decimal(values[C.weight]!)
      check(kilograms >= 1 && kilograms <= 700, 'invalid body weight')
      break
    }
    case 'weight_reward':
      check(integer(values[C.xp]!) === 25, 'invalid daily XP receipt')
      break
    case 'workout_award':
      check(uuidPattern.test(values[C.key]!), 'invalid workout XP receipt')
      break
  }
  return valid
}

function guidanceFrom(text: string): LegacyGuidance | null {
  return text === '' ? null : (jsonValue(text) as LegacyGuidance)
}

/** An undo history only fits when every exercise and set it names still exists in the workout. */
function undoFits(history: LegacyEditSnapshot[], exercises: LegacySessionExercise[]): boolean {
  const sets = new Map(exercises.map((exercise) => [exercise.id.toLowerCase(), new Set(exercise.sets.map((set) => set.id.toLowerCase()))]))
  return history.every(
    (snapshot) =>
      isObject(snapshot) &&
      Array.isArray(snapshot.exercises) &&
      snapshot.exercises.every((exercise) => {
        const known = isObject(exercise) && typeof exercise.id === 'string' ? sets.get(exercise.id.toLowerCase()) : undefined
        return known !== undefined && Array.isArray(exercise.sets) && exercise.sets.every((set) => isObject(set) && typeof set.id === 'string' && known.has(set.id.toLowerCase()))
      }),
  )
}

/** MotionBackupCSV.restore, producing the full-backup object instead of SwiftData records. */
export function decodeOlderCSV(rows: string[][]): { backup: LegacyBackup; version: number } {
  const version = olderVersion(rows[0] ?? [])
  if (version === null) throw new ImportError('csvMalformed')
  const width = rows[0]!.length
  const issues = new Issues()
  const records: Row[] = []
  for (const [position, values] of rows.slice(1).entries()) {
    const line = position + 2
    if (!issues.require(values.length === width, line, 'wrong number of columns')) continue
    const row = { line, values: [...values, ...Array<string>(columnCount - width).fill('')] }
    if (checkRow(row, issues)) records.push(row)
  }
  issues.throwIfAny()

  const of = (type: string) => records.filter((row) => row.values[C.type] === type)
  const v = (row: Row, index: number) => row.values[index]!
  const backup = emptyBackup()
  issues.require(of('nutrition').length <= 1, of('nutrition')[1]?.line ?? 1, 'duplicate identities')
  issues.require(of('profile').length <= 1, of('profile')[1]?.line ?? 1, 'duplicate identities')

  // Library and routines
  const libraryIDs = new Set<string>()
  for (const row of of('library_exercise')) {
    const id = v(row, C.exerciseID)
    issues.require(!libraryIDs.has(id.toLowerCase()), row.line, 'duplicate identities')
    libraryIDs.add(id.toLowerCase())
    const exercise: LegacyLibraryExercise = {
      id,
      name: v(row, C.name).slice(1),
      goalWeight: optionalDecimal(v(row, C.goal)),
      isPRTracked: v(row, C.prTracked) === 'true',
      restSeconds: optionalInteger(v(row, C.rest)),
      metadata: v(row, C.metadata) === '' ? null : (jsonValue(v(row, C.metadata)) as LegacyMetadata),
    }
    backup.library.push(exercise)
  }
  const routines = new Map<string, LegacyRoutine>()
  for (const row of of('blueprint')) {
    const id = v(row, C.key)
    issues.require(!routines.has(id.toLowerCase()), row.line, 'duplicate identities')
    const routine: LegacyRoutine = {
      id,
      name: v(row, C.name).slice(1),
      cardioType: v(row, C.cardioType) || null,
      cardioMinutes: optionalDecimal(v(row, C.cardioSeconds)),
      cardioDistance: optionalDecimal(v(row, C.cardioKm)),
      exercises: [],
    }
    routines.set(id.toLowerCase(), routine)
    backup.routines.push(routine)
  }
  const entrySlots = new Set<string>()
  for (const row of of('blueprint_exercise')) {
    const routine = routines.get(v(row, C.parent).toLowerCase())
    if (!issues.require(Boolean(routine), row.line, 'refers to a missing blueprint')) continue
    issues.require(libraryIDs.has(v(row, C.exerciseID).toLowerCase()), row.line, 'routine refers to a missing exercise')
    const slot = `${v(row, C.parent).toLowerCase()}:${v(row, C.order)}`
    issues.require(!entrySlots.has(slot), row.line, 'duplicate identities')
    entrySlots.add(slot)
    routine!.exercises.push({
      exerciseID: v(row, C.exerciseID),
      sortOrder: integer(v(row, C.order)),
      targetSets: integer(v(row, C.workingSets)),
      warmUpSets: integer(v(row, C.warmUpSets)),
      supersetGroup: v(row, C.superset) || null,
      guidance: guidanceFrom(v(row, C.guidance)),
    })
  }

  // Workouts with exercises and sets, linked by the keys of this file.
  const usedIDs = new Set<string>()
  const workoutRows = new Map<string, Row>()
  for (const row of of('workout')) {
    issues.require(!workoutRows.has(v(row, C.key)), row.line, 'duplicate identities')
    workoutRows.set(v(row, C.key), row)
  }
  const exerciseRows = new Map<string, { row: Row; workout: Row }>()
  for (const row of of('exercise')) {
    const workout = workoutRows.get(v(row, C.parent))
    if (!issues.require(Boolean(workout), row.line, 'refers to a missing workout')) continue
    issues.require(!exerciseRows.has(v(row, C.key)), row.line, 'duplicate identities')
    exerciseRows.set(v(row, C.key), { row, workout: workout! })
  }
  const setRows = new Map<string, Row[]>()
  for (const row of of('set')) {
    const parent = exerciseRows.get(v(row, C.parent))
    if (!issues.require(Boolean(parent), row.line, 'refers to a missing exercise')) continue
    const measurement = v(parent!.row, C.measurement) || 'Load & reps'
    if (measurement === 'Duration') {
      issues.require(decimal(v(row, C.weight)) === 0 && v(row, C.reps) === '' && (v(row, C.completed) !== 'true' || v(row, C.duration) !== ''), row.line, 'invalid set')
    } else {
      issues.require(v(row, C.duration) === '' && v(row, C.draftDuration) === '', row.line, 'invalid set')
      if (measurement !== 'Load & reps' && v(row, C.completed) === 'true') issues.require(integer(v(row, C.reps)) > 0, row.line, 'invalid set')
    }
    if (parent!.row.values[C.removed] === 'true') issues.require(v(row, C.completed) !== 'true', row.line, 'invalid set')
    const siblings = setRows.get(v(row, C.parent)) ?? []
    issues.require(!siblings.some((other) => v(other, C.setIndex) !== '' && integer(v(other, C.setIndex)) === integer(v(row, C.setIndex))), row.line, 'duplicate identities')
    setRows.set(v(row, C.parent), [...siblings, row])
  }
  issues.throwIfAny()

  // Explicit ids first, so derived ids never take one that the file uses.
  for (const row of records) for (const index of [C.draftID, C.snapshotID, C.setID]) if (v(row, index) !== '') usedIDs.add(v(row, index).toLowerCase())
  const sessionIDs = new Map<string, string>()
  for (const [key, row] of workoutRows) {
    if (v(row, C.sample) === 'true') continue
    const unix = decimal(v(row, C.date))
    const completed = v(row, C.completed) !== 'false'
    const id = v(row, C.draftID) || uniqueID(`legacy-csv/workout/${completed}/${Math.floor(unix)}/${v(row, C.name).slice(1)}`, usedIDs)
    sessionIDs.set(key, id)
  }

  const sessions = new Map<string, LegacySession>()
  for (const [key, row] of workoutRows) {
    const id = sessionIDs.get(key)
    if (!id) continue
    const session: LegacySession = {
      id,
      date: toApple(decimal(v(row, C.date))),
      name: v(row, C.name).slice(1),
      notes: unquoted(v(row, C.notes)),
      trainingPlanTicket: null,
      isCompleted: v(row, C.completed) !== 'false',
      earnedXP: integer(v(row, C.xp)),
      isFreestyle: v(row, C.freestyle) === 'true',
      isRetrospective: v(row, C.retrospective) === 'true',
      blueprintID: v(row, C.blueprintID) || null,
      draftUpdatedAt: v(row, C.draftUpdated) === '' ? null : toApple(decimal(v(row, C.draftUpdated))),
      healthWorkoutID: v(row, C.healthID) || null,
      // Health workouts are skipped by the importer; their details are only marked as present.
      healthDetails: v(row, C.healthDetails) === '' ? null : {},
      cardioType: v(row, C.cardioType) || null,
      cardioSeconds: optionalDecimal(v(row, C.cardioSeconds)),
      cardioDistance: optionalDecimal(v(row, C.cardioKm)),
      cardioPace: optionalDecimal(v(row, C.cardioPace)),
      restTimer: null,
      undoHistory: null,
      exercises: [],
    }
    sessions.set(key, session)
  }
  for (const [key, { row, workout }] of exerciseRows) {
    const session = sessions.get(v(workout, C.key))
    if (!session) continue
    const position = session.exercises.length
    const id = v(row, C.snapshotID) || uniqueID(`${session.id.toLowerCase()}/exercise/${position}`, usedIDs)
    const exercise: LegacySessionExercise = {
      id,
      exerciseID: v(row, C.exerciseID) || null,
      exerciseName: v(row, C.name).slice(1),
      isHistoryOnly: v(row, C.historyOnly) === 'true',
      isRemoved: v(row, C.removed) === 'true',
      // Files before v6 have no order; the order of the rows is the order in the workout.
      draftOrder: v(row, C.order) === '' ? position : integer(v(row, C.order)),
      measurementType: v(row, C.measurement) || 'Load & reps',
      supersetGroup: v(row, C.superset) || null,
      restSeconds: optionalInteger(v(row, C.rest)),
      acknowledgedRecordWeight: optionalDecimal(v(row, C.acknowledged)),
      guidance: guidanceFrom(v(row, C.guidance)),
      sets: [],
    }
    for (const setRow of setRows.get(key) ?? []) {
      const setIndex = integer(v(setRow, C.setIndex))
      const set: LegacySet = {
        id: v(setRow, C.setID) || uniqueID(`${id.toLowerCase()}/set/${setIndex}`, usedIDs),
        setIndex,
        weight: decimal(v(setRow, C.weight)),
        reps: optionalInteger(v(setRow, C.reps)),
        isCompleted: v(setRow, C.completed) === 'true',
        isWarmUp: v(setRow, C.warmUp) === 'true',
        durationSeconds: optionalDecimal(v(setRow, C.duration)),
        isSkipped: v(setRow, C.skipped) === 'true',
        isRemoved: v(setRow, C.removed) === 'true',
        draftWeightUnit: v(setRow, C.draftUnit) || 'kg',
        draftWeightText: unquoted(v(setRow, C.draftWeight)),
        draftRepsText: unquoted(v(setRow, C.draftReps)),
        draftDurationText: unquoted(v(setRow, C.draftDuration)),
      }
      exercise.sets.push(set)
    }
    session.exercises.push(exercise)
  }
  // Rest timer and undo history refer to sets of the workout; a reference that does not fit is dropped.
  for (const [key, session] of sessions) {
    const row = workoutRows.get(key)!
    if (v(row, C.restTimer) !== '') {
      const timer = base64JSON(v(row, C.restTimer))
      // RestTimerState data is at most 8 KB in the iOS app.
      if (issues.require(isObject(timer) && v(row, C.restTimer).length <= Math.ceil(8192 / 3) * 4, row.line, 'invalid rest timer')) {
        const state = timer as LegacyRestTimer
        const source = typeof state.sourceSetID === 'string' ? state.sourceSetID.toLowerCase() : null
        const known = session.exercises.some((exercise) => exercise.sets.some((set) => set.id.toLowerCase() === source))
        session.restTimer = { ...state, sourceSetID: known ? state.sourceSetID : null }
      }
    }
    if (v(row, C.undo) !== '') {
      const history = base64JSON(v(row, C.undo))
      if (issues.require(Array.isArray(history) && history.length <= 100, row.line, 'too much undo history')) {
        session.undoHistory = undoFits(history as LegacyEditSnapshot[], session.exercises) ? (history as LegacyEditSnapshot[]) : null
      }
    }
    backup.workouts.push(session)
  }

  // XP receipts: the receipt wins over the workout's own XP, as in the importer.
  const awardIDs = new Set<string>()
  for (const row of of('workout_award')) {
    const id = v(row, C.key).toLowerCase()
    issues.require(!awardIDs.has(id), row.line, 'duplicate identities')
    awardIDs.add(id)
    backup.workoutAwards.push({ sessionID: v(row, C.key), earnedXP: integer(v(row, C.xp)) })
  }
  for (const session of backup.workouts) {
    const award = backup.workoutAwards.find((candidate) => candidate.sessionID.toLowerCase() === session.id.toLowerCase())
    if (award && session.isCompleted) session.earnedXP = award.earnedXP
  }

  // Profile and daily records
  const profile = of('profile')[0]
  if (profile) {
    backup.profile = {
      celebratedWeightGoals: null,
      targetWeightKilograms: optionalDecimal(v(profile, C.targetWeight)),
      name: v(profile, C.name).slice(1),
      weightUnit: v(profile, C.weightUnit),
      exerciseLoadUnit: v(profile, C.loadUnit) || 'kg',
      distanceUnitPreference: v(profile, C.distanceUnit) || 'km',
      createdAt: toApple(decimal(v(profile, C.date))),
    }
  }
  for (const row of of('body_weight')) {
    backup.weights.push({ dayKey: v(row, C.key), recordedAt: toApple(decimal(v(row, C.date))), kilograms: decimal(v(row, C.weight)) })
  }
  for (const row of of('weight_reward')) {
    backup.weightRewards.push({ dayKey: v(row, C.key), awardedAt: toApple(decimal(v(row, C.date))), earnedXP: integer(v(row, C.xp)) })
  }
  issues.throwIfAny()
  backup.exportedAt = newestDate(backup)
  return { backup, version }
}

// Plain workout CSV ----------------------------------------------------------------------------

const isoPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/

/** ISO8601DateFormatter output, e.g. "2026-03-01T10:00:00Z"; null when it is anything else. */
function isoSeconds(value: string): number | null {
  const match = isoPattern.exec(value)
  if (!match) return null
  const zone = match[3] === 'Z' ? 'Z' : `${match[3]!.slice(0, 3)}:${match[3]!.slice(-2)}`
  const time = Date.parse(`${match[1]}${match[2] ?? ''}${zone}`)
  return Number.isFinite(time) ? time / 1000 : null
}

/** WorkoutCSVExporter.safeName: an apostrophe only protects names that start like a formula. */
function restoredName(value: string): string {
  if (!value.startsWith("'")) return value
  const rest = value.slice(1)
  return /^[=+\-@]/.test(rest.trim()) ? rest : value
}

/** WorkoutCSVImporter: one row per set; a workout is the same date and name, an exercise the same name within it. */
export function decodeWorkoutCSV(rows: string[][]): LegacyBackup {
  if (!isWorkoutCSV(rows[0] ?? [])) throw new ImportError('csvMalformed')
  const issues = new Issues()
  const backup = emptyBackup()
  const usedIDs = new Set<string>()
  const sessions = new Map<string, LegacySession>()
  for (const [position, values] of rows.slice(1).entries()) {
    const line = position + 2
    if (!issues.require(values.length === workoutCSVHeader.length, line, 'wrong number of columns')) continue
    const [dateText, workoutName, exerciseName, indexText, weightText, repsText, completedText] = values as [string, string, string, string, string, string, string]
    const seconds = isoSeconds(dateText)
    const setIndex = integer(indexText)
    const weight = decimal(weightText)
    const valid =
      issues.require(seconds !== null && isUnixDate(seconds), line, 'malformed value') &&
      issues.require(workoutName !== '' && exerciseName !== '', line, 'missing value') &&
      issues.require(setIndex > 0 && weight >= 0 && (repsText === '' || integer(repsText) > 0) && isBool(completedText), line, 'invalid set')
    if (!valid) continue
    const name = restoredName(workoutName)
    const key = `${Math.floor(seconds!)}\u001f${name}`
    let session = sessions.get(key)
    if (!session) {
      session = {
        id: uniqueID(`legacy-csv/workout/true/${Math.floor(seconds!)}/${name}`, usedIDs),
        date: toApple(seconds!),
        name,
        isCompleted: true,
        earnedXP: 0,
        isFreestyle: false,
        exercises: [],
      }
      sessions.set(key, session)
      backup.workouts.push(session)
    }
    const movement = restoredName(exerciseName)
    let exercise = session.exercises.find((candidate) => candidate.exerciseName === movement)
    if (!exercise) {
      exercise = {
        id: uniqueID(`${session.id}/exercise/${session.exercises.length}`, usedIDs),
        exerciseID: null,
        exerciseName: movement,
        isHistoryOnly: false,
        isRemoved: false,
        draftOrder: session.exercises.length,
        measurementType: 'Load & reps',
        sets: [],
      }
      session.exercises.push(exercise)
    }
    if (!issues.require(!exercise.sets.some((set) => set.setIndex === setIndex), line, 'duplicate identities')) continue
    exercise.sets.push({
      id: uniqueID(`${exercise.id}/set/${setIndex}`, usedIDs),
      setIndex,
      weight,
      reps: optionalInteger(repsText),
      isCompleted: completedText === 'true',
      isWarmUp: false,
      isSkipped: false,
      isRemoved: false,
    })
  }
  issues.throwIfAny()
  for (const session of backup.workouts) for (const exercise of session.exercises) exercise.sets.sort((a, b) => a.setIndex - b.setIndex)
  backup.exportedAt = newestDate(backup)
  return backup
}
