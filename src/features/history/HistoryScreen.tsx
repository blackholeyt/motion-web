import { useLiveQuery } from 'dexie-react-hooks'
import { History, NotebookText, Search, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { db } from '../../data/db'
import { live } from '../../data/repo'
import type { Workout } from '../../data/types'
import { useT } from '../../i18n'
import { useCompletedWorkouts } from '../../store/hooks'
import { useProfile } from '../../store/profile'
import { cardioSummary } from '../../domain/cardio'
import { EmptyState } from '../../ui/components'
import { DraftLinks } from '../workout/DraftLinks'
import { AIAnalysisSheet } from './AIAnalysisSheet'
import { HistoryEditor } from './HistoryEditor'
import { WorkoutDetailSheet } from './WorkoutDetailSheet'
import styles from './history.module.css'
import { Loading, SkeletonBlock } from '../../ui/Skeleton'

/** WorkoutHistoryView.swift: newest first, grouped by month; tap to look, then edit. */
export function HistoryScreen() {
  const { t, locale } = useT()
  const workouts = useCompletedWorkouts()
  const location = useLocation()
  const navigate = useNavigate()
  const opening = ((location.state ?? {}) as { open?: string }).open
  const [viewing, setViewing] = useState<Workout | null>(null)
  const [editing, setEditing] = useState<Workout | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [query, setQuery] = useState('')
  // Exercise names per workout, so the search also finds "Bench Press".
  const names = useLiveQuery(async () => {
    const map = new Map<string, string[]>()
    for (const exercise of live(await db.workout_exercises.toArray())) map.set(exercise.workout_id, [...(map.get(exercise.workout_id) ?? []), exercise.exercise_name])
    return map
  }, [])

  // "Last workout" on the dashboard opens that workout here.
  useEffect(() => {
    if (!opening || !workouts) return
    const workout = workouts.find((candidate) => candidate.id === opening)
    if (workout) setViewing(workout)
    navigate(location.pathname, { replace: true, state: null })
  }, [opening, workouts !== undefined])

  const months = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale)
    const matches = (workouts ?? []).filter(
      (workout) => !needle || [t(workout.name), workout.notes ?? '', ...(names?.get(workout.id) ?? [])].some((text) => text.toLocaleLowerCase(locale).includes(needle)),
    )
    const format = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
    const groups: { label: string; workouts: Workout[] }[] = []
    for (const workout of matches) {
      const label = format.format(new Date(workout.performed_at))
      const last = groups[groups.length - 1]
      if (last?.label === label) last.workouts.push(workout)
      else groups.push({ label, workouts: [workout] })
    }
    return groups
  }, [workouts, names, query, locale])
  return (
    <div className={styles.screen}>
      <DraftLinks returnTo="/history" />
      <header className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>{t('The work you put in.')}</h1>
          {workouts ? <p className={styles.muted}>{t('{0} saved sessions', [workouts.length])}</p> : <SkeletonBlock height={18} width={140} />}
        </div>
        {Boolean(workouts?.length) && (
          <button type="button" className={styles.aiButton} onClick={() => setAnalysing(true)} data-testid="openAIAnalysis">
            <Sparkles size={16} aria-hidden="true" /> {t('Analyse with AI')}
          </button>
        )}
      </header>
      {Boolean(workouts?.length) && (
        <label className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search workouts or exercises')} aria-label={t('Search workouts or exercises')} data-testid="historySearch" />
        </label>
      )}
      {workouts === undefined && (
        <Loading>
          {[0, 1, 2].map((index) => (
            <SkeletonBlock key={index} height={84} radius="var(--radius-row)" />
          ))}
        </Loading>
      )}
      {months.map((month) => (
        <section key={month.label} className={styles.month}>
          <h2 className={styles.monthTitle}>
            {month.label} <small>{t('{0} workouts', [month.workouts.length])}</small>
          </h2>
          {month.workouts.map((workout) => (
            <HistoryRow key={workout.id} workout={workout} onOpen={() => setViewing(workout)} />
          ))}
        </section>
      ))}
      {Boolean(workouts?.length) && months.length === 0 && <p className={styles.muted}>{t('No workouts match “{0}”.', [query.trim()])}</p>}
      {workouts?.length === 0 && <EmptyState icon={<History size={40} />} title={t('Your story starts here')} detail={t('Finish a workout to save it here.')} />}
      {viewing && (
        <WorkoutDetailSheet
          workout={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing)
            setViewing(null)
          }}
        />
      )}
      {editing && <HistoryEditor workout={editing} onClose={() => setEditing(null)} />}
      <AIAnalysisSheet open={analysing} onClose={() => setAnalysing(false)} />
    </div>
  )
}

function HistoryRow({ workout, onOpen }: { workout: Workout; onOpen: () => void }) {
  const { t, locale } = useT()
  const distanceUnit = useProfile()?.distance_unit ?? 'km'
  const summary = useLiveQuery(async () => {
    const exercises = live(await db.workout_exercises.where('workout_id').equals(workout.id).toArray()).sort((a, b) => a.sort_order - b.sort_order)
    const sets = live(await db.set_logs.where('workout_id').equals(workout.id).toArray()).filter((set) => set.is_completed)
    return {
      names: exercises.slice(0, 3).map((exercise) => exercise.exercise_name),
      exercises: exercises.filter((exercise) => sets.some((set) => set.workout_exercise_id === exercise.id)).length,
      working: sets.filter((set) => !set.is_warm_up).length,
      warmUp: sets.filter((set) => set.is_warm_up).length,
    }
  }, [workout.updated_at])
  const date = new Date(workout.performed_at)
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options).format(date)
  return (
    <button type="button" className={styles.row} onClick={onOpen} data-testid={`history-${workout.name}`}>
      <span className={styles.day}>
        <strong>{format({ day: 'numeric' })}</strong>
        <small>{format({ month: 'short' })}</small>
      </span>
      <span className={styles.body}>
        <strong className={styles.name}>{t(workout.name)}</strong>
        <small className={styles.muted}>{format({ weekday: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</small>
        {workout.cardio_type ? (
          <span className={styles.muted}>{cardioSummary(workout, distanceUnit, locale, t)}</span>
        ) : (
          summary && <span className={styles.muted}>{t('{0} exercises · {1} working · {2} warm-up', [summary.exercises, summary.working, summary.warmUp])}</span>
        )}
        {workout.notes?.trim() && (
          <span className={styles.notes}>
            <NotebookText size={14} aria-hidden="true" /> {workout.notes}
          </span>
        )}
        {summary && (
          <span className={styles.chips}>
            {summary.names.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </span>
        )}
      </span>
    </button>
  )
}
