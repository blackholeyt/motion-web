import type { RestTimerState } from '../data/types'

/*
 * RestTimerState.swift: the absolute deadline is authoritative; remaining seconds are a
 * display cache. Every function returns a new state.
 */

export const emptyTimer = (): RestTimerState => ({
  deadline: null,
  noticeUntil: null,
  duration: 90,
  remaining: 0,
  sourceSetID: null,
  exerciseName: null,
})

export const isVisible = (state: RestTimerState) => state.deadline !== null || state.noticeUntil !== null

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
const secondsUntil = (deadline: string, now: Date) => clamp(Math.ceil((Date.parse(deadline) - now.getTime()) / 1000), 0, 3600)

export function restored(state: RestTimerState | null | undefined): RestTimerState {
  if (!state) return emptyTimer()
  const valid =
    state.duration >= 1 &&
    state.duration <= 3600 &&
    state.remaining >= 0 &&
    state.remaining <= 3600 &&
    [state.deadline, state.noticeUntil].every((value) => value === null || !Number.isNaN(Date.parse(value)))
  return valid ? state : emptyTimer()
}

export function start(state: RestTimerState, seconds: number, now: Date, sourceSetID: string | null = null, exerciseName: string | null = null): RestTimerState {
  const duration = clamp(seconds, 1, 3600)
  return {
    ...state,
    duration,
    remaining: duration,
    deadline: new Date(now.getTime() + duration * 1000).toISOString(),
    noticeUntil: null,
    sourceSetID,
    exerciseName,
  }
}

export function adjust(state: RestTimerState, seconds: number, now: Date): RestTimerState {
  if (!state.deadline) return state
  const next = clamp(secondsUntil(state.deadline, now) + seconds, 0, 3600)
  return { ...state, deadline: new Date(now.getTime() + next * 1000).toISOString(), duration: Math.max(state.duration, next), remaining: next }
}

export const restart = (state: RestTimerState, now: Date) => start(state, state.duration, now, state.sourceSetID, state.exerciseName)

/** The caller decides whether this expiry happened while actively viewing the timer. */
export function tick(state: RestTimerState, now: Date): { state: RestTimerState; expired: boolean } {
  let next = state
  const deadline = next.deadline
  if (deadline) {
    next = { ...next, remaining: secondsUntil(deadline, now) }
    if (now.getTime() >= Date.parse(deadline)) {
      return { state: { ...next, deadline: null, noticeUntil: new Date(now.getTime() + 4000).toISOString() }, expired: true }
    }
  }
  if (next.noticeUntil && now.getTime() >= Date.parse(next.noticeUntil)) next = { ...next, noticeUntil: null }
  return { state: next, expired: false }
}

export const skip = (state: RestTimerState, now: Date): RestTimerState => ({
  ...state,
  deadline: null,
  remaining: 0,
  noticeUntil: new Date(now.getTime() + 4000).toISOString(),
})

export const cancel = (state: RestTimerState): RestTimerState => ({ ...state, deadline: null, noticeUntil: null, remaining: 0, sourceSetID: null })
