import { useLiveQuery } from 'dexie-react-hooks'
import { NotebookText } from 'lucide-react'
import type { Workout } from '../../data/types'
import { cardioSummary } from '../../domain/cardio'
import { formatNumber, loadLabel } from '../../domain/measurement'
import { useT } from '../../i18n'
import { useProfile } from '../../store/profile'
import { Sheet } from '../../ui/Sheet'
import { TextButton } from '../../ui/controls'
import { loadSession } from '../workout/session'
import styles from './history.module.css'

/**
 * A saved workout to look at. Editing is one tap away, so a look at old numbers cannot change
 * them by accident.
 */
export function WorkoutDetailSheet({ workout, onClose, onEdit }: { workout: Workout; onClose: () => void; onEdit: () => void }) {
  const { t, locale } = useT()
  const profile = useProfile()
  const unit = profile?.load_unit ?? 'kg'
  const session = useLiveQuery(() => loadSession(workout.id), [workout.id])
  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(workout.performed_at))

  return (
    <Sheet
      open
      onClose={onClose}
      title={t(workout.name)}
      leading={<TextButton onClick={onClose}>{t('Done')}</TextButton>}
      trailing={
        <TextButton strong onClick={onEdit} testID="editHistory">
          {t('Edit')}
        </TextButton>
      }
    >
      <div className={styles.detail} data-testid="workoutDetail">
        <p className={styles.muted}>{date}</p>
        {workout.cardio_type && <p>{cardioSummary(workout, profile?.distance_unit ?? 'km', locale, t)}</p>}
        {workout.notes?.trim() && (
          <p className={styles.detailNotes}>
            <NotebookText size={16} aria-hidden="true" /> {workout.notes}
          </p>
        )}
        {session?.exercises.map(({ exercise, rows }) => {
          const done = rows.filter(({ set }) => set.is_completed)
          if (done.length === 0) return null
          return (
            <section key={exercise.id} className={styles.detailExercise}>
              <h3>{exercise.exercise_name}</h3>
              <ol>
                {done.map(({ set }, index) => {
                  const amount =
                    exercise.measurement === 'Duration'
                      ? `${formatNumber(set.duration_seconds ?? 0, locale)} s`
                      : exercise.measurement === 'Bodyweight reps' && set.weight_kg === 0
                        ? null
                        : loadLabel(unit, set.weight_kg, locale)
                  const reps = set.reps != null ? t('{0} reps', [set.reps]) : null
                  return (
                    <li key={set.id}>
                      <span className={styles.detailIndex}>{set.is_warm_up ? 'W' : index + 1 - done.slice(0, index).filter((row) => row.set.is_warm_up).length}</span>
                      <span>{[amount, reps].filter(Boolean).join(' × ')}</span>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}
      </div>
    </Sheet>
  )
}
