import { useEffect } from 'react'
import styles from './toast.module.css'

export interface ToastMessage {
  /** Changes for every message, so the same text shown twice restarts the timer. */
  id: number
  text: string
  tone?: 'info' | 'error'
  action?: { label: string; onSelect: () => void }
}

/**
 * A short note at the top of the screen that goes away on its own: "Set removed · Undo" instead
 * of a confirmation, or a problem with a set instead of an OK dialog.
 */
export function Toast({ message, onDismiss }: { message: ToastMessage | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return
    const handle = window.setTimeout(onDismiss, message.action ? 5000 : 4000)
    return () => window.clearTimeout(handle)
  }, [message?.id])

  return (
    <div className={styles.region} role={message?.tone === 'error' ? 'alert' : 'status'} aria-live={message?.tone === 'error' ? 'assertive' : 'polite'}>
      {message && (
        <div key={message.id} className={`${styles.toast} ${message.tone === 'error' ? styles.error : ''}`} data-testid="toast">
          <span className={styles.text} onClick={onDismiss}>
            {message.text}
          </span>
          {message.action && (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                message.action?.onSelect()
                onDismiss()
              }}
              data-testid="toastAction"
            >
              {message.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
