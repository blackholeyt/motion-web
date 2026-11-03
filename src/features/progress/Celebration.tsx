import { CalendarCheck, CheckCircle2, TrendingUp, Trophy } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { WeightUnit } from '../../data/types'
import { fromKilograms, loadLabel } from '../../domain/measurement'
import { progressFor, rewardDuration, rewardFrame, type SessionStats, type WorkoutRecap, type XPAward } from '../../domain/progress'
import type { TrainingWeek } from '../../domain/statistics'
import { useT, type Translate } from '../../i18n'
import { ContinueButton } from '../../ui/components'
import { prefersReducedMotion } from '../../ui/motion'
import { finishScreens, highlightsFor, visibleHighlights, type FinishScreen, type Highlight } from './finishScreens'
import { ProgressCard } from './ProgressCard'
import styles from './progress.module.css'

export interface FinishStat {
  label: string
  value: string
  detail?: string
}

export interface CelebrationProps {
  name: string
  stats: FinishStat[]
  /** Replaces the baseline note, e.g. for cardio. */
  note?: string
  /** Strength only: improvements, records and the 28-day consistency. */
  recap: WorkoutRecap | null
  award: XPAward | null
  totalXP: number
  weeks: TrainingWeek[]
  unit: WeightUnit
  onContinue: () => void
}

const swipeDistance = 50

/** "48 min" or "1 h 05 min". */
export function durationLabel(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

export function strengthStats(stats: SessionStats, unit: WeightUnit, t: Translate, locale: string): FinishStat[] {
  return [
    stats.durationSeconds !== null ? { label: t('Duration'), value: durationLabel(stats.durationSeconds) } : null,
    { label: t('Working sets'), value: String(stats.workingSets), detail: stats.warmUpSets > 0 ? t('+{0} warm-up', [stats.warmUpSets]) : undefined },
    stats.volumeKg > 0 ? { label: t('Volume'), value: `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(fromKilograms(unit, stats.volumeKg))} ${unit}` } : null,
    { label: t('Exercises'), value: String(stats.exerciseCount) },
  ].filter((stat): stat is FinishStat => stat !== null)
}

/**
 * WorkoutCelebrationView as a short sequence: summary, XP, highlights, week.
 * Screens without content are skipped; no screen scrolls, content is capped instead.
 */
export function Celebration(props: CelebrationProps) {
  const { onContinue } = props
  const { t } = useT()
  const screens = finishScreens(props)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const last = index === screens.length - 1
  const current = screens[index]!

  const go = (step: 1 | -1) => {
    const next = index + step
    if (next < 0 || next >= screens.length) return
    setDirection(step)
    setIndex(next)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as Element | null)?.closest?.('[role="dialog"]')) return
      if (event.key === 'ArrowRight') go(1)
      if (event.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const endSwipe = (event: PointerEvent) => {
    const from = swipe.current
    swipe.current = null
    if (!from) return
    const dx = event.clientX - from.x
    const dy = event.clientY - from.y
    if (Math.abs(dx) < swipeDistance || Math.abs(dx) < Math.abs(dy) * 1.5) return
    go(dx < 0 ? 1 : -1)
  }

  return (
    <div className={styles.finish} data-testid="celebration" data-screen={current}>
      <div className={styles.finishTop}>
        <div className={styles.dots} aria-hidden="true">
          {screens.map((screen, position) => (
            <span key={screen} className={position === index ? styles.dotActive : styles.dot} />
          ))}
        </div>
        <p className={styles.srOnly} aria-live="polite" data-testid="finishStep">
          {t('Screen {0} of {1}', [index + 1, screens.length])}
        </p>
        <button type="button" className={styles.skip} onClick={onContinue} hidden={last} data-testid="celebrationSkip">
          {t('Skip')}
        </button>
      </div>
      <div
        className={styles.finishBody}
        data-testid="finishScreen"
        style={{ '--from': `${direction * 28}px` } as CSSProperties}
        onPointerDown={(event) => (swipe.current = { x: event.clientX, y: event.clientY })}
        onPointerUp={endSwipe}
        onPointerCancel={() => (swipe.current = null)}
      >
        <div key={current} className={styles.finishScreen}>
          <Screen screen={current} {...props} />
        </div>
      </div>
      <div className={styles.finishBar}>
        <ContinueButton onClick={() => (last ? onContinue() : go(1))} data-testid={last ? 'celebrationContinue' : 'celebrationNext'}>
          {t(last ? 'Done' : 'Next')}
        </ContinueButton>
      </div>
    </div>
  )
}

function Screen({ screen, ...props }: CelebrationProps & { screen: FinishScreen }) {
  switch (screen) {
    case 'summary':
      return <SummaryScreen {...props} />
    case 'xp':
      return <XPReward name={props.name} award={props.award!} totalXP={props.totalXP} />
    case 'highlights':
      return <HighlightsScreen recap={props.recap!} unit={props.unit} />
    case 'week':
      return <WeekScreen weeks={props.weeks} consistencyDays={props.recap?.consistencyDays ?? null} />
  }
}

function SummaryScreen({ name, stats, note, recap }: CelebrationProps) {
  const { t } = useT()
  const baseline = recap?.comparableCount === null ? t('First recorded session: a baseline, not an improvement claim.') : null
  return (
    <>
      <header className={styles.headline}>
        <CheckCircle2 className={styles.doneIcon} aria-hidden="true" />
        <span className={styles.eyebrowAction}>{t('SESSION COMPLETE')}</span>
        <h1>{t('Session saved.')}</h1>
        <p className={styles.muted}>{t(name)}</p>
      </header>
      <dl className={styles.stats} data-testid="finishStats">
        {stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <dt>{stat.label}</dt>
            <dd>
              {stat.value}
              {stat.detail && <small>{stat.detail}</small>}
            </dd>
          </div>
        ))}
      </dl>
      {(note ?? baseline) && <p className={styles.finishNote}>{note ?? baseline}</p>}
    </>
  )
}

