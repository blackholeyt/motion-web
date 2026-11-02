import { CalendarClock, Footprints, ListChecks, NotebookPen, Play, Shuffle, ShieldCheck, Sparkles, SquarePen, Dumbbell, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { planMovements, planEquipment, shortlist, starterPlans, type PlanEquipment } from '../../domain/starterPlans'
import { useT } from '../../i18n'
import { createBlueprint } from '../../store/blueprints'
import { copyStarterPlan } from '../../store/library'
import { ConfirmDialog } from '../../ui/Sheet'
import { exitSandbox, useSandbox } from '../../app/sandbox'
import { Choice, Continue, OnboardingPage, Quiet } from './OnboardingPage'
import { MiniDemo } from './MiniDemo'
import { OnboardingProfile } from './OnboardingProfile'
import { updateOnboarding, type OnboardingIntent, type OnboardingProgress } from './state'
import styles from './onboarding.module.css'

/** ProfileGateView + OnboardingView.swift: the introduction shown before the app. */
export function Onboarding({ progress }: { progress: OnboardingProgress }) {
  useEffect(() => {
    if (progress.status === 'notStarted') updateOnboarding({ status: 'inProgress' })
  }, [progress.status])
  if (!progress.profileStepDone) return <OnboardingProfile />
  if (progress.intent === 'template') return <TemplatePages progress={progress} />
  if (progress.intent === 'ownRoutine') return <OwnRoutine progress={progress} />
  if (progress.intent === 'freestyle') return <Freestyle />
  return <Welcome />
}

function useFinish() {
  const navigate = useNavigate()
  const sandbox = useSandbox()
  return async (path: string, skipped = false) => {
    updateOnboarding({ status: skipped ? 'skipped' : 'completed' })
    // The onboarding test closes when the introduction ends, as in OnboardingTestView.swift.
    if (sandbox?.kind === 'onboardingTest') {
      await exitSandbox()
      return navigate('/settings', { replace: true })
    }
    navigate(path, { replace: true, state: { returnTo: '/' } })
  }
}

const welcomeTitles = ['Log today. Pick up here next time.', 'Your first workout. Your way.', 'More ways to start']
const welcomeDetails = [
  'Record your sets and find your last values when you train again.',
  'Choose a starting point. You can change everything later.',
  'Bring your history or start with cardio.',
]

function Welcome() {
  const { t } = useT()
  const finish = useFinish()
  const [page, setPage] = useState(0)
  const [demo, setDemo] = useState(false)
  const [backup, setBackup] = useState(false)
  const choose = (intent: OnboardingIntent) => updateOnboarding({ intent })
  if (demo) return <MiniDemo onClose={() => setDemo(false)} onStart={() => setPage(1)} />
  return (
    <OnboardingPage
      category="YOUR TRAINING"
      title={t(welcomeTitles[page]!)}
      detail={t(welcomeDetails[page]!)}
      icon={page === 0 ? Sparkles : Dumbbell}
      step={page + 1}
      total={3}
      back={page > 0 ? () => setPage(page - 1) : undefined}
      titleID="onboardingTitle"
      footer={
        <>
          {page === 0 && (
            <Continue onClick={() => setPage(1)} testID="onboardingWelcomeContinue">
              {t('Continue')}
            </Continue>
          )}
          {page === 1 && <Quiet onClick={() => setPage(2)}>{t('More ways to start')}</Quiet>}
          <Quiet onClick={() => finish('/', true)} testID="onboardingExplore">
            {t('Explore first')}
          </Quiet>
        </>
      }
    >
      {page === 0 && (
        <>
          <p className={styles.note}>
            <ShieldCheck size={20} aria-hidden="true" /> {t('No registration needed. Your training is saved on this device first; an optional account for backup comes later.')}
          </p>
          <Quiet onClick={() => setDemo(true)} testID="onboardingDemo">
            {t('How it works')}
          </Quiet>
        </>
      )}
      {page === 1 && (
        <div className={styles.choices}>
          <Choice title={t('Start with a template')} icon={ListChecks} onClick={() => choose('template')} testID="onboardingTemplate" />
          <Choice title={t('Create my own routine')} icon={SquarePen} onClick={() => choose('ownRoutine')} testID="onboardingOwn" />
          <Choice title={t('Train without a template')} icon={Shuffle} onClick={() => choose('freestyle')} testID="onboardingFreestyle" />
        </div>
      )}
      {page === 2 && (
        <div className={styles.choices}>
          <Choice title={t('Restore backup')} icon={CalendarClock} onClick={() => setBackup(true)} />
          <Choice title={t('Cardio')} icon={Footprints} onClick={() => finish('/cardio')} />
        </div>
      )}
      <ConfirmDialog
        open={backup}
        title={t('Restore backup')}
        message={t('Importing your data from the iOS app arrives in a later version. Start now; your backup can be added afterwards without losing anything.')}
        onDismiss={() => setBackup(false)}
        actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setBackup(false) }]}
      />
    </OnboardingPage>
  )
}

const templateTitles = ['What equipment do you have?', 'How much time do you have?', 'Choose your starting point.']
const templateDetails = ['We’ll help you find a starting template.', 'Choose the time available for your session.', 'General template. You can change everything.']

