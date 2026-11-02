import { ease, openingOpacity, openingProgress } from './timeline'
import { ribbonFaces } from './sculpture'

// Expected values follow OpeningTimeline.swift.
describe('opening timeline', () => {
  it('uses smoothstep between two points', () => {
    expect(ease(0.5, 0, 1)).toBe(0.5)
    expect(ease(-1, 0, 1)).toBe(0)
    expect(ease(2, 0, 1)).toBe(1)
    expect(ease(0.25, 0, 1)).toBeCloseTo(0.15625)
  })

  it('runs 2.2 s, or 0.35 s with reduced motion', () => {
    expect(openingProgress(1.1, false)).toBeCloseTo(0.5)
    expect(openingProgress(2.2, false)).toBe(1)
    expect(openingProgress(0.35, true)).toBe(1)
  })

  it('fades out from 86 % (55 % reduced)', () => {
    expect(openingOpacity(0.86, false)).toBe(1)
    expect(openingOpacity(1, false)).toBe(0)
    expect(openingOpacity(0.55, true)).toBe(1)
  })

  it('builds six depth-sorted ribbons of 64 slices', () => {
    const faces = ribbonFaces(0.5, 390, 844)
    expect(faces).toHaveLength(6 * 64)
    expect(faces.every((face, index) => index === 0 || faces[index - 1]!.depth <= face.depth)).toBe(true)
    expect(faces.every((face) => face.light >= 0 && face.light <= 0.96)).toBe(true)
  })
})
