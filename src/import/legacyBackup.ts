import { ImportError, type ImportIssue } from './errors'

/*
 * The iOS full backup ("motion.full-backup", version 1) as written by MotionBackup.swift.
 * Dates are seconds since 1 January 2001, days are "<era>-<year>-<month>-<day>", UUIDs are upper case.
 * decodeBackup checks the structure like Swift's JSONDecoder, validateBackup applies the rules of
 * MotionBackupValidation.swift. Health archive and nutrition are not imported and only checked to be objects.
 */

type Day = string
type Seconds2001 = number

export interface LegacyGuidance {
  measurement?: string | null
  minimumReps?: number | null
  maximumReps?: number | null
  durationSeconds?: number | null
  restSeconds?: number | null
  notes?: string | null
  progression?: string | null
}

export interface LegacyMetadata {
  catalogueID?: string | null
  equipment?: string | null
  muscle?: string | null
  measurement?: string | null
  guidance?: string | null
  trackProgress?: boolean | null
}

export interface LegacyLibraryExercise {
  id: string
  name: string
  goalWeight?: number | null
  isPRTracked: boolean
  restSeconds?: number | null
  metadata?: LegacyMetadata | null
}

export interface LegacyRoutine {
  id: string
  name: string
  cardioType?: string | null
  cardioMinutes?: number | null
  cardioDistance?: number | null
  exercises: { exerciseID: string; sortOrder: number; targetSets: number; warmUpSets: number; supersetGroup?: string | null; guidance?: LegacyGuidance | null }[]
}

export interface LegacyTicket {
  planID: string
  revision: string
  entryID: string
  rotationToken?: string | null
  date: Seconds2001
  dayKey: Day
}

export interface LegacyRestTimer {
  deadline?: Seconds2001 | null
  noticeUntil?: Seconds2001 | null
  duration?: number | null
  remaining?: number | null
  sourceSetID?: string | null
  exerciseName?: string | null
}

export interface LegacyEditSnapshot {
  freestyle: boolean
  exercises: {
    id: string
    order: number
    group?: string | null
    removed: boolean
    sets: { id: string; unit?: string | null; warmUp?: boolean | null; weight: string; reps: string; completed: boolean; skipped: boolean; removed: boolean }[]
  }[]
}

export interface LegacySet {
  id: string
  setIndex: number
  weight: number
  reps?: number | null
  isCompleted: boolean
  isWarmUp: boolean
  durationSeconds?: number | null
  isSkipped: boolean
  isRemoved: boolean
  draftWeightUnit?: string | null
  draftWeightText?: string | null
  draftRepsText?: string | null
  draftDurationText?: string | null
}

export interface LegacySessionExercise {
  id: string
  exerciseID?: string | null
  exerciseName: string
  isHistoryOnly: boolean
  isRemoved: boolean
  draftOrder: number
  measurementType: string
  supersetGroup?: string | null
  restSeconds?: number | null
  acknowledgedRecordWeight?: number | null
  guidance?: LegacyGuidance | null
  sets: LegacySet[]
}

export interface LegacySession {
  id: string
  date: Seconds2001
  name: string
  notes?: string | null
  trainingPlanTicket?: LegacyTicket | null
  isCompleted: boolean
  earnedXP: number
  isFreestyle: boolean
  isRetrospective?: boolean | null
  blueprintID?: string | null
  draftUpdatedAt?: Seconds2001 | null
  healthWorkoutID?: string | null
  healthDetails?: object | null
  cardioType?: string | null
  cardioSeconds?: number | null
  cardioDistance?: number | null
  cardioPace?: number | null
  restTimer?: LegacyRestTimer | null
  undoHistory?: LegacyEditSnapshot[] | null
  exercises: LegacySessionExercise[]
}

export interface LegacySchedule {
  id: string
  revision: string
  enabled: boolean
  mode: string
  startDate: Seconds2001
  entries: { id: string; blueprintID: string; weekday?: number | null }[]
  weekdays: number[]
  cursor: number
  rotationToken: string
  notBefore?: Seconds2001 | null
  consumed: string[]
}

