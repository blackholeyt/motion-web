import { useLiveQuery } from 'dexie-react-hooks'
import { Target } from 'lucide-react'
import { useState } from 'react'
import type { Exercise } from '../../data/types'
import { loadLabel } from '../../domain/measurement'
import { topWeights } from '../../domain/progress'
import { useT } from '../../i18n'
import { useLibrary } from '../../store/hooks'
import { useProfile } from '../../store/profile'
import { completedHistory } from '../../store/progress'
import { EmptyState } from '../../ui/components'
import { GoalBar } from '../progress/Celebration'
import { GoalEditor } from './GoalEditor'
import styles from './exercises.module.css'

/** PRGoalsView.swift: load goals for external-load exercises. */
export function PRGoals() {
  const { t, locale } = useT()
  const unit = useProfile()?.load_unit ?? 'kg'
  const weighted = (useLibrary() ?? []).filter((exercise) => exercise.measurement === 'Load & reps')
  const history = useLiveQuery(completedHistory, []) ?? []
  const [editing, setEditing] = useState<Exercise | null>(null)
  const load = (kg: number) => loadLabel(unit, kg, locale)
  return (
    <div className={styles.library}>
      <h2 className={styles.heading}>{t('Recorded load goals.')}</h2>
      <p className={styles.muted}>
        {t('Weight goals and PR tracking are available for external-load working sets. Comparable bodyweight reps can appear in recaps; assistance and duration remain separate history measurements.')}
      </p>
      {weighted.length === 0 && <EmptyState icon={<Target size={40} />} title={t('Add an exercise first')} detail={t('Create an exercise in a blueprint to set its goal.')} />}
      {weighted.map((exercise) => {
        const best = Math.max(0, ...history.map((stored) => topWeights(stored).get(exercise.id) ?? 0))
        const goal = exercise.goal_weight_kg
        return (
          <button key={exercise.id} type="button" className={styles.goal} onClick={() => setEditing(exercise)} data-testid={`goal-${exercise.name}`}>
            <span className={styles.goalTop}>
              <strong>{exercise.name}</strong>
              <Target size={18} aria-hidden="true" />
            </span>
            {goal != null ? (
              <>
                <GoalBar weight={best} goal={goal} label={t('{0} goal progress', [exercise.name])} />
                <small>
                  {load(best)} / {load(goal)} · {t(best >= goal ? 'Goal reached' : 'Keep building')}
                </small>
              </>
            ) : (
              <small>{t('Set a goal')}</small>
            )}
          </button>
        )
      })}
      <GoalEditor exercise={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
