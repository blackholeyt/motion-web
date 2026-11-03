import { db } from '../data/db'
import { freshDatabase } from '../test/db'
import { checkIn } from './body'
import { buildCSVRows, csvColumns, toCSV } from './csvExport'

const time = '2026-11-02T12:00:00.000Z'
const base = { user_id: null, created_at: time, updated_at: time, deleted_at: null }

async function seedWorkout(completed: boolean, name = 'Push') {
  const id = crypto.randomUUID()
  const exercise = crypto.randomUUID()
  await db.workouts.put({
    ...base, id, name, performed_at: time, is_completed: completed, is_freestyle: false, is_retrospective: false, blueprint_id: null,
    notes: 'Felt "strong", good day', earned_xp: 120, draft_updated_at: null, plan_ticket: null, rest_timer: null, undo_history: null,
    cardio_type: null, cardio_seconds: null, cardio_distance_km: null, cardio_pace_s_per_km: null, source: 'motion',
  })
  await db.workout_exercises.put({
    ...base, id: exercise, workout_id: id, exercise_id: null, exercise_name: '=Bankdrücken', measurement: 'Load & reps', guidance: null,
    superset_group: null, rest_seconds: null, acknowledged_record_kg: null, is_history_only: false, is_removed: false, sort_order: 0,
  })
  const set = (index: number, warmUp: boolean, removed = false) => ({
    ...base, id: crypto.randomUUID(), workout_id: id, workout_exercise_id: exercise, set_index: index, weight_kg: warmUp ? 40 : 62.5, reps: 8,
    duration_seconds: null, is_completed: true, is_warm_up: warmUp, is_skipped: false, is_removed: removed,
    draft_weight_text: null, draft_weight_unit: null, draft_reps_text: null, draft_duration_text: null,
  })
  await db.set_logs.bulkPut([set(2, false), set(1, true), set(3, false, true)])
}

describe('CSV export', () => {
  beforeEach(freshDatabase)

  it('lists completed workouts with their sets and body weight', async () => {
    await seedWorkout(true)
    await seedWorkout(false, 'Open draft')
    await checkIn(67.05, new Date('2026-11-01T07:00:00'))
    const rows = await buildCSVRows()
    expect(rows.map((row) => row.type)).toEqual(['body_weight', 'workout', 'set', 'set'])
    expect(rows.find((row) => row.workout === 'Open draft')).toBeUndefined()
    expect(rows[2]).toMatchObject({ exercise: '=Bankdrücken', set: 1, set_type: 'warm-up', weight_kg: 40, reps: 8, completed: true })
    expect(rows[3]).toMatchObject({ set: 2, set_type: 'working', weight_kg: 62.5 })
    expect(rows[0]).toMatchObject({ date: '2026-11-01', value: 67.05 })
  })

  it('quotes text, neutralises formulas and keeps one header', async () => {
    await seedWorkout(true)
    const lines = toCSV(await buildCSVRows()).split('\r\n')
    expect(lines[0]).toBe(csvColumns.join(','))
    expect(lines[1]).toContain('"Felt ""strong"", good day"')
    expect(lines[2]).toContain(",'=Bankdrücken,")
    expect(lines.at(-1)).toBe('')
  })
})