export interface LegacyPreferences {
  appearance: string
  quietMode: boolean
  bodyWeightTrackingVisible: boolean
  launchAnimationEnabled: boolean
  xpHapticsEnabled: boolean
  isRepTrackingEnabled: boolean
  restTimerSeconds: number
  stepGoalEnabled: boolean
  dailyStepGoal: number
  bodyWeightGoal?: string | null
}

export interface LegacyBackup {
  format: string
  version: number
  exportedAt: Seconds2001
  library: LegacyLibraryExercise[]
  routines: LegacyRoutine[]
  workouts: LegacySession[]
  profile?: {
    celebratedWeightGoals?: string[] | null
    targetWeightKilograms?: number | null
    name: string
    weightUnit: string
    exerciseLoadUnit: string
    distanceUnitPreference: string
    createdAt: Seconds2001
  } | null
  weights: { dayKey: Day; recordedAt: Seconds2001; kilograms: number }[]
  weightRewards: { dayKey: Day; awardedAt: Seconds2001; earnedXP: number }[]
  workoutAwards: { sessionID: string; earnedXP: number }[]
  healthReceipts: string[]
  sleepScores?: { date: Seconds2001; dayKey: Day; score: number }[] | null
  healthArchive?: object | null
  nutrition?: object | null
  trainingPlan?: LegacySchedule | null
  /** Always in the full backup; CSV files before version 18 have none. */
  preferences?: LegacyPreferences | null
}

// Structure ------------------------------------------------------------------------------------

type Leaf = 'string' | 'number' | 'int' | 'bool' | 'uuid' | 'date' | 'object'
type Spec = Leaf | { optional: Spec } | { list: Spec } | { [key: string]: Spec }

const opt = (spec: Spec) => ({ optional: spec })
const list = (spec: Spec) => ({ list: spec })
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const guidanceSpec: Spec = {
  measurement: opt('string'),
  minimumReps: opt('int'),
  maximumReps: opt('int'),
  durationSeconds: opt('int'),
  restSeconds: opt('int'),
  notes: opt('string'),
  progression: opt('string'),
}

