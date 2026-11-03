const sides = ['top', 'right', 'bottom', 'left'] as const

/**
 * Copies the safe-area insets as pixels to --safe-*-measured on <html>.
 * Dialogs opened with showModal() live in the top layer; on some iOS versions env(safe-area-inset-*)
 * resolves to 0 there, which put sheet buttons under the status bar. The measured values come from
 * an element in the normal document, so sheets can use max(env(), measured).
 */
export function trackSafeArea(root: HTMLElement = document.documentElement) {
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText =
    'position:fixed;inset:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'
  document.body.append(probe)
  const update = () => {
    const style = getComputedStyle(probe)
    for (const side of sides) root.style.setProperty(`--safe-${side}-measured`, style.getPropertyValue(`padding-${side}`) || '0px')
  }
  update()
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)
  return () => {
    window.removeEventListener('resize', update)
    window.removeEventListener('orientationchange', update)
    probe.remove()
  }
}
