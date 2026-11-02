/** Detects whether iPhone users need the manual "Add to Home Screen" explanation. */
export interface InstallEnvironment {
  userAgent: string
  maxTouchPoints: number
  standalone: boolean
}

export type InstallHintKind = 'none' | 'ios-safari' | 'ios-other-browser'

export function installHintKind({ userAgent, maxTouchPoints, standalone }: InstallEnvironment): InstallHintKind {
  if (standalone) return 'none'
  // iPadOS reports a Mac user agent; touch points tell them apart.
  const iOS = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  if (!iOS) return 'none'
  // Since iOS 16.4 other browsers can add to the Home Screen too, but Safari is the documented path.
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent)
  return otherBrowser ? 'ios-other-browser' : 'ios-safari'
}

export function currentEnvironment(): InstallEnvironment {
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return { userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints ?? 0, standalone }
}