const backupFields: Record<string, Spec> = {
  format: 'string',
  version: 'int',
  exportedAt: 'date',
  library: list({
    id: 'uuid',
    name: 'string',
    goalWeight: opt('number'),
    isPRTracked: 'bool',
    restSeconds: opt('int'),
    metadata: opt({ catalogueID: opt('string'), equipment: opt('string'), muscle: opt('string'), measurement: opt('string'), guidance: opt('string'), trackProgress: opt('bool') }),
  }),
  routines: list({
    id: 'uuid',
    name: 'string',
    cardioType: opt('string'),
    cardioMinutes: opt('number'),
    cardioDistance: opt('number'),
    exercises: list({ exerciseID: 'uuid', sortOrder: 'int', targetSets: 'int', warmUpSets: 'int', supersetGroup: opt('string'), guidance: opt(guidanceSpec) }),
  }),
  workouts: list({
    id: 'uuid',
    date: 'date',
    name: 'string',
    notes: opt('string'),
    trainingPlanTicket: opt({ planID: 'uuid', revision: 'uuid', entryID: 'uuid', rotationToken: opt('uuid'), date: 'date', dayKey: 'string' }),
    isCompleted: 'bool',
    earnedXP: 'int',
    isFreestyle: 'bool',
    isRetrospective: opt('bool'),
    blueprintID: opt('uuid'),
    draftUpdatedAt: opt('date'),
    healthWorkoutID: opt('uuid'),
    healthDetails: opt('object'),
    cardioType: opt('string'),
    cardioSeconds: opt('number'),
    cardioDistance: opt('number'),
    cardioPace: opt('number'),
    restTimer: opt({ deadline: opt('date'), noticeUntil: opt('date'), duration: opt('int'), remaining: opt('int'), sourceSetID: opt('uuid'), exerciseName: opt('string') }),
    undoHistory: opt(
      list({
        freestyle: 'bool',
        exercises: list({
          id: 'uuid',
          order: 'int',
          group: opt('string'),
          removed: 'bool',
          sets: list({ id: 'uuid', unit: opt('string'), warmUp: opt('bool'), usedPrevious: opt('bool'), weight: 'string', reps: 'string', completed: 'bool', skipped: 'bool', removed: 'bool' }),
        }),
      }),
    ),
    exercises: list({
      id: 'uuid',
      exerciseID: opt('uuid'),
      identityReviewed: opt('bool'),
      exerciseName: 'string',
      isHistoryOnly: 'bool',
      isRemoved: 'bool',
      draftOrder: 'int',
      measurementType: 'string',
      supersetGroup: opt('string'),
      restSeconds: opt('int'),
      acknowledgedRecordWeight: opt('number'),
      guidance: opt(guidanceSpec),
      sets: list({
        id: 'uuid',
        setIndex: 'int',
        weight: 'number',
        reps: opt('int'),
        isCompleted: 'bool',
        isWarmUp: 'bool',
        durationSeconds: opt('number'),
        isSkipped: 'bool',
        isRemoved: 'bool',
        draftWeightUnit: opt('string'),
        draftWeightText: opt('string'),
        draftRepsText: opt('string'),
        draftDurationText: opt('string'),
      }),
    }),
  }),
  profile: opt({
    celebratedWeightGoals: opt(list('string')),
    targetWeightKilograms: opt('number'),
    name: 'string',
    weightUnit: 'string',
    exerciseLoadUnit: 'string',
    distanceUnitPreference: 'string',
    createdAt: 'date',
  }),
  weights: list({ dayKey: 'string', recordedAt: 'date', kilograms: 'number' }),
  weightRewards: list({ dayKey: 'string', awardedAt: 'date', earnedXP: 'int' }),
  workoutAwards: list({ sessionID: 'uuid', earnedXP: 'int' }),
  healthReceipts: list('uuid'),
  sleepScores: opt(list({ date: 'date', dayKey: 'string', score: 'int' })),
  healthArchive: opt('object'),
  nutrition: opt('object'),
  trainingPlan: opt({
    id: 'uuid',
    revision: 'uuid',
    enabled: 'bool',
    mode: 'string',
    startDate: 'date',
    entries: list({ id: 'uuid', blueprintID: 'uuid', weekday: opt('int') }),
    weekdays: list('int'),
    cursor: 'int',
    rotationToken: 'uuid',
    notBefore: opt('date'),
    consumed: list('string'),
  }),
  preferences: {
    appearance: 'string',
    quietMode: 'bool',
    bodyWeightTrackingVisible: 'bool',
    launchAnimationEnabled: 'bool',
    xpHapticsEnabled: 'bool',
    isRepTrackingEnabled: 'bool',
    restTimerSeconds: 'int',
    stepGoalEnabled: 'bool',
    dailyStepGoal: 'int',
    bodyWeightGoal: opt('string'),
  },
}
const backupSpec: Spec = backupFields
const olderCSVSpec: Spec = { ...backupFields, preferences: opt(backupFields.preferences!) }

const maximumIssues = 50

function leafMatches(leaf: Leaf, value: unknown): boolean {
  switch (leaf) {
    case 'string':
      return typeof value === 'string'
    case 'number':
    case 'date':
      return typeof value === 'number' && Number.isFinite(value)
    case 'int':
      return Number.isInteger(value)
    case 'bool':
      return typeof value === 'boolean'
    case 'uuid':
      return typeof value === 'string' && uuidPattern.test(value)
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}

function checkShape(value: unknown, spec: Spec, path: string, issues: ImportIssue[]) {
  if (issues.length >= maximumIssues) return
  if (typeof spec === 'string') {
    if (!leafMatches(spec, value)) issues.push({ path, reason: value === undefined ? 'missing value' : 'malformed value' })
  } else if ('optional' in spec) {
    if (value !== undefined && value !== null) checkShape(value, spec.optional as Spec, path, issues)
  } else if ('list' in spec) {
    if (!Array.isArray(value)) issues.push({ path, reason: value === undefined ? 'missing value' : 'malformed value' })
    else value.forEach((item, index) => checkShape(item, spec.list as Spec, `${path}[${index}]`, issues))
  } else if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    issues.push({ path, reason: value === undefined ? 'missing value' : 'malformed value' })
  } else {
    for (const [key, child] of Object.entries(spec)) checkShape((value as Record<string, unknown>)[key], child, path ? `${path}.${key}` : key, issues)
  }
}

