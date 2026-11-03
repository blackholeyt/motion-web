import { FlaskConical } from 'lucide-react'
import type { SandboxKind } from '../../app/sandbox'
import { useT } from '../../i18n'
import styles from './demo.module.css'

/** Covers the app while a sandbox is filled, so no screen reads or writes a half-seeded database. */
export function SandboxPreparing({ kind }: { kind: SandboxKind }) {
  const { t } = useT()
  return (
    <div className={styles.preparing} role="status" data-testid="sandboxPreparing">
      <FlaskConical size={32} aria-hidden="true" />
      <p>{t(kind === 'demo' ? 'Preparing demo…' : 'Preparing test…')}</p>
    </div>
  )
}
