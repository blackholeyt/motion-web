import { useState } from 'react'
import { useT } from '../../i18n'
import { decideGuestData, useAccount } from '../../sync/account'
import { ConfirmDialog } from '../../ui/Sheet'

/** First login on a device that already holds training without an account (decision 4, phase 0). */
export function GuestDataPrompt() {
  const { t } = useT()
  const { guestDecision } = useAccount()
  const [busy, setBusy] = useState(false)
  const decide = async (take: boolean) => {
    setBusy(true)
    try {
      await decideGuestData(take)
    } finally {
      setBusy(false)
    }
  }
  return (
    <ConfirmDialog
      open={guestDecision !== null && !busy}
      title={t('Add this device’s training to your account?')}
      message={t('This device already holds training, profile and body-weight data without an account. Add it to {email} to back it up, or keep it only on this device.', {
        email: guestDecision?.email ?? t('your account'),
      })}
      onDismiss={() => {}}
      actions={[
        { label: t('Add to account'), role: 'default', onSelect: () => void decide(true) },
        { label: t('Keep only on this device'), role: 'cancel', onSelect: () => void decide(false) },
      ]}
    />
  )
}
