import { useEffect, useState } from 'react'

const matches = (query: string) => typeof window.matchMedia === 'function' && window.matchMedia(query).matches

/** True while the media query matches. False where matchMedia is missing (tests). */
export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(() => matches(query))
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const list = window.matchMedia(query)
    const update = () => setValue(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return value
}

/** Phones show the bottom tab bar; from 768px the sidebar takes over (shell.module.css). */
export const useIsPhone = () => useMediaQuery('(max-width: 767px)')
