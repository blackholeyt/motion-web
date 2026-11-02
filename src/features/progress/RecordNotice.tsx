import { Crown, X } from 'lucide-react'
import type { WeightUnit } from '../../data/types'
import { loadLabel } from '../../domain/measurement'
import type { RecordAchievement } from '../../domain/progress'
import { useT } from '../../i18n'
import styles from './progress.module.css'

/** InSessionRecordAcknowledgment.swift: static inline content, no cover or focus change. */
export function RecordNotice({ record, unit, onDismiss }: { record: RecordAchievement; unit: WeightUnit; onDismiss: () => void }) {
  const { t, locale } = useT()
  return (
    <div className={styles.notice} role="status">
      <Crown size={18} className={styles.crown} aria-hidden="true" />
      <p data-testid="inSessionRecord">{t('Recorded load · {0}: {1}.', [record.name, loadLabel(unit, record.weight, locale)])}</p>
      <button type="button" onClick={onDismiss} aria-label={t('Dismiss personal record acknowledgment')}>
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
