import { CheckCircle2, CheckSquare, Ellipsis, Square } from 'lucide-react'
import { forwardRef } from 'react'
import { useT } from '../../i18n'
import { Menu } from '../../ui/controls'
import { useSetInputs, type SetRowHandle, type SetViewProps } from './useSetInputs'
import styles from './workout.module.css'

export type { SetRowHandle } from './useSetInputs'

/** WorkoutSetRow.swift: one set of the full view. */
export const SetRow = forwardRef<SetRowHandle, SetViewProps>(function SetRow(props, handle) {
  const { t } = useT()
  const inputs = useSetInputs(props, handle)
  const { set, exercise, badge, skipped } = inputs

  return (
    <div className={`${styles.setRow} ${set.is_completed ? styles.completed : ''}`} data-testid={`set-${exercise.exercise_name}-${set.set_index}`}>
      {inputs.comparison !== null && (
        <p className={styles.comparison} data-testid={`previous-${set.set_index}`}>
          {inputs.comparison}
        </p>
      )}
      <div className={styles.setHead}>
        <span className={styles.setType}>
          <span role="img" className={`${styles.badge} ${styles[badge.kind]}`} aria-label={inputs.badgeText} title={inputs.badgeText} data-testid={`setBadge-${set.set_index}`}>
            {badge.text}
          </span>
          {/* A superset badge names the slot (A1), so the set number moves into the label. */}
          {badge.kind === 'superset' ? t('Working set {0}', [badge.number ?? 1]) : inputs.kindLabel} {skipped && <small>{t('Skip')}</small>}
        </span>
        <Menu label={inputs.kindLabel} icon={<Ellipsis size={18} />} items={inputs.menuItems} />
      </div>
      <div className={styles.inputs}>
        <input className={styles.input} {...inputs.quantityInput} />
        <span className={styles.unit}>{inputs.quantityUnit}</span>
        {inputs.showReps && <input className={styles.input} {...inputs.repsInput} />}
        <button
          type="button"
          className={styles.check}
          disabled={skipped}
          aria-label={t('Set {0} completion', [set.set_index])}
          aria-pressed={set.is_completed}
          data-testid={`complete-${set.set_index}`}
          onClick={() => void inputs.complete()}
        >
          {set.is_completed ? <CheckSquare size={28} /> : <Square size={28} />}
        </button>
      </div>
      {set.is_completed ? (
        <div className={styles.recorded}>
          <span>
            <CheckCircle2 size={14} aria-hidden="true" /> {t('Set recorded.')}
          </span>
          <button type="button" onClick={() => void props.onComplete()}>
            {t('Undo')}
          </button>
        </div>
      ) : (
        props.previous &&
        !skipped && (
          <button type="button" className={styles.useLast} onClick={props.onUseLast} data-testid={`usePrevious-${set.set_index}`}>
            {t('Use last')}
          </button>
        )
      )}
    </div>
  )
})
