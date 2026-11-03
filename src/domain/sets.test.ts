import type { SetLog, WorkoutExercise } from '../data/types'
import { formatNumber, needsReps, parseNumber } from './measurement'
import { orderedRows, parseWeightText, setBadge, startsRest, type ExerciseRows } from './sets'

const base = { user_id: null, created_at: '', updated_at: '', deleted_at: null }
const exercise = (id: string, group: 'A' | null = null): WorkoutExercise => ({
  ...base, id, workout_id: 'w', exercise_id: id, exercise_name: id, measurement: 'Load & reps', guidance: null, superset_group: group,
  rest_seconds: null, acknowledged_record_kg: null, is_history_only: false, is_removed: false, sort_order: 0,
})
const set = (id: string, owner: string, index: number, extra: Partial<SetLog> = {}): SetLog => ({
  ...base, id, workout_id: 'w', workout_exercise_id: owner, set_index: index, weight_kg: 0, reps: null, duration_seconds: null,
  is_completed: false, is_warm_up: false, is_skipped: false, is_removed: false, draft_weight_text: null, draft_weight_unit: null,
  draft_reps_text: null, draft_duration_text: null, ...extra,
})
const rows = (ex: WorkoutExercise, sets: SetLog[]): ExerciseRows => ({ exercise: ex, rows: sets.map((s) => ({ set: s, exercise: ex })) })

describe('number input (MeasurementNumber.parse)', () => {
  it('accepts dot or comma with up to two decimals only', () => {
    expect(parseNumber('62.5')).toBe(62.5)
    expect(parseNumber('62,25')).toBe(62.25)
    expect(parseNumber('62.')).toBe(62)
    expect(parseNumber('1.000,5')).toBeNull()
    expect(parseNumber('-5')).toBeNull()
    expect(parseNumber('6.125')).toBeNull()
    expect(parseNumber('1e3')).toBeNull()
  })

  it('formats without grouping in the chosen locale', () => {
    expect(formatNumber(1234.5, 'de-DE')).toBe('1234,5')
    expect(formatNumber(100, 'en-US')).toBe('100')
  })

  it('keeps the exact stored value when the rounded display is unchanged', () => {
    expect(parseWeightText('220.46', 'Load & reps', 'lb', 100, 'en-US')).toBe(100)
    expect(parseWeightText('220.5', 'Load & reps', 'lb', 100, 'en-US')).toBeCloseTo(100.0172, 3)
    expect(parseWeightText('', 'Bodyweight reps', 'kg', 0, 'en-US')).toBe(0)
  })

  it('requires reps by measurement and setting', () => {
    expect(needsReps('Duration', true)).toBe(false)
    expect(needsReps('Load & reps', false)).toBe(false)
    expect(needsReps('Bodyweight reps', false)).toBe(true)
  })
})

describe('supersets (SupersetSequence)', () => {
  const a = exercise('a', 'A')
  const b = exercise('b', 'A')
  const c = exercise('c')
  const groups = [
    rows(a, [set('a0', 'a', 1, { is_warm_up: true }), set('a1', 'a', 2), set('a2', 'a', 3)]),
    rows(b, [set('b1', 'b', 1)]),
    rows(c, [set('c1', 'c', 1)]),
  ]

  it('runs warm-ups first, then alternates working rounds', () => {
    expect(orderedRows(groups).map((row) => row.set.id)).toEqual(['a0', 'a1', 'b1', 'a2', 'c1'])
  })

  it('rests only after every member of the round is resolved', () => {
    const ordered = orderedRows(groups)
    const a1 = ordered.find((row) => row.set.id === 'a1')!
    expect(startsRest(a1, groups)).toBe(false)
    const done = [rows(a, [set('a0', 'a', 1, { is_warm_up: true }), set('a1', 'a', 2, { is_completed: true }), set('a2', 'a', 3)]), groups[1]!, groups[2]!]
    const b1 = orderedRows(done).find((row) => row.set.id === 'b1')!
    expect(startsRest(b1, done)).toBe(true)
    expect(startsRest(ordered[0]!, groups)).toBe(true) // warm-up
  })
})

describe('set badges', () => {
  it('marks warm-ups, numbers working sets and names superset slots', () => {
    const a = exercise('a', 'A')
    const b = exercise('b', 'A')
    const c = exercise('c')
    const groups = [
      rows(a, [set('a0', 'a', 1, { is_warm_up: true }), set('a1', 'a', 2), set('a2', 'a', 3)]),
      rows(c, [set('c0', 'c', 1, { is_warm_up: true }), set('c1', 'c', 2), set('c2', 'c', 3, { is_skipped: true })]),
      rows(b, [set('b1', 'b', 1)]),
    ]
    const badge = (group: number, index: number) => setBadge(groups[group]!.rows[index]!, groups)
    expect(badge(0, 0)).toEqual({ kind: 'warmUp', text: 'W', number: null })
    expect(badge(0, 2)).toEqual({ kind: 'superset', text: 'A1', number: 2 })
    expect(badge(2, 0)).toEqual({ kind: 'superset', text: 'A2', number: 1 })
    expect(badge(1, 1)).toEqual({ kind: 'working', text: '1', number: 1 })
    expect(badge(1, 2)).toEqual({ kind: 'working', text: '2', number: 2 })
  })
})
