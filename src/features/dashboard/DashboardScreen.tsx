import { CalendarPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '../../i18n'
import { useProfile } from '../../store/profile'
import { SectionTitle } from '../../ui/components'
import { PhaseNotice } from '../../ui/PhaseNotice'
import { DraftLinks } from '../workout/DraftLinks'
import { PastWorkoutPicker } from './PastWorkoutPicker'
import { StartCard } from './StartCard'
import { WorkoutPicker } from './WorkoutPicker'
import styles from './dashboard.module.css'

export function DashboardScreen() {
  const { t, locale } = useT()
  const profile = useProfile()
  const [now, setNow] = useState(() => new Date())
  const [choosing, setChoosing] = useState(false)
  const [logging, setLogging] = useState(false)

  // Refresh once a minute, like the iOS TimelineView, so "Today" and due dates roll over.
  useEffect(() => {
    const handle = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(handle)
  }, [])

  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' }).format(now)
  const greeting = profile && profile.name !== 'Motion' ? t('{0},\nyour training in perspective.', [profile.name]) : t('Your training,\nin perspective.')
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.date}>{date}</p>
        <h1 className={styles.greeting}>{greeting}</h1>
      </header>
      <DraftLinks returnTo="/" />
      <div className={styles.startGroup}>
        <StartCard now={now} onChoose={() => setChoosing(true)} />
        <button type="button" className={styles.pastButton} onClick={() => setLogging(true)} data-testid="logPastWorkout">
          <CalendarPlus size={18} aria-hidden="true" /> {t('Log past workout')}
        </button>
      </div>
      <SectionTitle title={t('Calendar weeks')} subtitle={t('Monday–Sunday · 5 full weeks and this week')} />
      <PhaseNotice phase={3} />
      <WorkoutPicker open={choosing} onClose={() => setChoosing(false)} />
      <PastWorkoutPicker open={logging} onClose={() => setLogging(false)} />
    </div>
  )
}
