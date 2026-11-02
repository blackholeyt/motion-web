/** prefers-reduced-motion, read once per call; animations settle immediately when true. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
