import { Trophy } from 'lucide-react'
import type { WeightUnit } from '../../data/types'
import { loadLabel } from '../../domain/measurement'
import { useT } from '../../i18n'
import { ContinueButton, Masthead } from '../../ui/components'
import type { CheckInResult } from '../../store/body'
import styles from '../progress/progress.module.css'

/** WeightCheckInCelebration.swift; also used for the settings preview. */
export function WeightCelebration({ result, unit, preview = false, onContinue }: { result: CheckInResult; unit: WeightUnit; preview?: boolean; onContinue: () => void }) {
  const { t, locale } = useT()
  const goal = result.achievedTarget !== null
  const title = goal ? 'Goal reached!' : result.isCorrection ? 'Measurement corrected.' : result.earnedXP > 0 ? 'Check-in complete.' : 'Weight updated.'
  const detail = goal
    ? 'A milestone worth celebrating. Take a moment to appreciate your journey.'
    : result.isCorrection
      ? 'Your measurement is corrected. Its date and your XP stay the same.'
      : result.earnedXP > 0
        ? 'Your first check-in today is saved. One more point in your personal history.'
        : 'Today’s measurement is updated. You’ve already received today’s 25 XP.'
  return (
    <div className={styles.celebration} data-testid="weightCelebration">
      <div className={styles.celebrationBody}>
        <Masthead category={t('BODY WEIGHT')} accent={goal ? 'var(--achievement)' : 'var(--action)'} />
        {goal && <Trophy size={64} className={styles.trophy} aria-hidden="true" />}
        {preview && <p className={styles.caption}>{t('Preview · Your data stays unchanged')}</p>}
        <div className={styles.headline}>
          <h1 data-testid="weightCelebrationTitle">{t(title)}</h1>
          <p className={styles.muted}>{t(detail)}</p>
        </div>
        <section className={`${styles.card} ${styles.centered}`}>
          <span className={styles.eyebrow}>{t(goal ? 'TARGET WEIGHT' : 'SAVED MEASUREMENT')}</span>
          <span className={styles.bigWeight} data-testid="savedWeight">
            {loadLabel(unit, result.achievedTarget ?? result.kilograms, locale)}
          </span>
          <span className={styles.muted}>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(result.date))}</span>
          <hr className={styles.rule} />
          <span className={styles.bigXPSmall} data-testid="weightCheckInReward">
            {result.earnedXP > 0 ? `+${result.earnedXP} XP` : t('XP unchanged')}
          </span>
        </section>
      </div>
      <div className={styles.continueBar}>
        <ContinueButton onClick={onContinue}>{t('Continue')}</ContinueButton>
      </div>
    </div>
  )
}
