import { CalendarDays, Check, ChevronRight, Layers3, Plus, Shuffle, Sparkles } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n'
import { createBlueprint, entriesFor } from '../../store/blueprints'
import { useBlueprints, useHaptics } from '../../store/hooks'
import { PhaseNotice } from '../../ui/PhaseNotice'
import { Sheet } from '../../ui/Sheet'
import { Group, TextButton, TextRow } from '../../ui/controls'
import { TrainingPlanEditor } from '../plan/TrainingPlanEditor'
import styles from './blueprints.module.css'

type Section = 'blueprints' | 'goals' | 'exercises' | 'cardio'
const titles: Record<Section, string> = { blueprints: 'Blueprints', goals: 'PR Goals', exercises: 'Exercises', cardio: 'Cardio' }

export function BlueprintsScreen() {
  const { t } = useT()
  const [section, setSection] = useState<Section>('blueprints')
  const [creating, setCreating] = useState(false)
  const [planning, setPlanning] = useState(false)
  return (
    <>
      <header className={styles.header}>
        <h1>{t(titles[section])}</h1>
        {section === 'blueprints' && (
          <button type="button" className={styles.plus} aria-label={t('Create blueprint')} onClick={() => setCreating(true)}>
            <Plus size={24} />
          </button>
        )}
      </header>
      <nav className={styles.sections} aria-label={t('Blueprints')}>
        <button type="button" className={`${styles.primarySection} ${section === 'blueprints' ? styles.current : ''}`} aria-pressed={section === 'blueprints'} onClick={() => setSection('blueprints')}>
          <span>
            <Layers3 size={20} aria-hidden="true" /> {t('Blueprints')}
          </span>
          {section === 'blueprints' ? <Check size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
        </button>
        <div className={styles.secondary}>
          {(['goals', 'exercises', 'cardio'] as const).map((value) => (
            <button key={value} type="button" className={section === value ? styles.current : ''} aria-pressed={section === value} onClick={() => setSection(value)}>
              {t(titles[value])}
            </button>
          ))}
        </div>
      </nav>
      {section === 'blueprints' ? <BlueprintList onPlan={() => setPlanning(true)} /> : <PhaseNotice phase={3} />}
      <NewBlueprintSheet open={creating} onClose={() => setCreating(false)} />
      <TrainingPlanEditor open={planning} onClose={() => setPlanning(false)} />
    </>
  )
}

function BlueprintList({ onPlan }: { onPlan: () => void }) {
  const { t } = useT()
  const navigate = useNavigate()
  const blueprints = useBlueprints()
  const counts = useLiveQuery(async () => {
    const result: Record<string, number> = {}
    for (const blueprint of blueprints ?? []) result[blueprint.id] = (await entriesFor(blueprint.id)).length
    return result
  }, [blueprints])
  return (
    <div className={styles.list}>
      <button type="button" className={styles.item} onClick={onPlan} data-testid="trainingPlanEditor">
        <CalendarDays size={20} aria-hidden="true" /> <span>{t('Training plan')}</span>
      </button>
      <button type="button" className={styles.item} onClick={() => navigate('/blueprints/starter')}>
        <Sparkles size={20} aria-hidden="true" /> <span>{t('Browse Starter Plans')}</span>
      </button>
      <button type="button" className={styles.item} onClick={() => navigate('/workout/new?freestyle=1')}>
        <Shuffle size={20} aria-hidden="true" /> <span>{t('Start Freestyle')}</span>
      </button>
      {(blueprints ?? []).map((blueprint) => (
        <button key={blueprint.id} type="button" className={styles.blueprint} onClick={() => navigate(`/blueprints/${blueprint.id}`)}>
          <span className={styles.blueprintName}>{blueprint.name}</span>
          <span className={styles.blueprintDetail}>{blueprint.cardio_type ? t(blueprint.cardio_type) : t('{0} exercises', [counts?.[blueprint.id] ?? 0])}</span>
        </button>
      ))}
    </div>
  )
}

function NewBlueprintSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const navigate = useNavigate()
  const haptic = useHaptics()
  const [name, setName] = useState('')
  const [cardio, setCardio] = useState(false)
  const close = () => {
    setName('')
    setCardio(false)
    onClose()
  }
  const save = async () => {
    const blueprint = await createBlueprint(name)
    haptic('action')
    close()
    navigate(`/blueprints/${blueprint.id}`)
  }
  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('New Blueprint')}
      leading={<TextButton onClick={close}>{t('Cancel')}</TextButton>}
      trailing={
        <TextButton strong onClick={save} disabled={!name.trim() || cardio} testID="saveBlueprint">
          {t('Save')}
        </TextButton>
      }
    >
      <Group>
        <TextRow label={t('Blueprint name')} value={name} onChange={setName} autoFocus />
      </Group>
      <div className={styles.segmented} role="radiogroup" aria-label={t('Workout type')}>
        {[false, true].map((value) => (
          <button key={String(value)} type="button" role="radio" aria-checked={cardio === value} className={cardio === value ? styles.selected : ''} onClick={() => setCardio(value)}>
            {t(value ? 'Cardio' : 'Strength')}
          </button>
        ))}
      </div>
      {cardio && <PhaseNotice phase={3} />}
    </Sheet>
  )
}