/**
 * MotionBackupStore.decode: header first (file type, version), then the complete structure, then the rules.
 * A backup converted from an older CSV file has no preferences.
 */
export function decodeBackup(object: unknown, { fromOlderCSV = false } = {}): LegacyBackup {
  const header = object as { format?: unknown; version?: unknown } | null
  if (typeof header !== 'object' || header === null || header.format !== 'motion.full-backup') throw new ImportError('wrongType')
  if (header.version !== 1) throw new ImportError('unsupportedVersion')
  const issues: ImportIssue[] = []
  checkShape(object, fromOlderCSV ? olderCSVSpec : backupSpec, '', issues)
  if (issues.length > 0) throw new ImportError('invalid', { issues })
  const backup = object as LegacyBackup
  const rules = validateBackup(backup)
  if (rules.length > 0) throw new ImportError('invalid', { issues: rules })
  return backup
}

// Rules ----------------------------------------------------------------------------------------

export const appleEpochOffset = 978_307_200
const measurements = ['Load & reps', 'Bodyweight reps', 'Assisted reps', 'Duration']
const cardioActivities = ['Running', 'Bicycle', 'Swimming', 'Walking', 'Rowing', 'Elliptical', 'Other cardio']
const progressionsFor: Record<string, string[]> = {
  Duration: ['Not selected', 'Keep targets steady', 'Build duration'],
  'Load & reps': ['Not selected', 'Keep targets steady', 'Build repetitions first', 'Build external load'],
  'Bodyweight reps': ['Not selected', 'Keep targets steady', 'Build repetitions first'],
  'Assisted reps': ['Not selected', 'Keep targets steady', 'Build repetitions first'],
}
const textEncoder = new TextEncoder()

const isNil = (value: unknown): value is null | undefined => value === null || value === undefined
const unique = (values: unknown[]) => new Set(values).size === values.length
const inRange = (value: number, low: number, high: number) => value >= low && value <= high
/** Swift Date range accepted by the iOS app (years 1–9999), checked on Unix seconds. */
const date = (value: Seconds2001) => Number.isFinite(value) && inRange(value + appleEpochOffset, -62_135_596_800, 253_402_300_799)
const number = (value: number | null | undefined, upper = 1_000_000, positive = false) =>
  isNil(value) || (Number.isFinite(value) && value <= upper && (positive ? value > 0 : value >= 0))
const text = (value: string | null | undefined) => isNil(value) || textEncoder.encode(value).length <= 16_384
const rest = (value: number | null | undefined) => isNil(value) || inRange(value, 1, 3600)
const group = (value: string | null | undefined) => isNil(value) || ['A', 'B', 'C', 'D'].includes(value)
const weightUnit = (value: string | null | undefined) => value === 'kg' || value === 'lb'

/** TrainingSchedule.dayKey as validated by the iOS app: era 0–1, year, month 1–13, day, no leading zeros. */
export function isLegacyDay(value: string): boolean {
  const parts = value.split('-')
  const numbers = parts.map((part) => (/^\d+$/.test(part) ? Number(part) : NaN))
  return (
    parts.length === 4 &&
    numbers.every(Number.isInteger) &&
    numbers.join('-') === value &&
    inRange(numbers[0]!, 0, 1) &&
    inRange(numbers[1]!, 1, 9999) &&
    inRange(numbers[2]!, 1, 13) &&
    inRange(numbers[3]!, 1, 31)
  )
}

