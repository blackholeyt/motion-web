import { Pencil, Scale, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { BodyWeight } from '../../data/types'
import { loadLabel } from '../../domain/measurement'
import { useT } from '../../i18n'
import { deleteWeight, useBodyWeights } from '../../store/body'
import { useProfile } from '../../store/profile'
import { EmptyState } from '../../ui/components'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, TextButton } from '../../ui/controls'
import { BodyWeightEditor } from './BodyWeightEditor'
import { WeightChart } from './WeightChart'
import styles from './body.module.css'

/** BodyWeightHistoryView: chart, daily measurements, correct or delete. */
export function WeightHistory({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useT()
  const profile = useProfile()
  const unit = profile?.body_weight_unit ?? 'kg'
  const entries = useBodyWeights() ?? []
  const [editing, setEditing] = useState<BodyWeight | null>(null)
  const [deleting, setDeleting] = useState<BodyWeight | null>(null)
  return (
    <Sheet open={open} onClose={onClose} title={t('Weight history')} trailing={<TextButton strong onClick={onClose}>{t('Done')}</TextButton>}>
      {entries.length === 0 ? (
        <EmptyState icon={<Scale size={40} />} title={t('No weight check-ins')} detail={t('Add your first weight from the dashboard.')} />
      ) : (
        <>
          <section className={styles.card}>
            <WeightChart entries={entries} unit={unit} target={profile?.target_weight_kg ?? null} />
          </section>
          <Group title={t('Daily measurements')} footer={t('Tap to correct a measurement. Corrections earn no XP. Deleting a measurement keeps its daily XP award, so it cannot be earned twice.')}>
            {[...entries].reverse().map((entry) => (
              <div key={entry.id} className={styles.entry}>
                <button type="button" className={styles.entryButton} onClick={() => setEditing(entry)}>
                  <span>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(entry.recorded_at))}</span>
                  <span className={styles.number}>{loadLabel(unit, entry.kilograms, locale)}</span>
                  <Pencil size={14} aria-hidden="true" />
                </button>
                <button type="button" className={styles.iconButton} aria-label={t('Delete measurement')} onClick={() => setDeleting(entry)}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </Group>
        </>
      )}
      {editing && <BodyWeightEditor key={editing.id} unit={unit} entry={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={deleting !== null}
        title={t('Delete this measurement?')}
        onDismiss={() => setDeleting(null)}
        actions={[
          {
            label: t('Delete measurement'),
            role: 'destructive',
            onSelect: () => {
              void deleteWeight(deleting!)
              setDeleting(null)
            },
          },
          { label: t('Cancel'), role: 'cancel', onSelect: () => setDeleting(null) },
        ]}
      />
    </Sheet>
  )
}
