import { db } from '../data/db'
import { live } from '../data/repo'
import { freshDatabase } from '../test/db'
import * as engine from '../features/workout/engine'
import { loadSession } from '../features/workout/session'
import { addEntry, createBlueprint, entriesFor } from './blueprints'
import { createExercise, createLibraryExercise, deleteExercise, historyCandidates, linkSnapshot, saveExercise } from './library'

const context: engine.WorkoutContext = { trackReps: true, globalRestSeconds: 90, unit: 'kg', locale: 'en-US' }

async function freestyleWith(name: string) {
  const id = await engine.startFreestyle()
  await engine.addExercise(id, { customName: name, sets: 1 }, context)
  const set = (await loadSession(id))!.rows[0]!.set
  await engine.updateSetInput(id, set.id, '40', '10', context)
  await engine.toggleCompletion(id, set.id, context)
  await engine.finishWorkout(id, context)
  return (await loadSession(id))!.exercises[0]!.exercise
}

describe('exercise library', () => {
  beforeEach(freshDatabase)

  it('rejects duplicate names when creating', async () => {
    await createLibraryExercise('Sled Push')
    await expect(createLibraryExercise(' sled push ')).rejects.toThrow('already exists')
  })

  it('links only explicitly selected history when tracking is turned on', async () => {
    const snapshot = await freestyleWith('Sled Push')
    const exercise = (await db.exercises.get(snapshot.exercise_id!))!
    expect(snapshot.is_history_only).toBe(true)
    expect((await historyCandidates(exercise)).map(({ snapshot }) => snapshot.id)).toEqual([snapshot.id])
    const metadata = { equipment: 'Other', muscle: 'Legs', measurement: 'Load & reps' as const, guidance: '', track_progress: true }
    await saveExercise(exercise, 'Sled Push', metadata, [])
    expect((await db.workout_exercises.get(snapshot.id))!.is_history_only).toBe(true)
    await saveExercise(exercise, 'Sled Push', metadata, [snapshot.id])
    expect((await db.workout_exercises.get(snapshot.id))!).toMatchObject({ is_history_only: false, exercise_id: exercise.id, exercise_name: 'Sled Push' })
  })

  it('deletes from the library and routines but keeps history; links can be changed', async () => {
    const bench = await createExercise('Bench', true)
    const blueprint = await createBlueprint('Push')
    await addEntry(blueprint.id, bench)
    await deleteExercise(bench)
    expect(await entriesFor(blueprint.id)).toEqual([])
    expect(live(await db.exercises.toArray())).toEqual([])
    const snapshot = await freestyleWith('Row')
    await linkSnapshot(snapshot.id, null)
    expect((await db.workout_exercises.get(snapshot.id))!.exercise_id).toBeNull()
  })
})
