import { CheckCircle2, CheckSquare, Ellipsis, Square } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { needsReps, quantityLabel } from '../../domain/measurement'
import { comparisonText, quantityText, repsText, setUnit, type HistoricalSet, type Row } from '../../domain/sets'
import { useT } from '../../i18n'
import { Menu, type MenuItem } from '../../ui/controls'
import type { WorkoutContext } from './engine'
import styles from './workout.module.css'

export interface SetRowHandle {
  /** Writes pending keystrokes before an action that depends on them. */
  flush: () => Promise<void>
  focusQuantity: () => void
}

interface Props {
  row: Row
  previous: HistoricalSet | undefined
  canCopyPrevious: boolean
  context: WorkoutContext
  onInput: (quantity: string, reps: string) => Promise<void>
  onComplete: () => void
  onUseLast: () => void
  onCopyPrevious: () => void
  onClear: () => void
  onClassify: () => void
  onSkip: () => void
  onRemove: () => void
  onEnter: (field: 'quantity' | 'reps') => void
}

/** WorkoutSetRow.swift. Inputs keep local text and save 300 ms after typing, like saveDraft. */
export const SetRow = forwardRef<SetRowHandle, Props>(function SetRow(props, handle) {
  const { row, previous, context } = props
  const { t } = useT()
  const { set, exercise } = row
  const measurement = exercise.measurement
  const unit = setUnit(set, context.unit)
  const storedQuantity = quantityText(set, measurement, context.unit, context.locale)
  const storedReps = repsText(set)
  const [quantity, setQuantity] = useState(storedQuantity)
  const [reps, setReps] = useState(storedReps)
  const focused = useRef(false)
  const pending = useRef<number | null>(null)
  const quantityRef = useRef<HTMLInputElement>(null)
  const repsRef = useRef<HTMLInputElement>(null)
  const latest = useRef({ quantity, reps })
  latest.current = { quantity, reps }

  // External changes (undo, "Use last", unit switch) replace the text unless the user is typing.
  useEffect(() => {
    if (!focused.current && pending.current === null) {
      setQuantity(storedQuantity)
      setReps(storedReps)
    }
  }, [storedQuantity, storedReps])

  const flush = async () => {
    if (pending.current !== null) {
      window.clearTimeout(pending.current)
      pending.current = null
    }
    if (latest.current.quantity !== storedQuantity || latest.current.reps !== storedReps) {
      await props.onInput(latest.current.quantity, latest.current.reps)
    }
  }
  useImperativeHandle(handle, () => ({ flush, focusQuantity: () => quantityRef.current?.focus() }))
  useEffect(() => () => void flush(), []) // Save on unmount.

  const schedule = (nextQuantity: string, nextReps: string) => {
    if (pending.current !== null) window.clearTimeout(pending.current)
    pending.current = window.setTimeout(() => {
      pending.current = null
      void props.onInput(nextQuantity, nextReps)
    }, 300)
  }

  const showReps = needsReps(measurement, context.trackReps)
  const skipped = set.is_skipped
  const menuItems: MenuItem[] = set.is_completed
    ? [{ label: t('Undo completion'), onSelect: props.onComplete }]
    : skipped
      ? []
      : [
          ...(previous ? [{ label: t('Use last'), onSelect: props.onUseLast }] : []),
          ...(props.canCopyPrevious ? [{ label: t('Copy previous set'), onSelect: props.onCopyPrevious }] : []),
          ...(quantity || reps ? [{ label: t('Clear'), onSelect: props.onClear }] : []),
          { label: t(set.is_warm_up ? 'Make working set' : 'Make warm-up'), onSelect: props.onClassify },
        ]
  menuItems.push({ label: t(skipped ? 'Unskip set' : 'Skip set'), onSelect: props.onSkip }, { label: t('Remove set'), role: 'destructive', onSelect: props.onRemove })

  const label = t(quantityLabel(measurement))
  const quantityUnit = measurement === 'Duration' ? 'sec' : unit
  return (
    <div className={`${styles.setRow} ${set.is_completed ? styles.completed : ''}`} data-testid={`set-${exercise.exercise_name}-${set.set_index}`}>
      {(previous || set.is_warm_up) && (
        <p className={styles.comparison} data-testid={`previous-${set.set_index}`}>
          {comparisonText(set, measurement, previous, unit, context.trackReps, context.locale, t)}
        </p>
      )}
      <div className={styles.setHead}>
        <span className={styles.setType}>
          {t(set.is_warm_up ? 'Warm-up set' : 'Working set')} {skipped && <small>{t('Skip')}</small>}
        </span>
        <Menu label={t(set.is_warm_up ? 'Warm-up set' : 'Working set')} icon={<Ellipsis size={18} />} items={menuItems} />
      </div>
      <div className={styles.inputs}>
        <input
          ref={quantityRef}
          className={styles.input}
          inputMode="decimal"
          enterKeyHint={showReps ? 'next' : 'done'}
          value={quantity}
          disabled={skipped}
          placeholder={measurement === 'Bodyweight reps' ? t('0 (optional)') : quantityUnit}
          aria-label={t('Set {0}, {1} in {2}', [set.set_index, label, quantityUnit])}
          data-testid={`setLoad-${set.set_index}`}
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false
            void flush()
          }}
          onChange={(event) => {
            setQuantity(event.target.value)
            schedule(event.target.value, reps)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (showReps) repsRef.current?.focus()
              else props.onEnter('quantity')
            }
          }}
        />
        <span className={styles.unit}>{quantityUnit}</span>
        {showReps && (
          <input
            ref={repsRef}
            className={styles.input}
            inputMode="numeric"
            enterKeyHint="next"
            value={reps}
            disabled={skipped}
            placeholder={t('Reps')}
            aria-label={t('Set {0}, repetitions', [set.set_index])}
            data-testid={`setReps-${set.set_index}`}
            onFocus={() => (focused.current = true)}
            onBlur={() => {
              focused.current = false
              void flush()
            }}
            onChange={(event) => {
              setReps(event.target.value)
              schedule(quantity, event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                props.onEnter('reps')
              }
            }}
          />
        )}
        <button
          type="button"
          className={styles.check}
          disabled={skipped}
          aria-label={t('Set {0} completion', [set.set_index])}
          aria-pressed={set.is_completed}
          data-testid={`complete-${set.set_index}`}
          onClick={async () => {
            await flush()
            props.onComplete()
          }}
        >
          {set.is_completed ? <CheckSquare size={28} /> : <Square size={28} />}
        </button>
      </div>
      {set.is_completed ? (
        <div className={styles.recorded}>
          <span>
            <CheckCircle2 size={14} aria-hidden="true" /> {t('Set recorded.')}
          </span>
          <button type="button" onClick={props.onComplete}>
            {t('Undo')}
          </button>
        </div>
      ) : (
        previous &&
        !skipped && (
          <button type="button" className={styles.useLast} onClick={props.onUseLast} data-testid={`usePrevious-${set.set_index}`}>
            {t('Use last')}
          </button>
        )
      )}
    </div>
  )
})
