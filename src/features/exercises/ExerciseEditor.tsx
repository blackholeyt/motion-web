import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { CatalogueMeasurement, Exercise } from '../../data/types'
import { equipmentOptions, muscleLabel, muscleOptions, supportsLogging } from '../../domain/catalogue'
import { measurements } from '../../domain/measurement'
import { useT } from '../../i18n'
import { deleteExercise, historyCandidates, saveExercise, type ExerciseMetadata } from '../../store/library'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, RowButton, SelectRow, TextButton, TextRow, Toggle } from '../../ui/controls'
import styles from './exercises.module.css'

/** ExerciseEditor.swift: name, metadata, "Track progress" and optional history linking. */
export function ExerciseEditor({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const { t, locale } = useT()
  const [name, setName] = useState(exercise.name)
  const [metadata, setMetadata] = useState<ExerciseMetadata>({
    equipment: exercise.equipment,
    muscle: exercise.muscle,
    measurement: exercise.measurement,
    guidance: exercise.guidance,
    track_progress: exercise.track_progress,
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const candidates = useLiveQuery(() => historyCandidates(exercise), [exercise.id]) ?? []
  const change = (value: Partial<ExerciseMetadata>) => setMetadata((current) => ({ ...current, ...value }))
  const save = async () => {
    try {
      await saveExercise(exercise, name, metadata, [...selected])
      onClose()
    } catch (failure) {
      setError((failure as Error).message)
    }
  }
  const date = (value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
  return (
    <Sheet
      open
      onClose={onClose}
      title={t('Edit Exercise')}
      leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}
      trailing={
        <TextButton strong onClick={save} disabled={!name.trim()} testID="saveExercise">
          {t('Save')}
        </TextButton>
      }
    >
      <Group title={t('Movement')}>
        <TextRow label={t('Name')} value={name} onChange={setName} />
        <SelectRow label={t('Equipment')} value={metadata.equipment} onChange={(equipment) => change({ equipment })} options={equipmentOptions.map((value) => ({ value, label: t(value) }))} />
        <SelectRow label={t('Muscle')} value={metadata.muscle} onChange={(muscle) => change({ muscle })} options={muscleOptions.map((value) => ({ value, label: muscleLabel(t, value) }))} />
        <SelectRow<CatalogueMeasurement>
          label={t('Measurement')}
          value={metadata.measurement}
          onChange={(measurement) => change({ measurement })}
          options={[...measurements.map((value) => ({ value, label: t(value) })), { value: 'Distance & duration' as const, label: t('Distance & duration · logging unavailable') }]}
        />
        <TextRow label={t('Setup and notes')} value={metadata.guidance} onChange={(guidance) => change({ guidance })} />
      </Group>
      <Group footer={t('Applies to future sessions. Turning this off retains existing progress. Record tracking stays a separate choice in your routine; this switch never enables it or changes earned XP.')}>
        <Toggle label={t('Track progress')} checked={metadata.track_progress} onChange={(track_progress) => change({ track_progress })} />
      </Group>
      {!supportsLogging(metadata) && <p className={styles.muted}>{t('Metadata only: this movement cannot be logged until its measurement type is supported.')}</p>}
      {metadata.track_progress && supportsLogging(metadata) && (
        <Group
          title={t('Include historical results · optional')}
          footer={t('Nothing is selected automatically. Linked entries share this movement’s stable identity. Unlinked entries are ambiguous—even if the name matches. Select only sessions of this same movement. Names and earned XP stay unchanged; unselected entries remain history only.')}
        >
          {candidates.length === 0 && <p className={styles.rowNote}>{t('No history-only entries to include.')}</p>}
          {candidates.map(({ snapshot, workout }) => (
            <label key={snapshot.id} className={styles.check}>
              <input
                type="checkbox"
                checked={selected.has(snapshot.id)}
                onChange={(event) => {
                  const next = new Set(selected)
                  if (event.target.checked) next.add(snapshot.id)
                  else next.delete(snapshot.id)
                  setSelected(next)
                }}
              />
              <span className={styles.stack}>
                <span>{snapshot.exercise_name}</span>
                <small>
                  {t(workout.name)} · {date(workout.performed_at)}
                </small>
                <small>{t(snapshot.exercise_id === null ? 'Unlinked · confirm same movement' : 'Linked identity')}</small>
              </span>
            </label>
          ))}
        </Group>
      )}
      <Group>
        <RowButton tone="destructive" onClick={() => setDeleting(true)}>
          {t('Delete Exercise')}
        </RowButton>
      </Group>
      <ConfirmDialog
        open={deleting}
        title={t('Remove from library and all routines? Past history is preserved.')}
        onDismiss={() => setDeleting(false)}
        actions={[
          {
            label: t('Delete Exercise'),
            role: 'destructive',
            onSelect: async () => {
              setDeleting(false)
              await deleteExercise(exercise)
              onClose()
            },
          },
          { label: t('Cancel'), role: 'cancel', onSelect: () => setDeleting(false) },
        ]}
      />
      <ConfirmDialog open={error !== null} title={t('Could not save')} message={error ? t(error) : ''} onDismiss={() => setError(null)} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setError(null) }]} />
    </Sheet>
  )
}
