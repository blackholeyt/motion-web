import { useLiveQuery } from 'dexie-react-hooks'
import { Cloud, CloudAlert, CloudCheck, CloudOff, RefreshCw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { db } from '../../data/db'
import { useT, type Translate } from '../../i18n'
import { cloudConfigured } from '../../sync/client'
import { removeAccountFromDevice, signOut, unsyncedChanges, useAccount } from '../../sync/account'
import { announceDeletion } from '../privacy/DeletionNotice'
import type { DeleteMode } from '../privacy/DeleteDataSheet'
import { requestSync, useSyncStatus, type SyncStatus } from '../../sync/engine'
import { ConfirmDialog } from '../../ui/Sheet'
import { Group, RowButton } from '../../ui/controls'
import { ConflictSheet } from './ConflictSheet'
import { SignInSheet } from './SignInSheet'
import styles from './account.module.css'

/** Settings: the account, a quiet sync status, open conflicts and sign-out. Profile rows stay inside. */
export function AccountGroup({ children, onDelete }: { children: ReactNode; onDelete: (mode: DeleteMode) => void }) {
  const { t } = useT()
  const { account } = useAccount()
  const status = useSyncStatus()
  const conflicts = useLiveQuery(() => db.conflicts.count(), [account?.id]) ?? 0
  const [signingIn, setSigningIn] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState<number | null>(null)
  if (!cloudConfigured) {
    return (
      <Group title={t('Local account')} footer={t('Stored on this device for now. Account sign-in and cloud backup arrive in a later version.')}>
        {children}
        <DeleteDeviceRow onDelete={onDelete} />
      </Group>
    )
  }
  if (!account) {
    return (
      <>
        <Group title={t('Account')} footer={t('Without an account everything stays on this device. Sign in to back up your training and use it on several devices.')}>
          <RowButton onClick={() => setSigningIn(true)} testID="signIn">
            {t('Sign in')}
          </RowButton>
          {children}
          <DeleteDeviceRow onDelete={onDelete} />
        </Group>
        <SignInSheet open={signingIn} onClose={() => setSigningIn(false)} />
      </>
    )
  }
  const askSignOut = async () => setConfirmSignOut(await unsyncedChanges())
  return (
    <>
      <Group title={t('Account')} footer={t('Training is saved on this device first and backed up to the cloud whenever there is a connection.')}>
        <div className={styles.status} data-testid="syncStatus" data-state={status.state}>
          <StatusIcon status={status} />
          <span className={styles.statusText}>
            <span>{account.email ?? t('Signed in')}</span>
            <small>{describe(status, t)}</small>
          </span>
          {status.state !== 'syncing' && status.state !== 'signedOut' && (
            <button type="button" className={styles.refresh} aria-label={t('Sync now')} onClick={() => void requestSync()}>
              <RefreshCw size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        {status.state === 'signedOut' && (
          <RowButton onClick={() => setSigningIn(true)} testID="signInAgain">
            {t('Sign in again')}
          </RowButton>
        )}
        {status.state === 'deleted' && (
          <RowButton
            tone="destructive"
            testID="removeDeletedAccount"
            onClick={async () => {
              await removeAccountFromDevice()
              announceDeletion(t('The deleted account’s data was removed from this device.'))
            }}
          >
            {t('Remove its data from this device')}
          </RowButton>
        )}
        {conflicts > 0 && (
          <RowButton onClick={() => setReviewing(true)} testID="reviewConflicts">
            {t('Review changes from another device ({0})', [conflicts])}
          </RowButton>
        )}
        {children}
        <RowButton tone="destructive" onClick={() => void askSignOut()} testID="signOut">
          {t('Sign out')}
        </RowButton>
        <RowButton tone="destructive" onClick={() => onDelete('account')} testID="deleteAccount">
          {t('Delete account')}
        </RowButton>
      </Group>
      <SignInSheet open={signingIn} onClose={() => setSigningIn(false)} />
      <ConflictSheet open={reviewing} onClose={() => setReviewing(false)} />
      <ConfirmDialog
        open={confirmSignOut !== null}
        title={t('Sign out?')}
        message={
          confirmSignOut
            ? t('{0} changes are not backed up yet. If you sign out now, they stay on this device and upload the next time you sign in with this account.', [confirmSignOut])
            : t('Your training stays backed up in your account. This device then shows only data without an account.')
        }
        onDismiss={() => setConfirmSignOut(null)}
        actions={[
          { label: t('Cancel'), role: 'cancel', onSelect: () => setConfirmSignOut(null) },
          {
            label: t('Sign out'),
            role: 'destructive',
            onSelect: () => {
              setConfirmSignOut(null)
              void signOut()
            },
          },
        ]}
      />
    </>
  )
}

function DeleteDeviceRow({ onDelete }: { onDelete: (mode: DeleteMode) => void }) {
  const { t } = useT()
  return (
    <RowButton tone="destructive" onClick={() => onDelete('device')} testID="deleteDeviceData">
      {t('Delete data on this device')}
    </RowButton>
  )
}

function StatusIcon({ status }: { status: SyncStatus }) {
  const props = { size: 22, 'aria-hidden': true, className: styles.icon }
  if (status.state === 'offline') return <CloudOff {...props} />
  if (status.state === 'error' || status.state === 'signedOut' || status.state === 'deleted') return <CloudAlert {...props} />
  if (status.state === 'synced' && status.pending === 0) return <CloudCheck {...props} />
  return <Cloud {...props} />
}

export function describe(status: SyncStatus, t: Translate): string {
  switch (status.state) {
    case 'syncing':
      return t('Syncing…')
    case 'offline':
      return status.pending > 0 ? t('Offline · {0} changes waiting', [status.pending]) : t('Offline · saved on this device')
    case 'signedOut':
      return t('Session expired · changes stay on this device')
    case 'deleted':
      return t('This account was deleted on another device.')
    case 'error':
      return t('Backup paused: {0}', [status.error ?? ''])
    case 'synced':
      return status.pending > 0 ? t('{0} changes waiting', [status.pending]) : t('Everything backed up')
    default:
      return ''
  }
}
