import { CalendarCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { WeightUnit } from '../../data/types'
import { loadLabel } from '../../domain/measurement'
import { progressFor, rewardDuration, rewardFrame, type RecordAchievement, type WorkoutRecap, type XPAward } from '../../domain/progress'
import { useT } from '../../i18n'
import { useHaptics } from '../../store/hooks'
import { ContinueButton, Masthead } from '../../ui/components'
import { prefersReducedMotion } from '../../ui/motion'
import { ProgressCard } from './ProgressCard'
import styles from './progress.module.css'

export interface CelebrationProps {
  recap: WorkoutRecap | null
  award: XPAward | null
  totalXP: number
  records: RecordAchievement[]
  unit: WeightUnit
  /** Overrides the "{name} · {n} sets completed" line, e.g. for cardio. */
  detail?: string
  onContinue: () => void
}

/** PersonalRecordCelebration.swift (WorkoutCelebrationView) with the XP reward on top. */
export function Celebration({ recap, award, totalXP, records, unit, detail, onContinue }: CelebrationProps) {
  const { t, locale } = useT()
  const haptic = useHaptics()
  const load = (kg: number) => loadLabel(unit, kg, locale)
  useEffect(() => {
    if (!award) haptic('success')
  }, [])
  return (
    <div className={styles.celebration} data-testid="celebration">
      <div className={styles.celebrationBody}>
        {recap && award ? (
          <XPReward name={recap.name} detail={detail ?? t('{0} · {1} sets completed', [t(recap.name), recap.setCount])} award={award} totalXP={totalXP} />
        ) : (
          <>
            <Masthead category={t(recap ? 'SESSION COMPLETE' : 'LOAD RECORD')} accent={recap ? 'var(--action)' : 'var(--achievement)'} />
            <div className={styles.headline}>
              <h1>{t(recap ? 'Session saved.' : 'A new recorded load best!')}</h1>
              <p className={styles.muted}>
                {recap ? (detail ?? t('{0} · {1} working · {2} warm-up sets', [t(recap.name), recap.setCount, recap.warmUpCount])) : t('A higher external load was recorded.')}
              </p>
            </div>
          </>
        )}
        {recap && recap.improvements.length > 0 && (
          <section className={styles.card}>
            <h2 className={styles.eyebrow}>{t('RECORDED LOAD IMPROVEMENTS')}</h2>
            <p className={styles.caption}>{t('Higher top load without fewer reps across matching working sets')}</p>
            {recap.improvements.map((gain) => (
              <div key={gain.id} className={styles.gain}>
                <span>
                  <strong>{gain.name}</strong>
                  <small className={styles.muted}>
                    {load(gain.previous)} → {load(gain.weight)}
                  </small>
                </span>
                <strong className={styles.gainValue}>+{load(gain.weight - gain.previous)}</strong>
              </div>
            ))}
          </section>
        )}
        {recap?.repImprovements.map((gain) => (
          <section key={gain.id} className={styles.card}>
            <h2 className={styles.cardTitle}>{t('{0} · More recorded reps', [gain.name])}</h2>
            <p className={styles.muted}>
              {t(
                gain.measurement === 'Bodyweight reps'
                  ? '{0} → {1} total working reps at the same added load per set.'
                  : '{0} → {1} total working reps at the same external load per set.',
                [gain.previous, gain.reps],
              )}
            </p>
          </section>
        ))}
        {recap?.consistencyDays != null && (
          <p className={styles.consistency}>
            <CalendarCheck size={18} aria-hidden="true" /> {t('Training recorded on {0} distinct days in the 28 days ending with this session.', [recap.consistencyDays])}
          </p>
        )}
        {recap && (
          <p className={styles.caption}>
            {recap.comparableCount === null
              ? t('First recorded session: a baseline, not an improvement claim.')
              : t('Compared {0} exercises with their most recent recorded session. Matching identity, measurement, explicit targets and complete working sets are required. Missing context, changed targets and easier plans are not failed progress.', [recap.comparableCount])}
          </p>
        )}
        {records.map((record) => (
          <RecordCard key={record.id} record={record} unit={unit} />
        ))}
      </div>
      <div className={styles.continueBar}>
        <ContinueButton onClick={onContinue} data-testid="celebrationContinue">
          {t('Continue')}
        </ContinueButton>
      </div>
    </div>
  )
}

/** WorkoutXPRewardView.swift: one bounded, cancellable count-up shared by text and bar. */
function XPReward({ name, detail, award, totalXP }: { name: string; detail: string; award: XPAward; totalXP: number }) {
  const { t } = useT()
  const haptic = useHaptics()
  const reduced = useRef(prefersReducedMotion()).current
  const [elapsed, setElapsed] = useState(reduced ? rewardDuration : 0)
  const frame = rewardFrame(totalXP, award.total, elapsed, reduced)
  const final = rewardFrame(totalXP, award.total, rewardDuration, true)
  useEffect(() => {
    if (reduced) {
      haptic(final.leveledUp ? 'success' : 'completion')
      return
    }
    const started = performance.now()
    let handle = 0
    const credit = window.setTimeout(() => haptic('completion'), 250)
    const step = (time: number) => {
      const seconds = (time - started) / 1000
      setElapsed(Math.min(seconds, rewardDuration))
      if (seconds < rewardDuration && document.visibilityState === 'visible') handle = requestAnimationFrame(step)
      else setElapsed(rewardDuration)
    }
    handle = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(handle)
      window.clearTimeout(credit)
    }
  }, [])
  const levelUp = useRef(false)
  useEffect(() => {
    if (frame.leveledUp && !levelUp.current && !reduced) {
      levelUp.current = true
      haptic('success')
    }
  }, [frame.leveledUp])
  const summary = [
    final.rankedUp ? t('Rank unlocked: {0}.', [t(final.progress.rank.name)]) : '',
    final.leveledUp ? t('Level up to {0}.', [final.progress.level]) : '',
    t('Earned {0} XP.', [award.total]),
    detail,
  ].filter(Boolean).join(' ')
  return (
    <>
      <Masthead category={t('WORKOUT')} accent="var(--action)" />
      <div className={styles.headline} role="status" aria-label={summary} data-testid="xpRewardSummary" data-name={name}>
        <span className={frame.leveledUp ? styles.eyebrowAchievement : styles.eyebrow} aria-hidden="true">
          {t(frame.rankedUp ? 'RANK UNLOCKED' : frame.leveledUp ? 'LEVEL UP' : 'SESSION COMPLETE')}
        </span>
        <h1 aria-hidden="true">{frame.rankedUp ? t(frame.progress.rank.name) : frame.leveledUp ? t('Level {0}', [frame.progress.level]) : t('You earned this.')}</h1>
        <span className={styles.bigXP} aria-hidden="true">
          +{frame.creditedXP} XP
        </span>
        <p className={styles.muted} aria-hidden="true">
          {detail}
        </p>
      </div>
      <ProgressCard progress={progressFor(totalXP)} award={award} frame={frame} />
    </>
  )
}

