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
import { SkeletonBlock } from '../../ui/Skeleton'

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
  // Before the data is in, the cards would briefly claim there is nothing to show yet.
  const loading = history === undefined || library === undefined
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>{t('Progress')}</h1>
      </header>
      <section className={styles.section}>
        <SectionTitle title={t('Calendar weeks')} subtitle={t('Monday–Sunday · 5 full weeks and this week')} />
        {history ? <ConsistencyCard weeks={trainingWeeks(history.map(({ workout }) => workout.performed_at), now)} /> : <SkeletonBlock height={132} radius="var(--radius-card)" />}
      </section>
      <section className={styles.section}>
        <SectionTitle title={t('Strength trend')} info={t('Top working load per session over the last {0} weeks. Recorded results, not a strength estimate.', [trendWeeks])} />
        {loading ? <SkeletonBlock height={236} radius="var(--radius-card)" /> : <StrengthTrendCard trend={trend} unit={unit} />}
      </section>
      <section className={styles.section}>
        <SectionTitle title={t('Recorded load bests')} info={t('Heaviest completed external-load working sets. Not a strength estimate. Tap to edit a load goal.')} />
        {loading ? <SkeletonBlock height={160} radius="var(--radius-card)" /> : <LoadBestsCard bests={loadBests(history ?? [], library ?? [], now)} library={library ?? []} unit={unit} onEdit={setGoal} />}
      </section>
      <GoalEditor exercise={goal} onClose={() => setGoal(null)} />
    </div>
  )
}
