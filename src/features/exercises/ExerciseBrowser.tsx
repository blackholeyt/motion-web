import { useState } from 'react'
import type { Exercise } from '../../data/types'
import { catalogue, emptyFilter, equipmentOptions, matches, muscleOptions, supportsLogging, type CatalogueMovement, type ExerciseFilter } from '../../domain/catalogue'
import { measurements } from '../../domain/measurement'
import { useT } from '../../i18n'
import { addCatalogueMovement, adoptMovement } from '../../store/library'
import { useLibrary } from '../../store/hooks'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, RowButton, SelectRow, TextButton } from '../../ui/controls'
import styles from './exercises.module.css'

/** ExerciseBrowser.swift: your exercises plus the 36-movement starter catalogue, with search and filters. */
export function ExerciseBrowser({ requiresLogging = false, onSelect }: { requiresLogging?: boolean; onSelect: (exercise: Exercise) => void }) {
  const { t } = useT()
  const library = useLibrary() ?? []
  const [filter, setFilter] = useState<ExerciseFilter>(emptyFilter)
  const [pending, setPending] = useState<CatalogueMovement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const set = (change: Partial<ExerciseFilter>) => setFilter((current) => ({ ...current, ...change }))

  const use = async (movement: CatalogueMovement, existing?: Exercise) => {
    const exercise = await adoptMovement(movement, existing)
    setPending(null)
    onSelect(exercise)
  }
  const addNew = async (movement: CatalogueMovement) => {
    const result = await addCatalogueMovement(movement)
    if (result === 'ambiguous') return setError(t('Multiple saved exercises match. Choose the correct entry explicitly.'))
    setPending(null)
    onSelect(result)
  }

  return (
    <div>
      <input
        type="search"
        className={styles.search}
        placeholder={t('Name, equipment or muscle')}
        value={filter.search}
        onChange={(event) => set({ search: event.target.value })}
        aria-label={t('Name, equipment or muscle')}
      />
      <Group title={t('Filters')}>
        <SelectRow label={t('Equipment')} value={filter.equipment} onChange={(equipment) => set({ equipment })} options={[{ value: '', label: t('All equipment') }, ...equipmentOptions.map((value) => ({ value, label: t(value) }))]} />
        <SelectRow label={t('Muscle')} value={filter.muscle} onChange={(muscle) => set({ muscle })} options={[{ value: '', label: t('All muscles') }, ...muscleOptions.map((value) => ({ value, label: t(value) }))]} />
        <SelectRow
          label={t('Measurement')}
          value={filter.measurement}
          onChange={(measurement) => set({ measurement })}
          options={[
            { value: '', label: t('All measurements') },
            ...measurements.map((value) => ({ value, label: t(value) })),
            { value: 'Distance & duration', label: t('Distance & duration · logging unavailable') },
          ]}
        />
      </Group>
      <Group title={t('Your exercises')}>
        {library.filter((exercise) => matches(exercise, filter)).map((exercise) => (
          <RowButton key={exercise.id} tone="plain" onClick={() => onSelect(exercise)} disabled={requiresLogging && !supportsLogging(exercise)}>
            <span className={styles.stack}>
              <span>{exercise.name}</span>
              <small>{t(exercise.track_progress ? 'Progress tracking' : 'History only')}</small>
            </span>
          </RowButton>
        ))}
      </Group>
      <Group title={t('Starter catalogue · 36 movements')} footer={t('Load, bodyweight, assistance and duration logging are supported. Distance-based set logging is not available.')}>
        {catalogue.filter((movement) => matches(movement, filter)).map((movement) => (
          <RowButton key={movement.id} tone="plain" onClick={() => setPending(movement)} testID={`catalogue-${movement.id}`}>
            <span className={styles.stack}>
              <span>{t(movement.name)}</span>
              <small>
                {t(movement.equipment)} · {t(movement.muscle)}
              </small>
            </span>
          </RowButton>
        ))}
      </Group>
      <Sheet open={pending !== null} onClose={() => setPending(null)} title={pending ? t(pending.name) : ''} trailing={<TextButton onClick={() => setPending(null)}>{t('Cancel')}</TextButton>}>
        {pending && (
          <>
            <p className={styles.guidance}>{t(pending.guidance)}</p>
            {pending.measurement === 'Distance & duration' && <p className={styles.muted}>{t('Metadata preview only. This measurement cannot be logged yet.')}</p>}
            <Group>
              <RowButton onClick={() => addNew(pending)} disabled={pending.measurement === 'Distance & duration'} testID="addCatalogueMovement">
                {t('Add as a new movement')}
              </RowButton>
            </Group>
            {library.length > 0 && (
              <Group title={t('Already saved under another name? Choose it below to keep its identity and routine references. No history is linked by name.')}>
                {library.map((exercise) => (
                  <RowButton key={exercise.id} onClick={() => use(pending, exercise)} disabled={pending.measurement === 'Distance & duration'}>
                    {t('Use {0}', [exercise.name])}
                  </RowButton>
                ))}
              </Group>
            )}
          </>
        )}
      </Sheet>
      <ConfirmDialog open={error !== null} title={t('Exercise')} message={error ?? ''} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setError(null) }]} onDismiss={() => setError(null)} />
    </div>
  )
}
