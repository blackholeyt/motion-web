import { useEffect } from 'react'
import { useSettings, type Appearance } from '../settings/deviceSettings'

export function resolveTheme(appearance: Appearance, systemDark: boolean): 'dark' | 'light' {
  if (appearance === 'system') return systemDark ? 'dark' : 'light'
  return appearance
}

/** Applies the appearance setting to <html data-theme> and the browser chrome color. */
export function useApplyTheme() {
  const { appearance } = useSettings()
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const theme = resolveTheme(appearance, media.matches)
      document.documentElement.dataset.theme = theme
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0D1114' : '#F4F7F6')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [appearance])
}
