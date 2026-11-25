import { ChevronDown, Ellipsis, Plus, Timer } from 'lucide-react'
import { Fragment, useState, type RefObject } from 'react'
import type { SupersetGroup } from '../../data/types'
import { targetLabel } from '../../domain/guidance'
import { needsReps, quantityLabel, supportsWeightComparisons } from '../../domain/measurement'
import type { ExerciseRows } from '../../domain/sets'
import { useT } from '../../i18n'
import { ConfirmDialog } from '../../ui/Sheet'
import { Menu, SelectRow } from '../../ui/controls'
import { supersetOptions } from '../blueprints/BlueprintDetailScreen'
import type { WorkoutContext } from './engine'
import * as engine from './engine'
import { previousFor, type History, type Session } from './session'
import { setViewProps, runEngine } from './setActions'
import { SetRow, type SetRowHandle } from './SetRow'
import styles from './workout.module.css'
import { LearningTip } from '../onboarding/LearningTip'
import { updateOnboarding, useOnboarding } from '../onboarding/state'

interface Props {
  group: ExerciseRows
  session: Session
  history: History
  context: WorkoutContext
  isFirst: boolean
  isLast: boolean
  rowRefs: RefObject<Map<string, SetRowHandle>>
  onError: (message: string, values?: string[]) => void
  onComplete: (setID: string) => void | Promise<unknown>
  onRemoveSet: (setID: string) => void
  onReplace: () => void
  onEnter: (setID: string) => void
  onAddSet: () => void
}

const restChoices = [30, 45, 60, 90, 120, 180, 240, 300, 600]

