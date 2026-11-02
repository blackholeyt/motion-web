import { useState } from 'react'
import type { BlueprintExercise, Exercise, Guidance, Measurement, Progression } from '../../data/types'
import { emptyGuidance, entryMeasurement, preferences, validationError } from '../../domain/guidance'
import { measurements } from '../../domain/measurement'
import { useT } from '../../i18n'
import { updateEntry } from '../../store/blueprints'
import { Sheet } from '../../ui/Sheet'
import { Group, SelectRow, TextButton, TextRow } from '../../ui/controls'
import styles from './detail.module.css'

const toText = (value: number | null | undefined) => (value == null ? '' : String(value))
const toNumber = (text: string) => (text.trim() === '' ? null : Number(text))

/** RoutineGuidanceEditor.swift: targets, rest and notes that belong to this routine only. */
export function GuidanceEditor({ entry, exercise, onClose }: { entry: BlueprintExercise; exercise: Exercise | undefined; onClose: () => void }) {
  const { t } = useT()
  const initial = { ...emptyGuidance(), ...entry.guidance, measurement: entryMeasurement(entry, exercise) }
  const [draft, setDraft] = useState<Guidance>(initial)
  const [lower, setLower] = useState(toText(initial.minimumReps))
  const [upper, setUpper] = useState(toText(initial.maximumReps))
  const [duration, setDuration] = useState(toText(initial.durationSeconds))
  const [rest, setRest] = useState(toText(initial.restSeconds))
  const type = draft.measurement ?? 'Load & reps'
  const candidate: Guidance = { ...draft, minimumReps: toNumber(lower), maximumReps: toNumber(upper), durationSeconds: toNumber(duration), restSeconds: toNumber(rest) }
  const validation = [lower, upper, duration, rest].some((text) => text.trim() !== '' && !/^\d+$/.test(text.trim()))
    ? 'Use whole numbers, or leave optional targets blank.'
    : validationError(candidate, type)

  return (
    <Sheet
      open
      onClose={onClose}
      title={exercise?.name ?? ''}
      leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}
      trailing={
        <TextButton
          strong
          disabled={validation !== null}
          onClick={async () => {
            await updateEntry(entry, { guidance: candidate })
            onClose()
          }}
        >
          {t('Save')}
        </TextButton>
      }
    >
      <Group
        title={t('This routine only')}
        footer={t('Blank targets are optional. Blank rest uses the exercise default, then the global timer setting. Targets guide working sets; they never fill logged results.')}
      >
        <SelectRow<Measurement>
          label={t('Measurement')}
          value={type}
          options={measurements.map((value) => ({ value, label: t(value) }))}
          onChange={(measurement) => {
            setDraft({ ...draft, measurement, progression: 'Not selected' })
            setLower('')
            setUpper('')
            setDuration('')
          }}
        />
        {type === 'Duration' ? (
          <TextRow label={t('Duration target (seconds)')} value={duration} onChange={setDuration} placeholder={t('Optional')} inputMode="numeric" />
        ) : (
          <>
            <TextRow label={t('Minimum reps')} value={lower} onChange={setLower} placeholder={t('Optional')} inputMode="numeric" />
            <TextRow label={t('Maximum reps')} value={upper} onChange={setUpper} placeholder={t('Optional')} inputMode="numeric" />
          </>
        )}
        <TextRow label={t('Rest override (seconds)')} value={rest} onChange={setRest} placeholder={t('Optional')} inputMode="numeric" />
      </Group>
      <Group title={t('Notes')}>
        <textarea className={styles.notes} value={draft.notes} placeholder={t('Setup or technique reminders')} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={4} />
      </Group>
      <Group title={t('Progression preference')} footer={t('Optional and explicitly chosen by you. This stores your preference; it does not change next-session targets.')}>
        <SelectRow<Progression> label={t('Preference')} value={draft.progression} options={preferences(type).map((value) => ({ value, label: t(value) }))} onChange={(progression) => setDraft({ ...draft, progression })} />
      </Group>
      {validation && (
        <p className={styles.error} role="alert">
          {t(validation)}
        </p>
      )}
    </Sheet>
  )
}
