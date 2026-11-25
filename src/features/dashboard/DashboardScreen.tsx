import { CalendarPlus, Settings as SettingsIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import { useLiveQuery } from 'dexie-react-hooks'
import { usePreferences, useProfile } from '../../store/profile'
import { completedHistory, useProgress } from '../../store/progress'
import { useIsPhone } from '../../ui/useMediaQuery'
import { ProgressCard } from '../progress/ProgressCard'
import { BodyWeightCard } from '../body/BodyWeightCard'
import { DraftLinks } from '../workout/DraftLinks'
import { LastWorkoutCard } from './LastWorkoutCard'
import { PastWorkoutPicker } from './PastWorkoutPicker'
import { StartCard } from './StartCard'
import { WorkoutPicker } from './WorkoutPicker'
import styles from './dashboard.module.css'

/** Today: start the next session, see the last one. Statistics live on the Progress tab. */
export function DashboardScreen() {
  const { t, locale } = useT()
  const profile = useProfile()
  const phone = useIsPhone()
  const [now, setNow] = useState(() => new Date())
  const [choosing, setChoosing] = useState(false)
  const [logging, setLogging] = useState(false)
  const preferences = usePreferences()
  const progress = useProgress()
  const history = useLiveQuery(completedHistory, [])

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
        <div className={styles.headerTop}>
          <p className={styles.date}>{date}</p>
          {/* Phones have no Settings tab; the sidebar on larger screens has one. */}
          {phone && (
            <Link to="/settings" className={styles.settingsLink} aria-label={t('Settings')} title={t('Settings')}>
              <SettingsIcon size={22} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          )}
        </div>
        <h1 className={styles.greeting}>{greeting}</h1>
      </header>
      <DraftLinks returnTo="/" />
      <div className={styles.startGroup}>
        <StartCard now={now} onChoose={() => setChoosing(true)} />
        <button type="button" className={styles.pastButton} onClick={() => setLogging(true)} data-testid="logPastWorkout">
          <CalendarPlus size={18} aria-hidden="true" /> {t('Log past workout')}
        </button>
      </div>
      {history && <LastWorkoutCard history={history} now={now} />}
      {progress && <ProgressCard progress={progress} />}
      {preferences.bodyWeightTrackingVisible && <BodyWeightCard />}
      <WorkoutPicker open={choosing} onClose={() => setChoosing(false)} />
      <PastWorkoutPicker open={logging} onClose={() => setLogging(false)} />
    </div>
  )
}
