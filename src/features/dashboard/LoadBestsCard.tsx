import { ChevronRight, Crown } from 'lucide-react'
import { Fragment } from 'react'
import type { Exercise, WeightUnit } from '../../data/types'
import { loadLabel } from '../../domain/measurement'
import type { LoadBest } from '../../domain/statistics'
import { useT } from '../../i18n'
import { GoalBar } from '../progress/Celebration'
import styles from './stats.module.css'

/** PersonalRecordsCard: tap a best to edit its load goal. */
export function LoadBestsCard({ bests, library, unit, onEdit }: { bests: LoadBest[]; library: Exercise[]; unit: WeightUnit; onEdit: (exercise: Exercise) => void }) {
  const { t, locale } = useT()
  const load = (kg: number) => loadLabel(unit, kg, locale)
  if (bests.length === 0) {
    return (
      <section className={styles.card}>
        <Crown size={24} className={styles.muted} aria-hidden="true" />
        <h3>{t('No recorded load best yet.')}</h3>
        <p className={styles.muted}>{t('Enable the crown on an exercise and finish a workout to see its best weight here.')}</p>
      </section>
    )
  }
  return (
    <section className={styles.card}>
      {bests.map((best, index) => {
        const exercise = library.find((candidate) => candidate.id === best.id)
        const goal = exercise?.goal_weight_kg
        return (
          <Fragment key={best.id}>
            {index > 0 && <hr className={styles.divider} />}
            <button type="button" className={styles.record} onClick={() => exercise && onEdit(exercise)} data-testid={`record-${best.name}`} aria-description={t('Edit recorded load goal')}>
              <span className={styles.recordTop}>
                <span className={styles.crown} aria-hidden="true">
                  <Crown size={18} />
                </span>
                <span className={styles.recordName}>
                  <strong>{best.name}</strong>
                  <small>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(best.date))}</small>
                </span>
                <strong className={styles.recordWeight}>{load(best.weight)}</strong>
                <ChevronRight size={14} className={styles.muted} aria-hidden="true" />
              </span>
              {goal != null && goal > 0 ? (
                <>
                  <GoalBar weight={best.weight} goal={goal} label={t('Goal progress')} />
                  <span className={styles.goalLine}>
                    <span>{t('Goal · {0}', [load(goal)])}</span>
                    <span>{best.weight >= goal ? t('Goal reached') : t('{0} to go', [load(goal - best.weight)])}</span>
                  </span>
                </>
              ) : (
                <small className={styles.muted}>{t('Set your next target')}</small>
              )}
            </button>
          </Fragment>
        )
      })}
    </section>
  )
}
