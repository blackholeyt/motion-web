import type { WorkoutRecap, XPAward } from '../../domain/progress'
import type { TrainingWeek } from '../../domain/statistics'

/** The finish flow, in order. Screens without content are left out. */
export type FinishScreen = 'summary' | 'xp' | 'highlights' | 'week'

export interface Highlight {
  id: string
  kind: 'record' | 'load' | 'reps'
  name: string
  previous: number
  value: number
  goal: number | null
}

/** Records first, then load and rep gains not already shown as a record. */
export function highlightsFor(recap: WorkoutRecap | null): Highlight[] {
  if (!recap) return []
  const recordIDs = new Set(recap.records.map((record) => record.id))
  return [
    ...recap.records.map((record) => ({ id: `record-${record.id}`, kind: 'record' as const, name: record.name, previous: record.previous, value: record.weight, goal: record.goal })),
    ...recap.improvements
      .filter((gain) => !recordIDs.has(gain.id))
      .map((gain) => ({ id: `load-${gain.id}`, kind: 'load' as const, name: gain.name, previous: gain.previous, value: gain.weight, goal: null })),
    ...recap.repImprovements.map((gain) => ({ id: `reps-${gain.id}`, kind: 'reps' as const, name: gain.name, previous: gain.previous, value: gain.reps, goal: null })),
  ]
}

/** At most `limit` highlights fit one screen; the rest is counted. */
export function visibleHighlights(all: Highlight[], limit = 3): { shown: Highlight[]; hidden: number } {
  return { shown: all.slice(0, limit), hidden: Math.max(0, all.length - limit) }
}

/** The week screen only adds something once there is more than this one session. */
export const showsWeek = (weeks: TrainingWeek[]) => weeks.reduce((sum, week) => sum + week.workouts, 0) >= 2

export function finishScreens({ award, recap, weeks }: { award: XPAward | null; recap: WorkoutRecap | null; weeks: TrainingWeek[] }): FinishScreen[] {
  const screens: FinishScreen[] = ['summary']
  if (award) screens.push('xp')
  if (highlightsFor(recap).length > 0) screens.push('highlights')
  if (showsWeek(weeks)) screens.push('week')
  return screens
}