/** RoutineGuidance.validationError. */
function guidanceProblem(value: LegacyGuidance | null | undefined, fallback: string): boolean {
  if (isNil(value)) return false
  if (!isNil(value.measurement) && !measurements.includes(value.measurement)) return true
  const type = value.measurement ?? fallback
  if ([...(value.notes ?? '')].length > 2000) return true
  if (!isNil(value.restSeconds) && !inRange(value.restSeconds, 5, 3600)) return true
  if (type === 'Duration') {
    if (!isNil(value.minimumReps) || !isNil(value.maximumReps)) return true
    if (!isNil(value.durationSeconds) && !inRange(value.durationSeconds, 1, 604_800)) return true
  } else {
    if (!isNil(value.durationSeconds)) return true
    if (!isNil(value.minimumReps) || !isNil(value.maximumReps)) {
      const low = value.minimumReps
      const high = value.maximumReps
      if (isNil(low) || isNil(high) || !inRange(low, 1, 1000) || !inRange(high, low, 1000)) return true
    }
  }
  return !(progressionsFor[type] ?? []).includes(value.progression ?? 'Not selected')
}

/** TrainingSchedule.structurallyValid. */
function scheduleValid(state: LegacySchedule): boolean {
  const fixedDays = state.entries.map((entry) => entry.weekday).filter((day): day is number => !isNil(day))
  return (
    (state.mode === 'rotation' || state.mode === 'weekdays') &&
    state.entries.length <= 100 &&
    unique(state.entries.map((entry) => entry.id.toLowerCase())) &&
    state.weekdays.every((day) => inRange(day, 1, 7)) &&
    fixedDays.every((day) => inRange(day, 1, 7)) &&
    state.cursor >= 0 &&
    (state.entries.length === 0 ? state.cursor === 0 : state.cursor < state.entries.length) &&
    state.consumed.length <= 100_000 &&
    state.consumed.every((key) => textEncoder.encode(key).length < 100) &&
    (state.mode !== 'weekdays' || (fixedDays.length === state.entries.length && unique(fixedDays)))
  )
}

const lower = (value: string) => value.toLowerCase()

