import type { Platform } from './types'
import { webPlatform } from './web'

export type * from './types'

/** The single entry point for device capabilities. Capacitor will swap the implementation here. */
export const platform: Platform = webPlatform
