import { ArrowUpRight, CalendarDays, Dumbbell, Ellipsis, Info } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startOfDay } from '../../domain/measurement'
import { consume, nextTicket } from '../../domain/schedule'
import { useT } from '../../i18n'
import { useBlueprints, usePlan } from '../../store/hooks'
import { planProblem, savePlan } from '../../store/plan'
import { ConfirmDialog } from '../../ui/Sheet'
import { Menu } from '../../ui/controls'
import { TrainingBlueprintChoices, TrainingPlanEditor } from '../plan/TrainingPlanEditor'
import styles from './dashboard.module.css'

/** DashboardStartButton.swift: the jade "YOUR NEXT SESSION" card. */
export function StartButton({ title, subtitle, onClick, testID }: { title: string; subtitle?: string; onClick: () => void; testID: string }) {
  const { t } = useT()
  return (
    <button type="button" className={styles.start} onClick={onClick} data-testid={testID}>
      <span className={styles.startTop}>
        <span className={styles.startLabel}>
          <Dumbbell size={14} aria-hidden="true" /> {t('YOUR NEXT SESSION')}
        </span>
        <span className={styles.startArrow} aria-hidden="true">
          <ArrowUpRight size={22} />
        </span>
      </span>
      <span className={styles.startTitle}>{title}</span>
      <span className={styles.startSubtitle}>{subtitle ?? t('Choose your blueprint. Make it count.')}</span>
    </button>
  )
}

/** TrainingPlanDashboard.swift: the planned session when a plan is active, otherwise the picker. */
export function StartCard({ now, onChoose }: { now: Date; onChoose: () => void }) {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const plan = usePlan()
  const blueprints = useBlueprints() ?? []
  const [editing, setEditing] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const state = plan?.schedule
  const problem = useLiveQuery(async () => (state?.enabled ? planProblem(state, blueprints) : null), [state, blueprints])
  const ticket = state ? nextTicket(state, now) : null
  const entry = ticket && state?.entries.find((candidate) => candidate.id === ticket.entryID)
  const blueprint = entry && blueprints.find((candidate) => candidate.id === entry.blueprintID)

  const launch = (blueprintID: string) => {
    const cardio = blueprints.find((candidate) => candidate.id === blueprintID)?.cardio_type
    navigate(cardio ? `/cardio?blueprint=${blueprintID}` : `/workout/new?blueprint=${blueprintID}`, { state: { planTicket: ticket, returnTo: '/' } })
  }

  return (
    <div className={styles.startCard}>
      {state?.enabled && problem === null && ticket && blueprint ? (
        <>
          <StartButton
            title={new Date(ticket.date) > startOfDay(now) ? t('Start early') : t('Start workout')}
            subtitle={blueprint.name}
            onClick={() => launch(blueprint.id)}
            testID="startPlannedSession"
          />
          <div className={styles.planRow}>
            <span>
              {state.mode === 'rotation' && state.weekdays.length === 0 && new Date(ticket.date) <= startOfDay(now)
                ? t("Whenever you're ready")
                : startOfDay(new Date(ticket.date)).getTime() === startOfDay(now).getTime()
                  ? t('Today')
                  : new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(ticket.date))}
            </span>
            <Menu
              label={t('Plan options')}
              icon={<Ellipsis size={20} />}
              items={[
                { label: t('Choose another workout'), onSelect: onChoose },
                { label: t('Edit training plan'), onSelect: () => setEditing(true) },
                { label: t('Replace planned session'), onSelect: () => setReplacing(true) },
                { label: t('Skip session'), onSelect: () => setSkipping(true) },
              ]}
            />
          </div>
        </>
      ) : (
        <>
          <StartButton title={t('Start workout')} onClick={onChoose} testID="dashboardStartWorkout" />
          {problem && (
            <p className={styles.problem}>
              <Info size={16} aria-hidden="true" /> {t(problem)}
            </p>
          )}
          <button type="button" className={styles.link} onClick={() => setEditing(true)} data-testid="editTrainingPlan">
            <CalendarDays size={16} aria-hidden="true" /> {t(state ? 'Training plan' : 'Plan your training')}
          </button>
        </>
      )}
      <TrainingPlanEditor open={editing} onClose={() => setEditing(false)} />
      <TrainingBlueprintChoices
        open={replacing}
        onClose={() => setReplacing(false)}
        onSelect={(choice) => {
          setReplacing(false)
          launch(choice.id)
        }}
      />
      <ConfirmDialog
        open={skipping}
        title={t('Skip this planned session?')}
        message={t('Moves to the following session without saving a workout or awarding XP.')}
        onDismiss={() => setSkipping(false)}
        actions={[
          {
            label: t('Skip session'),
            onSelect: async () => {
              setSkipping(false)
              const next = state && ticket ? consume(state, ticket, now) : null
              if (next) await savePlan(next)
            },
          },
          { label: t('Cancel'), role: 'cancel', onSelect: () => setSkipping(false) },
        ]}
      />
    </div>
  )
}
