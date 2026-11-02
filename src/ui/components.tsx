import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
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

export function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className={styles.sectionTitle}>
      <h2>{title}</h2>
      <p>{subtitle}</p>
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
