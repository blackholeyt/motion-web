import { useRef, useState, type ReactNode } from 'react'
import { useT } from '../../i18n'
import { ConfirmDialog } from '../../ui/Sheet'

/**
 * For buttons that save something or leave the screen. `run` ignores a second tap while the first
 * one is still working and shows a failure in a dialog instead of letting it vanish; render
 * `dialog` once inside the screen.
 */
export function useGuardedAction(): { run: (action: () => Promise<unknown> | unknown) => Promise<void>; dialog: ReactNode } {
  const { t } = useT()
  // A ref, not state: it must block a second tap that arrives before the next render.
  const running = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const run = async (action: () => Promise<unknown> | unknown) => {
    if (running.current) return
    running.current = true
    try {
      await action()
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      running.current = false
    }
  }
  const dialog = (
    <ConfirmDialog open={error !== null} title={t('Couldn’t save')} message={error ? t(error) : ''} onDismiss={() => setError(null)} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setError(null) }]} />
  )
  return { run, dialog }
}
