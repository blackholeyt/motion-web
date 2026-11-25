import { useState } from 'react'
import { useT } from '../../i18n'
import { Sheet } from '../../ui/Sheet'
import { Group, PrimaryButton, TextButton } from '../../ui/controls'
import controls from '../../ui/controls.module.css'
import { cancelAccessCode, redeemAccessCode, useAccount } from '../../sync/account'
import styles from './account.module.css'

/** Plain words for a failed redeem; unknown errors keep their own message. */
function explain(failure: unknown): string {
  const error = failure as { name?: string; message?: string }
  if (navigator.onLine === false) return 'You are offline. Connect to the internet to unlock your account.'
  if (error.name === 'AuthRetryableFetchError' || (failure instanceof TypeError && /fetch|network|load failed/i.test(error.message ?? ''))) {
    return 'Motion cannot reach the server right now. Try again in a moment.'
  }
  return error.message ?? String(failure)
}

/**
 * After the first sign-in of an account: the fixed access code Mats hands out (docs/DATENSCHUTZ.md,
 * section 5). It is asked once per account; the server checks it and locks after ten wrong tries.
 */
export function AccessCodeSheet() {
  const { t } = useT()
  const { accessNeeded } = useAccount()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!accessNeeded) return null
  const finish = () => {
    setCode('')
    setError(null)
  }
  const cancel = async () => {
    finish()
    await cancelAccessCode()
  }
  const unlock = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await redeemAccessCode(code)
      if (result === 'ok') finish()
      else if (result === 'locked') setError(t('Too many wrong codes. Wait 15 minutes and try again.'))
      else setError(t('This access code is not right.'))
    } catch (failure) {
      setError(t(explain(failure)))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open onClose={() => void cancel()} title={t('Access code')} leading={<TextButton onClick={() => void cancel()}>{t('Cancel')}</TextButton>}>
      <p className={styles.intro}>
        {t('Motion is for friends only. Enter the access code you got from Mats. You need it only once for this account.')}
      </p>
      <Group footer={accessNeeded.email ? t('Signed in as {email}.', { email: accessNeeded.email }) : undefined}>
        <div className={controls.field}>
          <label htmlFor="access-code">{t('Access code')}</label>
          <input
            id="access-code"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && code.trim() && !busy) void unlock()
            }}
            data-testid="accessCode"
          />
        </div>
        <PrimaryButton disabled={busy || !code.trim()} testID="redeemAccessCode" onClick={() => void unlock()}>
          {t('Unlock')}
        </PrimaryButton>
      </Group>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </Sheet>
  )
}
