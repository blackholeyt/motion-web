/** A single clock keeps geometry, lighting, typography and dismissal in sync (OpeningTimeline.swift). */
export const openingDuration = 2.2
export const reducedOpeningDuration = 0.35

export function unit(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

/** Smoothstep between two points of the timeline. */
export function ease(progress: number, start: number, end: number): number {
  const x = unit((progress - start) / (end - start))
  return x * x * (3 - 2 * x)
}

export function openingProgress(elapsedSeconds: number, reducedMotion: boolean): number {
  return unit(elapsedSeconds / (reducedMotion ? reducedOpeningDuration : openingDuration))
}

export function openingOpacity(progress: number, reducedMotion: boolean): number {
  return 1 - ease(progress, reducedMotion ? 0.55 : 0.86, 1)
}
