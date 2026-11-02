import type { HapticEvent, NotificationPermission, Platform, RestNotification } from './types'

// Same event vocabulary and throttling as MotionHaptics.swift; patterns approximate iOS feedback.
const patterns: Record<HapticEvent, number | number[]> = {
  selection: 8,
  action: 12,
  completion: 20,
  success: [14, 60, 22],
  error: [30, 50, 30],
}

export function createHapticThrottle(now: () => number) {
  let lastPulse = -Infinity
  let lastSuccess = -Infinity
  return (event: HapticEvent): boolean => {
    const time = now()
    if (event === 'success') {
      if (time - lastSuccess < 800) return false
      lastSuccess = time
    } else if (time - lastPulse < 120 || time - lastSuccess < 800) {
      return false
    }
    lastPulse = time
    return true
  }
}

const allowHaptic = createHapticThrottle(() => performance.now())
const vibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator

function notificationPermission(): NotificationPermission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

// The web cannot schedule notifications for later; a timer only fires while the page is alive.
const scheduled = new Map<string, number>()

function schedule(notification: RestNotification) {
  cancel(notification.id)
  if (notificationPermission() !== 'granted') return
  const delay = notification.deadline.getTime() - Date.now()
  if (delay <= 0) return
  const handle = window.setTimeout(async () => {
    scheduled.delete(notification.id)
    // Foreground feedback belongs to the in-app timer, as in the iOS app.
    if (document.visibilityState === 'visible') return
    const registration = await navigator.serviceWorker?.getRegistration()
    const options = { body: notification.body, tag: notification.id }
    if (registration) await registration.showNotification(notification.title, options)
    else new Notification(notification.title, options)
  }, delay)
  scheduled.set(notification.id, handle)
}

function cancel(id: string) {
  const handle = scheduled.get(id)
  if (handle !== undefined) window.clearTimeout(handle)
  scheduled.delete(id)
}

let sentinel: WakeLockSentinel | null = null

export const webPlatform: Platform = {
  haptics: {
    supported: vibrate,
    play(event) {
      if (vibrate && allowHaptic(event)) navigator.vibrate(patterns[event])
    },
  },
  notifications: {
    permission: notificationPermission,
    async requestPermission() {
      if (notificationPermission() === 'unsupported') return 'unsupported'
      return Notification.requestPermission()
    },
    schedule,
    cancel,
  },
  wakeLock: {
    supported: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
    async acquire() {
      try {
        sentinel = await navigator.wakeLock.request('screen')
        return true
      } catch {
        return false
      }
    },
    async release() {
      await sentinel?.release()
      sentinel = null
    },
  },
  timers: {
    now: () => new Date(),
    every(milliseconds, tick) {
      const handle = window.setInterval(tick, milliseconds)
      return () => window.clearInterval(handle)
    },
  },
  files: {
    canShareFiles: typeof navigator !== 'undefined' && typeof navigator.canShare === 'function',
    async saveFile(name, mimeType, contents) {
      const file = new File([contents], name, { type: mimeType })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          return
        } catch (error) {
          if ((error as DOMException).name === 'AbortError') return
        }
      }
      const url = URL.createObjectURL(file)
      const link = Object.assign(document.createElement('a'), { href: url, download: name })
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    pickFile(accept) {
      return new Promise((resolve) => {
        const input = Object.assign(document.createElement('input'), { type: 'file', accept })
        input.addEventListener('change', () => resolve(input.files?.[0] ?? null))
        input.addEventListener('cancel', () => resolve(null))
        input.click()
      })
    },
  },
  storage: {
    async requestPersistence() {
      try {
        if (!navigator.storage?.persist) return false
        return (await navigator.storage.persisted()) || (await navigator.storage.persist())
      } catch {
        return false
      }
    },
  },
  health: { available: false },
}
