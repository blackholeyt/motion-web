import { useState } from 'react'
import { update } from '../../data/repo'
import type { Exercise } from '../../data/types'
import { loadInput, parseLoad } from '../../domain/measurement'
import { useT } from '../../i18n'
import { useProfile } from '../../store/profile'
import { Sheet } from '../../ui/Sheet'
import { Group, RowButton, TextButton, TextRow } from '../../ui/controls'

/** GoalEditorView (PRGoalsView.swift): setting a goal also turns on PR tracking. */
export function GoalEditor({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  return exercise ? <GoalEditorSheet key={exercise.id} exercise={exercise} onClose={onClose} /> : null
}

function GoalEditorSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const { t, locale } = useT()
  const unit = useProfile()?.load_unit ?? 'kg'
  const original = exercise.goal_weight_kg != null ? loadInput(unit, exercise.goal_weight_kg, locale) : ''
  const [text, setText] = useState(original)
  const parsed = parseLoad(unit, text)
  const value = text === original ? exercise.goal_weight_kg : parsed !== null && parsed > 0 ? parsed : null
  const save = async (goal: number | null) => {
    await update<Exercise>('exercises', exercise.id, goal === null ? { goal_weight_kg: null } : { goal_weight_kg: goal, is_pr_tracked: true })
    onClose()
  }
  return (
    <Sheet
      open
      onClose={onClose}
      title={t('Load Goal')}
      leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}
      trailing={
        <TextButton strong disabled={value == null} onClick={() => save(value!)} testID="saveGoal">
          {t('Save')}
        </TextButton>
      }
    >
      <Group title={exercise.name} footer={t('Aim for a positive weight. Reaching a goal fills the progress bar; you can then choose a new target.')}>
        <TextRow label={t('Goal in {0}', [unit])} value={text} onChange={setText} inputMode="decimal" autoFocus />
      </Group>
      {exercise.goal_weight_kg != null && (
        <Group>
          <RowButton tone="destructive" onClick={() => save(null)}>
            {t('Remove goal')}
          </RowButton>
        </Group>
      )}
    </Sheet>
  )
}
