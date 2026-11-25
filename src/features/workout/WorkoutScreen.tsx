import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarClock, CheckCircle2, ChevronDown, ChevronLeft, Layers, List, Plus, Shuffle, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useT } from '../../i18n'
import { platform } from '../../platform'
import type { FinishReward } from '../../store/progress'
import type { RecordAchievement } from '../../domain/progress'
import { Celebration, strengthStats } from '../progress/Celebration'
import { RecordNotice } from '../progress/RecordNotice'
import { updateOnboarding, useOnboarding } from '../onboarding/state'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { ContinueButton } from '../../ui/components'
import { TextButton } from '../../ui/controls'
import { Toast, type ToastMessage } from '../../ui/Toast'
import { RestNotificationSettings } from '../settings/RestNotificationSettings'
import * as engine from './engine'
import { ExercisePicker } from './ExercisePicker'
import { ExerciseSection } from './ExerciseSection'
import { FocusView, type CompletionOutcome } from './FocusView'
import { RestTimerBar } from './RestTimerBar'
import { identityKey, loadHistory, loadSession } from './session'
import type { SetRowHandle } from './useSetInputs'
import { useWorkoutContext } from './useWorkoutContext'
import styles from './workout.module.css'

/** ActiveWorkoutView.swift. Every change is already saved; leaving keeps a draft. */
export function WorkoutScreen() {
  const { id = '' } = useParams()
  const { t, locale } = useT()
  const navigate = useNavigate()
  const returnTo = ((useLocation().state ?? {}) as { returnTo?: string }).returnTo ?? '/'
  const context = useWorkoutContext()
  const session = useLiveQuery(() => loadSession(id), [id])
  const identities = session ? [...new Set(session.exercises.map(({ exercise }) => identityKey(exercise)))].sort().join('|') : ''
  const history = useLiveQuery(
    async () => (session ? loadHistory(new Set(identities.split('|')), session.workout.is_retrospective ? session.workout.performed_at : null, id) : new Map()),
    [identities, session?.workout.is_retrospective, id],
  )
  const rowRefs = useRef(new Map<string, SetRowHandle>())
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const toastID = useRef(0)
  const showToast = (message: Omit<ToastMessage, 'id'>) => setToast({ ...message, id: ++toastID.current })
  const setError = (error: { message: string; values?: string[] }) => showToast({ text: t(error.message, error.values), tone: 'error' })
  const [workoutOptions, setWorkoutOptions] = useState(false)
  const [picker, setPicker] = useState<{ replacing: string | null } | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reward, setReward] = useState<FinishReward | null>(null)
  const [record, setRecord] = useState<{ record: RecordAchievement; setID: string } | null>(null)
  const tips = useOnboarding()
  const [notes, setNotes] = useState<string | null>(null)
  // Every workout opens in the minimal focus view; the choice is deliberately not remembered.
  const [view, setView] = useState<'focus' | 'full'>('focus')

  useWakeLock(!!session && !session.workout.is_completed, session?.workout.id)

  if (session === undefined || history === undefined) return null
  if (session === null || (session.workout.is_completed && !saved)) return <UnavailableScreen onContinue={() => navigate('/')} />

  if (saved && reward && tips?.savedWorkoutTipDone !== false) {
    return (
      <Celebration
        name={reward.recap.name}
        stats={strengthStats(reward.stats, context.unit, t, locale)}
        recap={reward.recap}
        award={reward.award}
        totalXP={reward.totalXP}
        weeks={reward.weeks}
        unit={context.unit}
        onContinue={() => navigate(returnTo, { replace: true })}
      />
    )
  }

  if (saved) {
    return (
      <SavedScreen
        onContinue={() => {
          updateOnboarding({ savedWorkoutTipDone: true })
          navigate(returnTo, { replace: true })
        }}
      />
    )
  }

  const { workout } = session
  const report = (failure: unknown) => setError({ message: (failure as Error).message })
  const counts = engine.finishCounts(session)
  const next = session.rows.find(({ set }) => !set.is_completed && !set.is_skipped)
  const canUndo = (workout.undo_history?.length ?? 0) > 0

  const flushAll = async () => {
    for (const handle of rowRefs.current.values()) await handle.flush()
  }
  const complete = async (setID: string): Promise<CompletionOutcome> => {
    const result = await engine.toggleCompletion(id, setID, context).catch((failure) => {
      report(failure)
      return null
    })
    if (!result) return 'none'
    if (result.error) {
      setError({ message: result.error, values: result.errorValues })
      return 'none'
    }
    if (result.record) {
      setRecord({ record: result.record, setID })
      return 'record'
    }
    if (!result.completed && record?.setID === setID) setRecord(null)
    if (result.completed) updateOnboarding({ firstSetTipDone: true })
    return result.completed ? 'done' : 'none'
  }
  const save = async () => {
    setConfirmFinish(false)
    const result = await engine.finishWorkout(id, context)
    if (!result) return
    platform.notifications.cancel(`motion.rest.${id}`)
    setReward(result)
    setSaved(true)
  }
  const finish = async () => {
    await flushAll()
    const fresh = await loadSession(id)
    if (!fresh) return
    if (fresh.rows.every(({ set }) => set.is_completed)) await save()
    else setConfirmFinish(true)
  }
  // Removing is undoable, so it happens at once and offers Undo instead of asking first.
  const removeSet = (setID: string) => {
    void engine
      .removeSet(id, setID, context)
      .then(() => showToast({ text: t('Set removed'), action: { label: t('Undo'), onSelect: () => void engine.undo(id, context).catch(report) } }))
      .catch(report)
  }
  const focusNext = (setID: string) => {
    const order = session.rows.filter(({ set }) => !set.is_skipped).map(({ set }) => set.id)
    const nextID = order[order.indexOf(setID) + 1]
    if (nextID) rowRefs.current.get(nextID)?.focusQuantity()
    else (document.activeElement as HTMLElement | null)?.blur()
  }

  const focus = view === 'focus'
  const recordShown = !!record && session.rows.some(({ set }) => set.id === record.setID && set.is_completed)

  return (
    <div className={`${styles.screen} ${focus ? styles.focusScreen : ''}`}>
      <header className={styles.bar}>
        <TextButton
          onClick={async () => {
            await flushAll().catch(report)
            navigate(returnTo)
          }}
        >
          <ChevronLeft size={20} aria-hidden="true" /> {t('Back')}
        </TextButton>
        <div className={styles.barTitle}>
          <h1>{t(workout.name)}</h1>
          {!workout.is_retrospective && <Elapsed since={workout.performed_at} />}
        </div>
        <div className={styles.barEnd}>
          <button
            type="button"
            className={styles.viewToggle}
            aria-label={t(focus ? 'Show all sets' : 'Focus view')}
            title={t(focus ? 'Show all sets' : 'Focus view')}
            onClick={() => setView(focus ? 'full' : 'focus')}
            data-testid="viewToggle"
            data-view={view}
          >
            {focus ? <List size={20} aria-hidden="true" /> : <Layers size={20} aria-hidden="true" />}
          </button>
          <TextButton strong onClick={() => void finish().catch(report)} disabled={!engine.canFinish(session, context)} testID="finishWorkout">
            {t('Finish')}
          </TextButton>
        </div>
      </header>
      {focus && recordShown && record && (
        <div className={styles.focusNotice}>
          <RecordNotice record={record.record} unit={context.unit} onDismiss={() => setRecord(null)} />
        </div>
      )}
      {focus && (
        <FocusView
          session={session}
          history={history}
          context={context}
          rowRefs={rowRefs}
          recordOpen={recordShown}
          restTimer={!workout.is_retrospective}
          onNotifications={() => setNotifications(true)}
          onError={(message, values) => setError({ message, values })}
          onComplete={complete}
          onRemoveSet={removeSet}
          onShowFull={() => setView('full')}
        />
      )}
      {!focus && <div className={styles.content}>
        {workout.is_retrospective && (
          <div className={styles.card}>
            <span className={styles.inline}>
              <CalendarClock size={18} aria-hidden="true" /> {t('Past workout')}
            </span>
            <span className={styles.muted}>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(workout.performed_at))}</span>
          </div>
        )}
        <div className={styles.card}>
          <div className={styles.between}>
            <span className={styles.muted}>{t('Completed sets')}</span>
            <span className={styles.count} data-testid="completedSetCount">
              {counts.completed} / {session.rows.length}
            </span>
          </div>
          {next && <p className={styles.next}>{t('Next: {0} · set {1}', [next.exercise.exercise_name, next.set.set_index])}</p>}
        </div>
        <div className={styles.card}>
          <button type="button" className={styles.disclosure} aria-expanded={workoutOptions} onClick={() => setWorkoutOptions(!workoutOptions)}>
            {t('Workout options')} <ChevronDown size={16} className={workoutOptions ? styles.rotated : ''} aria-hidden="true" />
          </button>
          {workoutOptions && (
            <div className={styles.options}>
              <p className={styles.muted}>{t('{0} working · {1} warm-up sets completed', [counts.working, counts.warmUp])}</p>
              <button type="button" className={styles.linkButton} disabled={!canUndo} onClick={() => engine.undo(id, context).catch(report)} data-testid="undoEdit">
                <Undo2 size={16} aria-hidden="true" /> {t('Undo edit')}
              </button>
              {!workout.is_freestyle && (
                <button type="button" className={styles.linkButton} onClick={() => engine.enableFreestyle(id, context).catch(report)}>
                  <Shuffle size={16} aria-hidden="true" /> {t('Switch to Freestyle')}
                </button>
              )}
              <p className={styles.muted}>{t('Leave to save a draft. Routine changes apply only to this workout.')}</p>
            </div>
          )}
          {workout.is_freestyle && (
            <button type="button" className={styles.linkButton} onClick={() => setPicker({ replacing: null })} data-testid="addExercise">
              <Plus size={16} aria-hidden="true" /> {t('Add Exercise')}
            </button>
          )}
        </div>
        {recordShown && record && <RecordNotice record={record.record} unit={context.unit} onDismiss={() => setRecord(null)} />}
        {session.exercises.map((group, index) => (
          <ExerciseSection
            key={group.exercise.id}
            group={group}
            session={session}
            history={history}
            context={context}
            isFirst={index === 0}
            isLast={index === session.exercises.length - 1}
            rowRefs={rowRefs}
            onError={(message, values) => setError({ message, values })}
            onComplete={complete}
            onRemoveSet={removeSet}
            onReplace={() => setPicker({ replacing: group.exercise.id })}
            onEnter={focusNext}
            onAddSet={() => engine.addSet(id, group.exercise.id, context).catch(report)}
          />
        ))}
        <section className={styles.card}>
          <label className={styles.notesLabel} htmlFor="workout-notes">
            {t('Workout notes')}
          </label>
          <textarea
            id="workout-notes"
            className={styles.notes}
            rows={4}
            value={notes ?? workout.notes ?? ''}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => {
              if (notes !== null) void engine.updateNotes(id, notes)
            }}
            data-testid="workoutNotes"
          />
          <p className={styles.muted}>{t('Optional: how it felt, technique reminders or plans for next time.')}</p>
        </section>
      </div>}
      {!focus && !workout.is_retrospective && <RestTimerBar workout={workout} onNotifications={() => setNotifications(true)} />}

      {picker && <ExercisePicker workoutID={id} replacing={picker.replacing} context={context} onClose={() => setPicker(null)} />}
      <ConfirmDialog
        open={confirmFinish}
        title={t('Finish this session?')}
        message={
          counts.unfinished > 0
            ? t('{0} sets are still open. Only completed sets are saved.', [counts.unfinished])
            : t('{0} of {1} sets completed.', [counts.completed, session.rows.length])
        }
        onDismiss={() => setConfirmFinish(false)}
        actions={[
          { label: t('Save completed sets'), onSelect: () => void save().catch(report) },
          { label: t('Keep training'), role: 'cancel', onSelect: () => setConfirmFinish(false) },
        ]}
      />
      <Toast message={toast} onDismiss={() => setToast(null)} />
      <Sheet open={notifications} onClose={() => setNotifications(false)} title={t('Rest notifications')} leading={<TextButton onClick={() => setNotifications(false)}>{t('Done')}</TextButton>}>
        <RestNotificationSettings />
      </Sheet>
    </div>
  )
}

