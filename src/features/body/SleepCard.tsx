import { Moon } from 'lucide-react'
import { useState } from 'react'
import { addDays, dayKey, startOfDay } from '../../domain/measurement'
import { useT } from '../../i18n'
import { useSleepScores } from '../../store/body'
import { SleepScoreEditor } from './SleepScoreEditor'
import styles from './body.module.css'

/** SleepDashboardCard without the Health parts: manual Apple Sleep Score, last 7 days. */
export function SleepCard({ now }: { now: Date }) {
  const { t, locale } = useT()
  const scores = useSleepScores() ?? []
  const today = startOfDay(now)
  const dates = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6))
  const [selected, setSelected] = useState(dayKey(today))
  const [editing, setEditing] = useState(false)
  const score = (date: Date) => scores.find((entry) => entry.day === dayKey(date))?.score ?? null
  const selectedDate = dates.find((date) => dayKey(date) === selected) ?? today
  const recorded = dates.map(score).filter((value): value is number => value !== null)
  const format = (date: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options).format(date)
  return (
    <section className={styles.card} data-testid="sleepCard">
      <h2 className={styles.title}>
        <Moon size={18} aria-hidden="true" /> {t('Sleep score')}
      </h2>
      <label className={styles.between}>
        <span>{t('Night ending')}</span>
        <select value={selected} onChange={(event) => setSelected(event.target.value)} className={styles.link}>
          {dates.map((date) => (
            <option key={dayKey(date)} value={dayKey(date)}>
              {format(date, { weekday: 'short', day: 'numeric', month: 'short' })}
            </option>
          ))}
        </select>
      </label>
      <div>
        <span className={styles.big}>{score(selectedDate) !== null ? `${score(selectedDate)}/100` : '—'}</span>
        <p className={styles.caption}>{t('Apple Sleep Score')}</p>
      </div>
      {recorded.length > 0 && (
        <>
          <strong>{t('Score · last 7 days')}</strong>
          <ul className={styles.bars}>
            {dates.map((date) => {
              const value = score(date)
              const key = dayKey(date)
              return (
                <li key={key}>
                  <button
                    type="button"
                    className={key === selected ? styles.selectedDay : ''}
                    onClick={() => setSelected(key)}
                    aria-pressed={key === selected}
                    aria-label={`${format(date, { day: 'numeric', month: 'short' })}: ${value !== null ? t('{0} out of 100, manually entered', [value]) : t('No available data')}`}
                  >
                    <span className={styles.barArea}>
                      {value !== null && (
                        <span className={`${styles.bar} ${key === dayKey(today) ? styles.today : ''} ${key === selected ? '' : styles.dim}`} style={{ height: `${value}%` }} />
                      )}
                    </span>
                    {format(date, { weekday: 'short' })}
                  </button>
                </li>
              )
            })}
          </ul>
          <span className={styles.lead} data-testid="selectedDaySleepScore">
            {format(selectedDate, { day: 'numeric', month: 'short', year: 'numeric' })} · {score(selectedDate) !== null ? `${score(selectedDate)}/100` : t('No available data')}
          </span>
          <span className={styles.caption}>{t('Last 7 days · Tap a day for its exact score · Gaps mean no available data')}</span>
          <span className={styles.caption}>
            {t('Average: {0}/100 · {1} recorded nights', [Math.round(recorded.reduce((sum, value) => sum + value, 0) / recorded.length), recorded.length])}
          </span>
        </>
      )}
      <button type="button" className={styles.link} style={{ alignSelf: 'flex-start' }} onClick={() => setEditing(true)} data-testid="editSleepScore">
        {t(score(selectedDate) === null ? 'Add Apple Sleep Score' : 'Edit Apple Sleep Score')}
      </button>
      <span className={styles.caption}>{t('Apple Sleep Score · manually entered from Health')}</span>
      {editing && <SleepScoreEditor date={selectedDate} onClose={() => setEditing(false)} />}
    </section>
  )
}
