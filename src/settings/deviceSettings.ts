import { useSyncExternalStore } from 'react'

/*
 * Device preferences until the local database arrives in phase 2.
 * Defaults match the iOS app (MotionAppearance, launchAnimationEnabled).
 */
export type Appearance = 'dark' | 'light' | 'system'
export type LanguageChoice = 'device' | 'en' | 'de'

export interface DeviceSettings {
  appearance: Appearance
  openingAnimation: boolean
  language: LanguageChoice
  installHintDismissed: boolean
}

const key = 'motion.device-settings.v1'
export const defaultSettings: DeviceSettings = {
  appearance: 'dark',
  openingAnimation: true,
  language: 'device',
  installHintDismissed: false,
}

const listeners = new Set<() => void>()
let current = read()

function read(): DeviceSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<DeviceSettings>
    return { ...defaultSettings, ...stored }
  } catch {
    return defaultSettings
  }
}

export function getSettings(): DeviceSettings {
  return current
}

export function updateSettings(change: Partial<DeviceSettings>) {
  current = { ...current, ...change }
  try {
    localStorage.setItem(key, JSON.stringify(current))
  } catch {
    // Private browsing can refuse storage; the change still applies for this session.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSettings(): DeviceSettings {
  return useSyncExternalStore(subscribe, getSettings, getSettings)
}
