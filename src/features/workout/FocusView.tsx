import { Check, ChevronDown, ChevronUp, Ellipsis, Minus, Plus } from 'lucide-react'
import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { formatNumber, quantityLabel } from '../../domain/measurement'
import type { Row } from '../../domain/sets'
import { useT } from '../../i18n'
import { Menu } from '../../ui/controls'
import type { WorkoutContext } from './engine'
import { currentSetIndex, indexAtScroll, nextOpenIndex, segmentGroups } from './focus'
import { RestPanel, useRestTimer, type RestTimer } from './RestTimerBar'
import type { History, Session } from './session'
import { setViewProps } from './setActions'
import { useSetInputs, type SetRowHandle, type SetViewProps } from './useSetInputs'
import styles from './workout.module.css'

/** What happened when a set was toggled: finished, finished with a record notice, or nothing to follow up. */
export type CompletionOutcome = 'done' | 'record' | 'none'

interface Props {
  session: Session
  history: History
  context: WorkoutContext
  rowRefs: RefObject<Map<string, SetRowHandle>>
  /** True while the personal-record notice is on screen; the view advances once it is dismissed. */
  recordOpen: boolean
  /** False for a past workout: no rest timer. */
  restTimer: boolean
  onNotifications: () => void
  onError: (message: string, values?: string[]) => void
  onComplete: (setID: string) => Promise<CompletionOutcome>
  onRemoveSet: (setID: string) => void
  onShowFull: () => void
}

const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The minimal workout view: one big card per set in a vertical scroll-snap list, like a smart
 * stack. Swiping (or the arrow buttons) moves between sets; completing a set scrolls on to the
 * next unfinished one. Only one view (this or the full list) is mounted at a time.
 */
