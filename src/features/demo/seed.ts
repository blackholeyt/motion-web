import { insert, insertOne } from '../../data/repo'
import type { BlueprintExercise, BodyWeight, Exercise, Guidance, SetLog, Workout, WorkoutExercise } from '../../data/types'
import { catalogue } from '../../domain/catalogue'
import { addDays, dayKey } from '../../domain/measurement'
import { createBlueprint } from '../../store/blueprints'
import { ensureProfile, updateProfile } from '../../store/profile'
import { updateOnboarding } from '../onboarding/state'

/** SampleDataStore.seedDemo: six weeks of synthetic Push/Pull/Legs training in the demo database. */
export async function seedDemo(now = new Date()) {
  await ensureProfile()
  await updateProfile({ name: 'Demo Alex' })
  updateOnboarding({ status: 'legacyCompleted', profileStepDone: true, firstSetTipDone: true, previousValuesTipDone: true, savedWorkoutTipDone: true })
  // Explicit guidance makes demo sessions comparable, so trends and records are visible.
  const guidance: Guidance = { minimumReps: 6, maximumReps: 10, progression: 'Build external load', notes: '' }
  const templates: [string, [string, number, number][]][] = [
    ['Push', [['Bench Press', 60, 2.5], ['Overhead Press', 30, 2.5], ['Triceps Pushdown', 20, 2.5]]],
    ['Pull', [['Deadlift', 90, 5], ['Barbell Row', 45, 2.5], ['Lat Pulldown', 40, 2.5]]],
    ['Legs', [['Squats', 75, 5], ['Leg Press', 100, 10], ['Calf Raise', 40, 5]]],
  ]
  for (const [templateIndex, [name, entries]] of templates.entries()) {
    const blueprint = await createBlueprint(name)
    const exercises: Exercise[] = []
    for (const [order, [exerciseName]] of entries.entries()) {
      const movement = catalogue.find((candidate) => candidate.name === exerciseName)
      const exercise = await insertOne<Exercise>('exercises', {
        name: exerciseName,
        goal_weight_kg: null,
        is_pr_tracked: true,
        rest_seconds: null,
        catalogue_id: null,
        equipment: movement?.equipment ?? 'Other',
        muscle: movement?.muscle ?? 'Other',
        measurement: 'Load & reps',
        guidance: '',
        track_progress: true,
      })
      exercises.push(exercise)
      await insertOne<BlueprintExercise>('blueprint_exercises', { blueprint_id: blueprint.id, exercise_id: exercise.id, sort_order: order, target_sets: 3, warm_up_sets: 0, superset_group: null, guidance })
    }
    for (let week = 0; week < 6; week++) {
      const date = addDays(now, -((5 - week) * 7 + (6 - templateIndex * 2)))
      const workout = await insertOne<Workout>('workouts', {
        name: `${name} · Demo`,
        performed_at: date.toISOString(),
        is_completed: true,
        is_freestyle: false,
        is_retrospective: false,
        blueprint_id: blueprint.id,
        notes: null,
        earned_xp: 100,
        draft_updated_at: null,
        plan_ticket: null,
        rest_timer: null,
        undo_history: null,
        cardio_type: null,
        cardio_seconds: null,
        cardio_distance_km: null,
        cardio_pace_s_per_km: null,
        source: 'motion',
      })
      for (const [order, [exerciseName, base, increment]] of entries.entries()) {
        const snapshot = await insertOne<WorkoutExercise>('workout_exercises', {
          workout_id: workout.id,
          exercise_id: exercises[order]!.id,
          exercise_name: exerciseName,
          measurement: 'Load & reps',
          guidance,
          superset_group: null,
          rest_seconds: null,
          acknowledged_record_kg: null,
          is_history_only: false,
          is_removed: false,
          sort_order: order,
        })
        // Bench levels off; the other lifts keep improving.
        const step = exerciseName === 'Bench Press' ? Math.min(week, 2) : week
        await insert<SetLog>(
          'set_logs',
          [1, 2, 3].map((index) => ({
            workout_id: workout.id,
            workout_exercise_id: snapshot.id,
            set_index: index,
            weight_kg: base + step * increment,
            reps: index === 3 ? 6 : 8,
            duration_seconds: null,
            is_completed: true,
            is_warm_up: false,
            is_skipped: false,
            is_removed: false,
            draft_weight_text: null,
            draft_weight_unit: null,
            draft_reps_text: null,
            draft_duration_text: null,
          })),
        )
      }
    }
  }
  await insert<BodyWeight>(
    'body_weights',
    Array.from({ length: 7 }, (_, day) => {
      const date = addDays(now, -day)
      return { day: dayKey(date), recorded_at: date.toISOString(), kilograms: 78 + day * 0.15 }
    }),
  )
}
