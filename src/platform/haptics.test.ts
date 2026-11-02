import { createHapticThrottle } from './web'

// Throttling rules from MotionHaptics.swift.
describe('haptic throttle', () => {
  it('limits success to every 0.8 s and other pulses to every 0.12 s', () => {
    let time = 0
    const allow = createHapticThrottle(() => time)
    expect(allow('selection')).toBe(true)
    time = 100
    expect(allow('selection')).toBe(false)
    time = 130
    expect(allow('success')).toBe(true)
    time = 500
    expect(allow('completion')).toBe(false)
    time = 950
    expect(allow('completion')).toBe(true)
    time = 1000
    expect(allow('success')).toBe(true)
  })
})
