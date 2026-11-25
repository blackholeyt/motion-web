import { useEffect, useImperativeHandle, useRef, useState, type ChangeEvent, type ForwardedRef, type InputHTMLAttributes, type KeyboardEvent, type RefObject } from 'react'
import { needsReps, quantityLabel } from '../../domain/measurement'
import { comparisonText, quantityText, repsText, setUnit, type HistoricalSet, type Row, type SetBadge } from '../../domain/sets'
import { useT, type Translate } from '../../i18n'
import type { MenuItem } from '../../ui/controls'
import type { WorkoutContext } from './engine'

export interface SetRowHandle {
  /** Writes pending keystrokes before an action that depends on them. */
  flush: () => Promise<void>
  focusQuantity: () => void
}

/** What a set can do. The full view and the focus view call the same engine functions through these. */
export interface SetActions {
  onInput: (quantity: string, reps: string) => Promise<void>
  onComplete: () => void | Promise<unknown>
  onUseLast: () => void
  onCopyPrevious: () => void
  onClear: () => void
  onClassify: () => void
  onSkip: () => void
  onRemove: () => void
  onEnter: (field: 'quantity' | 'reps') => void
}

/** Everything a set editor (row or card) needs. */
export interface SetViewProps extends SetActions {
  row: Row
  badge: SetBadge
  previous: HistoricalSet | undefined
  canCopyPrevious: boolean
  context: WorkoutContext
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { ref: RefObject<HTMLInputElement | null>; 'data-testid': string }

export const SAVE_DELAY_MS = 300

/**
 * Input state of one set, shared by SetRow and the focus card. Inputs keep local text and save
 * 300 ms after typing, like saveDraft; external changes (undo, "Use last") replace the text
 * unless the user is typing.
 */
export function useSetInputs(props: SetViewProps, handle: ForwardedRef<SetRowHandle>) {
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
    onFocus: () => void (focused.current = true),
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

  const kindLabel = t(set.is_warm_up ? 'Warm-up set' : 'Working set')
  const menuItems = setMenu(t, { completed: set.is_completed, skipped, warmUp: set.is_warm_up, hasPrevious: !!previous, canCopyPrevious: props.canCopyPrevious, hasValues: !!(quantity || reps) }, props)
  const hasComparison = !!(previous || set.is_warm_up)

  const quantityInput: FieldProps = {
    ref: quantityRef,
    inputMode: 'decimal',
    autoComplete: 'off',
    enterKeyHint: showReps ? 'next' : 'done',
    value: quantity,
    disabled: skipped,
    placeholder: measurement === 'Bodyweight reps' ? t('0 (optional)') : quantityUnit,
    'aria-label': t('Set {0}, {1} in {2}', [set.set_index, t(quantityLabel(measurement)), quantityUnit]),
    'data-testid': `setLoad-${set.set_index}`,
    ...typingEvents,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setQuantity(event.target.value)
      scheduleSave(event.target.value, reps)
    },
    onKeyDown: onEnterKey(() => (showReps ? repsRef.current?.focus() : props.onEnter('quantity'))),
  }
  const repsInput: FieldProps = {
    ref: repsRef,
    inputMode: 'numeric',
    autoComplete: 'off',
    enterKeyHint: 'next',
    value: reps,
    disabled: skipped,
    placeholder: t('Reps'),
    'aria-label': t('Set {0}, repetitions', [set.set_index]),
    'data-testid': `setReps-${set.set_index}`,
    ...typingEvents,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setReps(event.target.value)
      scheduleSave(quantity, event.target.value)
    },
    onKeyDown: onEnterKey(() => props.onEnter('reps')),
  }

  return {
    set,
    exercise,
    badge,
    skipped,
    showReps,
    unit,
    quantityUnit,
    kindLabel,
    badgeText: badgeLabel(t, badge),
    menuItems,
    quantityInput,
    repsInput,
    comparison: hasComparison ? comparisonText(set, measurement, previous, unit, context.trackReps, context.locale, t) : null,
    /** Writes pending keystrokes first, then toggles completion. Resolves when the toggle is done. */
    complete: async () => {
      await flush()
      await props.onComplete()
    },
  }
}

export function badgeLabel(t: Translate, badge: SetBadge): string {
  if (badge.kind === 'warmUp') return t('Warm-up set')
  if (badge.kind === 'superset') return t('Superset {0}, working set {1}', [badge.text, badge.number ?? 1])
  return t('Working set {0}', [badge.number ?? 1])
}

/** The "…" menu of a set. Completed sets can only be undone; skip and remove are always offered. */
function setMenu(
  t: Translate,
  state: { completed: boolean; skipped: boolean; warmUp: boolean; hasPrevious: boolean; canCopyPrevious: boolean; hasValues: boolean },
  actions: Pick<SetActions, 'onComplete' | 'onUseLast' | 'onCopyPrevious' | 'onClear' | 'onClassify' | 'onSkip' | 'onRemove'>,
): MenuItem[] {
  const items: MenuItem[] = []
  if (state.completed) {
    items.push({ label: t('Undo completion'), onSelect: () => void actions.onComplete() })
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
