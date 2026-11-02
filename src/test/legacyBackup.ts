/*
 * A small backup in the exact shape the iOS app exports (MotionBackupStore.export): upper-case
 * UUIDs, dates in seconds since 2001, days as "<era>-<year>-<month>-<day>".
 */

export const appleSeconds = (iso: string) => Date.parse(iso) / 1000 - 978_307_200

export const ids = {
  bench: 'A1B2C3D4-0000-4000-8000-000000000001',
  curl: 'A1B2C3D4-0000-4000-8000-000000000002',
  push: 'B1B2C3D4-0000-4000-8000-000000000001',
  done: 'C1B2C3D4-0000-4000-8000-000000000001',
  draft: 'C1B2C3D4-0000-4000-8000-000000000002',
  health: 'C1B2C3D4-0000-4000-8000-000000000003',
  doneBench: 'D1B2C3D4-0000-4000-8000-000000000001',
  draftBench: 'D1B2C3D4-0000-4000-8000-000000000002',
  setWarmUp: 'E1B2C3D4-0000-4000-8000-000000000001',
  setWork: 'E1B2C3D4-0000-4000-8000-000000000002',
  setDraft: 'E1B2C3D4-0000-4000-8000-000000000003',
  plan: 'F1B2C3D4-0000-4000-8000-000000000001',
  entry: 'F1B2C3D4-0000-4000-8000-000000000002',
  token: 'F1B2C3D4-0000-4000-8000-000000000003',
  healthID: '91B2C3D4-0000-4000-8000-000000000001',
}

