import { freshDatabase } from '../../test/db'
import { addEntry, createBlueprint, updateEntry, entriesFor } from '../../store/blueprints'
import { createExercise } from '../../store/library'
import { currentPlan, savePlan } from '../../store/plan'
import { newSchedule, nextTicket } from '../../domain/schedule'
import { quantityText, repsText } from '../../domain/sets'
import * as engine from './engine'
import { loadHistory, loadSession, previousFor, identityKey } from './session'
import { db } from '../../data/db'

const context: engine.WorkoutContext = { trackReps: true, globalRestSeconds: 90, unit: 'kg', locale: 'en-US', now: () => new Date('2026-11-02T10:00:00Z') }

async function benchBlueprint(sets = 2, warmUps = 0) {
  const blueprint = await createBlueprint('Push')
  const bench = await createExercise('Bench Press', true)
  await addEntry(blueprint.id, bench, sets)
  if (warmUps) await updateEntry((await entriesFor(blueprint.id))[0]!.entry, { warm_up_sets: warmUps })
  return { blueprint, bench }
}

async function enter(workoutID: string, index: number, weight: string, reps: string) {
  const session = (await loadSession(workoutID))!
  await engine.updateSetInput(workoutID, session.rows[index]!.set.id, weight, reps, context)
  return (await loadSession(workoutID))!.rows[index]!.set.id
}

describe('workout engine', () => {
  beforeEach(freshDatabase)

  it('creates warm-up and working sets from the blueprint and saves immediately', async () => {
    const { blueprint } = await benchBlueprint(3, 1)
    const id = await engine.startFromBlueprint(blueprint)
    const session = (await loadSession(id))!
    expect(session.workout.name).toBe('Push')
    expect(session.rows.map((row) => row.set.is_warm_up)).toEqual([true, false, false, false])
    expect(await db.outbox.count()).toBeGreaterThan(0)
  })

  it('validates, completes a set and starts the rest timer from a stored deadline', async () => {
    const { blueprint } = await benchBlueprint()
    const id = await engine.startFromBlueprint(blueprint)
    const setID = await enter(id, 0, '60', '')
    const invalid = await engine.toggleCompletion(id, setID, context)
    expect(invalid.error).toContain('positive rep count')
    await enter(id, 0, '60', '8')
    const result = await engine.toggleCompletion(id, setID, context)
    expect(result).toMatchObject({ completed: true, startedRest: true })
    const workout = (await loadSession(id))!.workout
    expect(workout.rest_timer?.deadline).toBe('2026-11-02T10:01:30.000Z')
    expect(workout.rest_timer?.exerciseName).toBe('Bench Press')
  })

  it('survives a restart in the middle of the workout', async () => {
    const { blueprint } = await benchBlueprint()
    const id = await engine.startFromBlueprint(blueprint)
    const setID = await enter(id, 0, '62,5', '8')
    await engine.toggleCompletion(id, setID, context)
    await enter(id, 1, '62.', '')
    // Simulate closing the app: reopen the same IndexedDB with a new connection.
    const name = db.name
    db.close()
    const { MotionDatabase, setDatabase } = await import('../../data/db')
    const reopened = new MotionDatabase(name)
    setDatabase(reopened)
    await reopened.open()
    expect((await engine.latestDraft())?.id).toBe(id)
    const session = (await loadSession(id))!
    expect(session.rows[0]!.set).toMatchObject({ is_completed: true, weight_kg: 62.5, reps: 8 })
    // Unfinished input is restored exactly as typed.
    expect(quantityText(session.rows[1]!.set, 'Load & reps', 'kg', 'en-US')).toBe('62.')
    expect(session.workout.rest_timer?.deadline).toBe('2026-11-02T10:01:30.000Z')
  })

  it('offers the previous working values in the next session', async () => {
    const { blueprint } = await benchBlueprint()
    const first = await engine.startFromBlueprint(blueprint)
    for (const [index, weight] of ['60', '65'].entries()) {
      const setID = await enter(first, index, weight, '8')
      await engine.toggleCompletion(first, setID, context)
    }
    expect(await engine.finishWorkout(first, context)).toBe(true)
    const second = await engine.startFromBlueprint(blueprint)
    const session = (await loadSession(second))!
    const history = await loadHistory(new Set(session.exercises.map(({ exercise }) => identityKey(exercise))), null, second)
    expect(previousFor(session.rows[1]!, session, history)?.weight).toBe(65)
    await engine.reuseValues(second, session.rows[1]!.set.id, { previous: previousFor(session.rows[1]!, session, history) }, context)
    const reused = (await loadSession(second))!.rows[1]!.set
    expect(reused.weight_kg).toBe(65)
    expect(repsText(reused)).toBe('8')
  })

  it('undo restores removed sets and earlier values', async () => {
    const { blueprint } = await benchBlueprint()
    const id = await engine.startFromBlueprint(blueprint)
    const setID = await enter(id, 0, '60', '8')
    await engine.removeSet(id, setID, context)
    expect((await loadSession(id))!.rows).toHaveLength(1)
    await engine.undo(id, context)
    expect((await loadSession(id))!.rows).toHaveLength(2)
    await engine.undo(id, context)
    expect(quantityText((await loadSession(id))!.rows[0]!.set, 'Load & reps', 'kg', 'en-US')).toBe('')
  })

  it('enforces superset order', async () => {
    const blueprint = await createBlueprint('Arms')
    for (const name of ['Curl', 'Pushdown']) await addEntry(blueprint.id, await createExercise(name, true), 1)
    for (const { entry } of await entriesFor(blueprint.id)) await updateEntry(entry, { superset_group: 'A' })
    const id = await engine.startFromBlueprint(blueprint)
    const second = await enter(id, 1, '20', '10')
    const result = await engine.toggleCompletion(id, second, context)
    expect(result.error).toBe('Superset order: complete or skip {0} set {1} first.')
    expect(result.errorValues).toEqual(['Curl', '1'])
  })

  it('finishing a planned session advances the rotation; past workouts never do', async () => {
    const { blueprint } = await benchBlueprint(1)
    await savePlan({ ...newSchedule(new Date('2026-11-01')), enabled: true, entries: [{ id: 'e1', blueprintID: blueprint.id }, { id: 'e2', blueprintID: blueprint.id }] })
    const ticket = nextTicket((await currentPlan())!.schedule, new Date('2026-11-02T10:00:00Z'))!
    const id = await engine.startFromBlueprint(blueprint, { planTicket: ticket })
    await engine.toggleCompletion(id, await enter(id, 0, '50', '5'), context)
    await engine.finishWorkout(id, context)
    expect((await currentPlan())!.schedule.cursor).toBe(1)
    const past = await engine.startFromBlueprint(blueprint, { retrospectiveDate: new Date('2026-10-30'), planTicket: ticket })
    expect((await loadSession(past))!.workout.plan_ticket).toBeNull()
  })

  it('freestyle custom exercises are history only and names stay unique', async () => {
    await createExercise('Bench Press', true)
    const id = await engine.startFreestyle()
    await engine.addExercise(id, { customName: 'Sled Push', sets: 2 }, context)
    const session = (await loadSession(id))!
    expect(session.exercises[0]!.exercise.is_history_only).toBe(true)
    await expect(engine.addExercise(id, { customName: 'sled push', sets: 1 }, context)).rejects.toThrow('already in your workout')
    await expect(engine.addExercise(id, { customName: 'bench press', sets: 1 }, context)).rejects.toThrow('existing exercise')
  })
})
