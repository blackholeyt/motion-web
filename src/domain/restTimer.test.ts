import { adjust, cancel, display, emptyTimer, restart, restored, skip, start, tick } from './restTimer'

const t0 = new Date('2026-11-02T10:00:00Z')
const at = (seconds: number) => new Date(t0.getTime() + seconds * 1000)

describe('rest timer (RestTimerState.swift)', () => {
  it('derives remaining time from the stored deadline', () => {
    const state = start(emptyTimer(), 90, t0, 'set', 'Bench Press')
    expect(state.deadline).toBe(at(90).toISOString())
    expect(tick(state, at(30.2)).state.remaining).toBe(60)
  })

  it('shows "rest complete" for 4 seconds after expiry', () => {
    const state = start(emptyTimer(), 60, t0)
    const expired = tick(state, at(61))
    expect(expired.expired).toBe(true)
    expect(expired.state.deadline).toBeNull()
    expect(expired.state.noticeUntil).toBe(at(65).toISOString())
    expect(tick(expired.state, at(66)).state.noticeUntil).toBeNull()
  })

  it('clamps durations and adjustments to 1–3600 seconds', () => {
    expect(start(emptyTimer(), 5000, t0).duration).toBe(3600)
    expect(start(emptyTimer(), 0, t0).duration).toBe(1)
    const adjusted = adjust(start(emptyTimer(), 60, t0), 30, at(10))
    expect(adjusted.remaining).toBe(80)
    expect(adjusted.duration).toBe(80)
  })

  it('skip, cancel and restart', () => {
    const state = start(emptyTimer(), 60, t0, 'set', 'Squats')
    expect(skip(state, at(5)).deadline).toBeNull()
    expect(cancel(state).sourceSetID).toBeNull()
    expect(restart(state, at(100)).deadline).toBe(at(160).toISOString())
  })

  it('shows the time left from the deadline alone, also after a reload', () => {
    const stored = JSON.parse(JSON.stringify(start(emptyTimer(), 90, t0, 'set', 'Bench Press')))
    // No tick ran in between, as after a closed app or a frozen page.
    expect(display(restored(stored), at(75.4))).toEqual({ phase: 'running', remaining: 15 })
    expect(display(restored(stored), at(0))).toEqual({ phase: 'running', remaining: 90 })
  })

  it('reads a deadline that passed while the app was closed as complete, never as a frozen count', () => {
    const state = start(emptyTimer(), 60, t0)
    expect(display(state, at(60))).toEqual({ phase: 'complete' })
    expect(display(state, at(3600 * 5))).toEqual({ phase: 'complete' })
    // The first tick after returning starts the short notice from then and the bar hides afterwards.
    const returned = tick(state, at(600))
    expect(returned.state.noticeUntil).toBe(at(604).toISOString())
    expect(display(returned.state, at(603))).toEqual({ phase: 'complete' })
    expect(display(returned.state, at(604))).toEqual({ phase: 'idle' })
  })

  it('does not depend on how many ticks ran', () => {
    const state = start(emptyTimer(), 120, t0)
    let ticked = state
    for (let second = 1; second <= 50; second++) ticked = tick(ticked, at(second)).state
    expect(display(ticked, at(80))).toEqual(display(state, at(80)))
    expect(tick(ticked, at(130)).state).toEqual(tick(state, at(130)).state)
  })

  it('adjusts, skips and restarts relative to the deadline', () => {
    const state = start(emptyTimer(), 90, t0, 'set', 'Rows')
    expect(display(adjust(state, 30, at(60)), at(60))).toEqual({ phase: 'running', remaining: 60 })
    expect(display(adjust(state, -30, at(60)), at(60))).toEqual({ phase: 'complete' })
    expect(display(skip(state, at(10)), at(11))).toEqual({ phase: 'complete' })
    expect(display(skip(state, at(10)), at(14))).toEqual({ phase: 'idle' })
    expect(display(restart(state, at(500)), at(530))).toEqual({ phase: 'running', remaining: 60 })
    expect(display(cancel(state), at(10))).toEqual({ phase: 'idle' })
  })

  it('a new set replaces a rest that expired unseen', () => {
    const expired = start(emptyTimer(), 60, t0, 'first', 'Squats')
    const next = start(expired, 90, at(400), 'second', 'Squats')
    expect(next.sourceSetID).toBe('second')
    expect(display(next, at(410))).toEqual({ phase: 'running', remaining: 80 })
  })
})
