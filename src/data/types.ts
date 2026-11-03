/*
 * Records stored on the device (Dexie) and, from phase 4, synchronized to Supabase.
 * Column names follow docs/DATENMODELL.md. Canonical units: kg, km, seconds, seconds per km.
 */

export interface SyncedRecord {
  id: string
  user_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type Measurement = 'Load & reps' | 'Bodyweight reps' | 'Assisted reps' | 'Duration'
export type CatalogueMeasurement = Measurement | 'Distance & duration'
export type SupersetGroup = 'A' | 'B' | 'C' | 'D'
export type WeightUnit = 'kg' | 'lb'
export type DistanceUnit = 'km' | 'mi'

export type Progression =
  | 'Not selected'
  | 'Keep targets steady'
  | 'Build repetitions first'
  | 'Build external load'
  | 'Build duration'

/** RoutineGuidance from the iOS app; optional fields keep pre-plan data neutral. */
export interface Guidance {
  measurement?: Measurement | null
  minimumReps?: number | null
  maximumReps?: number | null
  durationSeconds?: number | null
  restSeconds?: number | null
  notes: string
  progression: Progression
}

export interface Exercise extends SyncedRecord {
  name: string
  goal_weight_kg: number | null
  is_pr_tracked: boolean
  rest_seconds: number | null
  catalogue_id: string | null
  equipment: string
  muscle: string
  measurement: CatalogueMeasurement
  guidance: string
  track_progress: boolean
}

export interface Blueprint extends SyncedRecord {
  name: string
  cardio_type: string | null
  cardio_minutes: number | null
  cardio_distance_km: number | null
}

export interface BlueprintExercise extends SyncedRecord {
  blueprint_id: string
  exercise_id: string
  sort_order: number
  target_sets: number
  warm_up_sets: number
  superset_group: SupersetGroup | null
  guidance: Guidance | null
}

export interface RestTimerState {
  deadline: string | null
  noticeUntil: string | null
  duration: number
  remaining: number
  sourceSetID: string | null
  exerciseName: string | null
}

export interface TrainingPlanTicket {
  planID: string
  revision: string
  entryID: string
  rotationToken: string | null
  date: string
  dayKey: string
}

export interface EditSnapshot {
  freestyle: boolean
  exercises: {
    id: string
    order: number
    group: SupersetGroup | null
    removed: boolean
    sets: {
      id: string
      unit: WeightUnit
      warmUp: boolean
      weight: string
      reps: string
      completed: boolean
      skipped: boolean
      removed: boolean
    }[]
  }[]
}

export interface Workout extends SyncedRecord {
  name: string
  performed_at: string
  is_completed: boolean
  is_freestyle: boolean
  is_retrospective: boolean
  blueprint_id: string | null
  notes: string | null
  earned_xp: number
  draft_updated_at: string | null
  plan_ticket: TrainingPlanTicket | null
  rest_timer: RestTimerState | null
  undo_history: EditSnapshot[] | null
  cardio_type: string | null
  cardio_seconds: number | null
  cardio_distance_km: number | null
  cardio_pace_s_per_km: number | null
  source: 'motion' | 'legacy_health'
}

export interface WorkoutExercise extends SyncedRecord {
  workout_id: string
  exercise_id: string | null
  exercise_name: string
  measurement: Measurement
  guidance: Guidance | null
  superset_group: SupersetGroup | null
  rest_seconds: number | null
  acknowledged_record_kg: number | null
  is_history_only: boolean
  is_removed: boolean
  sort_order: number
}

export interface SetLog extends SyncedRecord {
  workout_id: string
  workout_exercise_id: string
  set_index: number
  weight_kg: number
  reps: number | null
  duration_seconds: number | null
  is_completed: boolean
  is_warm_up: boolean
  is_skipped: boolean
  is_removed: boolean
  draft_weight_text: string | null
  draft_weight_unit: WeightUnit | null
  draft_reps_text: string | null
  draft_duration_text: string | null
}

export interface Preferences {
  bodyWeightTrackingVisible: boolean
  haptics: boolean
  trackReps: boolean
  restTimerSeconds: number
  restNotifications: boolean
}

export interface Profile extends SyncedRecord {
  name: string
  body_weight_unit: WeightUnit
  load_unit: WeightUnit
  distance_unit: DistanceUnit
  target_weight_kg: number | null
  celebrated_weight_goals: string[]
  body_weight_goal: 'lose' | 'gain' | 'maintain'
  preferences: Preferences
}

export interface TrainingPlanRecord extends SyncedRecord {
  schedule: import('../domain/schedule').TrainingSchedule
}

export interface BodyWeight extends SyncedRecord {
  day: string
  recorded_at: string
  kilograms: number
}

export interface WeightReward extends SyncedRecord {
  day: string
  awarded_at: string
  earned_xp: number
}

export interface WorkoutAward extends SyncedRecord {
  workout_id: string
  earned_xp: number
}

/** Receipt of an imported iOS backup; the id derives from the file's fingerprint (phase 5a). */
export interface LegacyImport extends SyncedRecord {
  fingerprint: string
  file_name: string
  source_format: 'json' | 'csv'
  exported_at: string
  imported_at: string
  counts: { file: Record<string, number>; added: Record<string, number> }
}

export interface OutboxEntry {
  key: string
  table: SyncedTable
  record_id: string
  queued_at: string
}

/** Newest server synced_at already pulled for a table. */
export interface SyncCursor {
  table: SyncedTable
  synced_at: string
}

/**
 * A cloud version that was not applied because it would have replaced unsaved changes of a workout
 * that is still open on this device. Kept until the user chooses a version.
 */
export interface SyncConflict {
  key: string
  table: SyncedTable
  record_id: string
  workout_id: string
  remote: SyncedRecord
  detected_at: string
}

export type SyncedTable =
  | 'profiles'
  | 'exercises'
  | 'blueprints'
  | 'blueprint_exercises'
  | 'workouts'
  | 'workout_exercises'
  | 'set_logs'
  | 'training_plans'
  | 'body_weights'
  | 'weight_rewards'
  | 'workout_awards'
  | 'legacy_imports'