/** One exercise of the active workout: header, set rows, "Add Set" and "Exercise options". */
export function ExerciseSection({ group, session, history, context, isFirst, isLast, rowRefs, onError, onComplete, onRemoveSet, onReplace, onEnter, onAddSet }: Props) {
  const { t } = useT()
  const { exercise, rows } = group
  const tips = useOnboarding()
  const firstPrevious = session.rows.find((row) => previousFor(row, session, history) !== undefined)?.set.id
  const [options, setOptions] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const workoutID = session.workout.id
  const guidance = exercise.guidance
  const target = guidance ? targetLabel(guidance, t) : null
  const run = (action: Promise<unknown>) => runEngine(onError, action)
  const showReps = needsReps(exercise.measurement, context.trackReps)
  const nextInGroup = exercise.superset_group
    ? session.rows.find((row) => !row.set.is_completed && !row.set.is_skipped && row.exercise.superset_group === exercise.superset_group)
    : undefined

  return (
    <section className={styles.exercise} aria-labelledby={`exercise-${exercise.id}`}>
      <h2 id={`exercise-${exercise.id}`} className={styles.exerciseTitle}>
        {exercise.exercise_name}
      </h2>
      {rows.length === 0 && <p className={styles.muted}>{t('No sets. Add a set to continue.')}</p>}
      <div className={`${styles.columns} ${showReps ? '' : styles.withoutReps}`} aria-hidden="true">
        <span>{t('Set')}</span>
        <span>{t(quantityLabel(exercise.measurement))}</span>
        {showReps && <span>{t('Reps')}</span>}
        <span>{t('Done')}</span>
      </div>
      {rows.map((row) => (
        <Fragment key={row.set.id}>
          {tips && !tips.firstSetTipDone && session.rows[0]?.set.id === row.set.id && (
            <LearningTip text="Enter what you did. Tap the checkmark to complete the set." onDismiss={() => updateOnboarding({ firstSetTipDone: true })} testID="firstSetTip" />
          )}
          {tips && !tips.previousValuesTipDone && firstPrevious === row.set.id && (
            <LearningTip text="These were your last values. Use them or adjust them." onDismiss={() => updateOnboarding({ previousValuesTipDone: true })} testID="previousValuesTip" />
          )}
          <SetRow
            ref={(handle) => {
              if (handle) rowRefs.current?.set(row.set.id, handle)
              else rowRefs.current?.delete(row.set.id)
            }}
            {...setViewProps(row, { session, history, context, onError, onComplete, onRemoveSet, onEnter })}
          />
        </Fragment>
      ))}
      <button type="button" className={styles.addSet} onClick={onAddSet} data-testid={`addSet-${exercise.exercise_name}`}>
        <Plus size={18} aria-hidden="true" /> {t('Add Set')}
      </button>
      <button type="button" className={styles.disclosure} aria-expanded={options} onClick={() => setOptions(!options)}>
        {t('Exercise options')} <ChevronDown size={16} className={options ? styles.rotated : ''} aria-hidden="true" />
      </button>
      {options && (
        <div className={styles.options}>
          {target && <p className={styles.target}>{target}</p>}
          {guidance?.notes && <p>{guidance.notes}</p>}
          {guidance && guidance.progression !== 'Not selected' && <p className={styles.muted}>{t('Preference: {0} · no automatic adjustments', [t(guidance.progression)])}</p>}
          <p className={styles.muted}>{t(exercise.measurement)}</p>
          <SelectRow<SupersetGroup | ''>
            label={t('Superset')}
            value={exercise.superset_group ?? ''}
            options={supersetOptions(t)}
            onChange={(value) => run(engine.setSuperset(workoutID, exercise.id, value === '' ? null : value, context))}
          />
          {exercise.superset_group && (
            <>
              <p className={styles.muted}>{t('Group {0}: alternate working sets in exercise order. Rest after each round; warm-ups are separate.', [exercise.superset_group])}</p>
              {nextInGroup && <p>{t('Next: {0} · set {1}', [nextInGroup.exercise.exercise_name, nextInGroup.set.set_index])}</p>}
            </>
          )}
          {!supportsWeightComparisons(exercise.measurement) && (
            <p className={styles.muted}>{t('Baseline only: these results are retained with their units. Load-based trends, PRs and improvement XP are not supported for this type.')}</p>
          )}
          {!session.workout.is_retrospective && (
            <>
              <SelectRow
                label={t('Rest default: {0}s{1}', [exercise.rest_seconds ?? context.globalRestSeconds, exercise.rest_seconds === null ? t(' · global') : ''])}
                value={exercise.rest_seconds === null ? '' : String(exercise.rest_seconds)}
                options={[
                  { value: '', label: t('Use global default ({0} seconds)', [context.globalRestSeconds]) },
                  ...restChoices.map((value) => ({ value: String(value), label: t('{0} seconds', [value]) })),
                ]}
                onChange={(value) => run(engine.setRestDefault(exercise.id, value === '' ? null : Number(value)))}
              />
              <p className={styles.muted}>{t('Changes rest for this session only. Your routine stays unchanged.')}</p>
              <button type="button" className={styles.linkButton} onClick={() => run(engine.startRest(workoutID, exercise, context))}>
                <Timer size={16} aria-hidden="true" /> {t('Start rest')}
              </button>
            </>
          )}
          <Menu
            label={t('Edit exercise')}
            icon={
              <span className={styles.linkButton}>
                <Ellipsis size={16} aria-hidden="true" /> {t('Edit exercise')}
              </span>
            }
            items={[
              { label: t('Replace exercise'), onSelect: () => setConfirmReplace(true) },
              { label: t('Move up'), disabled: isFirst, onSelect: () => run(engine.moveExercise(workoutID, exercise.id, -1, context)) },
              { label: t('Move down'), disabled: isLast, onSelect: () => run(engine.moveExercise(workoutID, exercise.id, 1, context)) },
              { label: t('Remove exercise'), role: 'destructive', onSelect: () => setConfirmRemove(true) },
            ]}
          />
        </div>
      )}
      <ConfirmDialog
        open={confirmRemove}
        title={t('Remove {0}?', [exercise.exercise_name])}
        message={t('Its sets will not count. Undo edit restores the exercise, results and position.')}
        onDismiss={() => setConfirmRemove(false)}
        actions={[
          { label: t('Remove exercise and results'), role: 'destructive', onSelect: () => { setConfirmRemove(false); void run(engine.removeExercise(workoutID, exercise.id, context)) } },
          { label: t('Cancel'), role: 'cancel', onSelect: () => setConfirmRemove(false) },
        ]}
      />
      <ConfirmDialog
        open={confirmReplace}
        title={t('Replace {0}?', [exercise.exercise_name])}
        message={t('Completed sets keep their original movement. Unfinished sets are skipped after you choose a replacement.')}
        onDismiss={() => setConfirmReplace(false)}
        actions={[
          { label: t('Keep results and add replacement'), onSelect: () => { setConfirmReplace(false); onReplace() } },
          { label: t('Cancel'), role: 'cancel', onSelect: () => setConfirmReplace(false) },
        ]}
      />
    </section>
  )
}
