import { Cloud, HeartPulse, ShieldCheck, Smartphone, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useT } from '../../i18n'
import { acceptConsent } from '../../privacy/consent'
import { recordCloudConsent, signOut, useAccount } from '../../sync/account'
import { Continue, OnboardingPage, Quiet } from '../onboarding/OnboardingPage'
import { LegalLinks, LegalSheet, type LegalPage } from './LegalSheet'
import styles from './privacy.module.css'

export function ConsentCheck({ checked, onChange, children, testID }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; testID?: string }) {
  return (
    <label className={styles.check}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} data-testid={testID} />
      <span>{children}</span>
    </label>
  )
}

/**
 * First start: what Motion stores where, the legal texts, and the explicit consent to health data
 * (Art. 9 DSGVO). Someone who is already signed in (earlier versions) also confirms the cloud backup
 * or continues without the account.
 */
export function ConsentScreen() {
  const { t } = useT()
  const { account } = useAccount()
  const [health, setHealth] = useState(false)
  const [age, setAge] = useState(false)
  const [cloud, setCloud] = useState(false)
  const [legal, setLegal] = useState<LegalPage | null>(null)
  const ready = health && age && (!account || cloud)
  return (
    <>
      <OnboardingPage
        category="PRIVACY"
        title={t('Your data stays yours.')}
        detail={t('Before you start: what Motion stores and where.')}
        icon={ShieldCheck}
        titleID="consentTitle"
        footer={
          <>
            <Continue disabled={!ready} onClick={() => {
                acceptConsent({ cloud: Boolean(account) })
                if (account) void recordCloudConsent()
              }} testID="acceptConsent">
              {t('Agree and continue')}
            </Continue>
            {account && (
              <Quiet
                onClick={async () => {
                  await signOut()
                  if (health && age) acceptConsent({ cloud: false })
                }}
              >
                {t('Sign out and use without an account')}
              </Quiet>
            )}
          </>
        }
      >
        <ul className={styles.points}>
          <li>
            <Smartphone size={20} aria-hidden="true" />
            <span>{t('Training, body weight and sleep scores are saved on this device. No ads, no tracking, no analytics.')}</span>
          </li>
          <li>
            <HeartPulse size={20} aria-hidden="true" />
            <span>{t('Body weight and sleep scores are health data. Motion uses them only to show your progress.')}</span>
          </li>
          <li>
            <Cloud size={20} aria-hidden="true" />
            <span>{t('An account is optional. With one, your data is backed up on servers in Frankfurt (EU), operated by Supabase.')}</span>
          </li>
          <li>
            <Trash2 size={20} aria-hidden="true" />
            <span>{t('Export or delete everything at any time in Settings.')}</span>
          </li>
        </ul>
        <LegalLinks onOpen={setLegal} />
        <div className={styles.points}>
          <ConsentCheck checked={health} onChange={setHealth} testID="consentHealth">
            {t('I have read the privacy policy and agree that Motion processes my training and health data (body weight, sleep score) on this device.')}
          </ConsentCheck>
          <ConsentCheck checked={age} onChange={setAge} testID="consentAge">
            {t('I am at least 16 years old, or a parent agrees.')}
          </ConsentCheck>
          {account && (
            <ConsentCheck checked={cloud} onChange={setCloud} testID="consentCloud">
              {t('I agree that my training and health data are backed up in my account on Supabase servers in Frankfurt (EU).')}
            </ConsentCheck>
          )}
        </div>
      </OnboardingPage>
      <LegalSheet page={legal} onClose={() => setLegal(null)} />
    </>
  )
}
