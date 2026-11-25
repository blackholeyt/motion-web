import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db } from '../../data/db'
import { live } from '../../data/repo'
import type { Exercise } from '../../data/types'
import { loadBests, trainingWeeks } from '../../domain/statistics'
import { strengthTrend, trendWeeks } from '../../domain/strengthTrend'
import { useT } from '../../i18n'
import { useProfile } from '../../store/profile'
import { completedHistory } from '../../store/progress'
import { SectionTitle } from '../../ui/components'
import { GoalEditor } from '../exercises/GoalEditor'
import { ConsistencyCard } from './ConsistencyCard'
import { LoadBestsCard } from './LoadBestsCard'
import { StrengthTrendCard } from './StrengthTrendCard'
import styles from './dashboard.module.css'

/** The statistics that used to fill the dashboard: weeks, strength trend and load bests. */
export function ProgressScreen() {
  const { t } = useT()
  const profile = useProfile()
  const [now, setNow] = useState(() => new Date())
  const [goal, setGoal] = useState<Exercise | null>(null)
  const library = useLiveQuery(async () => live(await db.exercises.toArray()), [])
  const history = useLiveQuery(completedHistory, [])

  useEffect(() => {
    const handle = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(handle)
  }, [])

  const trend = useMemo(() => strengthTrend(history ?? [], library ?? [], now), [history, library, now])
  const unit = profile?.load_unit ?? 'kg'
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>{t('Progress')}</h1>
      </header>
      <section className={styles.section}>
        <SectionTitle title={t('Calendar weeks')} subtitle={t('Monday–Sunday · 5 full weeks and this week')} />
        <ConsistencyCard weeks={trainingWeeks((history ?? []).map(({ workout }) => workout.performed_at), now)} />
      </section>
      <section className={styles.section}>
        <SectionTitle title={t('Strength trend')} info={t('Top working load per session over the last {0} weeks. Recorded results, not a strength estimate.', [trendWeeks])} />
        <StrengthTrendCard trend={trend} unit={unit} />
      </section>
      <section className={styles.section}>
        <SectionTitle title={t('Recorded load bests')} info={t('Heaviest completed external-load working sets. Not a strength estimate. Tap to edit a load goal.')} />
        <LoadBestsCard bests={loadBests(history ?? [], library ?? [], now)} library={library ?? []} unit={unit} onEdit={setGoal} />
      </section>
      <GoalEditor exercise={goal} onClose={() => setGoal(null)} />
    </div>
  )
}
