import { adjust, cancel, emptyTimer, restart, skip, start, tick } from './restTimer'

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
})
