import { db } from '../data/db'
import { derivedID } from '../data/ids'
import { defaultSettings, getSettings, updateSettings } from '../settings/deviceSettings'
import { freshDatabase } from '../test/db'
import { legacyBackup } from '../test/legacyBackup'
import { motionV1, motionV17, olderCSV, olderIDs, unix, workoutCSV } from '../test/olderCSV'
import { ImportError } from './errors'
import { previewImport, readImportText, runImport } from './importer'
import { olderHeaders, olderVersion } from './olderCSV'

async function failure(work: Promise<unknown>): Promise<ImportError> {
  try {
    await work
  } catch (error) {
    if (error instanceof ImportError) return error
    throw error
  }
  throw new Error('expected the import to fail')
}

describe('older iOS CSV files (phase 5b)', () => {
  beforeEach(async () => {
    await freshDatabase()
    updateSettings(defaultSettings)
  })

  it('recognises every header from version 1 to 17 exactly', () => {
    expect(olderHeaders.map((header) => olderVersion(header))).toEqual(Array.from({ length: 17 }, (_, index) => index + 1))
    expect(olderHeaders[0]).toHaveLength(12)
    expect(olderHeaders[16]).toHaveLength(53)
    expect(olderVersion(['motion_backup_v12', 'key', 'date'])).toBeNull()
  })

  it('turns a version 17 file into the full backup with 2001 dates and leaves sample workouts out', async () => {
    const source = await readImportText(motionV17(), 'MotionBackup.csv')
    expect(source.origin).toEqual({ kind: 'olderCSV', version: 17 })
    const { backup } = source
    expect(backup.workouts.map((session) => session.name)).toEqual(['Push', 'Freestyle', 'Running'])
    const push = backup.workouts[0]!
    expect(push.id).toBe(olderIDs.done)
    expect(push.date + 978_307_200).toBe(unix('2026-03-01T10:00:00.250Z'))
    expect(push.notes).toBe('Felt strong')
    expect(push.exercises[1]!.sets[0]).toMatchObject({ durationSeconds: 60, weight: 0, isCompleted: true })
    const draft = backup.workouts[1]!
    expect(draft.exercises[0]!.sets[0]).toMatchObject({ id: olderIDs.draftSet, draftWeightText: '60', draftRepsText: '' })
    expect(draft.restTimer).toMatchObject({ remaining: 30, sourceSetID: olderIDs.draftSet })
    expect(draft.undoHistory).toHaveLength(1)
    expect(backup.routines[0]!.exercises[0]).toMatchObject({ targetSets: 3, warmUpSets: 1, guidance: { minimumReps: 6, maximumReps: 8 } })
    expect(backup.library[0]!.metadata).toMatchObject({ equipment: 'Barbell' })
    expect(backup.profile).toMatchObject({ name: 'Mathis', targetWeightKilograms: 72 })
    expect(backup.preferences).toBeNull()
    expect(backup.exportedAt + 978_307_200).toBe(unix('2026-03-02T07:05:00Z'))
  })

  it('imports a version 17 file, keeps the device settings and adds nothing on a second import', async () => {
    updateSettings({ appearance: 'light' })
    const source = await readImportText(motionV17(), 'MotionBackup.csv')
    const summary = await previewImport(source)
    expect(summary.origin).toEqual({ kind: 'olderCSV', version: 17 })
    expect(summary.file).toMatchObject({ workouts: 1, drafts: 1, sets: 3, exercises: 1, routines: 1, bodyWeights: 1, xpReceipts: 2, records: 1, xp: 175, healthWorkouts: 1 })
    await runImport(source)

    const push = await db.workouts.get(olderIDs.done.toLowerCase())
    expect(push).toMatchObject({ name: 'Push', performed_at: '2026-03-01T10:00:00.250Z', earned_xp: 150, blueprint_id: olderIDs.routine.toLowerCase() })
    expect(await db.set_logs.where('workout_id').equals(olderIDs.done.toLowerCase()).count()).toBe(3)
    expect((await db.body_weights.toArray())[0]).toMatchObject({ day: '2026-03-01', kilograms: 74.2 })
    expect((await db.profiles.toArray())[0]).toMatchObject({ name: 'Mathis', target_weight_kg: 72 })
    expect(getSettings().appearance).toBe('light')
    expect(await db.legacy_imports.count()).toBe(1)

    const again = await runImport(await readImportText(motionV17(), 'MotionBackup.csv'))
    expect(again.previous).not.toBeNull()
    expect(again.added).toMatchObject({ workouts: 0, drafts: 0, sets: 0, exercises: 0, routines: 0, bodyWeights: 0, xpReceipts: 0 })
  })

  it('gives version 1 files stable ids derived from their content', async () => {
    const first = await readImportText(motionV1(), 'old.csv')
    const second = await readImportText(motionV1(), 'copy.csv')
    const [session] = first.backup.workouts
    expect(session!.id).toBe(second.backup.workouts[0]!.id)
    expect(session!.id).toBe(derivedID(`legacy-csv/workout/true/${unix('2025-06-01T18:00:00Z')}/Legs`))
    expect(session!.exercises[0]).toMatchObject({ measurementType: 'Load & reps', draftOrder: 0 })
    expect(session!.exercises[0]!.sets.map((set) => [set.setIndex, set.reps ?? null, set.isCompleted])).toEqual([
      [1, 5, true],
      [2, null, false],
    ])
    await runImport(first)
    expect((await db.profiles.toArray())[0]).toMatchObject({ body_weight_unit: 'lb', load_unit: 'kg', distance_unit: 'km' })
    // A completed workout without a receipt is sealed with the XP from the file.
    expect((await db.workout_awards.toArray()).map((award) => award.earned_xp)).toEqual([120])
    expect((await runImport(second)).added.workouts).toBe(0)
  })

  it('recognises a workout already imported from the full backup by name, completion and second', async () => {
    await runImport(await readImportText(JSON.stringify(legacyBackup()), 'Motion-Backup.json'))
    const summary = await runImport(await readImportText(motionV1('Push', '2026-11-01T10:00:00Z'), 'old.csv'))
    expect(summary.added.workouts).toBe(0)
    expect(summary.added.xpReceipts).toBe(0)
    // The full backup brought two workouts; its Health workout is skipped.
    expect(await db.workouts.count()).toBe(2)
  })

  it('reports every broken row with its row number and imports nothing', async () => {
    const csv = olderCSV(5, [
      { 0: 'workout', 1: 'w0', 2: 'yesterday', 3: "'Push", 8: 'true', 9: '10', 10: 'false' },
      { 0: 'exercise', 1: 'w0e0', 3: "'Bench", 4: 'w9' },
      { 0: 'mystery' },
      { 0: 'set', 4: 'w0e0', 5: '0', 6: '10', 8: 'true' },
    ]).replace(/\r\n$/, '\r\n"set","w0e0"\r\n')
    const error = await failure(readImportText(csv, 'broken.csv'))
    expect(error.code).toBe('invalid')
    expect(error.detail.issues).toEqual([
      { path: 'rows[1]', reason: 'malformed value' },
      { path: 'rows[3]', reason: 'unknown record type' },
      { path: 'rows[4]', reason: 'invalid set' },
      { path: 'rows[5]', reason: 'wrong number of columns' },
    ])
    const linked = await failure(readImportText(olderCSV(5, [{ 0: 'exercise', 1: 'w0e0', 3: "'Bench", 4: 'w9' }]), 'orphan.csv'))
    expect(linked.detail.issues).toEqual([{ path: 'rows[1]', reason: 'refers to a missing workout' }])
    expect(await db.workouts.count()).toBe(0)
  })

  it('drops an undo history or rest timer that refers to sets the file does not have', async () => {
    // The set id appears in plain text only in the set row; undo and timer hold it in base64.
    const csv = motionV17().replace(olderIDs.draftSet, 'E2B2C3D4-0000-4000-8000-0000000000FF')
    const draft = (await readImportText(csv, 'MotionBackup.csv')).backup.workouts[1]!
    expect(draft.undoHistory).toBeNull()
    expect(draft.restTimer?.sourceSetID).toBeNull()
  })

  it('imports the simple workout CSV as completed workouts grouped by date and name', async () => {
    const source = await readImportText(workoutCSV(), 'Workouts.csv')
    expect(source.origin).toEqual({ kind: 'workoutCSV' })
    const sessions = source.backup.workouts
    expect(sessions.map((session) => [session.name, session.exercises.map((exercise) => exercise.exerciseName)])).toEqual([
      ['Pull', ['Row', '-Pull-up']],
      ['Pull', ['Row']],
    ])
    expect(sessions[0]!.date + 978_307_200).toBe(unix('2026-03-05T18:00:00Z'))
    const summary = await runImport(source)
    expect(summary.added).toMatchObject({ workouts: 2, sets: 3, xp: 0 })
    expect(await db.set_logs.count()).toBe(4)
    expect((await runImport(await readImportText(workoutCSV(), 'Workouts.csv'))).added.workouts).toBe(0)
  })

  it('rejects broken rows of the simple workout CSV', async () => {
    const csv = workoutCSV() + '"2026-03-05","Pull","Row","3","60","10","true"\r\n"2026-03-05T18:00:00Z","Pull","Row","1","60","10","true"\r\n'
    const error = await failure(readImportText(csv, 'Workouts.csv'))
    expect(error.detail.issues).toEqual([
      { path: 'rows[5]', reason: 'malformed value' },
      { path: 'rows[6]', reason: 'duplicate identities' },
    ])
  })
})
