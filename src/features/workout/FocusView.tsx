import { Check, ChevronDown, ChevronUp, Ellipsis } from 'lucide-react'
import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { quantityLabel } from '../../domain/measurement'
import type { Row } from '../../domain/sets'
import { useT } from '../../i18n'
import { Menu } from '../../ui/controls'
import type { WorkoutContext } from './engine'
import { currentSetIndex, indexAtScroll, nextOpenIndex } from './focus'
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
  /** The rest bar is fixed at the bottom; the cards stop above it. */
  restBar: boolean
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
export function FocusView({ session, history, context, rowRefs, recordOpen, restBar, onError, onComplete, onRemoveSet, onShowFull }: Props) {
  const { t } = useT()
  const rows = session.rows
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(() => currentSetIndex(rows))
  const activeRef = useRef(active)
  activeRef.current = active
  const [advanceFrom, setAdvanceFrom] = useState<string | null>(null)
  const afterNotice = useRef<string | null>(null)

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
    <div className={`${styles.focusView} ${restBar ? styles.withRest : ''}`} data-testid="focusView">
      <div className={styles.focusNav}>
        <button type="button" aria-label={t('Previous set')} disabled={active <= 0} onClick={() => scrollToIndex(active - 1, true)} data-testid="focusPrevious">
          <ChevronUp size={22} aria-hidden="true" />
        </button>
        <div className={styles.focusSegments} aria-hidden="true">
          {rows.map((row, index) => (
            <span
              key={row.set.id}
              className={`${styles.focusSegment} ${row.set.is_completed ? styles.segmentDone : ''} ${row.set.is_skipped ? styles.segmentSkipped : ''} ${index === active ? styles.segmentActive : ''}`}
            />
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
}

/** One set as a big card: name, progress, last time, large inputs and a big check button. */
const FocusCard = forwardRef<SetRowHandle, CardProps>(function FocusCard(props, handle) {
  const { t } = useT()
  const inputs = useSetInputs(props, handle)
  const { set, exercise, badge, skipped } = inputs
  const { index, total, following } = props
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
        <div>
          <h2 id={`focus-title-${set.id}`} className={styles.focusTitle}>
            {exercise.exercise_name}
          </h2>
          <p className={styles.focusProgress}>{t('Set {0} of {1}', [index + 1, total])}</p>
        </div>
        {(inputs.comparison !== null || (props.previous && !skipped && !set.is_completed)) && (
          <div className={styles.focusLast}>
            {inputs.comparison !== null && <p data-testid={`previous-${set.set_index}`}>{inputs.comparison}</p>}
            {props.previous && !skipped && !set.is_completed && (
              <button type="button" className={styles.useLast} onClick={props.onUseLast} data-testid={`usePrevious-${set.set_index}`}>
                {t('Use last')}
              </button>
            )}
          </div>
        )}
        <div className={styles.focusInputs}>
          <div className={styles.focusField}>
            <span aria-hidden="true">
              {t(quantityLabel(exercise.measurement))} · {inputs.quantityUnit}
            </span>
            <input className={styles.focusInput} {...inputs.quantityInput} />
          </div>
          {inputs.showReps && (
            <div className={styles.focusField}>
              <span aria-hidden="true">{t('Reps')}</span>
              <input className={styles.focusInput} {...inputs.repsInput} />
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
