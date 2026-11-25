import { Info } from 'lucide-react'
import { useId, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import styles from './components.module.css'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`${styles.card} ${className}`}>{children}</section>
}

/** A quiet, shared signature keeps the result itself at the center of each celebration. */
export function Masthead({ category, accent }: { category: string; accent?: string }) {
  return (
    <div className={styles.masthead} style={{ '--accent': accent } as CSSProperties} aria-label={category} role="img">
      <div className={styles.mastheadTop} aria-hidden="true">
        <span className={styles.mastheadBrand}>MOTION</span>
        <span className={styles.mastheadJournal}>TRAINING JOURNAL</span>
      </div>
      <div className={styles.mastheadRule} aria-hidden="true" />
      <span className={styles.mastheadCategory} aria-hidden="true">{category}</span>
    </div>
  )
}

export function ContinueButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={styles.continueButton} />
}

/**
 * Heading of a dashboard section. A long explanation goes in `info`: it stays behind a small ⓘ
 * button so the screen shows results first.
 */
export function SectionTitle({ title, subtitle, info }: { title: string; subtitle?: string; info?: string }) {
  const [open, setOpen] = useState(false)
  const infoID = useId()
  return (
    <div className={styles.sectionTitle}>
      <div className={styles.sectionTitleRow}>
        <h2>{title}</h2>
        {info && (
          <button type="button" className={styles.infoButton} aria-expanded={open} aria-controls={infoID} aria-label={`${title}: info`} onClick={() => setOpen(!open)}>
            <Info size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {subtitle && <p>{subtitle}</p>}
      {info && open && <p id={infoID}>{info}</p>}
    </div>
  )
}

export function EmptyState({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className={styles.empty}>
      <span aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
  )
}
