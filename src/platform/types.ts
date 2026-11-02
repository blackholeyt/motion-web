/*
 * Device capabilities behind app-owned interfaces. The web implementations live
 * next to this file; a Capacitor build can provide native ones without touching
 * screens or business logic.
 */

export type HapticEvent = 'selection' | 'action' | 'completion' | 'success' | 'error'

export interface Haptics {
  /** False where the device or browser cannot vibrate (e.g. Safari on iPhone). */
  readonly supported: boolean
  play(event: HapticEvent): void
}

export type NotificationPermission = 'unsupported' | 'default' | 'denied' | 'granted'

export interface RestNotification {
  id: string
  deadline: Date
  title: string
  body: string
}

export interface Notifications {
  permission(): NotificationPermission
  requestPermission(): Promise<NotificationPermission>
  /** Best effort on the web; limits are documented in docs/PLATTFORM.md. */
  schedule(notification: RestNotification): void
  cancel(id: string): void
}

export interface WakeLock {
  readonly supported: boolean
  /** Keeps the screen on while training; released automatically when hidden. */
  acquire(): Promise<boolean>
  release(): Promise<void>
}

export interface Timers {
  /** Wall-clock time; timers derive remaining time from stored deadlines, never from ticks. */
  now(): Date
  /** Calls back on each tick while the app is visible; returns a stop function. */
  every(milliseconds: number, tick: () => void): () => void
}

export interface ShareAndFiles {
  readonly canShareFiles: boolean
  /** Saves a file (download on the web) or opens the share sheet when available. */
  saveFile(name: string, mimeType: string, contents: Blob): Promise<void>
  pickFile(accept: string): Promise<File | null>
}

export interface StoragePersistence {
  requestPersistence(): Promise<boolean>
}

/** Placeholder until the native app: Apple Health stays out of version 1. */
export interface Health {
  readonly available: false
}

export interface Platform {
  haptics: Haptics
  notifications: Notifications
  wakeLock: WakeLock
  timers: Timers
  files: ShareAndFiles
  storage: StoragePersistence
  health: Health
}
