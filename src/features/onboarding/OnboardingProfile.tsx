import { Scale, UserRound } from 'lucide-react'
import { useState } from 'react'
import type { WeightUnit } from '../../data/types'
import { parseBodyWeight, type BodyWeightGoal } from '../../domain/body'
import { loadInput } from '../../domain/measurement'
import { useT } from '../../i18n'
import { checkIn } from '../../store/body'
import { updateProfile } from '../../store/profile'
import { ConfirmDialog } from '../../ui/Sheet'
import { Continue, OnboardingPage, Quiet } from './OnboardingPage'
import { updateOnboarding } from './state'
import styles from './onboarding.module.css'

const titles = ['Make Motion yours', 'Your preferred unit', 'Your starting point', 'A goal of your own', 'Choose your direction', 'Your target weight']
const details = [
  'Add your name. You can change it later.',
  'Choose how body weight is displayed.',
  'Add your current weight, or leave it blank for now.',
  'Optional. Your goal is a personal reference and does not change workout XP.',
  'Choose the direction of your personal weight goal.',
  'You can adjust your goal later in your profile.',
]

/** OnboardingProfileView.swift: name, unit, current weight and an optional goal. */
export function OnboardingProfile() {
  const { t, locale } = useT()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<WeightUnit>('kg')
  const [weight, setWeight] = useState('')
  const [target, setTarget] = useState('')
  const [wantsGoal, setWantsGoal] = useState(false)
  const [goal, setGoal] = useState<BodyWeightGoal>('lose')
  const [error, setError] = useState<string | null>(null)
  const current = parseBodyWeight(weight, unit)
  const destination = parseBodyWeight(target, unit)

  const goalProblem = () => {
    if (!wantsGoal) return null
    if (current === null || destination === null) return 'Enter your current and target weight to set a goal.'
    if (goal === 'lose' && destination >= current) return 'For weight loss, your target must be below your current weight.'
    if (goal === 'gain' && destination <= current) return 'For weight gain, your target must be above your current weight.'
    return null
  }
  const problem =
    step === 0 && name.trim().length > 40
      ? 'Use up to 40 characters for your name.'
      : step === 2 && (weight !== '' || wantsGoal) && current === null
        ? 'Enter a valid current weight.'
        : step === 5
          ? goalProblem()
          : null

  const changeUnit = (next: WeightUnit) => {
    if (current !== null) setWeight(loadInput(next, current, locale))
    if (destination !== null) setTarget(loadInput(next, destination, locale))
    setUnit(next)
  }
  const save = async () => {
    try {
      await updateProfile({ name: name.trim() || 'Motion', body_weight_unit: unit, target_weight_kg: wantsGoal ? destination : null, ...(wantsGoal ? { body_weight_goal: goal } : {}) })
      if (current !== null) await checkIn(current)
      updateOnboarding({ profileStepDone: true })
    } catch (failure) {
      setError((failure as Error).message)
    }
  }
  const next = () => {
    if (step === 5 || (step === 3 && !wantsGoal)) void save()
    else if (step === 3 && wantsGoal && current === null) setStep(2)
    else setStep(step + 1)
  }
  const weightField = (label: string, value: string, change: (value: string) => void, id: string) => (
    <label className={styles.inputRow}>
      <input aria-label={t(label)} placeholder={t(label)} inputMode="decimal" value={value} onChange={(event) => change(event.target.value)} data-testid={id} autoFocus />
      <span>{unit}</span>
    </label>
  )
  return (
    <OnboardingPage
      category="YOUR PROFILE"
      title={t(titles[step]!)}
      detail={t(step === 2 && wantsGoal ? 'Add your current weight to set a goal.' : details[step]!)}
      icon={step < 2 ? UserRound : Scale}
      step={step + 1}
      total={wantsGoal ? 6 : 4}
      back={step > 0 ? () => setStep(step - 1) : undefined}
      titleID="onboardingProfileTitle"
      footer={
        <>
          <Continue onClick={next} disabled={problem !== null} testID="onboardingProfileContinue">
            {t('Continue')}
          </Continue>
          <Quiet onClick={() => updateOnboarding({ profileStepDone: true })} testID="onboardingProfileSkip">
            {t('Skip for now')}
          </Quiet>
        </>
      }
    >
      <div className={styles.panel}>
        {step === 0 && (
          <input
            aria-label={t('Name')}
            placeholder={t('Name')}
            autoComplete="given-name"
            enterKeyHint="next"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && problem === null && setStep(1)}
            data-testid="onboardingName"
            autoFocus
          />
        )}
        {step === 1 && (
          <div className={styles.segmented} role="radiogroup" aria-label={t('Body weight unit')} data-testid="onboardingWeightUnit">
            {(['kg', 'lb'] as const).map((value) => (
              <button key={value} type="button" role="radio" aria-checked={unit === value} className={unit === value ? styles.selected : ''} onClick={() => changeUnit(value)}>
                {value}
              </button>
            ))}
          </div>
        )}
        {step === 2 && weightField('Current weight', weight, setWeight, 'onboardingCurrentWeight')}
        {step === 3 && (
          <label className={styles.toggle}>
            <span>{t('Set a weight goal')}</span>
            <input type="checkbox" role="switch" checked={wantsGoal} onChange={(event) => setWantsGoal(event.target.checked)} data-testid="onboardingSetGoal" />
          </label>
        )}
        {step === 4 && (
          <div className={styles.segmented} role="radiogroup" aria-label={t('Body-weight goal')} data-testid="onboardingGoalDirection">
            {(['lose', 'gain'] as const).map((value) => (
              <button key={value} type="button" role="radio" aria-checked={goal === value} className={goal === value ? styles.selected : ''} onClick={() => setGoal(value)}>
                {t(value === 'lose' ? 'Lose Weight' : 'Gain Weight')}
              </button>
            ))}
          </div>
        )}
        {step === 5 && weightField('Target weight', target, setTarget, 'onboardingTargetWeight')}
      </div>
      {problem && (
        <p className={styles.validation} data-testid="onboardingValidation">
          {t(problem)}
        </p>
      )}
      <ConfirmDialog open={error !== null} title={t('Couldn’t save')} message={error ? t(error) : ''} onDismiss={() => setError(null)} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setError(null) }]} />
    </OnboardingPage>
  )
}
