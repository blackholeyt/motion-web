import { db } from '../data/db'
import { softDelete, update } from '../data/repo'
import type { Workout } from '../data/types'
import * as engine from '../features/workout/engine'
import { loadSession } from '../features/workout/session'
import { buildBackup } from '../store/backup'
import { addEntry, createBlueprint } from '../store/blueprints'
import { checkIn } from '../store/body'
import { createExercise } from '../store/library'
import { ensureProfile, updateProfile } from '../store/profile'
import { totalXP } from '../store/progress'
import { freshDatabase } from '../test/db'
import { legacyBackup } from '../test/legacyBackup'
import { ImportError } from './errors'
import { readBackupText } from './importer'
import { previewRestore, runRestore, type WebBackupSource } from './webBackup'

const context: engine.WorkoutContext = { trackReps: true, globalRestSeconds: 90, unit: 'kg', locale: 'en-US', now: () => new Date() }

/** A device with a profile, a finished workout and body weight; returns its backup as text. */
async function exportedDevice() {
  await freshDatabase()
  await ensureProfile()
  await updateProfile({ name: 'Restored' })
  const blueprint = await createBlueprint('Push')
  await addEntry(blueprint.id, await createExercise('Bench Press', true), 2)
  const id = await engine.startFromBlueprint(blueprint)
  for (const row of (await loadSession(id))!.rows) {
    await engine.updateSetInput(id, row.set.id, '62,5', '8', context)
    await engine.toggleCompletion(id, row.set.id, context)
  }
  await engine.finishWorkout(id, context)
  await checkIn(67.4, new Date('2026-11-02T07:00:00'))
  return { text: JSON.stringify(await buildBackup()), workoutID: id, xp: await totalXP() }
}

async function webSource(text: string): Promise<WebBackupSource> {
  const file = await readBackupText(text, 'Motion-Backup-2026-11-03.json')
  if (file.kind !== 'web') throw new Error('expected a web backup')
  return file.source
}

async function failure(work: Promise<unknown>): Promise<ImportError> {
  try {
    await work
  } catch (error) {
    if (error instanceof ImportError) return error
    throw error
  }
  throw new Error('expected the restore to fail')
}

describe('restoring the web backup', () => {
  it('brings everything back on an empty device and queues it for sync', async () => {
    const { text, workoutID, xp } = await exportedDevice()
    await freshDatabase()
    await ensureProfile()
    const source = await webSource(text)
    const preview = await previewRestore(source)
    expect(preview.origin).toEqual({ kind: 'webBackup' })
    expect(preview.file).toMatchObject({ workouts: 1, drafts: 0, sets: 2, routines: 1, bodyWeights: 1, records: 0 })
    expect(preview.added).toEqual(preview.file)
    expect(await db.workouts.count()).toBe(0)

    await runRestore(source)
    expect(await db.workouts.get(workoutID)).toMatchObject({ name: 'Push', is_completed: true })
    expect((await db.set_logs.where('workout_id').equals(workoutID).toArray()).map((set) => set.weight_kg)).toEqual([62.5, 62.5])
    expect((await db.profiles.toArray()).map((profile) => profile.name)).toEqual(['Restored'])
    expect(await totalXP()).toBe(xp)
    expect(await db.outbox.where('table').equals('workouts').count()).toBe(1)
  })

  it('ignores the sleep scores of backups made before the sleep index was removed', async () => {
    const { text, workoutID } = await exportedDevice()
    const older = JSON.parse(text)
    const time = new Date().toISOString()
    older.tables.sleep_scores = [{ id: '0b5c7a39-3f0e-4c55-9b7e-2f7e1d6a9c01', day: '2026-11-02', score: 81, created_at: time, updated_at: time, deleted_at: null }]
    await freshDatabase()
    await runRestore(await webSource(JSON.stringify(older)))
    expect(await db.workouts.get(workoutID)).toMatchObject({ is_completed: true })
    expect(db.tables.map((table) => table.name)).not.toContain('sleep_scores')
  })

  it('adds nothing when restored twice', async () => {
    const { text } = await exportedDevice()
    await freshDatabase()
    await runRestore(await webSource(text))
    const again = await runRestore(await webSource(text))
    expect(Object.values(again.added).every((value) => value === 0)).toBe(true)
  })

  it('keeps newer changes of this device and newer deletions from the file', async () => {
    const { text, workoutID } = await exportedDevice()
    // After the export: the workout is renamed here, the blueprint deleted.
    await new Promise((resolve) => setTimeout(resolve, 5))
    await update<Workout>('workouts', workoutID, { name: 'Push renamed' })
    const blueprint = (await db.blueprints.toArray())[0]!
    await softDelete('blueprints', [blueprint.id])
    await runRestore(await webSource(text))
    expect((await db.workouts.get(workoutID))!.name).toBe('Push renamed')
    expect((await db.blueprints.get(blueprint.id))!.deleted_at).not.toBeNull()

    // A file whose tombstone is newer deletes the record here.
    const later = JSON.parse(text)
    const weight = later.tables.body_weights[0]
    weight.deleted_at = weight.updated_at = new Date(Date.now() + 60_000).toISOString()
    const summary = await runRestore(await webSource(JSON.stringify(later)))
    expect((await db.body_weights.get(weight.id))!.deleted_at).not.toBeNull()
    expect(summary.added.bodyWeights).toBe(0)
  })

  it('accepts backups made before the import receipts existed', async () => {
    const { text } = await exportedDevice()
    const older = JSON.parse(text)
    delete older.tables.legacy_imports
    await freshDatabase()
    expect((await runRestore(await webSource(JSON.stringify(older)))).added.workouts).toBe(1)
  })

  it('reports damaged files with their place and writes nothing', async () => {
    const { text } = await exportedDevice()
    await freshDatabase()
    const damaged = JSON.parse(text)
    damaged.tables.set_logs[1].id = 'not-an-id'
    damaged.tables.workouts[0].updated_at = 'yesterday'
    const error = await failure(webSource(JSON.stringify(damaged)))
    expect(error.code).toBe('invalid')
    expect(error.detail.issues).toEqual([
      { path: 'workouts[0]', reason: 'invalid date' },
      { path: 'set_logs[1]', reason: 'invalid ID' },
    ])
    expect((await failure(webSource(JSON.stringify({ ...damaged, version: 2 })))).code).toBe('unsupportedVersion')
    expect(await db.workouts.count()).toBe(0)
  })

  it('still sends backups of the iOS app to the iOS import', async () => {
    await freshDatabase()
    expect((await readBackupText(JSON.stringify(legacyBackup()), 'Motion-Backup.json')).kind).toBe('ios')
  })
})
