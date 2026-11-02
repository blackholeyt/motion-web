import { db, syncedTables } from '../data/db'
import type { SyncedTable } from '../data/types'

/*
 * JSON backup in the new web format (FullBackupSection.swift, export side). Every synced table is
 * included with its tombstones, so a later restore can merge without reviving deleted records.
 * The import of the iOS app's backup lives in src/import (phase 5a); restoring this web format is not built yet.
 */

export const backupFormat = 'motion-web-backup'
export const backupVersion = 1

export interface Backup {
  format: typeof backupFormat
  version: typeof backupVersion
  exported_at: string
  app_version: string
  tables: Record<SyncedTable, unknown[]>
}

export async function buildBackup(now = new Date()): Promise<Backup> {
  const tables = {} as Record<SyncedTable, unknown[]>
  for (const name of syncedTables) tables[name] = await db.table(name).toArray()
  return { format: backupFormat, version: backupVersion, exported_at: now.toISOString(), app_version: __APP_VERSION__, tables }
}

export async function exportBackup(now = new Date()): Promise<File> {
  const backup = await buildBackup(now)
  const stamp = now.toISOString().slice(0, 10)
  return new File([JSON.stringify(backup, null, 2)], `Motion-Backup-${stamp}.json`, { type: 'application/json' })
}
