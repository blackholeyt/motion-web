import { olderHeaders, workoutCSVHeader } from '../import/olderCSV'

/*
 * Files in the CSV formats the iOS app wrote before version 18 (MotionBackupCSV.makeCSV and
 * WorkoutCSVExporter): Unix seconds, names with a leading apostrophe, every field quoted, CRLF.
 */

export const unix = (iso: string) => Date.parse(iso) / 1000

export const olderIDs = {
  bench: 'A2B2C3D4-0000-4000-8000-000000000001',
  routine: 'B2B2C3D4-0000-4000-8000-000000000001',
  draft: 'C2B2C3D4-0000-4000-8000-000000000001',
  done: 'C2B2C3D4-0000-4000-8000-000000000002',
  health: '92B2C3D4-0000-4000-8000-000000000001',
  draftBench: 'D2B2C3D4-0000-4000-8000-000000000001',
  draftSet: 'E2B2C3D4-0000-4000-8000-000000000001',
}

const quote = (value: string) => `"${value.replace(/"/g, '""')}"`

/** Rows given as column → value; the header of the version decides how many columns there are. */
export function olderCSV(version: number, records: Record<number, string>[]): string {
  const header = olderHeaders[version - 1]!
  const rows = [header, ...records.map((fields) => header.map((_, index) => fields[index] ?? ''))]
  return rows.map((row) => row.map(quote).join(',')).join('\r\n') + '\r\n'
}

const base64 = (value: unknown) => btoa(JSON.stringify(value))

/** A version 17 file with every record type: library, routine, workouts, draft, Health, profile, daily records. */
export function motionV17(): string {
  return olderCSV(17, [
    { 0: 'library_exercise', 3: "'Bench Press", 19: olderIDs.bench, 21: 'true', 22: '100', 36: '120', 39: JSON.stringify({ catalogueID: 'bench', equipment: 'Barbell', muscle: 'Chest', measurement: 'Load & reps', guidance: '', trackProgress: true }) },
    { 0: 'blueprint', 1: olderIDs.routine, 3: "'Push" },
    { 0: 'blueprint_exercise', 4: olderIDs.routine, 19: olderIDs.bench, 25: '0', 45: '1', 46: '3', 47: JSON.stringify({ minimumReps: 6, maximumReps: 8, notes: '', progression: 'Build external load' }) },
    { 0: 'workout_award', 1: olderIDs.done, 9: '150' },
    // A sample workout is left out like in the full backup.
    { 0: 'workout', 1: 'w0', 2: String(unix('2026-01-01T10:00:00Z')), 3: "'Sample", 8: 'true', 9: '50', 10: 'true', 12: 'false', 49: 'false' },
    { 0: 'workout', 1: 'w1', 2: String(unix('2026-03-01T10:00:00.250Z')), 3: "'Push", 8: 'true', 9: '150', 10: 'false', 12: 'false', 23: olderIDs.done, 28: olderIDs.routine, 49: 'false', 52: "'Felt strong" },
    { 0: 'exercise', 1: 'w1e0', 3: "'Bench Press", 4: 'w1', 13: 'false', 19: olderIDs.bench, 25: '0', 30: 'false', 40: 'Load & reps' },
    { 0: 'set', 4: 'w1e0', 5: '1', 6: '40', 7: '10', 8: 'true', 30: 'false', 32: 'false', 35: 'kg', 42: 'true' },
    { 0: 'set', 4: 'w1e0', 5: '2', 6: '80', 7: '8', 8: 'true', 30: 'false', 32: 'false', 35: 'kg', 42: 'false' },
    { 0: 'exercise', 1: 'w1e1', 3: "'Plank", 4: 'w1', 13: 'false', 25: '1', 30: 'false', 40: 'Duration' },
    { 0: 'set', 4: 'w1e1', 5: '1', 6: '0', 8: 'true', 30: 'false', 32: 'false', 35: 'kg', 41: '60', 42: 'false' },
    {
      0: 'workout', 1: 'w2', 2: String(unix('2026-03-02T07:00:00Z')), 3: "'Freestyle", 8: 'false', 9: '0', 10: 'false', 12: 'true', 23: olderIDs.draft,
      24: String(unix('2026-03-02T07:05:00Z')), 49: 'false',
      29: base64([{ freestyle: true, exercises: [{ id: olderIDs.draftBench, order: 0, removed: false, sets: [{ id: olderIDs.draftSet, weight: '', reps: '', completed: false, skipped: false, removed: false }] }] }]),
      37: base64({ duration: 90, remaining: 30, sourceSetID: olderIDs.draftSet, exerciseName: 'Bench Press' }),
    },
    { 0: 'exercise', 1: 'w2e0', 3: "'Bench Press", 4: 'w2', 13: 'false', 19: olderIDs.bench, 20: olderIDs.draftBench, 25: '0', 30: 'false', 40: 'Load & reps' },
    { 0: 'set', 4: 'w2e0', 5: '1', 6: '0', 8: 'false', 26: "'60", 27: "'", 30: 'false', 31: olderIDs.draftSet, 32: 'false', 35: 'kg', 42: 'false' },
    { 0: 'workout', 1: 'w3', 2: String(unix('2026-02-27T17:00:00Z')), 3: "'Running", 8: 'true', 9: '100', 10: 'false', 12: 'false', 14: 'Running', 15: '1800', 16: '5', 17: '360', 18: olderIDs.health, 49: 'false' },
    { 0: 'profile', 2: String(unix('2025-12-01T09:00:00Z')), 3: "'Mathis", 11: 'kg', 33: 'kg', 34: 'km', 50: '72' },
    { 0: 'body_weight', 1: '1-2026-3-1', 2: String(unix('2026-03-01T06:30:00Z')), 6: '74.2' },
    { 0: 'weight_reward', 1: '1-2026-3-1', 2: String(unix('2026-03-01T06:30:00Z')), 9: '25' },
    { 0: 'nutrition', 51: '{}' },
  ])
}

/** A version 1 file: no ids at all, one completed workout with two sets. */
export function motionV1(name = 'Legs', iso = '2025-06-01T18:00:00Z'): string {
  return olderCSV(1, [
    { 0: 'workout', 1: 'w0', 2: String(unix(iso)), 3: `'${name}`, 8: 'true', 9: '120', 10: 'false' },
    { 0: 'exercise', 1: 'w0e0', 3: "'Squat", 4: 'w0' },
    { 0: 'set', 4: 'w0e0', 5: '1', 6: '100', 7: '5', 8: 'true' },
    { 0: 'set', 4: 'w0e0', 5: '2', 6: '100', 7: '', 8: 'false' },
    { 0: 'profile', 2: String(unix('2025-05-01T09:00:00Z')), 3: "'Mathis", 11: 'lb' },
  ])
}

/** WorkoutCSVExporter output: newest workout first, exercises by name, one row per set. */
export function workoutCSV(): string {
  const rows = [
    workoutCSVHeader,
    ['2026-03-05T18:00:00Z', 'Pull', 'Row', '1', '60', '10', 'true'],
    ['2026-03-05T18:00:00Z', 'Pull', 'Row', '2', '65', '8', 'true'],
    ['2026-03-05T18:00:00Z', 'Pull', "'-Pull-up", '1', '0', '', 'false'],
    ['2026-03-03T18:00:00Z', 'Pull', 'Row', '1', '55', '10', 'true'],
  ]
  return rows.map((row) => row.map(quote).join(',')).join('\r\n') + '\r\n'
}
