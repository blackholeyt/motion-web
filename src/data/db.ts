import Dexie, { type EntityTable } from 'dexie'
import type {
  BlueprintExercise,
  Blueprint,
  BodyWeight,
  Exercise,
  OutboxEntry,
  Profile,
  SetLog,
  SleepScore,
  SyncedRecord,
  SyncedTable,
  TrainingPlanRecord,
  WeightReward,
  Workout,
  WorkoutAward,
  WorkoutExercise,
} from './types'

/** One IndexedDB per account; "motion-local" holds data before the first login (phase 4). */
export class MotionDatabase extends Dexie {
  profiles!: EntityTable<Profile, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  blueprints!: EntityTable<Blueprint, 'id'>
  blueprint_exercises!: EntityTable<BlueprintExercise, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  workout_exercises!: EntityTable<WorkoutExercise, 'id'>
  set_logs!: EntityTable<SetLog, 'id'>
  training_plans!: EntityTable<TrainingPlanRecord, 'id'>
  body_weights!: EntityTable<BodyWeight, 'id'>
  weight_rewards!: EntityTable<WeightReward, 'id'>
  workout_awards!: EntityTable<WorkoutAward, 'id'>
  sleep_scores!: EntityTable<SleepScore, 'id'>
  outbox!: EntityTable<OutboxEntry, 'key'>

  constructor(name = 'motion-local') {
    super(name)
    this.version(1).stores({
      profiles: 'id',
      exercises: 'id, name, catalogue_id',
      blueprints: 'id, name',
      blueprint_exercises: 'id, blueprint_id, exercise_id',
      workouts: 'id, performed_at, blueprint_id',
      workout_exercises: 'id, workout_id, exercise_id',
      set_logs: 'id, workout_id, workout_exercise_id',
      training_plans: 'id',
      body_weights: 'id, day',
      weight_rewards: 'id, day',
      workout_awards: 'id, workout_id',
      sleep_scores: 'id, day',
      outbox: 'key, table, queued_at',
    })
  }

  table_<T extends SyncedRecord>(name: SyncedTable) {
    return this.table<T, string>(name)
  }
}

export let db = new MotionDatabase()

/** Tests and the onboarding/demo sandboxes swap the active database. */
export function setDatabase(next: MotionDatabase) {
  db = next
}

export const syncedTables: SyncedTable[] = [
  'profiles',
  'exercises',
  'blueprints',
  'blueprint_exercises',
  'workouts',
  'workout_exercises',
  'set_logs',
  'training_plans',
  'body_weights',
  'weight_rewards',
  'workout_awards',
  'sleep_scores',
]
