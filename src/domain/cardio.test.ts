import { draftKilometers, draftPace, draftSeconds, draftValid, newCardioDraft, timeFromPace, withDistance, withSeconds } from './cardio'

describe('cardio draft', () => {
  it('calculates pace from time and distance and accepts matching input', () => {
    const draft = { ...newCardioDraft('km'), minutes: '30', distance: '5' }
    expect(draftPace(draft)).toBe(360)
    expect(draftValid(draft)).toBe(true)
    expect(draftValid({ ...draft, pace: '6:00' })).toBe(true)
    expect(draftValid({ ...draft, pace: '6' })).toBe(true)
    expect(draftValid({ ...draft, pace: '5:00' })).toBe(false)
  })

  it('reads pace per mile and decimal comma input', () => {
    const draft = { ...newCardioDraft('mi'), minutes: '30', distance: '3', pace: '10' }
    expect(draftKilometers(draft)).toBeCloseTo(4.828, 3)
    expect(draftPace(draft)!).toBeCloseTo(600 / 1.609344, 6)
    expect(draftValid(draft)).toBe(true)
    expect(draftPace({ ...draft, pace: '9,5' })).toBeCloseTo(570 / 1.609344, 6)
  })

  it('rejects malformed pace and out-of-range values', () => {
    const draft = { ...newCardioDraft('km'), minutes: '30', distance: '5' }
    for (const pace of ['6:60', ':30', '6:', 'abc', '0:00']) expect(draftPace({ ...draft, pace })).toBeNull()
    expect(draftValid({ ...draft, minutes: '0' })).toBe(false)
    expect(draftValid({ ...draft, activity: 'Skating' })).toBe(false)
  })

  it('keeps exact stored values until edited and sets blueprint time from pace', () => {
    let draft = withSeconds(newCardioDraft('km'), 1234.5)
    draft = withDistance(draft, 4.321)
    expect(draftSeconds(draft)).toBe(1234.5)
    expect(draftKilometers(draft)).toBe(4.321)
    draft = timeFromPace({ ...draft, distance: '10', pace: '5:00' })
    expect(draftSeconds(draft)).toBe(3000)
  })
})
