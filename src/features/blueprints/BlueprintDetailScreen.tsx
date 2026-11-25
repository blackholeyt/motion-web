import { ArrowDown, ArrowUp, ChevronLeft, Crown, Ellipsis, List, Play, Plus, PlusCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Exercise, SupersetGroup } from '../../data/types'
import { sameName } from '../../domain/catalogue'
import { targetLabel } from '../../domain/guidance'
import { useT } from '../../i18n'
import { addEntry, deleteBlueprint, DuplicateEntryError, moveEntry, removeEntry, renameBlueprint, updateEntry, type BlueprintEntry } from '../../store/blueprints'
import { useBlueprint, useEntries, useLibrary } from '../../store/hooks'
import { createExercise } from '../../store/library'
import { usePreferences } from '../../store/profile'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Loading, SkeletonBlock } from '../../ui/Skeleton'
import { Group, Menu, PrimaryButton, RowButton, SelectRow, Stepper, TextButton, TextRow } from '../../ui/controls'
import { ExerciseBrowser } from '../exercises/ExerciseBrowser'
import { GuidanceEditor } from './GuidanceEditor'
import styles from './detail.module.css'

export const supersetOptions = (t: (text: string, values?: (string | number)[]) => string) => [
  { value: '' as const, label: t('None') },
  ...(['A', 'B', 'C', 'D'] as const).map((group) => ({ value: group, label: t('Group {0}', [group]) })),
]

export function BlueprintDetailScreen() {
  const { id } = useParams()
  const { t } = useT()
  const navigate = useNavigate()
  const blueprint = useBlueprint(id)
  const entries = useEntries(id) ?? []
  const library = useLibrary() ?? []
  const [name, setName] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (blueprint) setName(blueprint.name)
  }, [blueprint?.id])

  if (blueprint === undefined)
    return (
      <Loading>
        <SkeletonBlock height={34} width="55%" />
        <SkeletonBlock height={52} radius="var(--radius-button)" />
        <SkeletonBlock height={220} radius="var(--radius-button)" />
      </Loading>
    )
  if (blueprint === null || blueprint.deleted_at) return <p>{t('Workout unavailable')}</p>

  const available = library.filter((exercise) => !entries.some(({ entry }) => entry.exercise_id === exercise.id))
  const add = async (exercise: Exercise, sets = 3) => {
    try {
      await addEntry(blueprint.id, exercise, sets)
    } catch (failure) {
      setError(failure instanceof DuplicateEntryError ? t(failure.message) : String(failure))
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.top}>
        <TextButton onClick={() => navigate('/blueprints')}>
          <ChevronLeft size={20} aria-hidden="true" /> {t('Blueprints')}
        </TextButton>
        <Menu label={t('Edit')} icon={<Ellipsis size={22} />} items={[{ label: t('Delete'), role: 'destructive', onSelect: () => setDeleting(true) }]} />
      </header>
      <Group title={t('Blueprint')}>
        <TextRow label={t('Name')} value={name} onChange={setName} placeholder={t('e.g. Push, Pull or Legs')} onBlur={() => renameBlueprint(blueprint, name)} />
      </Group>
      <Group
        title={t('Exercises')}
        footer={t('Targets, measurement, notes and rest overrides belong to this routine. Manage shared exercise PR tracking in the exercise library. Tap Edit to drag exercises into order, or swipe left to remove one.')}
      >
        {entries.length === 0 && <p className={styles.empty}>{t('Add an exercise to get started.')}</p>}
        {entries.map((item, index) => (
          <EntryRow key={item.entry.id} item={item} index={index} entries={entries} />
        ))}
      </Group>
      <Group title={t('Add Exercise')}>
        <RowButton onClick={() => setBrowsing(true)} testID="routineExerciseCatalogue">
          <List size={18} aria-hidden="true" /> {t('Browse exercise catalogue')}
        </RowButton>
        <RowButton onClick={() => setChoosing(true)} disabled={available.length === 0}>
          <Plus size={18} aria-hidden="true" /> {t('Choose Existing Exercise')}
        </RowButton>
        <RowButton onClick={() => setCreating(true)}>
          <PlusCircle size={18} aria-hidden="true" /> {t('New Exercise')}
        </RowButton>
      </Group>
      <div className={styles.startBar}>
        {entries.length === 0 && <p>{t('Add an exercise to start your workout.')}</p>}
        <PrimaryButton onClick={() => navigate(`/workout/new?blueprint=${blueprint.id}`)} disabled={entries.length === 0} testID="startWorkout">
          <Play size={18} aria-hidden="true" /> {t('Start Workout')}
        </PrimaryButton>
      </div>

      <Sheet open={browsing} onClose={() => setBrowsing(false)} title={t('Exercises')} trailing={<TextButton onClick={() => setBrowsing(false)}>{t('Close')}</TextButton>}>
        <ExerciseBrowser
          requiresLogging
          onSelect={async (exercise) => {
            await add(exercise)
            setBrowsing(false)
          }}
        />
      </Sheet>
      <Sheet open={choosing} onClose={() => setChoosing(false)} title={t('Choose Existing Exercise')} trailing={<TextButton onClick={() => setChoosing(false)}>{t('Close')}</TextButton>}>
        <Group>
          {available.map((exercise) => (
            <RowButton
              key={exercise.id}
              tone="plain"
              onClick={async () => {
                await add(exercise)
                setChoosing(false)
              }}
            >
              {exercise.name}
            </RowButton>
          ))}
        </Group>
      </Sheet>
      {creating && (
        <ExerciseNameSheet
          onClose={() => setCreating(false)}
          onSave={async (exerciseName, sets) => {
            const existing = library.find((exercise) => sameName(exercise.name, exerciseName))
            await add(existing ?? (await createExercise(exerciseName)), sets)
          }}
        />
      )}
      <ConfirmDialog
        open={deleting}
        title={t('Delete')}
        message={blueprint.name}
        onDismiss={() => setDeleting(false)}
        actions={[
          {
            label: t('Delete'),
            role: 'destructive',
            onSelect: async () => {
              await deleteBlueprint(blueprint)
              navigate('/blueprints')
            },
          },
          { label: t('Cancel'), role: 'cancel', onSelect: () => setDeleting(false) },
        ]}
      />
      <ConfirmDialog open={error !== null} title={t('Unable to Save')} message={error ?? ''} onDismiss={() => setError(null)} actions={[{ label: t('Dismiss'), role: 'cancel', onSelect: () => setError(null) }]} />
    </div>
  )
}

