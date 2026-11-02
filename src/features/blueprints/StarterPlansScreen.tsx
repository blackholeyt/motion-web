import { CheckCircle2, ChevronDown, ChevronLeft, Plus, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { planEquipment, planMovements, shortlist, starterPlans, type PlanEquipment, type StarterPlan } from '../../domain/starterPlans'
import { useT } from '../../i18n'
import { copyStarterPlan } from '../../store/library'
import { Group, PrimaryButton, RowButton, SelectRow, TextButton } from '../../ui/controls'
import styles from './starter.module.css'

/** PlanChooser.swift outside onboarding. */
export function StarterPlansScreen() {
  const { t } = useT()
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState<PlanEquipment>('Machines & cables')
  const [minutes, setMinutes] = useState(20)
  const [expanded, setExpanded] = useState<string | null>(null)
  // A stable ID per confirmed plan makes a retried tap reuse the same copy.
  const [confirmation, setConfirmation] = useState<{ plan: string; id: string } | null>(null)
  const suggested = shortlist(equipment, minutes).slice(0, 3)
  const others = starterPlans.filter((plan) => !suggested.some((candidate) => candidate.id === plan.id))

  const use = async (plan: StarterPlan) => {
    const id = confirmation?.plan === plan.id ? confirmation.id : crypto.randomUUID()
    setConfirmation({ plan: plan.id, id })
    const blueprint = await copyStarterPlan(plan, id)
    navigate(`/blueprints/${blueprint.id}`, { replace: true })
  }

  const card = (plan: StarterPlan, highlighted = false) => {
    const movements = planMovements(plan)
    const open = expanded === plan.id
    return (
      <div key={plan.id} className={styles.plan}>
        <button type="button" className={styles.planHead} aria-expanded={open} onClick={() => setExpanded(open ? null : plan.id)} data-testid={`plan-${plan.id}`}>
          <span>
            {highlighted && (
              <span className={styles.match}>
                <CheckCircle2 size={14} aria-hidden="true" /> {t('Matches your equipment & time')}
              </span>
            )}
            <strong>{t(plan.name)}</strong>
            <span className={styles.meta}>
              ~{plan.minutes} min · {t(plan.equipment)}
            </span>
            <small>{t('{0} exercises', [movements.length])}</small>
            <small>{t('{0} sets', [movements.length * plan.sets])}</small>
          </span>
          <ChevronDown size={18} className={open ? styles.rotated : ''} aria-hidden="true" />
        </button>
        {open && (
          <div className={styles.planBody}>
            <p className={styles.meta}>{t('General template. You can change everything.')}</p>
            {movements.map((movement) => (
              <div key={movement.id} className={styles.movement}>
                <span>{t(movement.name)}</span>
                <small>{t('{0} sets', [plan.sets])}</small>
              </div>
            ))}
            <small className={styles.meta}>{t('90s rest per set · all targets editable')}</small>
            <PrimaryButton onClick={() => use(plan)} testID={`usePlan-${plan.id}`}>
              {t('Use template')}
            </PrimaryButton>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <TextButton onClick={() => navigate('/blueprints')}>
        <ChevronLeft size={20} aria-hidden="true" /> {t('Blueprints')}
      </TextButton>
      <h1 className={styles.title}>{t('Choose your starting point.')}</h1>
      <Group title={t('Equipment & time')}>
        <SelectRow<PlanEquipment> label={t('Available equipment')} value={equipment} options={planEquipment.map((value) => ({ value, label: t(value) }))} onChange={setEquipment} />
        <SelectRow label={t('Time budget')} value={String(minutes)} options={[20, 30, 45].map((value) => ({ value: String(value), label: t('{0} minutes', [value]) }))} onChange={(value) => setMinutes(Number(value))} />
      </Group>
      <Group title={t('Matching templates')}>
        {suggested.length === 0 && <p className={styles.empty}>{t('No starter matches both choices. Try more time, browse alternatives, or start freestyle.')}</p>}
        {suggested.map((plan, index) => card(plan, index === 0))}
      </Group>
      <Group title={t('All other templates')}>{others.map((plan) => card(plan))}</Group>
      <Group title={t('Other starting points')}>
        <RowButton onClick={() => navigate('/workout/new?freestyle=1')}>
          <Shuffle size={18} aria-hidden="true" /> {t('Train without a template')}
        </RowButton>
        <RowButton onClick={() => navigate('/blueprints')}>
          <Plus size={18} aria-hidden="true" /> {t('Create my own routine')}
        </RowButton>
      </Group>
    </div>
  )
}
