import { CalendarDays, Check, ChevronRight, Layers3, Plus, Shuffle, Sparkles } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n'
import { createBlueprint, entriesFor } from '../../store/blueprints'
import { useBlueprints } from '../../store/hooks'
import { Sheet } from '../../ui/Sheet'
import { Group, TextButton, TextRow } from '../../ui/controls'
import { TrainingPlanEditor } from '../plan/TrainingPlanEditor'
import { ExerciseLibrary } from '../exercises/ExerciseLibrary'
import { PRGoals } from '../exercises/PRGoals'
import { CardioLibrary } from '../cardio/CardioLibrary'
import { CardioBlueprintForm } from '../cardio/CardioBlueprintSheet'
import { draftValid, newCardioDraft } from '../../domain/cardio'
import { createCardioBlueprint } from '../../store/cardio'
import { useProfile } from '../../store/profile'
import styles from './blueprints.module.css'
import { SkeletonBlock } from '../../ui/Skeleton'

type Section = 'blueprints' | 'goals' | 'exercises' | 'cardio'
const titles: Record<Section, string> = { blueprints: 'Blueprints', goals: 'PR Goals', exercises: 'Exercises', cardio: 'Cardio' }

export function BlueprintsScreen() {
  const { t } = useT()
  const [section, setSection] = useState<Section>('blueprints')
  const [creating, setCreating] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [newExercise, setNewExercise] = useState(false)
  return (
    <>
      <header className={styles.header}>
        <h1>{t(titles[section])}</h1>
        {(section === 'blueprints' || section === 'exercises') && (
          <button
            type="button"
            className={styles.plus}
            aria-label={t(section === 'blueprints' ? 'Create blueprint' : 'New Exercise')}
            onClick={() => (section === 'blueprints' ? setCreating(true) : setNewExercise(true))}
            data-testid={section === 'blueprints' ? 'createBlueprint' : 'newExercise'}
          >
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
      {section === 'blueprints' && <BlueprintList onPlan={() => setPlanning(true)} />}
      {section === 'goals' && <PRGoals />}
      {section === 'exercises' && <ExerciseLibrary creating={newExercise} onCreated={() => setNewExercise(false)} />}
      {section === 'cardio' && <CardioLibrary />}
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
      {blueprints === undefined &&
        [0, 1, 2].map((index) => (
          <span key={index} className={styles.skeletonRow}>
            <SkeletonBlock height={16} width="45%" />
            <SkeletonBlock height={12} width="25%" />
          </span>
        ))}
      {(blueprints ?? []).map((blueprint) => (
        <button key={blueprint.id} type="button" className={styles.blueprint} onClick={() => navigate(blueprint.cardio_type ? `/cardio?blueprint=${blueprint.id}` : `/blueprints/${blueprint.id}`, { state: { returnTo: '/blueprints' } })}>
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
  const [name, setName] = useState('')
  const [cardio, setCardio] = useState(false)
  const unit = useProfile()?.distance_unit ?? 'km'
  const [draft, setDraft] = useState(() => newCardioDraft(unit))
  const close = () => {
    setName('')
    setCardio(false)
    setDraft(newCardioDraft(unit))
    onClose()
  }
  const save = async () => {
    if (cardio) {
      await createCardioBlueprint(name, draft)
      return close()
    }
    const blueprint = await createBlueprint(name)
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
        <TextButton strong onClick={save} disabled={!name.trim() || (cardio && !draftValid(draft))} testID="saveBlueprint">
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
      {cardio && <CardioBlueprintForm name={name} onName={setName} draft={draft} onDraft={setDraft} hideName />}
    </Sheet>
  )
}
