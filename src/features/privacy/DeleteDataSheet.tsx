import { useState } from 'react'
import { useT } from '../../i18n'
import { exportBackup } from '../../store/backup'
import { exportCSV } from '../../store/csvExport'
import { deleteAccount, deleteDeviceData } from '../../sync/account'
import { downloadFile } from '../../ui/download'
import { Sheet } from '../../ui/Sheet'
import { Group, RowButton, TextButton } from '../../ui/controls'
import { ConsentCheck } from './ConsentScreen'
import { announceDeletion } from './DeletionNotice'
import styles from './privacy.module.css'

export type DeleteMode = 'account' | 'device'

/** Server answers in plain words; unknown ones keep their own message. */
function explain(failure: unknown): string {
  const error = failure as { message?: string }
  if (navigator.onLine === false) return 'You are offline. Connect to the internet to delete your account.'
  if (failure instanceof TypeError && /fetch|network|load failed/i.test(error.message ?? '')) return 'Motion cannot reach the server right now. Try again in a moment.'
  return error.message ?? String(failure)
}

/**
 * Konto löschen (cloud and this device) or, without an account, everything on this device. The
 * export comes first, the deletion needs an explicit confirmation and cannot be undone.
 */
export function DeleteDataSheet({ mode, onClose }: { mode: DeleteMode | null; onClose: () => void }) {
  const { t } = useT()
  const [understood, setUnderstood] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!mode) return null
  const close = () => {
    setUnderstood(false)
    setError(null)
    onClose()
  }
  const save = async (build: () => Promise<File>) => {
    try {
      downloadFile(await build())
    } catch (failure) {
      setError(t(explain(failure)))
    }
  }
  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'account') {
        const counts = await deleteAccount()
        const removed = Object.values(counts).reduce((sum, count) => sum + count, 0)
        announceDeletion(t('Your account was deleted. {0} records were removed from the cloud, and the account’s data on this device is gone.', [removed]))
      } else {
        await deleteDeviceData()
        announceDeletion(t('All data on this device was deleted.'))
      }
      close()
    } catch (failure) {
      setError(t(explain(failure)))
    } finally {
      setBusy(false)
    }
  }
  const title = mode === 'account' ? t('Delete account') : t('Delete data on this device')
  const heading = mode === 'account' ? title : t('Delete device data')
  return (
    <Sheet open onClose={close} title={heading} leading={<TextButton onClick={close}>{t('Cancel')}</TextButton>}>
      <p className={styles.note}>
        {mode === 'account'
          ? t('This deletes your account and all its training, body weight, sleep scores, routines, plans, XP and profile, in the cloud and on this device. Other devices keep their copy until you sign out there.')
          : t('This deletes all training, body weight, sleep scores, routines, plans, XP, your profile and your consent on this device. Motion then starts over.')}
      </p>
      <Group title={t('Export first')} footer={t('JSON is the complete backup. CSV is a table of workouts, sets, body weight and sleep scores for spreadsheets.')}>
        <RowButton tone="plain" onClick={() => void save(exportBackup)} testID="deleteExportJSON">
          {t('Export backup (JSON)')}
        </RowButton>
        <RowButton tone="plain" onClick={() => void save(exportCSV)} testID="deleteExportCSV">
          {t('Export table (CSV)')}
        </RowButton>
      </Group>
      <Group>
        <ConsentCheck checked={understood} onChange={setUnderstood} testID="confirmDeletion">
          {t('I understand that this cannot be undone.')}
        </ConsentCheck>
      </Group>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="button" className={styles.danger} disabled={!understood || busy} onClick={() => void remove()} data-testid="confirmDelete">
        {busy ? t('Deleting…') : title}
      </button>
    </Sheet>
  )
}
