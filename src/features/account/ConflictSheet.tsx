import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useT } from '../../i18n'
import { keepDeviceVersion, applyCloudVersion } from '../../sync/conflicts'
import { Sheet } from '../../ui/Sheet'
import { Group, RowButton, TextButton } from '../../ui/controls'
import styles from './account.module.css'

/** One entry per workout that was changed on two devices at once. Nothing is discarded until the user chooses. */
export function ConflictSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useT()
  const workouts = useLiveQuery(async () => {
    const conflicts = await db.conflicts.toArray()
    const ids = [...new Set(conflicts.map((conflict) => conflict.workout_id))]
    const stored = await db.workouts.bulkGet(ids)
    return ids.map((id, index) => ({
      id,
      name: stored[index]?.name ?? t('Workout'),
      detectedAt: conflicts.filter((conflict) => conflict.workout_id === id).reduce((latest, conflict) => (conflict.detected_at > latest ? conflict.detected_at : latest), ''),
    }))
  }, [])
  if (!open) return null
  return (
    <Sheet open onClose={onClose} title={t('Changes from another device')} trailing={<TextButton strong onClick={onClose}>{t('Done')}</TextButton>}>
      <p className={styles.intro}>
        {t('These workouts were open on this device and changed on another device at the same time. This device kept its state; the other version is kept here until you choose.')}
      </p>
      {(workouts ?? []).map((workout) => (
        <Group key={workout.id} title={workout.name} footer={t('Noticed {0}', [new Date(workout.detectedAt).toLocaleString(locale)])}>
          <RowButton onClick={() => void keepDeviceVersion(workout.id)}>{t('Keep this device’s version')}</RowButton>
          <RowButton tone="plain" onClick={() => void applyCloudVersion(workout.id)}>
            {t('Use the other device’s version')}
          </RowButton>
        </Group>
      ))}
      {workouts?.length === 0 && <p className={styles.intro}>{t('No open conflicts.')}</p>}
    </Sheet>
  )
}
