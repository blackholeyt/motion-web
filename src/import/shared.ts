import type { ImportCounts } from './importer'

/* Small things the importer and its parsers all need, kept in one place. */

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** A report lists at most this many problems; more would only bury the first ones. */
export const maximumIssues = 50
export const measurements = ['Load & reps', 'Bodyweight reps', 'Assisted reps', 'Duration']
export const cardioActivities = ['Running', 'Bicycle', 'Swimming', 'Walking', 'Rowing', 'Elliptical', 'Other cardio']

/** A byte order mark some apps put at the start of exported text files. */
export const stripBOM = (text: string) => text.replace(/^﻿/, '')

export const emptyCounts = (): ImportCounts => ({
  workouts: 0,
  drafts: 0,
  sets: 0,
  exercises: 0,
  routines: 0,
  bodyWeights: 0,
  xpReceipts: 0,
  records: 0,
  xp: 0,
  healthWorkouts: 0,
})