/** RecordProgressCard: the goal bar advances from the previous best to the new one. */
export function RecordCard({ record, unit }: { record: RecordAchievement; unit: WeightUnit }) {
  const { t, locale } = useT()
  const [advanced, setAdvanced] = useState(false)
  useEffect(() => {
    const handle = window.setTimeout(() => setAdvanced(true), 250)
    return () => window.clearTimeout(handle)
  }, [])
  const load = (kg: number) => loadLabel(unit, kg, locale)
  const goal = record.goal && record.goal > 0 ? record.goal : null
  const shown = advanced ? record.weight : record.previous
  return (
    <section className={styles.card} data-testid="recordCard">
      <span className={styles.eyebrowAchievement}>{t('LOAD RECORD')}</span>
      <div className={styles.gain}>
        <strong>{record.name}</strong>
        <strong className={styles.recordValue}>{load(record.weight)}</strong>
      </div>
      {goal ? (
        <>
          <GoalBar weight={shown} goal={goal} label={t('{0} goal progress', [record.name])} />
          <p className={styles.muted}>
            {record.weight >= goal ? t('Goal reached! {0}', [load(goal)]) : t('{0} to your {1} goal', [load(goal - record.weight), load(goal)])}
          </p>
        </>
      ) : (
        <p className={styles.muted}>{t('Up from {0}', [load(record.previous)])}</p>
      )}
    </section>
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
