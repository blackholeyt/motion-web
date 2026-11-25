import { db } from '../data/db'
import { derivedID, stableID } from '../data/ids'
import { getSettings, updateSettings, defaultSettings } from '../settings/deviceSettings'
import { checkIn } from '../store/body'
import { createExercise } from '../store/library'
import { totalXP } from '../store/progress'
import { freshDatabase } from '../test/db'
import { completeCSV, ids, legacyBackup } from '../test/legacyBackup'
import { parseCSV } from './csv'
import { ImportError } from './errors'
import { previewImport, readImportText, runImport, webDay } from './importer'

const json = (value: unknown = legacyBackup()) => JSON.stringify(value, null, 2)

async function failure(work: Promise<unknown>): Promise<ImportError> {
  try {
    await work
  } catch (error) {
    if (error instanceof ImportError) return error
    throw error
  }
  throw new Error('expected the import to fail')
}

describe('reading iOS backups', () => {
  beforeEach(freshDatabase)

  it('reads the JSON backup and the CSV v18 export of it as the same backup', async () => {
    const fromJSON = await readImportText(json(), 'Motion-Backup-2026-11-02.json')
    const fromCSV = await readImportText(completeCSV(legacyBackup()), 'MotionBackup.csv')
    expect(fromJSON.format).toBe('json')
    expect(fromCSV.format).toBe('csv')
    expect(fromCSV.backup).toEqual(fromJSON.backup)
    expect(fromCSV.fingerprint).toBe(fromJSON.fingerprint)
  })

  it('parses quoted CSV fields with commas, quotes and line breaks', () => {
    expect(parseCSV('﻿"a","b ""c""","d,\ne"\r\n')).toEqual([['a', 'b "c"', 'd,\ne']])
    expect(() => parseCSV('"a"b')).toThrow(ImportError)
  })

  it('treats a cut-off header of an older CSV as damaged instead of guessing', async () => {
    expect((await failure(readImportText('motion_backup_v17,key,date\n', 'old.csv'))).code).toBe('csvMalformed')
    expect((await failure(readImportText('workout_date,workout_name,exercise\n', 'w.csv'))).code).toBe('csvMalformed')
    expect((await failure(readImportText('hello', 'x.txt'))).code).toBe('unreadable')
    expect((await failure(readImportText('{"format":"motion-web-backup","version":1}', 'web.json'))).code).toBe('wrongType')
    expect((await failure(readImportText('{"format":"motion.full-backup","version":2}', 'new.json'))).code).toBe('unsupportedVersion')
  })

  it('rejects broken CSV rows with their line number', async () => {
    const csv = completeCSV(legacyBackup()).replace('"library","1"', '"library","01"')
    const error = await failure(readImportText(csv, 'MotionBackup.csv'))
    expect(error.code).toBe('csvRow')
    expect(error.detail.row).toBeGreaterThan(1)
  })

  it('applies the validation rules of the iOS app and reports every problem with its place', async () => {
    const backup = legacyBackup()
    backup.workouts[0]!.exercises[0]!.sets[1]!.isSkipped = true
    backup.weights[0]!.kilograms = 900
    backup.workoutAwards[0]!.earnedXP = 10
    const error = await failure(readImportText(json(backup), 'bad.json'))
    expect(error.code).toBe('invalid')
    expect(error.detail.issues).toEqual(
      expect.arrayContaining([
        { path: 'workouts[0].exercises[0].sets[1]', reason: 'invalid set' },
        { path: 'weights[0]', reason: 'invalid body weight' },
        { path: 'workouts[0]', reason: 'workout XP disagrees with its award receipt' },
      ]),
    )
  })

  it('reports missing fields like an incomplete file', async () => {
    const backup = legacyBackup() as Record<string, unknown>
    delete backup.preferences
    const error = await failure(readImportText(json(backup), 'cut.json'))
    expect(error.detail.issues).toEqual([{ path: 'preferences', reason: 'missing value' }])
  })

  it('converts iOS calendar days', () => {
    expect(webDay('1-2026-11-2')).toBe('2026-11-02')
    expect(webDay('1-2026-02-2')).toBeNull()
    expect(webDay('1-2026-2-30')).toBeNull()
    expect(webDay('0-2026-2-3')).toBeNull()
  })
})