export function legacyBackup() {
  return {
    format: 'motion.full-backup',
    version: 1,
    exportedAt: appleSeconds('2026-11-02T08:00:00Z'),
    library: [
      {
        id: ids.bench,
        name: 'Bench Press',
        goalWeight: 80,
        isPRTracked: true,
        metadata: { catalogueID: 'bench', equipment: 'Barbell', muscle: 'Chest', measurement: 'Load & reps', guidance: 'Press.', trackProgress: true },
      },
      { id: ids.curl, name: 'Curl', isPRTracked: false },
    ],
    routines: [
      {
        id: ids.push,
        name: 'Push',
        exercises: [
          { exerciseID: ids.bench, sortOrder: 0, targetSets: 3, warmUpSets: 1, supersetGroup: 'A', guidance: { minimumReps: 6, maximumReps: 8, notes: '', progression: 'Build external load' } },
        ],
      },
    ],
    workouts: [
      {
        id: ids.done,
        date: appleSeconds('2026-11-01T10:00:00Z'),
        name: 'Push',
        notes: 'Felt strong',
        isCompleted: true,
        earnedXP: 175,
        isFreestyle: false,
        isRetrospective: false,
        blueprintID: ids.push,
        trainingPlanTicket: { planID: ids.plan, revision: ids.plan, entryID: ids.entry, rotationToken: ids.token, date: appleSeconds('2026-11-01T00:00:00Z'), dayKey: '1-2026-11-1' },
        exercises: [
          {
            id: ids.doneBench,
            exerciseID: ids.bench,
            identityReviewed: true,
            exerciseName: 'Bench Press',
            isHistoryOnly: false,
            isRemoved: false,
            draftOrder: 0,
            measurementType: 'Load & reps',
            supersetGroup: 'A',
            guidance: { minimumReps: 6, maximumReps: 8, notes: '', progression: 'Build external load' },
            sets: [
              { id: ids.setWarmUp, setIndex: 1, weight: 40, reps: 10, isCompleted: true, isWarmUp: true, isSkipped: false, isRemoved: false },
              { id: ids.setWork, setIndex: 2, weight: 82.5, reps: 7, isCompleted: true, isWarmUp: false, isSkipped: false, isRemoved: false },
            ],
          },
        ],
      },
      {
        id: ids.draft,
        date: appleSeconds('2026-11-02T07:00:00Z'),
        name: 'Freestyle',
        isCompleted: false,
        earnedXP: 0,
        isFreestyle: true,
        draftUpdatedAt: appleSeconds('2026-11-02T07:05:00Z'),
        restTimer: { deadline: appleSeconds('2026-11-02T07:06:30Z'), duration: 90, remaining: 90, sourceSetID: ids.setDraft, exerciseName: 'Bench Press' },
        undoHistory: [
          {
            freestyle: true,
            exercises: [{ id: ids.draftBench, order: 0, removed: false, sets: [{ id: ids.setDraft, weight: '60', reps: '', completed: false, skipped: false, removed: false }] }],
          },
        ],
        exercises: [
          {
            id: ids.draftBench,
            exerciseID: ids.bench,
            identityReviewed: true,
            exerciseName: 'Bench Press',
            isHistoryOnly: false,
            isRemoved: false,
            draftOrder: 0,
            measurementType: 'Load & reps',
            sets: [{ id: ids.setDraft, setIndex: 1, weight: 0, isCompleted: false, isWarmUp: false, isSkipped: false, isRemoved: false, draftWeightUnit: 'kg', draftWeightText: '60', draftRepsText: '' }],
          },
        ],
      },
      {
        id: ids.health,
        date: appleSeconds('2026-10-30T17:00:00Z'),
        name: 'Running',
        isCompleted: true,
        earnedXP: 100,
        isFreestyle: false,
        healthWorkoutID: ids.healthID,
        cardioType: 'Running',
        cardioSeconds: 1800,
        cardioDistance: 5,
        cardioPace: 360,
        exercises: [],
      },
    ],
    profile: { name: 'Mathis', weightUnit: 'kg', exerciseLoadUnit: 'kg', distanceUnitPreference: 'km', targetWeightKilograms: 70, celebratedWeightGoals: ['gain:68000'], createdAt: appleSeconds('2026-04-11T09:00:00Z') },
    weights: [
      { dayKey: '1-2026-11-1', recordedAt: appleSeconds('2026-11-01T06:30:00Z'), kilograms: 67.05 },
      { dayKey: '1-2026-11-2', recordedAt: appleSeconds('2026-11-02T06:30:00Z'), kilograms: 67.2 },
    ],
    weightRewards: [{ dayKey: '1-2026-11-1', awardedAt: appleSeconds('2026-11-01T06:30:00Z'), earnedXP: 25 }],
    workoutAwards: [
      { sessionID: ids.done, earnedXP: 175 },
      { sessionID: ids.health, earnedXP: 100 },
    ],
    healthReceipts: [ids.healthID],
    sleepScores: [{ date: appleSeconds('2026-11-01T06:00:00Z'), dayKey: '1-2026-11-1', score: 84 }],
    trainingPlan: {
      id: ids.plan,
      revision: ids.plan,
      enabled: true,
      mode: 'rotation',
      startDate: appleSeconds('2026-10-01T00:00:00Z'),
      entries: [{ id: ids.entry, blueprintID: ids.push }],
      weekdays: [2, 4, 6],
      cursor: 0,
      rotationToken: ids.token,
      consumed: [`${ids.entry}/${ids.token}`, 'cardio/1-2026-10-30'],
    },
    preferences: {
      appearance: 'light',
      quietMode: true,
      bodyWeightTrackingVisible: true,
      launchAnimationEnabled: false,
      xpHapticsEnabled: false,
      isRepTrackingEnabled: true,
      restTimerSeconds: 120,
      stepGoalEnabled: false,
      dailyStepGoal: 8000,
      bodyWeightGoal: 'gain',
    },
  }
}

/** CompleteCSVCodec.encode: one row per top-level value or array element, every field quoted. */
export function completeCSV(object: Record<string, unknown>): string {
  const sorted = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(sorted)
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted((value as Record<string, unknown>)[key])]))
        : value
  const rows = [['motion_backup_v18', 'record_index', 'value_json']]
  for (const key of Object.keys(object).sort()) {
    const value = object[key]
    if (Array.isArray(value)) {
      if (value.length === 0) rows.push([key, '[]', '[]'])
      value.forEach((item, index) => rows.push([key, String(index), JSON.stringify(sorted(item))]))
    } else rows.push([key, '', JSON.stringify(sorted(value))])
  }
  return rows.map((row) => row.map((field) => `"${field.replace(/"/g, '""')}"`).join(',')).join('\r\n') + '\r\n'
}
