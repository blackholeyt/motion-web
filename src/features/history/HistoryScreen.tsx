import { useLiveQuery } from 'dexie-react-hooks'
import { History, NotebookText } from 'lucide-react'
import { useState } from 'react'
import { db } from '../../data/db'
import { live } from '../../data/repo'
import type { Workout } from '../../data/types'
import { useT } from '../../i18n'
import { useCompletedWorkouts } from '../../store/hooks'
import { useProfile } from '../../store/profile'
import { cardioSummary } from '../../domain/cardio'
import { EmptyState } from '../../ui/components'
import { DraftLinks } from '../workout/DraftLinks'
import { HistoryEditor } from './HistoryEditor'
import styles from './history.module.css'

/** WorkoutHistoryView.swift: newest first, tap to edit. */
export function HistoryScreen() {
  const { t } = useT()
  const workouts = useCompletedWorkouts()
  const [editing, setEditing] = useState<Workout | null>(null)
  return (
    <div className={styles.screen}>
      <DraftLinks returnTo="/history" />
      <header>
        <h1 className={styles.title}>{t('The work you put in.')}</h1>
        <p className={styles.muted}>{t('{0} saved sessions', [workouts?.length ?? 0])}</p>
      </header>
      {workouts?.map((workout) => (
        <HistoryRow key={workout.id} workout={workout} onOpen={() => setEditing(workout)} />
      ))}
      {workouts?.length === 0 && <EmptyState icon={<History size={40} />} title={t('Your story starts here')} detail={t('Finish a workout to save it here.')} />}
      {editing && <HistoryEditor workout={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function HistoryRow({ workout, onOpen }: { workout: Workout; onOpen: () => void }) {
  const { t, locale } = useT()
  const distanceUnit = useProfile()?.distance_unit ?? 'km'
  const summary = useLiveQuery(async () => {
    const exercises = live(await db.workout_exercises.where('workout_id').equals(workout.id).toArray()).sort((a, b) => a.sort_order - b.sort_order)
    const sets = live(await db.set_logs.where('workout_id').equals(workout.id).toArray()).filter((set) => set.is_completed)
    return {
      names: exercises.slice(0, 3).map((exercise) => exercise.exercise_name),
      exercises: exercises.filter((exercise) => sets.some((set) => set.workout_exercise_id === exercise.id)).length,
      working: sets.filter((set) => !set.is_warm_up).length,
      warmUp: sets.filter((set) => set.is_warm_up).length,
    }
  }, [workout.updated_at])
  const date = new Date(workout.performed_at)
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options).format(date)
  return (
    <button type="button" className={styles.row} onClick={onOpen} data-testid={`history-${workout.name}`}>
      <span className={styles.day}>
        <strong>{format({ day: 'numeric' })}</strong>
        <small>{format({ month: 'short' })}</small>
      </span>
      <span className={styles.body}>
        <strong className={styles.name}>{t(workout.name)}</strong>
        <small className={styles.muted}>{format({ weekday: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</small>
        {workout.cardio_type ? (
          <span className={styles.muted}>{cardioSummary(workout, distanceUnit, locale, t)}</span>
        ) : (
          summary && <span className={styles.muted}>{t('{0} exercises · {1} working · {2} warm-up', [summary.exercises, summary.working, summary.warmUp])}</span>
        )}
        {workout.notes?.trim() && (
          <span className={styles.notes}>
            <NotebookText size={14} aria-hidden="true" /> {workout.notes}
          </span>
        )}
        {summary && (
          <span className={styles.chips}>
            {summary.names.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </span>
        )}
      </span>
    </button>
  )
}
