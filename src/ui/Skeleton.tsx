import type { CSSProperties, ReactNode } from 'react'
import { useT } from '../i18n'
import styles from './skeleton.module.css'

interface BlockProps {
  height: number | string
  width?: number | string
  /** A CSS length or a theme variable, e.g. `var(--radius-card)`. */
  radius?: string
  testID?: string
}

/** A grey shape in place of content that is still loading. Decorative: hidden from screen readers. */
export function SkeletonBlock({ height, width, radius = 'var(--radius-input)', testID }: BlockProps) {
  const style: CSSProperties = { height, width, borderRadius: radius }
  return <span className={styles.block} style={style} aria-hidden="true" data-testid={testID} />
}

/** Groups placeholders and tells screen readers once that the content is loading. */
export function Loading({ children, page = false }: { children: ReactNode; /** Full screen outside the tab layout. */ page?: boolean }) {
  const { t } = useT()
  return (
    <div className={page ? styles.page : styles.loading} aria-busy="true" data-testid="loading">
      <span className="visually-hidden" role="status">
        {t('Loading…')}
      </span>
      {children}
    </div>
  )
}

/** Top bar of a full screen (Back … Finish) as two small shapes. */
export function SkeletonBar() {
  return (
    <div className={styles.bar}>
      <SkeletonBlock height={20} width={64} />
      <SkeletonBlock height={20} width={56} />
    </div>
  )
}