function EntryRow({ item, index, entries }: { item: BlueprintEntry; index: number; entries: BlueprintEntry[] }) {
  const { t } = useT()
  const { restTimerSeconds } = usePreferences()
  const [editing, setEditing] = useState(false)
  const { entry, exercise } = item
  const guidance = entry.guidance
  const target = guidance ? targetLabel(guidance, t) : null
  return (
    <div className={styles.entry}>
      <div className={styles.entryHead}>
        <strong>{exercise?.name}</strong>
        {exercise?.is_pr_tracked && <Crown size={18} className={styles.crown} aria-label={t('PR tracking enabled in exercise library')} />}
        <span className={styles.entryTools}>
          <button type="button" aria-label={t('Move up')} disabled={index === 0} onClick={() => moveEntry(entries, index, -1)}>
            <ArrowUp size={18} />
          </button>
          <button type="button" aria-label={t('Move down')} disabled={index === entries.length - 1} onClick={() => moveEntry(entries, index, 1)}>
            <ArrowDown size={18} />
          </button>
          <button type="button" aria-label={t('Remove exercise')} onClick={() => removeEntry(entry)}>
            <Trash2 size={18} />
          </button>
        </span>
      </div>
      <Stepper label={t('{0} working sets', [entry.target_sets])} value={entry.target_sets} min={1} max={1000} onChange={(target_sets) => updateEntry(entry, { target_sets })} />
      <small className={styles.measurement}>{t(guidance?.measurement ?? exercise?.measurement ?? 'Load & reps')}</small>
      <Stepper label={t('{0} warm-up sets', [entry.warm_up_sets])} value={entry.warm_up_sets} min={0} max={20} onChange={(warm_up_sets) => updateEntry(entry, { warm_up_sets })} />
      <SelectRow<SupersetGroup | ''>
        label={t('Superset')}
        value={entry.superset_group ?? ''}
        options={supersetOptions(t)}
        onChange={(group) => updateEntry(entry, { superset_group: group === '' ? null : group })}
      />
      <p className={styles.hint}>{t('Same group: alternate working sets in routine order, then rest. Each exercise keeps its own results. Targets and measurement edits apply only to this routine’s future sessions.')}</p>
      {target && <p className={styles.target}>{target}</p>}
      {guidance?.notes && <p className={styles.noteText}>{guidance.notes}</p>}
      {guidance && guidance.progression !== 'Not selected' && <p className={styles.hint}>{t('Preference: {0} · no automatic adjustments', [t(guidance.progression)])}</p>}
      <p className={styles.hint}>{t('Rest: {0}s', [guidance?.restSeconds ?? exercise?.rest_seconds ?? restTimerSeconds])}</p>
      <TextButton onClick={() => setEditing(true)}>{t('Targets, rest & notes')}</TextButton>
      {editing && <GuidanceEditor entry={entry} exercise={exercise} onClose={() => setEditing(false)} />}
    </div>
  )
}

export function ExerciseNameSheet({ onClose, onSave }: { onClose: () => void; onSave: (name: string, sets: number) => void | Promise<void> }) {
  const { t } = useT()
  const [name, setName] = useState('')
  const [sets, setSets] = useState(3)
  return (
    <Sheet
      open
      onClose={onClose}
      title={t('New Exercise')}
      leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}
      trailing={
        <TextButton
          strong
          disabled={!name.trim()}
          onClick={async () => {
            await onSave(name.trim(), sets)
            onClose()
          }}
        >
          {t('Save')}
        </TextButton>
      }
    >
      <Group>
        <TextRow label={t('Exercise name')} value={name} onChange={setName} autoFocus />
        <Stepper label={t('{0} sets', [sets])} value={sets} min={1} max={100} onChange={setSets} />
      </Group>
    </Sheet>
  )
}