/** OnboardingPlanPages.swift: one template, then one exercise at a time. */
function TemplatePages({ progress }: { progress: OnboardingProgress }) {
  const { t } = useT()
  const finish = useFinish()
  const [page, setPage] = useState(0)
  const equipment = (planEquipment.includes(progress.equipment as PlanEquipment) ? progress.equipment : 'Machines & cables') as PlanEquipment
  const minutes = progress.minutes
  const matches = shortlist(equipment, minutes)
  const [selectedID, setSelectedID] = useState(progress.confirmedPlan ?? matches[0]?.id ?? starterPlans[0]!.id)
  const plan = starterPlans.find((candidate) => candidate.id === selectedID) ?? starterPlans[0]!
  const movements = planMovements(plan)
  const movement = movements[page - 3]
  const last = page >= 3 + movements.length - 1
  const use = async () => {
    // A stable ID per confirmation means a retry never creates a second copy.
    const id = progress.confirmedPlan === plan.id && progress.routineID ? progress.routineID : crypto.randomUUID()
    updateOnboarding({ confirmedPlan: plan.id, routineID: id })
    const blueprint = await copyStarterPlan(plan, id)
    finish(`/blueprints/${blueprint.id}`)
  }
  return (
    <OnboardingPage
      category="YOUR TEMPLATE"
      title={t(page < 3 ? templateTitles[page]! : 'One exercise at a time.')}
      detail={t(page < 3 ? templateDetails[page]! : 'Review your template. Your workout starts only when you choose Start workout.')}
      icon={page < 2 ? SlidersHorizontal : ListChecks}
      step={page + 1}
      total={3 + movements.length}
      back={() => (page === 0 ? updateOnboarding({ intent: null }) : setPage(page - 1))}
      footer={
        last ? (
          <Continue onClick={use} testID={`usePlan-${plan.id}`}>
            {t('Use template')}
          </Continue>
        ) : (
          <Continue
            onClick={() => {
              if (page === 1) setSelectedID(matches[0]?.id ?? starterPlans[0]!.id)
              setPage(page + 1)
            }}
            testID="onboardingPlanContinue"
          >
            {t('Continue')}
          </Continue>
        )
      }
    >
      <div className={styles.panel}>
        {page === 0 && (
          <select aria-label={t('Available equipment')} value={equipment} onChange={(event) => updateOnboarding({ equipment: event.target.value })} data-testid="planEquipment">
            {planEquipment.map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
        )}
        {page === 1 && (
          <select aria-label={t('Time budget')} value={minutes} onChange={(event) => updateOnboarding({ minutes: Number(event.target.value) })} data-testid="planMinutes">
            {[20, 30, 45].map((value) => (
              <option key={value} value={value}>
                {t('{0} minutes', [value])}
              </option>
            ))}
          </select>
        )}
        {page === 2 && (
          <>
            <select aria-label={t('Template')} value={selectedID} onChange={(event) => setSelectedID(event.target.value)} data-testid="onboardingPlanPicker">
              {starterPlans.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {t(candidate.name)}
                </option>
              ))}
            </select>
            <span className={styles.muted}>{t(plan.equipment)}</span>
            <span className={styles.muted}>{t('~{0} min · {1} exercises · {2} sets', [plan.minutes, movements.length, movements.length * plan.sets])}</span>
            {matches.some((candidate) => candidate.id === selectedID) ? (
              <span className={styles.matches}>{t('Matches your equipment & time')}</span>
            ) : (
              matches.length === 0 && <span className={styles.muted}>{t('No starter matches both choices. Try more time, browse alternatives, or start freestyle.')}</span>
            )}
          </>
        )}
        {movement && (
          <>
            <strong className={styles.big}>{t(movement.name)}</strong>
            <span className={styles.muted}>{t('{0} sets', [plan.sets])}</span>
            <span className={styles.muted}>{t('90s rest per set · all targets editable')}</span>
          </>
        )}
      </div>
    </OnboardingPage>
  )
}

function OwnRoutine({ progress }: { progress: OnboardingProgress }) {
  const { t } = useT()
  const finish = useFinish()
  const [name, setName] = useState(progress.manualName)
  const create = async () => {
    const id = progress.routineID ?? crypto.randomUUID()
    updateOnboarding({ manualName: name, routineID: id })
    const blueprint = await createBlueprint(name, id)
    finish(`/blueprints/${blueprint.id}`)
  }
  return (
    <OnboardingPage
      category="YOUR ROUTINE"
      title={t('Create my own routine')}
      detail={t('Add exercises next. Your workout starts only when you choose Start workout.')}
      icon={NotebookPen}
      back={() => updateOnboarding({ intent: null })}
      footer={
        <Continue onClick={create} disabled={!name.trim()} testID="createRoutineConfirm">
          {t('Create routine')}
        </Continue>
      }
    >
      <div className={styles.panel}>
        <input aria-label={t('Routine name')} placeholder={t('Routine name')} value={name} onChange={(event) => setName(event.target.value)} data-testid="newRoutineName" autoFocus />
      </div>
    </OnboardingPage>
  )
}

function Freestyle() {
  const { t } = useT()
  const finish = useFinish()
  return (
    <OnboardingPage
      category="FREESTYLE"
      title={t('Train without a template')}
      detail={t('Choose exercises as you go. Record only what you actually do.')}
      icon={Shuffle}
      back={() => updateOnboarding({ intent: null })}
      footer={
        <Continue onClick={() => finish('/workout/new?freestyle=1')} testID="startFreestyle">
          <Play size={16} aria-hidden="true" /> {t('Start workout')}
        </Continue>
      }
    >
      <p className={styles.muted} style={{ textAlign: 'center' }}>
        {t('Your workout starts only when you choose Start workout.')}
      </p>
    </OnboardingPage>
  )
}
