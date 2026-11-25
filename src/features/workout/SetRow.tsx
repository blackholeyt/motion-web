import { CheckCircle2, CheckSquare, Ellipsis, Square } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react'
import { needsReps, quantityLabel } from '../../domain/measurement'
import { comparisonText, quantityText, repsText, setUnit, type HistoricalSet, type Row, type SetBadge } from '../../domain/sets'
import { useT, type Translate } from '../../i18n'
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
  badge: SetBadge
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

const SAVE_DELAY_MS = 300

/** WorkoutSetRow.swift. Inputs keep local text and save 300 ms after typing, like saveDraft. */
export const SetRow = forwardRef<SetRowHandle, Props>(function SetRow(props, handle) {
  const { row, previous, context, badge } = props
  const { t } = useT()
  const { set, exercise } = row
  const measurement = exercise.measurement
  const skipped = set.is_skipped
  const showReps = needsReps(measurement, context.trackReps)
  const unit = setUnit(set, context.unit)
  const quantityUnit = measurement === 'Duration' ? 'sec' : unit

  const storedQuantity = quantityText(set, measurement, context.unit, context.locale)
  const storedReps = repsText(set)
  const [quantity, setQuantity] = useState(storedQuantity)
  const [reps, setReps] = useState(storedReps)

  const focused = useRef(false)
  const pending = useRef<number | null>(null)
  const quantityRef = useRef<HTMLInputElement>(null)
  const repsRef = useRef<HTMLInputElement>(null)
  // Always the newest values, also for the save that runs when the row unmounts.
  const latest = useRef({ quantity, reps, storedQuantity, storedReps, onInput: props.onInput })
  latest.current = { quantity, reps, storedQuantity, storedReps, onInput: props.onInput }

  // External changes (undo, "Use last", unit switch) replace the text unless the user is typing.
  useEffect(() => {
    if (!focused.current && pending.current === null) {
      setQuantity(storedQuantity)
      setReps(storedReps)
    }
  }, [storedQuantity, storedReps])

  const cancelPendingSave = () => {
    if (pending.current === null) return
    window.clearTimeout(pending.current)
    pending.current = null
  }
  const flush = async () => {
    cancelPendingSave()
    const current = latest.current
    if (current.quantity !== current.storedQuantity || current.reps !== current.storedReps) {
      await current.onInput(current.quantity, current.reps)
    }
  }
  const scheduleSave = (nextQuantity: string, nextReps: string) => {
    cancelPendingSave()
    pending.current = window.setTimeout(() => {
      pending.current = null
      void latest.current.onInput(nextQuantity, nextReps)
    }, SAVE_DELAY_MS)
  }

  useImperativeHandle(handle, () => ({ flush, focusQuantity: () => quantityRef.current?.focus() }))
  useEffect(() => () => void flush(), []) // Save on unmount.

  // Shared by both inputs: track typing and save when the field is left.
  const typingEvents = {
    onFocus: () => (focused.current = true),
    onBlur: () => {
      focused.current = false
      void flush()
    },
  }
  const onEnterKey = (action: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    action()
  }

  const menuItems = setMenu(t, { completed: set.is_completed, skipped, warmUp: set.is_warm_up, hasPrevious: !!previous, canCopyPrevious: props.canCopyPrevious, hasValues: !!(quantity || reps) }, props)
  const kindLabel = t(set.is_warm_up ? 'Warm-up set' : 'Working set')

  return (
    <div className={`${styles.setRow} ${set.is_completed ? styles.completed : ''}`} data-testid={`set-${exercise.exercise_name}-${set.set_index}`}>
      {(previous || set.is_warm_up) && (
        <p className={styles.comparison} data-testid={`previous-${set.set_index}`}>
          {comparisonText(set, measurement, previous, unit, context.trackReps, context.locale, t)}
        </p>
      )}
      <div className={styles.setHead}>
        <span className={styles.setType}>
          <span role="img" className={`${styles.badge} ${styles[badge.kind]}`} aria-label={badgeLabel(t, badge)} title={badgeLabel(t, badge)} data-testid={`setBadge-${set.set_index}`}>
            {badge.text}
          </span>
          {/* A superset badge names the slot (A1), so the set number moves into the label. */}
          {badge.kind === 'superset' ? t('Working set {0}', [badge.number ?? 1]) : kindLabel} {skipped && <small>{t('Skip')}</small>}
        </span>
        <Menu label={kindLabel} icon={<Ellipsis size={18} />} items={menuItems} />
      </div>
      <div className={styles.inputs}>
        <input
          ref={quantityRef}
          className={styles.input}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint={showReps ? 'next' : 'done'}
          value={quantity}
          disabled={skipped}
          placeholder={measurement === 'Bodyweight reps' ? t('0 (optional)') : quantityUnit}
          aria-label={t('Set {0}, {1} in {2}', [set.set_index, t(quantityLabel(measurement)), quantityUnit])}
          data-testid={`setLoad-${set.set_index}`}
          {...typingEvents}
          onChange={(event) => {
            setQuantity(event.target.value)
            scheduleSave(event.target.value, reps)
          }}
          onKeyDown={onEnterKey(() => (showReps ? repsRef.current?.focus() : props.onEnter('quantity')))}
        />
        <span className={styles.unit}>{quantityUnit}</span>
        {showReps && (
          <input
            ref={repsRef}
            className={styles.input}
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="next"
            value={reps}
            disabled={skipped}
            placeholder={t('Reps')}
            aria-label={t('Set {0}, repetitions', [set.set_index])}
            data-testid={`setReps-${set.set_index}`}
            {...typingEvents}
            onChange={(event) => {
              setReps(event.target.value)
              scheduleSave(quantity, event.target.value)
            }}
            onKeyDown={onEnterKey(() => props.onEnter('reps'))}
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

function badgeLabel(t: Translate, badge: SetBadge): string {
  if (badge.kind === 'warmUp') return t('Warm-up set')
  if (badge.kind === 'superset') return t('Superset {0}, working set {1}', [badge.text, badge.number ?? 1])
  return t('Working set {0}', [badge.number ?? 1])
}

/** The "…" menu of a set. Completed sets can only be undone; skip and remove are always offered. */
function setMenu(
  t: Translate,
  state: { completed: boolean; skipped: boolean; warmUp: boolean; hasPrevious: boolean; canCopyPrevious: boolean; hasValues: boolean },
  actions: Pick<Props, 'onComplete' | 'onUseLast' | 'onCopyPrevious' | 'onClear' | 'onClassify' | 'onSkip' | 'onRemove'>,
): MenuItem[] {
  const items: MenuItem[] = []
  if (state.completed) {
    items.push({ label: t('Undo completion'), onSelect: actions.onComplete })
  } else if (!state.skipped) {
    if (state.hasPrevious) items.push({ label: t('Use last'), onSelect: actions.onUseLast })
    if (state.canCopyPrevious) items.push({ label: t('Copy previous set'), onSelect: actions.onCopyPrevious })
    if (state.hasValues) items.push({ label: t('Clear'), onSelect: actions.onClear })
    items.push({ label: t(state.warmUp ? 'Make working set' : 'Make warm-up'), onSelect: actions.onClassify })
  }
  items.push({ label: t(state.skipped ? 'Unskip set' : 'Skip set'), onSelect: actions.onSkip })
  items.push({ label: t('Remove set'), role: 'destructive', onSelect: actions.onRemove })
  return items
}
