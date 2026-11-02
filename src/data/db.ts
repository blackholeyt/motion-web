import Dexie, { type EntityTable, type Transaction } from 'dexie'
import { stableID, type StableKind } from './ids'
import type {
  BlueprintExercise,
  Blueprint,
  BodyWeight,
  Exercise,
  OutboxEntry,
  Profile,
  SetLog,
  SleepScore,
  SyncConflict,
  SyncCursor,
  SyncedRecord,
  SyncedTable,
  TrainingPlanRecord,
  WeightReward,
  Workout,
  WorkoutAward,
  WorkoutExercise,
} from './types'

/** One IndexedDB per account ("motion-<user id>"); "motion-local" holds data of the guest without an account. */
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
  sync_state!: EntityTable<SyncCursor, 'table'>
  conflicts!: EntityTable<SyncConflict, 'key'>

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
    this.version(2)
      .stores({ sync_state: 'table', conflicts: 'key, table, record_id' })
      .upgrade(adoptStableIDs)
  }

  table_<T extends SyncedRecord>(name: SyncedTable) {
    return this.table<T, string>(name)
  }
}

export let db = new MotionDatabase()

const databaseListeners = new Set<() => void>()

/** Accounts, tests and the onboarding/demo sandboxes swap the active database. */
export function setDatabase(next: MotionDatabase) {
  db = next
  databaseListeners.forEach((listener) => listener())
}

/** Screens remount on a swap, so no live query keeps reading the previous database. */
export function onDatabaseChange(listener: () => void) {
  databaseListeners.add(listener)
  return () => {
    databaseListeners.delete(listener)
  }
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

const stableKeys: Record<StableKind, (record: SyncedRecord & Record<string, unknown>) => string | undefined> = {
  profiles: () => undefined,
  training_plans: () => undefined,
  body_weights: (record) => record.day as string,
  weight_rewards: (record) => record.day as string,
  sleep_scores: (record) => record.day as string,
  workout_awards: (record) => record.workout_id as string,
}

/**
 * Version 2: records that exist once per account or day get their stable id (data/ids.ts), so the
 * first sync merges them with other devices instead of duplicating. Of several records for the same
 * key the live, most recently changed one is kept. Nothing was uploaded before version 2, so the
 * dropped duplicates only ever existed on this device.
 */
async function adoptStableIDs(transaction: Transaction) {
  for (const kind of Object.keys(stableKeys) as StableKind[]) {
    const table = transaction.table<SyncedRecord & Record<string, unknown>, string>(kind)
    const groups = new Map<string, (SyncedRecord & Record<string, unknown>)[]>()
    for (const record of await table.toArray()) {
      const key = stableKeys[kind](record) ?? 'singleton'
      groups.set(key, [...(groups.get(key) ?? []), record])
    }
    for (const [key, records] of groups) {
      const keep = records.sort((a, b) => Number(a.deleted_at !== null) - Number(b.deleted_at !== null) || b.updated_at.localeCompare(a.updated_at))[0]!
      const id = stableID(kind, key)
      const replaced = records.map((record) => record.id).filter((old) => old !== id)
      if (replaced.length === 0) continue
      await table.bulkDelete(replaced)
      await table.put({ ...keep, id })
      await transaction.table('outbox').bulkDelete(replaced.map((old) => `${kind}:${old}`))
      await transaction.table('outbox').put({ key: `${kind}:${id}`, table: kind, record_id: id, queued_at: new Date().toISOString() })
    }
  }
}
