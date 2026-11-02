import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { latestDraft } from '../workout/engine'
import { getSettings } from '../../settings/deviceSettings'
import { OpeningAnimation } from './OpeningAnimation'

interface OpeningState {
  show: () => void
}

const OpeningContext = createContext<OpeningState>({ show: () => {} })

/** Shows the opening once per cold launch when enabled; Settings can preview it. */
export function OpeningProvider({ children }: { children: ReactNode }) {
  // Cold-launch welcome, skipped when unfinished workouts exist (AppLaunchView.swift).
  const [presentation, setPresentation] = useState<number | null>(() => (getSettings().openingAnimation && !hasDraftsHint() ? Date.now() : null))
  useEffect(() => {
    void latestDraft().then((draft) => {
      rememberDrafts(!!draft)
      if (draft) setPresentation(null)
    })
  }, [])
  const show = useCallback(() => setPresentation(Date.now()), [])
  const finish = useCallback(() => setPresentation(null), [])
  return (
    <OpeningContext.Provider value={{ show }}>
      <div aria-hidden={presentation !== null} inert={presentation !== null}>
        {children}
      </div>
      {presentation !== null && <OpeningAnimation key={presentation} onFinish={finish} />}
    </OpeningContext.Provider>
  )
}

export const useOpening = () => useContext(OpeningContext)

// IndexedDB answers asynchronously; a cached hint avoids flashing the opening over a draft.
const hintKey = 'motion.has-drafts'
function hasDraftsHint() {
  try {
    return localStorage.getItem(hintKey) === '1'
  } catch {
    return false
  }
}
function rememberDrafts(value: boolean) {
  try {
    localStorage.setItem(hintKey, value ? '1' : '0')
  } catch {
    // Storage can be unavailable in private browsing; the opening then simply shows.
  }
}