/** Time since the workout started, e.g. 32:10. Hidden for a draft left open for hours. */
function Elapsed({ since }: { since: string }) {
  const { t } = useT()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(handle)
  }, [])
  const seconds = Math.floor((now - Date.parse(since)) / 1000)
  if (!Number.isFinite(seconds) || seconds < 0 || seconds >= 5 * 3600) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const text = hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : `${minutes}:${String(seconds % 60).padStart(2, '0')}`
  return (
    <span className={styles.elapsed} aria-label={t('Training time {0}', [text])} data-testid="elapsed">
      {text}
    </span>
  )
}

/** Keeps the screen on while training, where the browser allows it. */
function useWakeLock(active: boolean, workoutID: string | undefined) {
  useEffect(() => {
    if (!active) return
    void platform.wakeLock.acquire()
    const reacquire = () => document.visibilityState === 'visible' && void platform.wakeLock.acquire()
    document.addEventListener('visibilitychange', reacquire)
    return () => {
      document.removeEventListener('visibilitychange', reacquire)
      void platform.wakeLock.release()
    }
  }, [active, workoutID])
}

function UnavailableScreen({ onContinue }: { onContinue: () => void }) {
  const { t } = useT()
  return (
    <div className={styles.unavailable}>
      <CheckCircle2 size={40} aria-hidden="true" />
      <h1>{t('Workout unavailable')}</h1>
      <p>{t('This draft has been removed.')}</p>
      <TextButton onClick={onContinue}>{t('Continue')}</TextButton>
    </div>
  )
}

function SavedScreen({ onContinue }: { onContinue: () => void }) {
  const { t } = useT()
  return (
    <div className={styles.saved} data-testid="workoutSaved">
      <CheckCircle2 size={44} className={styles.savedIcon} aria-hidden="true" />
      <h1>{t('Workout saved.')}</h1>
      <p>{t('Next time, you can use these values as your starting point.')}</p>
      <ContinueButton onClick={onContinue}>{t('Continue')}</ContinueButton>
    </div>
  )
}
