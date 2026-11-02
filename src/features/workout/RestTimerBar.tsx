import { Ellipsis, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Workout } from '../../data/types'
import * as timer from '../../domain/restTimer'
import { useT } from '../../i18n'
import { platform } from '../../platform'
import { useHaptics } from '../../store/hooks'
import { usePreferences } from '../../store/profile'
import { Menu } from '../../ui/controls'
import * as engine from './engine'
import styles from './workout.module.css'

/** FloatingRestTimer.swift: a stable bar below the sets; time comes from the stored deadline. */
export function RestTimerBar({ workout, onNotifications }: { workout: Workout; onNotifications: () => void }) {
  const { t } = useT()
  const haptic = useHaptics()
  const preferences = usePreferences()
  const state = timer.restored(workout.rest_timer)
  const [now, setNow] = useState(() => new Date())
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    // Returning to the app shows elapsed rest silently; only a watched expiry gives feedback.
    void engine.tickRest(workout.id, false)
    const stop = platform.timers.every(250, async () => {
      setNow(new Date())
      if (document.visibilityState !== 'visible') return
      if (await engine.tickRest(workout.id, true)) {
        haptic('success')
        setAnnouncement(t('Rest complete. Ready for your next set.'))
      }
    })
    const onVisible = () => document.visibilityState === 'visible' && void engine.tickRest(workout.id, false)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisible)
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

  const remaining = state.deadline ? Math.max(0, Math.ceil((Date.parse(state.deadline) - now.getTime()) / 1000)) : 0
  const title = state.noticeUntil
    ? t('Rest complete')
    : state.deadline
      ? t('Rest {0}:{1}', [Math.floor(remaining / 60), String(remaining % 60).padStart(2, '0')])
      : t('Rest timer')
  const subtitle = timer.isVisible(state) ? (state.exerciseName ?? t('Ready for your next set')) : t('Starts after a completed set')

  return (
    <div className={styles.restBar}>
      <div className={styles.restText}>
        <strong data-testid={state.noticeUntil ? 'restCompleteNotice' : 'restCountdown'}>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {state.deadline && (
        <button
          type="button"
          className={styles.restStop}
          aria-label={t('Stop rest timer')}
          onClick={() => {
            void engine.cancelRest(workout.id)
            haptic('selection')
          }}
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
          ...(state.deadline ? [{ label: t('Skip rest'), onSelect: () => void engine.skipRest(workout.id) }] : []),
          ...(timer.isVisible(state) ? [{ label: t('Cancel timer'), onSelect: () => void engine.cancelRest(workout.id) }] : []),
          { label: t('Rest notifications…'), onSelect: onNotifications },
        ]}
      />
      <span className="visually-hidden" role="status" aria-live="assertive">
        {announcement}
      </span>
    </div>
  )
}
