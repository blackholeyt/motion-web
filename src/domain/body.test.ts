import { claimGoal, goalReached, parseBodyWeight, validSleepScore } from './body'

describe('body weight and sleep rules', () => {
  it('parses weights within 1–700 kg in either unit', () => {
    expect(parseBodyWeight('72,5', 'kg')).toBe(72.5)
    expect(parseBodyWeight('160', 'lb')).toBeCloseTo(72.57, 2)
    expect(parseBodyWeight('0.5', 'kg')).toBeNull()
    expect(parseBodyWeight('701', 'kg')).toBeNull()
    expect(parseBodyWeight('1.234', 'kg')).toBeNull()
  })

  it('reaches goals by direction and celebrates each goal once', () => {
    expect(goalReached(69.9, 70, 'lose')).toBe(true)
    expect(goalReached(70.1, 70, 'lose')).toBe(false)
    expect(goalReached(70, 70, 'gain')).toBe(true)
    expect(goalReached(70.01, 70, 'maintain')).toBe(false)
    const first = claimGoal(70, 69, 'lose', [])
    expect(first?.celebrated).toEqual(['lose:70000'])
    expect(claimGoal(70, 68, 'lose', first!.celebrated)).toBeNull()
    expect(claimGoal(70, 71, 'gain', first!.celebrated)?.celebrated).toEqual(['lose:70000', 'gain:70000'])
    expect(claimGoal(null, 70, 'maintain', [])).toBeNull()
  })

  it('accepts sleep scores from 0 to 100', () => {
    expect(validSleepScore('0')).toBe(0)
    expect(validSleepScore(' 87 ')).toBe(87)
    expect(validSleepScore('101')).toBeNull()
    expect(validSleepScore('8.5')).toBeNull()
  })
})
