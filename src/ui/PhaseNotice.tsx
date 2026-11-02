import { Hammer } from 'lucide-react'
import { useT } from '../i18n'
import styles from './phaseNotice.module.css'

/** Marks screens of the phase-1 skeleton honestly instead of showing fake data. */
export function PhaseNotice({ phase, id }: { phase: number; id?: string }) {
  const { t } = useT()
  return (
    <p className={styles.notice} id={id}>
      <Hammer size={16} aria-hidden="true" />
      <span>{t('This area is being rebuilt for the web. It arrives in phase {phase}.', { phase })}</span>
    </p>
  )
}
