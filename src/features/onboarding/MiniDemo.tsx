import { CheckCircle2, Dumbbell, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { parseNumber } from '../../domain/measurement'
import { useT } from '../../i18n'
import { Continue, OnboardingPage } from './OnboardingPage'
import styles from './onboarding.module.css'

const titles = ['Record a set.', 'One tap to finish.', 'This is how you find your starting point again.']
const details = [
  'Try the controls with example values. No exercise is needed.',
  'In a real workout, completing a set starts your rest timer.',
  'Finish your workout to save your sets for next time.',
]

/** OnboardingMiniDemo.swift: a simulation that never touches the database. */
export function MiniDemo({ onClose, onStart }: { onClose: () => void; onStart?: () => void }) {
  const { t } = useT()
  const [page, setPage] = useState(0)
  const [load, setLoad] = useState('40')
  const [reps, setReps] = useState('8')
  // The example needs a readable load and a whole number of repetitions above zero.
  const valid = parseNumber(load) !== null && /^\d+$/.test(reps.trim()) && Number.parseInt(reps, 10) > 0
  const finish = () => {
    onClose()
    onStart?.()
  }
  return (
    <OnboardingPage
      category="PRACTICE"
      title={t(titles[page]!)}
      detail={t(details[page]!)}
      icon={page === 2 ? CheckCircle2 : Dumbbell}
      step={page + 1}
      total={3}
      back={page > 0 ? () => setPage(page - 1) : undefined}
      onClose={onClose}
      footer={
        page === 0 ? (
          <Continue onClick={() => setPage(1)} disabled={!valid} testID="demoContinue">
            {t('Continue')}
          </Continue>
        ) : page === 1 ? (
          <Continue onClick={() => setPage(2)} testID="practiceSet">
            {t('Complete practice set')}
          </Continue>
        ) : (
          <Continue onClick={finish}>{t('Start my own training')}</Continue>
        )
      }
    >
      <div className={styles.panel}>
        <span className={styles.muted} data-testid="demoNotSaved">
          <FlaskConical size={14} aria-hidden="true" /> {t('Example — not saved')}
        </span>
        {page === 0 ? (
          <div className={styles.inputRow}>
            <input aria-label={t('Example load')} inputMode="decimal" value={load} onChange={(event) => setLoad(event.target.value)} data-testid="demoLoad" />
            <span>kg</span>
            <input aria-label={t('Example repetitions')} inputMode="numeric" value={reps} onChange={(event) => setReps(event.target.value)} data-testid="demoReps" />
            <span>{t('Reps')}</span>
          </div>
        ) : (
          <>
            <span className={styles.big} data-testid={page === 2 ? 'practiceResult' : 'practiceSummary'}>
              {load} kg × {reps}
            </span>
            {page === 2 && <p className={styles.muted}>{t('In your workout, choose Use last to copy the values. You can adjust them before completing the set.')}</p>}
          </>
        )}
      </div>
    </OnboardingPage>
  )
}