describe('importing iOS backups', () => {
  beforeEach(async () => {
    await freshDatabase()
    updateSettings(defaultSettings)
  })

  it('previews counts and the latest workouts without writing anything', async () => {
    const source = await readImportText(json(), 'Motion-Backup.json')
    const summary = await previewImport(source)
    expect(summary.file).toEqual({
      workouts: 1,
      drafts: 1,
      sets: 2,
      exercises: 2,
      routines: 1,
      bodyWeights: 2,
      xpReceipts: 3,
      records: 1,
      xp: 200,
      healthWorkouts: 1,
    })
    expect(summary.added).toEqual(summary.file)
    expect(summary.samples.map((sample) => sample.name)).toEqual(['Freestyle', 'Push'])
    expect(summary.samples[1]!.exercises[0]!.sets.map((set) => [set.weight, set.reps, set.warmUp])).toEqual([
      [40, 10, true],
      [82.5, 7, false],
    ])
    expect(await db.workouts.count()).toBe(0)
    expect(await db.outbox.count()).toBe(0)
  })

  it('writes every record with lower-case ids, web days and ISO dates and queues it for sync', async () => {
    const summary = await runImport(await readImportText(json(), 'Motion-Backup.json'), new Date('2026-11-02T09:00:00Z'))
    expect(summary.previous).toBeNull()
    const done = (await db.workouts.get(ids.done.toLowerCase()))!
    expect(done).toMatchObject({
      name: 'Push',
      performed_at: '2026-11-01T10:00:00.000Z',
      is_completed: true,
      earned_xp: 175,
      notes: 'Felt strong',
      blueprint_id: ids.push.toLowerCase(),
      plan_ticket: { entryID: ids.entry.toLowerCase(), rotationToken: ids.token.toLowerCase(), dayKey: '2026-11-01', date: '2026-11-01T00:00:00.000Z' },
      source: 'motion',
    })
    const draft = (await db.workouts.get(ids.draft.toLowerCase()))!
    expect(draft).toMatchObject({ is_completed: false, draft_updated_at: '2026-11-02T07:05:00.000Z' })
    expect(draft.rest_timer).toEqual({ deadline: '2026-11-02T07:06:30.000Z', noticeUntil: null, duration: 90, remaining: 90, sourceSetID: ids.setDraft.toLowerCase(), exerciseName: 'Bench Press' })
    expect(draft.undo_history![0]!.exercises[0]!.sets[0]).toMatchObject({ id: ids.setDraft.toLowerCase(), unit: 'kg', warmUp: false, weight: '60' })
    expect(await db.workouts.get(ids.health.toLowerCase())).toBeUndefined()
    expect(await db.set_logs.where('workout_id').equals(ids.done.toLowerCase()).count()).toBe(2)
    expect(await db.set_logs.get(ids.setDraft.toLowerCase())).toMatchObject({ draft_weight_text: '60', draft_weight_unit: 'kg', is_completed: false })
    expect(await db.exercises.get(ids.bench.toLowerCase())).toMatchObject({ name: 'Bench Press', catalogue_id: 'bench', is_pr_tracked: true, goal_weight_kg: 80 })
    expect(await db.exercises.get(ids.curl.toLowerCase())).toMatchObject({ equipment: 'Other', measurement: 'Load & reps', track_progress: true })
    expect(await db.blueprint_exercises.get(derivedID(`blueprint_exercises/${ids.push.toLowerCase()}/${ids.bench.toLowerCase()}`))).toMatchObject({
      target_sets: 3,
      warm_up_sets: 1,
      superset_group: 'A',
      guidance: { minimumReps: 6, maximumReps: 8, progression: 'Build external load', notes: '', measurement: null },
    })
    expect(await db.body_weights.get(stableID('body_weights', '2026-11-01'))).toMatchObject({ day: '2026-11-01', kilograms: 67.05 })
    const plan = (await db.training_plans.get(stableID('training_plans')))!.schedule
    expect(plan.consumed).toEqual([`${ids.entry.toLowerCase()}/${ids.token.toLowerCase()}`, 'cardio/2026-10-30'])
    expect(plan.entries[0]!.blueprintID).toBe(ids.push.toLowerCase())
    const profile = (await db.profiles.get(stableID('profiles')))!
    expect(profile).toMatchObject({ name: 'Alex', target_weight_kg: 70, body_weight_goal: 'gain', celebrated_weight_goals: ['gain:68000'], created_at: '2026-04-11T09:00:00.000Z' })
    expect(profile.preferences).toMatchObject({ restTimerSeconds: 120 })
    expect(Object.keys(profile.preferences)).not.toEqual(expect.arrayContaining(['quietMode', 'haptics']))
    expect(getSettings()).toMatchObject({ appearance: 'light', openingAnimation: false })
    // XP comes from the file: the completed workout plus one daily weight receipt.
    expect(await totalXP()).toBe(200)
    expect(await db.legacy_imports.toArray()).toEqual([expect.objectContaining({ file_name: 'Motion-Backup.json', source_format: 'json', imported_at: '2026-11-02T09:00:00.000Z' })])
    const queued = new Set((await db.outbox.toArray()).map((entry) => entry.table))
    expect(queued).toEqual(new Set(['exercises', 'blueprints', 'blueprint_exercises', 'workouts', 'workout_exercises', 'set_logs', 'workout_awards', 'body_weights', 'weight_rewards', 'training_plans', 'profiles', 'legacy_imports']))
  })

  it('adds nothing twice and points out a file that was already imported', async () => {
    await runImport(await readImportText(json(), 'Motion-Backup.json'))
    const counts = await Promise.all([db.workouts.count(), db.set_logs.count(), db.exercises.count(), db.workout_awards.count()])
    const again = await readImportText(completeCSV(legacyBackup()), 'MotionBackup.csv')
    const preview = await previewImport(again)
    expect(preview.previous?.file_name).toBe('Motion-Backup.json')
    expect(preview.added).toMatchObject({ workouts: 0, drafts: 0, sets: 0, exercises: 0, routines: 0, bodyWeights: 0, xpReceipts: 0, xp: 0 })
    await runImport(again)
    expect(await Promise.all([db.workouts.count(), db.set_logs.count(), db.exercises.count(), db.workout_awards.count()])).toEqual(counts)
    expect(await db.legacy_imports.count()).toBe(1)
  })

  it('keeps existing records and days unchanged', async () => {
    await checkIn(70, new Date('2026-11-01T07:00:00'))
    const own = await createExercise('Squat')
    const summary = await runImport(await readImportText(json(), 'Motion-Backup.json'))
    expect(summary.added.bodyWeights).toBe(1)
    expect(summary.added.xpReceipts).toBe(2)
    expect((await db.body_weights.get(stableID('body_weights', '2026-11-01')))!.kilograms).toBe(70)
    expect(await db.exercises.get(own.id)).toMatchObject({ name: 'Squat' })
  })

  it('stops without writing when a new workout reuses ids of another workout', async () => {
    const backup = legacyBackup()
    await runImport(await readImportText(json(backup), 'first.json'))
    backup.workouts[0]!.id = 'C1B2C3D4-0000-4000-8000-0000000000FF'
    backup.workoutAwards = backup.workoutAwards.filter((award) => award.sessionID !== ids.done)
    const before = await db.workouts.count()
    const error = await failure(runImport(await readImportText(json(backup), 'second.json')))
    expect(error.code).toBe('conflict')
    expect(await db.workouts.count()).toBe(before)
    expect(await db.legacy_imports.count()).toBe(1)
  })
})