export function FocusView({ session, history, context, rowRefs, recordOpen, restTimer, onNotifications, onError, onComplete, onRemoveSet, onShowFull }: Props) {
  const { t } = useT()
  const rows = session.rows
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(() => currentSetIndex(rows))
  const activeRef = useRef(active)
  activeRef.current = active
  const [advanceFrom, setAdvanceFrom] = useState<string | null>(null)
  const afterNotice = useRef<string | null>(null)
  const rest = useRestTimer(session.workout)

  const scrollToIndex = (index: number, smooth: boolean) => {
    const element = scroller.current
    if (!element) return
    element.scrollTo({ top: index * element.clientHeight, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' })
  }

  // Open on the current set, and stay on the same card when the screen changes size.
  useLayoutEffect(() => {
    scrollToIndex(activeRef.current, false)
    const element = scroller.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => scrollToIndex(activeRef.current, false))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Keep the position valid when sets are removed.
  const count = rows.length
  useEffect(() => {
    if (count > 0 && activeRef.current > count - 1) scrollToIndex(count - 1, false)
  }, [count])

  // A completed set moves the view to the next unfinished one, once the saved state shows it.
  useEffect(() => {
    if (!advanceFrom) return
    const from = rows.findIndex((row) => row.set.id === advanceFrom)
    const source = rows[from]
    if (!source) return setAdvanceFrom(null)
    if (!source.set.is_completed) return
    setAdvanceFrom(null)
    const target = nextOpenIndex(rows, from)
    if (target === -1) return
    // Closing the keyboard first keeps focus from staying on a card that scrolls away.
    ;(document.activeElement as HTMLElement | null)?.blur()
    scrollToIndex(target, true)
  }, [advanceFrom, rows])

  // After a personal-record notice, advance once it is dismissed.
  useEffect(() => {
    if (recordOpen || !afterNotice.current) return
    setAdvanceFrom(afterNotice.current)
    afterNotice.current = null
  }, [recordOpen])

  const complete = async (setID: string) => {
    const outcome = await onComplete(setID)
    if (outcome === 'done') setAdvanceFrom(setID)
    if (outcome === 'record') afterNotice.current = setID
  }
  const blurOnEnter = () => (document.activeElement as HTMLElement | null)?.blur()

  // Keyboard on a computer: ↑/↓ (or K/J) change the card, Enter completes it. Typing in a field is left alone.
  const keyState = useRef({ active, rows, complete })
  keyState.current = { active, rows, complete }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (target && (target.closest('input, textarea, select, [role="menu"], [role="dialog"], [role="alertdialog"]') || target.isContentEditable)) return
      const { active: index, rows: current, complete: completeSet } = keyState.current
      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault()
        scrollToIndex(Math.min(current.length - 1, index + 1), true)
      } else if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault()
        scrollToIndex(Math.max(0, index - 1), true)
      } else if (event.key === 'Enter' && (!target || target === document.body)) {
        const row = current[index]
        if (!row || row.set.is_skipped) return
        event.preventDefault()
        void rowRefs.current?.get(row.set.id)?.flush().then(() => completeSet(row.set.id))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (rows.length === 0) {
    return (
      <div className={styles.focusView}>
        <div className={styles.focusEmpty}>
          <p>{t('No sets. Add a set to continue.')}</p>
          <button type="button" className={styles.linkButton} onClick={onShowFull}>
            {t('Show all sets')}
          </button>
        </div>
      </div>
    )
  }

  const completed = rows.filter(({ set }) => set.is_completed).length
  return (
    <div className={styles.focusView} data-testid="focusView">
      <div className={styles.focusNav}>
        <button type="button" aria-label={t('Previous set')} disabled={active <= 0} onClick={() => scrollToIndex(active - 1, true)} data-testid="focusPrevious">
          <ChevronUp size={22} aria-hidden="true" />
        </button>
        <div className={styles.focusSegments} aria-hidden="true">
          {segmentGroups(rows).map((group) => (
            <span key={group.key} className={styles.segmentGroup} style={{ flexGrow: group.indices.length }}>
              {group.indices.map((index) => {
                const row = rows[index]
                if (!row) return null
                return (
                  <span
                    key={row.set.id}
                    className={`${styles.focusSegment} ${row.set.is_completed ? styles.segmentDone : ''} ${row.set.is_skipped ? styles.segmentSkipped : ''} ${index === active ? styles.segmentActive : ''}`}
                  />
                )
              })}
            </span>
          ))}
        </div>
        <span className={styles.focusCount} data-testid="completedSetCount">
          {completed} / {rows.length}
        </span>
        <button type="button" aria-label={t('Next set')} disabled={active >= rows.length - 1} onClick={() => scrollToIndex(active + 1, true)} data-testid="focusNext">
          <ChevronDown size={22} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.focusFrame}>
        <div
          ref={scroller}
          className={styles.focusScroller}
          role="region"
          aria-label={t('Set cards')}
          onScroll={(event) => {
            const element = event.currentTarget
            setActive(indexAtScroll(element.scrollTop, element.clientHeight, rows.length))
          }}
          data-testid="focusScroller"
        >
          {rows.map((row, index) => (
            <FocusCard
              key={row.set.id}
              ref={(handle) => {
                if (handle) rowRefs.current?.set(row.set.id, handle)
                else rowRefs.current?.delete(row.set.id)
              }}
              {...setViewProps(row, { session, history, context, onError, onComplete: complete, onRemoveSet, onEnter: blurOnEnter })}
              index={index}
              total={rows.length}
              active={index === active}
              following={rows[index + 1]}
              rest={restTimer && index === active ? rest : null}
              onNotifications={onNotifications}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface CardProps extends SetViewProps {
  index: number
  total: number
  active: boolean
  following: Row | undefined
  /** The running rest, shown on the card on screen only. */
  rest: RestTimer | null
  onNotifications: () => void
}

/** One set as a big card: name, progress, last time, large inputs and a big check button. */
const FocusCard = forwardRef<SetRowHandle, CardProps>(function FocusCard(props, handle) {
  const { t, locale } = useT()
  const inputs = useSetInputs(props, handle)
  const { set, exercise, badge, skipped } = inputs
  const { index, total, following } = props
  const step = formatNumber(inputs.quantityStep, locale)
  const editable = !skipped && !set.is_completed
  return (
    <div className={styles.focusSlide} data-testid="focusSlide" data-index={index} data-active={props.active}>
      <article
        className={`${styles.focusCard} ${set.is_completed ? styles.focusDone : ''} ${skipped ? styles.focusSkipped : ''}`}
        aria-labelledby={`focus-title-${set.id}`}
        data-testid={`set-${exercise.exercise_name}-${set.set_index}`}
      >
        <div className={styles.setHead}>
          <span className={styles.setType}>
            <span role="img" className={`${styles.badge} ${styles[badge.kind]}`} aria-label={inputs.badgeText} title={inputs.badgeText} data-testid={`setBadge-${set.set_index}`}>
              {badge.text}
            </span>
            {badge.kind === 'superset' ? t('Working set {0}', [badge.number ?? 1]) : inputs.kindLabel} {skipped && <small>{t('Skip')}</small>}
          </span>
          <Menu label={inputs.kindLabel} icon={<Ellipsis size={18} />} items={inputs.menuItems} />
        </div>
        {props.rest && <RestPanel workoutID={set.workout_id} rest={props.rest} onNotifications={props.onNotifications} />}
        <div>
          <h2 id={`focus-title-${set.id}`} className={styles.focusTitle}>
            {exercise.exercise_name}
          </h2>
          <p className={styles.focusProgress}>{t('Set {0} of {1}', [index + 1, total])}</p>
        </div>
        {inputs.comparison !== null && (
          <div className={styles.focusLast}>
            <p data-testid={`previous-${set.set_index}`}>{inputs.comparison}</p>
          </div>
        )}
        <div className={styles.focusInputs}>
          <div className={styles.focusField}>
            <span aria-hidden="true">
              {t(quantityLabel(exercise.measurement))} · {inputs.quantityUnit}
            </span>
            <input className={styles.focusInput} {...inputs.quantityInput} />
            {editable && (
              <div className={styles.stepper}>
                <button type="button" aria-label={t('{0} less', [`${step} ${inputs.quantityUnit}`])} onClick={() => inputs.stepQuantity(-1)} data-testid={`loadMinus-${set.set_index}`}>
                  <Minus size={16} aria-hidden="true" /> {step}
                </button>
                <button type="button" aria-label={t('{0} more', [`${step} ${inputs.quantityUnit}`])} onClick={() => inputs.stepQuantity(1)} data-testid={`loadPlus-${set.set_index}`}>
                  <Plus size={16} aria-hidden="true" /> {step}
                </button>
              </div>
            )}
          </div>
          {inputs.showReps && (
            <div className={styles.focusField}>
              <span aria-hidden="true">{t('Reps')}</span>
              <input className={styles.focusInput} {...inputs.repsInput} />
              {editable && (
                <div className={styles.stepper}>
                  <button type="button" aria-label={t('One rep less')} onClick={() => inputs.stepReps(-1)} data-testid={`repsMinus-${set.set_index}`}>
                    <Minus size={16} aria-hidden="true" /> 1
                  </button>
                  <button type="button" aria-label={t('One rep more')} onClick={() => inputs.stepReps(1)} data-testid={`repsPlus-${set.set_index}`}>
                    <Plus size={16} aria-hidden="true" /> 1
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <button type="button" className={styles.focusCheck} disabled={skipped} aria-pressed={set.is_completed} data-testid={`complete-${set.set_index}`} onClick={() => void inputs.complete()}>
          <Check size={30} aria-hidden="true" /> {t('Complete set')}
        </button>
        {following && (
          <p className={styles.focusNext}>{t('Next: {0} · set {1}', [following.exercise.exercise_name, following.set.set_index])}</p>
        )}
      </article>
    </div>
  )
})
