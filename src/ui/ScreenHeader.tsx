import styles from './screenHeader.module.css'

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className={styles.header}>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  )
}
