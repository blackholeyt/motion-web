import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { getSettings } from '../../settings/deviceSettings'
import { OpeningAnimation } from './OpeningAnimation'

interface OpeningState {
  show: () => void
}

const OpeningContext = createContext<OpeningState>({ show: () => {} })

/** Shows the opening once per cold launch when enabled; Settings can preview it. */
export function OpeningProvider({ children }: { children: ReactNode }) {
  // Unfinished workouts arrive in phase 2; until then only the setting decides.
  const [presentation, setPresentation] = useState<number | null>(() => (getSettings().openingAnimation ? Date.now() : null))
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
