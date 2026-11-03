import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../data/db'
import { live } from '../../data/repo'
import type { Exercise } from '../../data/types'
import { sameName } from '../../domain/catalogue'
import { useT } from '../../i18n'
import { useLibrary } from '../../store/hooks'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, RowButton, Stepper, TextButton, TextRow } from '../../ui/controls'
import { ExerciseBrowser } from '../exercises/ExerciseBrowser'
import * as engine from './engine'

/** FreestyleExercisePicker.swift; with `replacing` it swaps an exercise in one undo step. */
export function ExercisePicker({ workoutID, replacing, context, onClose }: { workoutID: string; replacing: string | null; context: engine.WorkoutContext; onClose: () => void }) {
  const { t } = useT()
  const library = useLibrary() ?? []
  const [sets, setSets] = useState(3)
  const [name, setName] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savedNames = useLiveQuery(async () => {
    const snapshots = live(await db.workout_exercises.toArray()).filter((exercise) => exercise.is_history_only)
    return [...new Set(snapshots.map((exercise) => exercise.exercise_name))]
      .filter((candidate) => !library.some((exercise) => sameName(exercise.name, candidate)))
      .sort((a, b) => a.localeCompare(b))
  }, [library])

  const add = async (request: { existing?: Exercise; customName?: string }) => {
    try {
      await engine.addExercise(workoutID, { ...request, sets }, context, { replacing: replacing ?? undefined })
      onClose()
    } catch (failure) {
      setError(t((failure as Error).message))
    }
  }

  return (
    <Sheet open onClose={onClose} title={t('Add Exercise')} leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}>
      <Group>
        <Stepper label={t('{0} sets', [sets])} value={sets} min={1} max={100} onChange={setSets} />
      </Group>
      <Group title={t('Library and starter catalogue')}>
        <RowButton onClick={() => setBrowsing(true)} testID="findExercise">
          {t('Find exercise · search and filters')}
        </RowButton>
      </Group>
      <Group title={t('Custom exercise · history only')} footer={t('Saved for reuse and in workout history. Excluded from exercise statistics, personal records and improvement XP. Workout completion XP still applies.')}>
        <TextRow label={t('Custom exercise name')} value={name} onChange={setName} />
        <RowButton onClick={() => add({ customName: name })} disabled={!name.trim()} testID="addCustomExercise">
          {t('Add Custom Exercise')}
        </RowButton>
      </Group>
      {(savedNames?.length ?? 0) > 0 && (
        <Group title={t('Saved custom exercises · history only')}>
          {savedNames!.map((saved) => (
            <RowButton key={saved} tone="plain" onClick={() => add({ customName: saved })}>
              {saved}
            </RowButton>
          ))}
        </Group>
      )}
      <Sheet open={browsing} onClose={() => setBrowsing(false)} title={t('Choose Exercise')} leading={<TextButton onClick={() => setBrowsing(false)}>{t('Cancel')}</TextButton>}>
        <ExerciseBrowser
          requiresLogging
          onSelect={async (exercise) => {
            setBrowsing(false)
            await add({ existing: exercise })
          }}
        />
      </Sheet>
      <ConfirmDialog open={error !== null} title={t('Exercise')} message={error ?? ''} onDismiss={() => setError(null)} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setError(null) }]} />
    </Sheet>
  )
}
