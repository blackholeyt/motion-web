import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cardioSummary } from '../../domain/cardio'
import type { StoredWorkout } from '../../domain/progress'
import { startOfDay } from '../../domain/measurement'
import { useT } from '../../i18n'
import { useProfile } from '../../store/profile'
import styles from './dashboard.module.css'

/** "Last workout: Push · 2 days ago · 18 sets". Opens it in the history. */
export function LastWorkoutCard({ history, now }: { history: StoredWorkout[]; now: Date }) {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const distanceUnit = useProfile()?.distance_unit ?? 'km'
  const last = history.reduce<StoredWorkout | null>((newest, item) => (!newest || item.workout.performed_at > newest.workout.performed_at ? item : newest), null)
  if (!last) return null

  const { workout } = last
  const days = Math.round((startOfDay(now).getTime() - startOfDay(new Date(workout.performed_at)).getTime()) / 86_400_000)
  const when = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day')
  const sets = last.sets.filter((set) => set.is_completed && set.deleted_at === null && !set.is_warm_up).length
  const exercises = new Set(last.sets.filter((set) => set.is_completed && set.deleted_at === null).map((set) => set.workout_exercise_id)).size
  const detail = workout.cardio_type ? cardioSummary(workout, distanceUnit, locale, t) : t('{0} exercises · {1} sets', [exercises, sets])

  return (
    <button type="button" className={styles.lastWorkout} onClick={() => navigate('/history', { state: { open: workout.id } })} data-testid="lastWorkout">
      <span className={styles.lastText}>
        <small>{t('Last workout')}</small>
        <strong>{t(workout.name)}</strong>
        <span>
          {when} · {detail}
        </span>
      </span>
      <ChevronRight size={20} aria-hidden="true" />
    </button>
  )
}