/** MotionBackup.validate, collecting every problem with its location instead of stopping at the first. */
export function validateBackup(backup: LegacyBackup): ImportIssue[] {
  const issues: ImportIssue[] = []
  const require = (condition: boolean, path: string, reason: string) => {
    if (!condition && issues.length < maximumIssues) issues.push({ path, reason })
    return condition
  }
  if (backup.trainingPlan) require(scheduleValid(backup.trainingPlan), 'trainingPlan', 'invalid training plan')
  const sleep = backup.sleepScores ?? []
  require(sleep.length <= 100_000 && unique(sleep.map((score) => score.dayKey)), 'sleepScores', 'invalid sleep score identities')
  sleep.forEach((score, index) =>
    require(date(score.date) && isLegacyDay(score.dayKey) && inRange(score.score, 0, 100), `sleepScores[${index}]`, 'invalid sleep score'),
  )
  require(date(backup.exportedAt), 'exportedAt', 'invalid export date')
  const snapshots = backup.workouts.flatMap((session) => session.exercises)
  const sets = snapshots.flatMap((exercise) => exercise.sets)
  require(
    [backup.library, backup.routines, backup.workouts, backup.weights, backup.weightRewards, backup.workoutAwards, backup.healthReceipts, snapshots, sets].every(
      (records) => records.length <= 100_000,
    ),
    '',
    'too many records',
  )
  require(
    unique(backup.library.map((exercise) => lower(exercise.id))) &&
      unique(backup.routines.map((routine) => lower(routine.id))) &&
      unique(backup.workouts.map((session) => lower(session.id))) &&
      unique(snapshots.map((exercise) => lower(exercise.id))) &&
      unique(sets.map((set) => lower(set.id))) &&
      unique(backup.workouts.flatMap((session) => (session.healthWorkoutID ? [lower(session.healthWorkoutID)] : []))) &&
      unique(backup.healthReceipts.map(lower)) &&
      unique(backup.weights.map((weight) => weight.dayKey)) &&
      unique(backup.weightRewards.map((reward) => reward.dayKey)) &&
      unique(backup.workoutAwards.map((award) => lower(award.sessionID))),
    '',
    'duplicate identities',
  )
  const library = new Map(backup.library.map((exercise) => [lower(exercise.id), exercise]))
  backup.library.forEach((exercise, index) => {
    const path = `library[${index}]`
    require(text(exercise.name) && exercise.name !== '' && number(exercise.goalWeight) && rest(exercise.restSeconds), path, 'invalid library exercise')
    const metadata = exercise.metadata
    if (metadata) {
      require(
        text(metadata.catalogueID) && text(metadata.equipment) && text(metadata.muscle) && text(metadata.guidance) && text(metadata.measurement),
        `${path}.metadata`,
        'invalid exercise metadata',
      )
    }
  })
  backup.routines.forEach((routine, index) => {
    const path = `routines[${index}]`
    require(
      text(routine.name) &&
        (isNil(routine.cardioType) || cardioActivities.includes(routine.cardioType)) &&
        number(routine.cardioMinutes, 10_080, true) &&
        number(routine.cardioDistance, 10_000, true),
      path,
      'invalid routine',
    )
    routine.exercises.forEach((entry, position) => {
      const exercise = library.get(lower(entry.exerciseID))
      if (!require(Boolean(exercise), `${path}.exercises[${position}]`, 'routine refers to a missing exercise')) return
      const measurement = measurements.includes(exercise!.metadata?.measurement ?? '') ? exercise!.metadata!.measurement! : 'Load & reps'
      require(
        inRange(entry.sortOrder, 0, 100_000) &&
          inRange(entry.targetSets, 1, 1000) &&
          inRange(entry.warmUpSets, 0, 20) &&
          group(entry.supersetGroup) &&
          !guidanceProblem(entry.guidance, measurement),
        `${path}.exercises[${position}]`,
        'invalid routine targets',
      )
    })
  })
  const awards = new Map(backup.workoutAwards.map((award) => [lower(award.sessionID), award.earnedXP]))
  backup.workouts.forEach((session, index) => {
    const path = `workouts[${index}]`
    require(
      text(session.name) && date(session.date) && (isNil(session.draftUpdatedAt) || date(session.draftUpdatedAt)) && inRange(session.earnedXP, 0, 1_000_000),
      path,
      'invalid workout',
    )
    const award = awards.get(lower(session.id))
    if (award !== undefined && session.isCompleted) require(award === session.earnedXP, path, 'workout XP disagrees with its award receipt')
    require(
      (isNil(session.cardioType) || cardioActivities.includes(session.cardioType)) &&
        number(session.cardioSeconds, 604_800, true) &&
        number(session.cardioDistance, 10_000, true) &&
        number(session.cardioPace, 1_000_000_000, true),
      path,
      'invalid cardio result',
    )
    require(isNil(session.healthWorkoutID) || !isNil(session.cardioType) || !isNil(session.healthDetails), path, 'invalid Health workout summary')
    require(isNil(session.healthDetails) || !isNil(session.healthWorkoutID), path, 'invalid Health workout details')
    require(text(session.notes), path, 'invalid workout')
    if (session.trainingPlanTicket) {
      require(date(session.trainingPlanTicket.date) && isLegacyDay(session.trainingPlanTicket.dayKey), `${path}.trainingPlanTicket`, 'invalid training plan ticket')
    }
    session.exercises.forEach((exercise, position) => {
      const exercisePath = `${path}.exercises[${position}]`
      if (!require(measurements.includes(exercise.measurementType), exercisePath, 'unknown workout measurement')) return
      // Historical IDs may refer to deleted library exercises or routines. Never relink by name.
      require(
        text(exercise.exerciseName) &&
          inRange(exercise.draftOrder, 0, 100_000) &&
          rest(exercise.restSeconds) &&
          number(exercise.acknowledgedRecordWeight) &&
          group(exercise.supersetGroup) &&
          !guidanceProblem(exercise.guidance, exercise.measurementType) &&
          unique(exercise.sets.map((set) => set.setIndex)),
        exercisePath,
        'invalid workout exercise',
      )
      exercise.sets.forEach((set, setPosition) =>
        require(
          inRange(set.setIndex, 1, 100_000) &&
            number(set.weight) &&
            (isNil(set.reps) || inRange(set.reps, 0, 1_000_000)) &&
            number(set.durationSeconds, 604_800) &&
            (!set.isCompleted || (!set.isRemoved && !set.isSkipped && !exercise.isRemoved)) &&
            (isNil(set.draftWeightUnit) || weightUnit(set.draftWeightUnit)) &&
            text(set.draftWeightText) &&
            text(set.draftRepsText) &&
            text(set.draftDurationText),
          `${exercisePath}.sets[${setPosition}]`,
          'invalid set',
        ),
      )
    })
    const timer = session.restTimer
    if (timer) {
      require(
        inRange(timer.duration ?? 90, 1, 3600) &&
          inRange(timer.remaining ?? 0, 0, 3600) &&
          [timer.deadline, timer.noticeUntil].every((value) => isNil(value) || date(value)) &&
          text(timer.exerciseName),
        `${path}.restTimer`,
        'invalid rest timer',
      )
      if (timer.sourceSetID) {
        const source = lower(timer.sourceSetID)
        require(
          session.exercises.some((exercise) => exercise.sets.some((set) => lower(set.id) === source)),
          `${path}.restTimer`,
          'rest timer refers to a missing set',
        )
      }
    }
    const history = session.undoHistory
    if (history) {
      require(history.length <= 100, `${path}.undoHistory`, 'too much undo history')
      const exercisesByID = new Map(session.exercises.map((exercise) => [lower(exercise.id), exercise]))
      history.forEach((snapshot, step) => {
        const snapshotPath = `${path}.undoHistory[${step}]`
        require(unique(snapshot.exercises.map((exercise) => lower(exercise.id))), snapshotPath, 'duplicate undo exercise')
        for (const exercise of snapshot.exercises) {
          const current = exercisesByID.get(lower(exercise.id))
          if (!require(Boolean(current), snapshotPath, 'undo refers to a missing exercise')) continue
          const ids = new Set(current!.sets.map((set) => lower(set.id)))
          require(
            inRange(exercise.order, 0, 100_000) && group(exercise.group) && unique(exercise.sets.map((set) => lower(set.id))),
            snapshotPath,
            'invalid undo exercise',
          )
          for (const set of exercise.sets) {
            require(
              ids.has(lower(set.id)) &&
                text(set.weight) &&
                text(set.reps) &&
                (isNil(set.unit) || weightUnit(set.unit)) &&
                (!set.completed || (!set.removed && !set.skipped && !exercise.removed)),
              snapshotPath,
              'invalid undo set',
            )
          }
        }
      })
    }
  })
  const profile = backup.profile
  if (profile) {
    if (!isNil(profile.targetWeightKilograms)) require(inRange(profile.targetWeightKilograms, 1, 700), 'profile', 'invalid target weight')
    require(
      profile.name.trim() !== '' &&
        [...profile.name].length <= 40 &&
        weightUnit(profile.weightUnit) &&
        weightUnit(profile.exerciseLoadUnit) &&
        (profile.distanceUnitPreference === 'km' || profile.distanceUnitPreference === 'mi') &&
        date(profile.createdAt),
      'profile',
      'invalid profile',
    )
  }
  backup.weights.forEach((weight, index) =>
    require(isLegacyDay(weight.dayKey) && date(weight.recordedAt) && inRange(weight.kilograms, 1, 700), `weights[${index}]`, 'invalid body weight'),
  )
  backup.weightRewards.forEach((reward, index) =>
    require(isLegacyDay(reward.dayKey) && date(reward.awardedAt) && reward.earnedXP === 25, `weightRewards[${index}]`, 'invalid daily XP receipt'),
  )
  require(
    backup.workoutAwards.every((award) => inRange(award.earnedXP, 0, 1_000_000)),
    'workoutAwards',
    'invalid workout XP receipt',
  )
  const preferences = backup.preferences
  if (preferences) require(
    (isNil(preferences.bodyWeightGoal) || ['lose', 'gain', 'maintain'].includes(preferences.bodyWeightGoal)) &&
      ['dark', 'light', 'system'].includes(preferences.appearance) &&
      inRange(preferences.restTimerSeconds, 5, 240) &&
      inRange(preferences.dailyStepGoal, 500, 50_000),
    'preferences',
    'invalid preferences',
  )
  return issues
}
