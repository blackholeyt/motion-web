import { useEffect, useRef, type ReactNode } from 'react'
import styles from './sheet.module.css'

/**
 * A modal sheet on the native <dialog> element: focus is trapped, Escape closes it.
 * Full screen on phones, a centred panel from tablet width.
 */
export function Sheet({
  open,
  onClose,
  title,
  leading,
  trailing,
  children,
  fullScreen = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  leading?: ReactNode
  trailing?: ReactNode
  children: ReactNode
  fullScreen?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`${styles.sheet} ${fullScreen ? styles.full : ''}`}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      aria-label={title}
    >
      {open && (
        <div className={styles.inner}>
          <header className={styles.bar}>
            <div className={styles.side}>{leading}</div>
            <h2>{title}</h2>
            <div className={`${styles.side} ${styles.end}`}>{trailing}</div>
          </header>
          <div className={styles.body}>{children}</div>
        </div>
      )}
    </dialog>
  )
}

export interface DialogAction {
  label: string
  role?: 'destructive' | 'cancel' | 'default'
  onSelect: () => void
}

/** Alerts and confirmation dialogs ("Discard unfinished workout?"). */
export function ConfirmDialog({ open, title, message, actions, onDismiss }: { open: boolean; title: string; message?: string; actions: DialogAction[]; onDismiss: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={styles.alert}
      role="alertdialog"
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault()
        onDismiss()
      }}
    >
      {open && (
        <>
          <h2 id="confirm-title">{title}</h2>
          {message && <p>{message}</p>}
          <div className={styles.actions}>
            {actions.map((action) => (
              <button key={action.label} type="button" className={styles[action.role ?? 'default']} onClick={action.onSelect}>
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </dialog>
  )
}