/** WorkoutXPRewardView.swift: one bounded, cancellable count-up shared by text and bar. */
function XPReward({ name, award, totalXP }: { name: string; award: XPAward; totalXP: number }) {
  const { t } = useT()
  const reduced = useRef(prefersReducedMotion()).current
  const [elapsed, setElapsed] = useState(reduced ? rewardDuration : 0)
  const frame = rewardFrame(totalXP, award.total, elapsed, reduced)
  const final = rewardFrame(totalXP, award.total, rewardDuration, true)
  useEffect(() => {
    if (reduced) return
    const started = performance.now()
    let handle = 0
    const step = (time: number) => {
      const seconds = (time - started) / 1000
      setElapsed(Math.min(seconds, rewardDuration))
      if (seconds < rewardDuration && document.visibilityState === 'visible') handle = requestAnimationFrame(step)
      else setElapsed(rewardDuration)
    }
    handle = requestAnimationFrame(step)
    return () => cancelAnimationFrame(handle)
  }, [])
  const summary = [
    final.rankedUp ? t('Rank unlocked: {0}.', [t(final.progress.rank.name)]) : '',
    final.leveledUp ? t('Level up to {0}.', [final.progress.level]) : '',
    t('Earned {0} XP.', [award.total]),
    t(name),
  ].filter(Boolean).join(' ')
  return (
    <>
      <div className={styles.headline} role="status" aria-label={summary} data-testid="xpRewardSummary" data-name={name}>
        <span className={frame.leveledUp ? styles.eyebrowAchievement : styles.eyebrowAction} aria-hidden="true">
          {t(frame.rankedUp ? 'RANK UNLOCKED' : frame.leveledUp ? 'LEVEL UP' : 'SESSION COMPLETE')}
        </span>
        <h1 aria-hidden="true">{frame.rankedUp ? t(frame.progress.rank.name) : frame.leveledUp ? t('Level {0}', [frame.progress.level]) : t('You earned this.')}</h1>
        <span className={styles.bigXP} aria-hidden="true">
          +{frame.creditedXP} XP
        </span>
      </div>
      <ProgressCard progress={progressFor(totalXP)} award={award} frame={frame} />
    </>
  )
}

function HighlightsScreen({ recap, unit }: { recap: WorkoutRecap; unit: WeightUnit }) {
  const { t } = useT()
  const all = highlightsFor(recap)
  const { shown, hidden } = visibleHighlights(all)
  const records = all.filter((highlight) => highlight.kind === 'record').length
  return (
    <>
      <header className={`${styles.headline} ${styles.compactHeadline}`}>
        {records > 0 ? <Trophy className={styles.trophy} aria-hidden="true" /> : <TrendingUp className={styles.doneIcon} aria-hidden="true" />}
        <span className={records > 0 ? styles.eyebrowAchievement : styles.eyebrowAction}>{t(records > 0 ? 'LOAD RECORD' : 'RECORDED LOAD IMPROVEMENTS')}</span>
        <h1>{records > 0 ? t('{0} new records', [records]) : t('Better than last time')}</h1>
      </header>
      <ul className={styles.highlights}>
        {shown.map((highlight) => (
          <HighlightRow key={highlight.id} highlight={highlight} unit={unit} />
        ))}
      </ul>
      <p className={styles.finishNote} data-testid="highlightsNote">
        {[hidden > 0 ? t('+{0} more', [hidden]) : '', recap.comparableCount !== null ? t('Compared {0} exercises with their most recent recorded session.', [recap.comparableCount]) : '']
          .filter(Boolean)
          .join(' · ')}
      </p>
    </>
  )
}

