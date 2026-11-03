import { db, syncedTables } from '../data/db'
import { enqueue, transaction } from '../data/repo'
import type { SyncedRecord, SyncedTable } from '../data/types'
import { backupFormat, backupVersion } from '../store/backup'
import { changedAt, isOpenWorkout, workoutOf } from '../sync/merge'
import { ImportError, type ImportIssue } from './errors'
import type { ImportCounts, ImportSummary } from './importer'

/*
 * Restoring the web app's own JSON backup (src/store/backup.ts). Unlike the iOS import, the records
 * already have the web format, so they are taken as they are, with the rule the sync uses: per record
 * the newer version wins. A record changed here after the export stays; a record deleted in the file
 * (tombstone) is deleted here if the deletion is newer. A workout open on this device keeps its state.
 */

type Row = SyncedRecord & Record<string, unknown>

export interface WebBackupSource {
  fileName: string
  exportedAt: string
  tables: Record<SyncedTable, Row[]>
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isTime = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value))
const maximumIssues = 50

/** Fields every record of a table needs, beyond id and timestamps, so the screens can show it. */
const required: Partial<Record<SyncedTable, string[]>> = {
  exercises: ['name'],
  blueprints: ['name'],
  blueprint_exercises: ['blueprint_id', 'exercise_id'],
  workouts: ['name', 'performed_at'],
  workout_exercises: ['workout_id', 'exercise_name'],
  set_logs: ['workout_id', 'workout_exercise_id'],
  body_weights: ['day', 'kilograms'],
  weight_rewards: ['day', 'earned_xp'],
  workout_awards: ['workout_id', 'earned_xp'],
  legacy_imports: ['fingerprint'],
}

export const isWebBackup = (object: unknown) => typeof object === 'object' && object !== null && (object as { format?: unknown }).format === backupFormat

export function decodeWebBackup(object: unknown, fileName: string): WebBackupSource {
  const header = object as { format?: unknown; version?: unknown; exported_at?: unknown; tables?: unknown }
  if (!isWebBackup(object)) throw new ImportError('wrongType')
  if (header.version !== backupVersion) throw new ImportError('unsupportedVersion')
  const issues: ImportIssue[] = []
  const report = (path: string, reason: string) => {
    if (issues.length < maximumIssues) issues.push({ path, reason })
  }
  if (!isTime(header.exported_at)) report('', 'invalid export date')
  if (typeof header.tables !== 'object' || header.tables === null) throw new ImportError('invalid', { issues: [{ path: '', reason: 'no tables' }] })
  const source = header.tables as Record<string, unknown>
  const tables = {} as Record<SyncedTable, Row[]>
  for (const table of syncedTables) {
    // Backups made before a table existed (legacy_imports came with phase 5a) simply lack it.
    const records = source[table] ?? []
    if (!Array.isArray(records)) {
      report(table, 'not a list')
      tables[table] = []
      continue
    }
    const seen = new Set<string>()
    records.forEach((record: unknown, index) => {
      const path = `${table}[${index}]`
      if (typeof record !== 'object' || record === null) return report(path, 'invalid record')
      const row = record as Row
      if (typeof row.id !== 'string' || !uuidPattern.test(row.id)) return report(path, 'invalid ID')
      if (seen.has(row.id.toLowerCase())) return report(path, 'duplicate ID')
      seen.add(row.id.toLowerCase())
      if (!isTime(row.created_at) || !isTime(row.updated_at)) return report(path, 'invalid date')
      if (row.deleted_at !== null && !isTime(row.deleted_at)) return report(path, 'invalid date')
      if ((required[table] ?? []).some((field) => row[field] === undefined || row[field] === null)) return report(path, 'missing value')
    })
    tables[table] = records as Row[]
  }
  if (issues.length > 0) throw new ImportError('invalid', { issues })
  return { fileName, exportedAt: new Date(header.exported_at as string).toISOString(), tables }
}

function emptyCounts(): ImportCounts {
  return { workouts: 0, drafts: 0, sets: 0, exercises: 0, routines: 0, bodyWeights: 0, xpReceipts: 0, records: 0, xp: 0, healthWorkouts: 0 }
}

/** The same rows as the iOS import, counted over live records only. */
function count(tables: Record<SyncedTable, Row[]>): ImportCounts {
  const counts = emptyCounts()
  const live = (table: SyncedTable) => tables[table].filter((record) => record.deleted_at === null)
  for (const workout of live('workouts')) {
    if (workout.is_completed) {
      counts.workouts++
      counts.xp += Number(workout.earned_xp ?? 0)
    } else counts.drafts++
  }
  counts.sets = live('set_logs').filter((set) => set.is_completed && !set.is_removed).length
  counts.exercises = live('exercises').length
  counts.records = live('exercises').filter((exercise) => exercise.is_pr_tracked).length
  counts.routines = live('blueprints').length
  counts.bodyWeights = live('body_weights').length
  counts.xpReceipts = live('workout_awards').length + live('weight_rewards').length
  counts.xp += live('weight_rewards').reduce((sum, reward) => sum + Number(reward.earned_xp ?? 0), 0)
  return counts
}

/** Per table the records of the file that would change this device: absent here or newer. */
async function changes(source: WebBackupSource): Promise<Record<SyncedTable, Row[]>> {
  const result = {} as Record<SyncedTable, Row[]>
  for (const table of syncedTables) {
    const records = source.tables[table].map((record) => ({ ...record, id: record.id.toLowerCase() }))
    const locals = await db.table<Row, string>(table).bulkGet(records.map((record) => record.id))
    const apply: Row[] = []
    for (const [index, record] of records.entries()) {
      const local = locals[index]
      if (local && changedAt(record) <= changedAt(local)) continue
      if (local && (await isOpenWorkout(db, workoutOf(table, local)))) continue
      apply.push(record)
    }
    result[table] = apply
  }
  return result
}

function summary(source: WebBackupSource, applied: Record<SyncedTable, Row[]>): ImportSummary {
  return {
    fileName: source.fileName,
    format: 'json',
    origin: { kind: 'webBackup' },
    exportedAt: source.exportedAt,
    file: count(source.tables),
    added: count(applied),
    samples: [],
    previous: null,
  }
}

const readTables = () => syncedTables.map((name) => db.table(name))

export async function previewRestore(source: WebBackupSource): Promise<ImportSummary> {
  return db.transaction('r', [...readTables(), db.workouts], async () => summary(source, await changes(source)))
}

/** One transaction: every newer record is written and queued for sync, or nothing. */
export async function runRestore(source: WebBackupSource): Promise<ImportSummary> {
  return transaction(async () => {
    const applied = await changes(source)
    for (const table of syncedTables) {
      const records = applied[table]
      if (records.length === 0) continue
      await db.table(table).bulkPut(records)
      await enqueue(
        table,
        records.map((record) => record.id),
      )
    }
    return summary(source, applied)
  })
}
