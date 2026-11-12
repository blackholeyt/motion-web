import type { Exercise, SetLog, Workout, WorkoutExercise } from '../data/types'
import type { StoredWorkout } from './progress'
import { strengthTrend } from './strengthTrend'

const now = new Date(2026, 10, 12, 12)
const stamp = '2026-11-01T00:00:00.000Z'
const base = { user_id: null, created_at: stamp, updated_at: stamp, deleted_at: null }

const exercise = (id: string, name: string, muscle: string, extra: Partial<Exercise> = {}): Exercise => ({
  ...base,
  id,
  name,
  goal_weight_kg: null,
  is_pr_tracked: false,
  rest_seconds: null,
  catalogue_id: null,
  equipment: 'Other',
  muscle,
  measurement: 'Load & reps',
  guidance: '',
  track_progress: true,
  ...extra,
})

/** One completed session with one working set per listed exercise, `daysAgo` days before `now`. */
function session(id: string, daysAgo: number, loads: Record<string, number>, options: { warmUp?: boolean; completed?: boolean } = {}): StoredWorkout {
  const performed = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 9).toISOString()
  const workout: Workout = {
    ...base,
    id,
    name: 'Session',
    performed_at: performed,
    is_completed: options.completed ?? true,
    is_freestyle: false,
    is_retrospective: false,
    blueprint_id: null,
    notes: null,
    earned_xp: 0,
    draft_updated_at: null,
    plan_ticket: null,
    rest_timer: null,
    undo_history: null,
    cardio_type: null,
    cardio_seconds: null,
    cardio_distance_km: null,
    cardio_pace_s_per_km: null,
    source: 'motion',
  }
  const exercises: WorkoutExercise[] = []
  const sets: SetLog[] = []
  for (const [exerciseID, weight] of Object.entries(loads)) {
    const snapshot: WorkoutExercise = {
      ...base,
      id: `${id}-${exerciseID}`,
      workout_id: id,
      exercise_id: exerciseID,
      exercise_name: exerciseID,
      measurement: 'Load & reps',
      guidance: null,
      superset_group: null,
      rest_seconds: null,
      acknowledged_record_kg: null,
      is_history_only: false,
      is_removed: false,
      sort_order: exercises.length,
    }
    exercises.push(snapshot)
    sets.push({
      ...base,
      id: `${snapshot.id}-set`,
      workout_id: id,
      workout_exercise_id: snapshot.id,
      set_index: 1,
      weight_kg: weight,
      reps: 8,
      duration_seconds: null,
      is_completed: true,
      is_warm_up: options.warmUp ?? false,
      is_skipped: false,
      is_removed: false,
      draft_weight_text: null,
      draft_weight_unit: null,
      draft_reps_text: null,
      draft_duration_text: null,
    })
  }
  return { workout, exercises, sets }
}

const library = [exercise('bench', 'Bench Press', 'Chest'), exercise('fly', 'Cable Fly', 'Chest'), exercise('squat', 'Squats', 'Legs'), exercise('curl', 'Curl', 'Arms')]

describe('strength trend', () => {
  it('follows the top working load per session and ranks exercises by their change', () => {
    const history = [session('a', 21, { bench: 60, squat: 100 }), session('b', 14, { bench: 62.5, squat: 110 }), session('c', 7, { bench: 65, squat: 120 })]
    const { exercises } = strengthTrend(history, library, now)
    expect(exercises.map((series) => series.id)).toEqual(['squat', 'bench'])
    expect(exercises[0]).toMatchObject({ change: 20, percent: 20, exerciseCount: 1 })
    expect(exercises[1]!.points.map((point) => point.value)).toEqual([60, 62.5, 65])
    expect(exercises[1]!.percent).toBeCloseTo(8.3, 1)
  })

  it('reports losses with a negative change', () => {
    const history = [session('a', 10, { bench: 80 }), session('b', 3, { bench: 70 })]
    expect(strengthTrend(history, library, now).exercises[0]).toMatchObject({ id: 'bench', change: -10, percent: -12.5 })
  })

  it('averages the relative change of a muscle group and keeps a lift between its sessions', () => {
    // Bench +10 % after the first week, fly +20 % after the second: the chest index reads 5 %, then 15 %.
    const history = [session('a', 21, { bench: 100, fly: 20 }), session('b', 14, { bench: 110 }), session('c', 7, { fly: 24 })]
    const { muscles } = strengthTrend(history, library, now)
    expect(muscles).toHaveLength(1)
    expect(muscles[0]).toMatchObject({ id: 'Chest', exerciseCount: 2, change: 15, percent: 15 })
    expect(muscles[0]!.points.map((point) => point.value)).toEqual([0, 5, 15])
  })

  it('puts the muscle with the largest change first', () => {
    const history = [session('a', 20, { bench: 100, squat: 100, curl: 10 }), session('b', 5, { bench: 102, squat: 130, curl: 9 })]
    expect(strengthTrend(history, library, now).muscles.map((series) => series.id)).toEqual(['Legs', 'Arms', 'Chest'])
  })

  it('needs two sessions inside the window and ignores warm-ups, drafts and the future', () => {
    const history = [
      session('old', 120, { bench: 40 }),
      session('a', 10, { bench: 60 }),
      session('warm', 5, { bench: 200 }, { warmUp: true }),
      session('draft', 4, { bench: 300 }, { completed: false }),
      session('future', -2, { bench: 400 }),
    ]
    const trend = strengthTrend(history, library, now)
    expect(trend.exercises).toEqual([])
    expect(trend.muscles).toEqual([])
  })

  it('skips deleted or untracked exercises and unlinked history', () => {
    const history = [session('a', 10, { bench: 60, squat: 100, ghost: 50 }), session('b', 3, { bench: 70, squat: 120, ghost: 80 })]
    const sparse = [exercise('bench', 'Bench Press', 'Chest', { deleted_at: stamp }), exercise('squat', 'Squats', 'Legs', { track_progress: false })]
    const trend = strengthTrend(history, sparse, now)
    expect(trend.exercises).toEqual([])
    expect(trend.muscles).toEqual([])
  })
})
