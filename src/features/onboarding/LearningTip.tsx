import { Info } from 'lucide-react'
import { useT } from '../../i18n'
import styles from './onboarding.module.css'

/** WorkoutLearningTip: shown once in the first workouts. */
export function LearningTip({ text, onDismiss, testID }: { text: string; onDismiss: () => void; testID: string }) {
  const { t } = useT()
  return (
    <div className={styles.tip} role="note" data-testid={testID}>
      <p>
        <Info size={18} aria-hidden="true" /> {t(text)}
      </p>
      <button type="button" onClick={onDismiss}>
        {t('Got it')}
      </button>
    </div>
  )
}
