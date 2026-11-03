import { useSyncExternalStore } from 'react'
import { useT } from '../../i18n'
import { ConfirmDialog } from '../../ui/Sheet'

/*
 * The confirmation after a deletion. Deleting swaps the database, which remounts every screen
 * (App.tsx), so the message lives here, outside the screens, instead of in the sheet that asked.
 */

let notice: string | null = null
const listeners = new Set<() => void>()

export function announceDeletion(message: string | null) {
  notice = message
  listeners.forEach((listener) => listener())
}

export function DeletionNotice() {
  const { t } = useT()
  const message = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => notice,
    () => notice,
  )
  const dismiss = () => announceDeletion(null)
  return <ConfirmDialog open={message !== null} title={t('Deleted')} message={message ?? ''} onDismiss={dismiss} actions={[{ label: t('OK'), role: 'cancel', onSelect: dismiss }]} />
}
