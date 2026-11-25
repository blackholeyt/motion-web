import { setBadge, type Row } from '../../domain/sets'
import type { WorkoutContext } from './engine'
import * as engine from './engine'
import { previousFor, type History, type Session } from './session'
import type { SetViewProps } from './useSetInputs'

export interface SetActionContext {
  session: Session
  history: History
  context: WorkoutContext
  onError: (message: string) => void
  onComplete: (setID: string) => void | Promise<unknown>
  onRemoveSet: (setID: string) => void
  onEnter: (setID: string) => void
}

/** Runs an engine call; a failure is reported through onError instead of being thrown. */
export function runEngine(onError: (message: string) => void, action: Promise<unknown>): Promise<void> {
  return action.then(() => undefined, (failure: Error) => onError(failure.message))
}

/**
 * The props of one set editor. Shared by the full view (SetRow) and the focus view (FocusCard),
 * so both call exactly the same engine functions.
 */
export function setViewProps(row: Row, { session, history, context, onError, onComplete, onRemoveSet, onEnter }: SetActionContext): SetViewProps {
  const workoutID = session.workout.id
  const setID = row.set.id
  const run = (action: Promise<unknown>) => runEngine(onError, action)
  const previous = previousFor(row, session, history)
  return {
    row,
    badge: setBadge(row, session.exercises),
    previous,
    canCopyPrevious: engine.rowAbove(session, row) !== undefined,
    context,
    onInput: (quantity, reps) => run(engine.updateSetInput(workoutID, setID, quantity, reps, context)),
    onComplete: () => onComplete(setID),
    onUseLast: () => void run(engine.reuseValues(workoutID, setID, { previous }, context)),
    onCopyPrevious: () => void run(engine.reuseValues(workoutID, setID, { fromRowAbove: true }, context)),
    onClear: () => void run(engine.clearValues(workoutID, setID, context)),
    onClassify: () => void run(engine.toggleWarmUp(workoutID, setID, context)),
    onSkip: () => void run(engine.toggleSkip(workoutID, setID, context)),
    onRemove: () => onRemoveSet(setID),
    onEnter: () => onEnter(setID),
  }
}