/** A record's goal bar advances from the previous best to the new one. */
function HighlightRow({ highlight, unit }: { highlight: Highlight; unit: WeightUnit }) {
  const { t, locale } = useT()
  const [advanced, setAdvanced] = useState(false)
  useEffect(() => {
    const handle = window.setTimeout(() => setAdvanced(true), 250)
    return () => window.clearTimeout(handle)
  }, [])
  const load = (kg: number) => loadLabel(unit, kg, locale)
  const record = highlight.kind === 'record'
  const reps = highlight.kind === 'reps'
  const goal = highlight.goal && highlight.goal > 0 ? highlight.goal : null
  const kind = record ? 'Load record' : reps ? 'More reps' : 'Higher load'
  return (
    <li className={record ? styles.highlightRecord : styles.highlight} data-testid="highlight" data-kind={highlight.kind}>
      <div className={styles.gain}>
        <span>
          <small className={record ? styles.eyebrowAchievement : styles.eyebrowAction}>{t(kind)}</small>
          <strong>{highlight.name}</strong>
        </span>
        <strong className={record ? styles.recordValue : styles.gainValue}>{reps ? t('{0} reps', [highlight.value]) : load(highlight.value)}</strong>
      </div>
      {goal && <GoalBar weight={advanced ? highlight.value : highlight.previous} goal={goal} label={t('{0} goal progress', [highlight.name])} />}
      <p className={styles.caption}>
        {reps
          ? t('Up from {0} total working reps', [highlight.previous])
          : goal
            ? highlight.value >= goal
              ? t('Goal reached! {0}', [load(goal)])
              : t('{0} to your {1} goal', [load(goal - highlight.value), load(goal)])
            : t('Up from {0}', [load(highlight.previous)])}
      </p>
    </li>
  )
}

function WeekScreen({ weeks, consistencyDays }: { weeks: TrainingWeek[]; consistencyDays: number | null }) {
  const { t } = useT()
  const thisWeek = weeks.find((week) => week.isCurrent)?.workouts ?? 0
  const most = Math.max(1, ...weeks.map((week) => week.workouts))
  return (
    <>
      <header className={styles.headline}>
        <CalendarCheck className={styles.doneIcon} aria-hidden="true" />
        <span className={styles.eyebrowAction}>{t('THIS WEEK')}</span>
        <h1>{t('{0} workouts this week', [thisWeek])}</h1>
      </header>
      <div className={styles.weekChart} role="img" aria-label={weeks.map((week) => t('Week {0}: {1}', [week.number, week.workouts])).join(', ')}>
        {weeks.map((week) => (
          <div key={week.number} className={styles.weekColumn} aria-hidden="true">
            <span className={styles.weekCount}>{week.workouts}</span>
            <span className={styles.weekTrack}>
              <span className={week.isCurrent ? styles.weekFillCurrent : styles.weekFill} style={{ height: `${(week.workouts / most) * 100}%` }} />
            </span>
            <span className={week.isCurrent ? styles.weekLabelCurrent : styles.weekLabel}>{week.isCurrent ? t('Now') : t('W{0}', [week.number])}</span>
          </div>
        ))}
      </div>
      {consistencyDays !== null && (
        <p className={styles.consistency}>
          <CalendarCheck size={18} aria-hidden="true" /> {t('Training recorded on {0} distinct days in the 28 days ending with this session.', [consistencyDays])}
        </p>
      )}
    </>
  )
}

export function GoalBar({ weight, goal, label }: { weight: number; goal: number; label: string }) {
  const fraction = Math.min(Math.max(weight / goal, 0), 1)
  return (
    <div className={styles.goalTrack} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(fraction * 100)}>
      <span className={styles.goalFill} style={{ width: `${fraction * 100}%` }} />
    </div>
  )
}
