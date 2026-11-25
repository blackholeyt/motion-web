import { Ellipsis, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Workout } from '../../data/types'
import * as timer from '../../domain/restTimer'
import { useT } from '../../i18n'
import { platform } from '../../platform'
import { usePreferences } from '../../store/profile'
import { Menu } from '../../ui/controls'
import * as engine from './engine'
import styles from './workout.module.css'

/** FloatingRestTimer.swift: a stable bar below the sets; time comes from the stored deadline. */
export function RestTimerBar({ workout, onNotifications }: { workout: Workout; onNotifications: () => void }) {
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

  const shown = timer.display(state, now)
  const title =
    shown.phase === 'complete'
      ? t('Rest complete')
      : shown.phase === 'running'
        ? t('Rest {0}:{1}', [Math.floor(shown.remaining / 60), String(shown.remaining % 60).padStart(2, '0')])
        : t('Rest timer')
  const subtitle = shown.phase !== 'idle' ? (state.exerciseName ?? t('Ready for your next set')) : t('Starts after a completed set')

  return (
    <div className={styles.restBar} data-testid="restBar">
      <div className={styles.restText}>
        <strong data-testid={shown.phase === 'complete' ? 'restCompleteNotice' : 'restCountdown'}>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {shown.phase === 'running' && (
        <button
          type="button"
          className={styles.restStop}
          aria-label={t('Stop rest timer')}
          onClick={() => void engine.cancelRest(workout.id)}
        >
          <Square size={16} fill="currentColor" /> {t('Stop')}
        </button>
      )}
      <Menu
        label={t('Rest timer options')}
        icon={<Ellipsis size={22} />}
        className={styles.restMenu}
        items={[
          ...(state.exerciseName ? [{ label: t('Restart last interval'), onSelect: () => void engine.restartRest(workout.id) }] : []),
          ...(shown.phase === 'running' ? [{ label: t('Skip rest'), onSelect: () => void engine.skipRest(workout.id) }] : []),
          ...(shown.phase !== 'idle' ? [{ label: t('Cancel timer'), onSelect: () => void engine.cancelRest(workout.id) }] : []),
          { label: t('Rest notifications…'), onSelect: onNotifications },
        ]}
      />
      <span className="visually-hidden" role="status" aria-live="assertive">
        {announcement}
      </span>
    </div>
  )
}
