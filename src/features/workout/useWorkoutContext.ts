import { useT } from '../../i18n'
import { usePreferences, useProfile } from '../../store/profile'
import type { WorkoutContext } from './engine'

export function useWorkoutContext(): WorkoutContext {
  const { locale } = useT()
  const preferences = usePreferences()
  const profile = useProfile()
  return {
    trackReps: preferences.trackReps,
    globalRestSeconds: preferences.restTimerSeconds,
    unit: profile?.load_unit ?? 'kg',
    locale,
  }
}
