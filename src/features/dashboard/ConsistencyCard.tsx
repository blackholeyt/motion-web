import type { TrainingWeek } from '../../domain/statistics'
import { useT } from '../../i18n'
import styles from './stats.module.css'

/** ConsistencyCard: completed workouts per calendar week, this week highlighted. */
export function ConsistencyCard({ weeks }: { weeks: TrainingWeek[] }) {
  const { t, locale } = useT()
  const top = Math.max(3, ...weeks.map((week) => week.workouts))
  const range = (week: TrainingWeek) => {
    const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    return `${format.format(week.start)} – ${format.format(week.end)}`
  }
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h3>{t('Consistency')}</h3>
        <span className={styles.eyebrow}>{t('6 WEEKS')}</span>
      </div>
      <ul className={styles.chart} aria-label={t('Consistency')}>
        {weeks.map((week) => (
          <li key={week.start.toISOString()} aria-label={`${t('Week {0}', [week.number])}, ${range(week)}: ${t('{0} completed workouts', [week.workouts])}`}>
            <span className={styles.barArea} aria-hidden="true">
              <span className={styles.value}>{week.workouts > 0 ? week.workouts : ''}</span>
              <span className={week.isCurrent ? styles.barCurrent : styles.bar} style={{ height: `${(week.workouts / top) * 100}%` }} />
            </span>
            <span className={styles.label} aria-hidden="true">
              {t('Week {0}', [week.number])}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
