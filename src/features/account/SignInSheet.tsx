import { useState } from 'react'
import { useT } from '../../i18n'
import { Sheet } from '../../ui/Sheet'
import { Group, PrimaryButton, TextButton } from '../../ui/controls'
import controls from '../../ui/controls.module.css'
import { sendCode, signInWithGoogle, verifyCode } from '../../sync/account'
import { acceptCloudConsent, getConsent } from '../../privacy/consent'
import { ConsentCheck } from '../privacy/ConsentScreen'
import styles from './account.module.css'

/** Supabase errors in plain words; unknown ones keep their own message. */
function explain(failure: unknown): string {
  const error = failure as { name?: string; status?: number; code?: string; message?: string }
  if (navigator.onLine === false) return 'You are offline. Connect to the internet to sign in.'
  if (error.name === 'AuthRetryableFetchError' || (failure instanceof TypeError && /fetch|network|load failed/i.test(error.message ?? ''))) {
    return 'Motion cannot reach the server right now. Try again in a moment.'
  }
  if (error.status === 429 || error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') return 'Too many attempts. Wait a minute and try again.'
  if (error.code === 'otp_expired' || /token has expired or is invalid/i.test(error.message ?? '')) return 'This code is wrong or has expired. Request a new one.'
  return error.message ?? String(failure)
}

const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
const validCode = (code: string) => /^\d{6,10}$/.test(code.trim())

/** Google or a 6-digit e-mail code. No password and no magic link (it would open outside the installed app). */
export function SignInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cloud, setCloud] = useState(() => Boolean(getConsent()?.cloud_accepted_at))
  const run = async (work: () => Promise<void>) => {
    // The cloud consent is recorded when it is acted on, and again with the login (recordCloudConsent).
    if (!getConsent()?.cloud_accepted_at) acceptCloudConsent()
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (failure) {
      setError(t(explain(failure)))
    } finally {
      setBusy(false)
    }
  }
  const close = () => {
    setCode('')
    setSentTo(null)
    setError(null)
    onClose()
  }
  if (!open) return null
  return (
    <Sheet open onClose={close} title={t('Sign in')} leading={<TextButton onClick={close}>{t('Cancel')}</TextButton>}>
      <p className={styles.intro}>{t('Back up your training and use it on several devices. Your data stays on this device as well and works offline.')} {t('New accounts also need the access code from Mathis.')}</p>
      <Group footer={t('You can withdraw this at any time by deleting your account in Settings.')}>
        <ConsentCheck checked={cloud} onChange={setCloud} testID="signInConsent">
          {t('I agree that my training and health data are backed up in my account on Supabase servers in Frankfurt (EU).')}
        </ConsentCheck>
      </Group>
      <Group>
        <button type="button" className={styles.google} onClick={() => run(signInWithGoogle)} disabled={busy || !cloud} data-testid="signInGoogle">
          {t('Continue with Google')}
        </button>
      </Group>
      {sentTo === null ? (
        <Group title={t('Or with an e-mail code')} footer={t('We send you a 6-digit code. No password needed.')}>
          <div className={controls.field}>
            <label htmlFor="sign-in-email">{t('E-mail')}</label>
            <input id="sign-in-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <PrimaryButton
            disabled={busy || !cloud || !validEmail(email)}
            testID="sendCode"
            onClick={() =>
              run(async () => {
                await sendCode(email)
                setSentTo(email.trim())
              })
            }
          >
            {t('Send code')}
          </PrimaryButton>
        </Group>
      ) : (
        <Group title={t('Enter code')} footer={t('Sent to {email}. The code is valid for one hour.', { email: sentTo })}>
          <div className={controls.field}>
            <label htmlFor="sign-in-code">{t('6-digit code')}</label>
            <input id="sign-in-code" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />
          </div>
          <PrimaryButton disabled={busy || !validCode(code)} testID="verifyCode" onClick={() => run(async () => {
            await verifyCode(sentTo, code)
            close()
          })}>
            {t('Sign in')}
          </PrimaryButton>
          <TextButton disabled={busy} onClick={() => run(() => sendCode(sentTo))}>
            {t('Send a new code')}
          </TextButton>
          <TextButton disabled={busy} onClick={() => setSentTo(null)}>
            {t('Use another e-mail')}
          </TextButton>
        </Group>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </Sheet>
  )
}
