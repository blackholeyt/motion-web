import { Ellipsis, SkipForward, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Workout } from '../../data/types'
import * as timer from '../../domain/restTimer'
import { useT, type Translate } from '../../i18n'
import { platform } from '../../platform'
import { usePreferences } from '../../store/profile'
import { Menu, type MenuItem } from '../../ui/controls'
import * as engine from './engine'
import styles from './workout.module.css'

export interface RestTimer {
  state: ReturnType<typeof timer.restored>
  shown: timer.RestDisplay
  announcement: string
}

/**
 * Keeps the rest timer of a workout ticking: the time comes from the stored deadline, expiry is
 * announced, and a background notification is scheduled. Mount it once per workout screen.
 */
export function useRestTimer(workout: Workout): RestTimer {
  const { t } = useT()
  const preferences = usePreferences()
  const state = timer.restored(workout.rest_timer)
  const [now, setNow] = useState(() => new Date())
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    // Returning to the app shows elapsed rest silently; only a watched expiry gives feedback.
    // iOS freezes or discards a backgrounded PWA, so every way back re-reads the clock at once.
    const resume = () => {
      if (document.visibilityState !== 'visible') return
      setNow(new Date())
      void engine.tickRest(workout.id, false)
    }
    resume()
    const stop = platform.timers.every(250, async () => {
      setNow(new Date())
      if (document.visibilityState !== 'visible') return
      if (await engine.tickRest(workout.id, true)) {
        setAnnouncement(t('Rest complete. Ready for your next set.'))
      }
    })
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('pageshow', resume)
    window.addEventListener('focus', resume)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('pageshow', resume)
      window.removeEventListener('focus', resume)
    }
  }, [workout.id])

  // Best-effort background alert: one replaceable notification per draft.
  useEffect(() => {
    const id = `motion.rest.${workout.id}`
    if (preferences.restNotifications && state.deadline && Date.parse(state.deadline) > Date.now()) {
      platform.notifications.schedule({
        id,
        deadline: new Date(state.deadline),
        title: t('Rest complete'),
        body: state.exerciseName ? t('Your rest after {0} is complete.', [state.exerciseName]) : t('Ready for your next set.'),
      })
    } else platform.notifications.cancel(id)
  }, [state.deadline, preferences.restNotifications])

  return { state, shown: timer.display(state, now), announcement }
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

function restMenu(t: Translate, workoutID: string, rest: RestTimer, onNotifications: () => void): MenuItem[] {
  const { state, shown } = rest
  return [
    ...(state.exerciseName ? [{ label: t('Restart last interval'), onSelect: () => void engine.restartRest(workoutID) }] : []),
    ...(shown.phase === 'running' ? [{ label: t('Skip rest'), onSelect: () => void engine.skipRest(workoutID) }] : []),
    ...(shown.phase !== 'idle' ? [{ label: t('Cancel timer'), onSelect: () => void engine.cancelRest(workoutID) }] : []),
    { label: t('Rest notifications…'), onSelect: onNotifications },
  ]
}

function Announcement({ text }: { text: string }) {
  return (
    <span className="visually-hidden" role="status" aria-live="assertive">
      {text}
    </span>
  )
}

/** −15 s / +15 s for a running rest. */
function AdjustButtons({ workoutID }: { workoutID: string }) {
  const { t } = useT()
  return (
    <>
      <button type="button" className={styles.restAdjust} aria-label={t('15 seconds less rest')} onClick={() => void engine.adjustRest(workoutID, -15)} data-testid="restMinus">
        −15
      </button>
      <button type="button" className={styles.restAdjust} aria-label={t('15 seconds more rest')} onClick={() => void engine.adjustRest(workoutID, 15)} data-testid="restPlus">
        +15
      </button>
    </>
  )
}

/** FloatingRestTimer.swift: a bar below the set list. Hidden while no rest is running. */
export function RestTimerBar({ workout, onNotifications }: { workout: Workout; onNotifications: () => void }) {
  const { t } = useT()
  const rest = useRestTimer(workout)
  const { state, shown } = rest
  if (shown.phase === 'idle') return <Announcement text={rest.announcement} />

  const title = shown.phase === 'complete' ? t('Rest complete') : t('Rest {0}:{1}', [Math.floor(shown.remaining / 60), String(shown.remaining % 60).padStart(2, '0')])
  return (
    <div className={styles.restBar} data-testid="restBar">
      <div className={styles.restText}>
        <strong data-testid={shown.phase === 'complete' ? 'restCompleteNotice' : 'restCountdown'}>{title}</strong>
        <span>{state.exerciseName ?? t('Ready for your next set')}</span>
      </div>
      {shown.phase === 'running' && (
        <>
          <AdjustButtons workoutID={workout.id} />
          <button type="button" className={styles.restStop} aria-label={t('Stop rest timer')} onClick={() => void engine.cancelRest(workout.id)}>
            <Square size={16} fill="currentColor" /> {t('Stop')}
          </button>
        </>
      )}
      <Menu label={t('Rest timer options')} icon={<Ellipsis size={22} />} className={styles.restMenu} items={restMenu(t, workout.id, rest, onNotifications)} />
      <Announcement text={rest.announcement} />
    </div>
  )
}

/**
 * The rest in the focus view: a big countdown with a ring on the card you look at between sets.
 * The timer itself (useRestTimer) runs once in the focus view; this only shows it.
 */
export function RestPanel({ workoutID, rest, onNotifications }: { workoutID: string; rest: RestTimer; onNotifications: () => void }) {
  const { t } = useT()
  const { state, shown } = rest
  if (shown.phase === 'idle') return null
  const running = shown.phase === 'running'
  const progress = running ? Math.min(1, shown.remaining / Math.max(1, state.duration)) : 0
  const radius = 22
  const circumference = 2 * Math.PI * radius
  return (
    <div className={`${styles.restPanel} ${running ? '' : styles.restPanelDone}`} data-testid="restPanel">
      <svg className={styles.restRing} viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r={radius} className={styles.restRingTrack} />
        <circle cx="26" cy="26" r={radius} className={styles.restRingValue} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
      </svg>
      <div className={styles.restPanelText}>
        {running ? (
          <span data-testid="restCountdown">
            <small>{t('Rest')}</small>{' '}
            <strong>{clock(shown.remaining)}</strong>
          </span>
        ) : (
          <strong data-testid="restCompleteNotice">{t('Rest complete')}</strong>
        )}
      </div>
      {running && (
        <div className={styles.restPanelActions}>
          <AdjustButtons workoutID={workoutID} />
          <button type="button" className={styles.restAdjust} aria-label={t('Skip rest')} onClick={() => void engine.skipRest(workoutID)} data-testid="restSkip">
            <SkipForward size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      <Menu label={t('Rest timer options')} icon={<Ellipsis size={18} />} items={restMenu(t, workoutID, rest, onNotifications)} />
    </div>
  )
}
