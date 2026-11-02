import { Minus, Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import styles from './controls.module.css'

export function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className={styles.stepper}>
      <span>{label}</span>
      <div role="group" aria-label={label}>
        <button type="button" aria-label={`${label} −`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus size={18} />
        </button>
        <button type="button" aria-label={`${label} +`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string }) {
  return (
    <label className={styles.row}>
      <span className={styles.labelStack}>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" role="switch" className={styles.switch} checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}

export function SelectRow<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  const id = useId()
  return (
    <label className={styles.row} htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TextRow({ label, value, onChange, placeholder, inputMode, onBlur, autoFocus }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; inputMode?: 'decimal' | 'numeric' | 'text'; onBlur?: () => void; autoFocus?: boolean }) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} placeholder={placeholder} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} autoFocus={autoFocus} autoComplete="off" />
    </div>
  )
}

export function Group({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.group}>
      {title && <h3>{title}</h3>}
      <div className={styles.groupBody}>{children}</div>
      {footer && <p className={styles.footer}>{footer}</p>}
    </section>
  )
}

export function RowButton({ children, onClick, tone = 'action', disabled, testID }: { children: ReactNode; onClick: () => void; tone?: 'action' | 'plain' | 'destructive'; disabled?: boolean; testID?: string }) {
  return (
    <button type="button" className={`${styles.row} ${styles.rowButton} ${styles[tone]}`} onClick={onClick} disabled={disabled} data-testid={testID}>
      {children}
    </button>
  )
}

export interface MenuItem {
  label: string
  onSelect: () => void
  role?: 'destructive'
  disabled?: boolean
}

/** A small popover menu (the iOS "…" menus). Closes on outside click and Escape. */
export function Menu({ label, icon, items, className }: { label: string; icon: ReactNode; items: MenuItem[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])
  return (
    <div className={`${styles.menu} ${className ?? ''}`} ref={ref}>
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {icon}
      </button>
      {open && (
        <div role="menu" className={styles.menuList}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={item.role === 'destructive' ? styles.destructive : ''}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PrimaryButton({ children, onClick, disabled, testID }: { children: ReactNode; onClick: () => void; disabled?: boolean; testID?: string }) {
  return (
    <button type="button" className={styles.primary} onClick={onClick} disabled={disabled} data-testid={testID}>
      {children}
    </button>
  )
}

export function TextButton({ children, onClick, disabled, testID, strong }: { children: ReactNode; onClick: () => void; disabled?: boolean; testID?: string; strong?: boolean }) {
  return (
    <button type="button" className={`${styles.textButton} ${strong ? styles.strong : ''}`} onClick={onClick} disabled={disabled} data-testid={testID}>
      {children}
    </button>
  )
}
