import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { SupersetGroup, Workout } from '../../data/types'
import { formatNumber, loadInput, parseLoad, quantityLabel, supportsWeightComparisons } from '../../domain/measurement'
import { parseDuration } from '../../domain/sets'
import { useT } from '../../i18n'
import { deleteWorkout, saveHistoryEdit } from '../../store/history'
import { useProfile } from '../../store/profile'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, RowButton, SelectRow, TextButton, TextRow, Toggle } from '../../ui/controls'
import { supersetOptions } from '../blueprints/BlueprintDetailScreen'
import { loadSession } from '../workout/session'
import styles from './history.module.css'

interface SetDraft {
  id: string
  exercise: string
  index: number
  measurement: import('../../data/types').Measurement
  weight: string
  original: string
  storedKg: number
  reps: string
  warmUp: boolean
}

const localInput = (iso: string) => {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** WorkoutHistoryEditor.swift ("Edit Session"). */
export function HistoryEditor({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const { t, locale } = useT()
  const unit = useProfile()?.load_unit ?? 'kg'
  const session = useLiveQuery(() => loadSession(workout.id), [workout.id])
  const [name, setName] = useState(workout.name)
  const [date, setDate] = useState(localInput(workout.performed_at))
  const [notes, setNotes] = useState(workout.notes ?? '')
  const [groups, setGroups] = useState<Record<string, SupersetGroup | null>>({})
  const [sets, setSets] = useState<SetDraft[] | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!session || sets) return
    setGroups(Object.fromEntries(session.all.map(({ exercise }) => [exercise.id, exercise.superset_group])))
    setSets(
      session.all.flatMap(({ exercise, rows }) =>
        rows
          .filter(({ set }) => set.is_completed)
          .map(({ set }) => {
            const weight = exercise.measurement === 'Duration' ? formatNumber(set.duration_seconds ?? 0, locale) : loadInput(unit, set.weight_kg, locale)
            return { id: set.id, exercise: exercise.exercise_name, index: set.set_index, measurement: exercise.measurement, weight, original: weight, storedKg: set.weight_kg, reps: set.reps != null ? String(set.reps) : '', warmUp: set.is_warm_up }
          }),
      ),
    )
  }, [session]) // Initialise once, like the SwiftUI editor's @State.

  if (!session || !sets) return null

  const parsedWeight = (set: SetDraft) => {
    if (set.measurement === 'Duration') return 0
    if (set.measurement === 'Bodyweight reps' && set.weight.trim() === '') return 0
    if (set.weight === set.original) return set.storedKg
    return parseLoad(unit, set.weight)
  }
  const parsedReps = (set: SetDraft) => (/^\d+$/.test(set.reps.trim()) ? Number(set.reps.trim()) : null)
  const valid = (set: SetDraft) =>
    set.measurement === 'Duration'
      ? parseDuration(set.weight) !== null
      : parsedWeight(set) !== null && ((set.measurement === 'Load & reps' && set.reps.trim() === '') || (parsedReps(set) ?? 0) > 0)
  const canSave = name.trim() !== '' && sets.every(valid) && !Number.isNaN(Date.parse(date)) && new Date(date) <= new Date()
  const incomplete = session.all
    .map(({ exercise, rows }) => ({ name: exercise.exercise_name, count: rows.filter(({ set }) => !set.is_completed).length }))
    .filter(({ count }) => count > 0)
  const change = (id: string, values: Partial<SetDraft>) => setSets(sets.map((set) => (set.id === id ? { ...set, ...values } : set)))

  const save = async () => {
    await saveHistoryEdit(workout, {
      name,
      performed_at: new Date(date).toISOString(),
      notes: notes === '' ? null : notes,
      groups,
      sets: sets.map((set) => ({
        id: set.id,
        weight_kg: parsedWeight(set) ?? 0,
        reps: set.measurement === 'Duration' ? null : parsedReps(set),
        duration_seconds: set.measurement === 'Duration' ? parseDuration(set.weight) : null,
        is_warm_up: set.warmUp,
      })),
    })
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={t('Edit Session')}
      leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}
      trailing={
        <TextButton strong onClick={save} disabled={!canSave} testID="saveHistory">
          {t('Save')}
        </TextButton>
      }
    >
      <Group title={t('Session')}>
        <TextRow label={t('Workout name')} value={name} onChange={setName} />
        <label className={styles.dateRow}>
          <span>{t('Date')}</span>
          <input type="datetime-local" value={date} max={localInput(new Date().toISOString())} onChange={(event) => setDate(event.target.value)} />
        </label>
      </Group>
      <Group title={t('Workout notes')} footer={t('Optional: how it felt, technique reminders or plans for next time.')}>
        <textarea className={styles.textarea} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} aria-label={t('Workout notes')} />
      </Group>
      {incomplete.length > 0 && (
        <Group title={t('Planned work')}>
          {incomplete.map(({ name: exercise, count }) => (
            <p key={exercise} className={styles.planned}>
              {t('{0}: {1} unfinished, skipped or removed sets (not performed)', [exercise, count])}
            </p>
          ))}
        </Group>
      )}
      <Group title={t('Exercise structure')}>
        {session.all.map(({ exercise }) => (
          <SelectRow<SupersetGroup | ''>
            key={exercise.id}
            label={t('{0} · superset', [exercise.exercise_name])}
            value={groups[exercise.id] ?? ''}
            options={supersetOptions(t)}
            onChange={(value) => setGroups({ ...groups, [exercise.id]: value === '' ? null : value })}
          />
        ))}
      </Group>
      {sets.map((set) => (
        <Group key={set.id} title={`${set.exercise} · ${t('Set')} ${set.index} · ${t(set.measurement)}`}>
          <Toggle label={t('Warm-up set')} checked={set.warmUp} onChange={(warmUp) => change(set.id, { warmUp })} />
          <TextRow
            label={`${t(quantityLabel(set.measurement))} · ${set.measurement === 'Duration' ? 'sec' : unit}`}
            value={set.weight}
            onChange={(weight) => change(set.id, { weight })}
            placeholder={set.measurement === 'Bodyweight reps' ? t('0 (optional)') : t('Value')}
            inputMode="decimal"
          />
          {set.measurement !== 'Duration' && (
            <TextRow label={t('Reps')} value={set.reps} onChange={(reps) => change(set.id, { reps })} placeholder={set.measurement === 'Load & reps' ? t('Not tracked') : t('Required')} inputMode="numeric" />
          )}
          {!supportsWeightComparisons(set.measurement) && <p className={styles.planned}>{t('Baseline only · no load-based trend, PR or improvement reward.')}</p>}
        </Group>
      ))}
      <Group footer={t('Edits update supported working-set statistics, never earned XP. Warm-ups remain in history. Only ordinary weighted sets may omit reps. Historical measurement types stay unchanged.')}>
        <RowButton tone="destructive" onClick={() => setDeleting(true)} testID="deleteWorkout">
          {t('Delete workout')}
        </RowButton>
      </Group>
      <ConfirmDialog
        open={deleting}
        title={t('Delete this workout? This cannot be undone.')}
        onDismiss={() => setDeleting(false)}
        actions={[
          {
            label: t('Delete workout'),
            role: 'destructive',
            onSelect: async () => {
              await deleteWorkout(workout.id)
              onClose()
            },
          },
          { label: t('Cancel'), role: 'cancel', onSelect: () => setDeleting(false) },
        ]}
      />
    </Sheet>
  )
}
