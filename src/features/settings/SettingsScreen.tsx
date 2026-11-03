import { useState } from 'react'
import { useT } from '../../i18n'
import { platform } from '../../platform'
import { updateSettings, useSettings, type Appearance, type LanguageChoice } from '../../settings/deviceSettings'
import { updatePreferences, usePreferences } from '../../store/profile'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, RowButton, SelectRow, TextButton, Toggle } from '../../ui/controls'
import { useOpening } from '../opening/OpeningContext'
import { RestNotificationSettings } from './RestNotificationSettings'
import { ProfileSheet } from '../body/ProfileSheet'
import { MiniDemo } from '../onboarding/MiniDemo'
import { WorkoutPicker } from '../dashboard/WorkoutPicker'
import { enterSandbox, useSandbox } from '../../app/sandbox'
import { seedDemo } from '../demo/seed'
import { useNavigate } from 'react-router-dom'
import { exportBackup } from '../../store/backup'
import { exportCSV } from '../../store/csvExport'
import { downloadFile } from '../../ui/download'
import { useConsent } from '../../privacy/consent'
import { LegalSheet, type LegalPage } from '../privacy/LegalSheet'
import { DeleteDataSheet, type DeleteMode } from '../privacy/DeleteDataSheet'
import { SleepScores } from '../body/SleepScores'
import { WeightCelebration } from '../body/WeightCelebration'
import { bodyWeightGoals, type BodyWeightGoal } from '../../domain/body'
import { updateProfile, useProfile } from '../../store/profile'
import { AccountGroup } from '../account/AccountGroup'
import { ImportSheet } from '../import/ImportSheet'
import styles from './settings.module.css'

const appearances: Appearance[] = ['dark', 'light', 'system']
const titles: Record<Appearance, string> = { dark: 'Dark', light: 'Light', system: 'System' }

export function SettingsScreen() {
  const { t, locale } = useT()
  const settings = useSettings()
  const consent = useConsent()
  const [legal, setLegal] = useState<LegalPage | null>(null)
  const [deleting, setDeleting] = useState<DeleteMode | null>(null)
  const preferences = usePreferences()
  const opening = useOpening()
  const [notifications, setNotifications] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [sleep, setSleep] = useState(false)
  const [goalPreview, setGoalPreview] = useState(false)
  const profile = useProfile()
  const sandbox = useSandbox()
  const navigate = useNavigate()
  const [howItWorks, setHowItWorks] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const enter = async (kind: 'demo' | 'onboardingTest') => {
    try {
      await enterSandbox(kind, kind === 'demo' ? () => seedDemo() : undefined)
      navigate('/', { replace: true })
    } catch (failure) {
      setMessage((failure as Error).message)
    }
  }
  const download = async (build: () => Promise<File>) => {
    try {
      downloadFile(await build())
    } catch (failure) {
      setMessage((failure as Error).message)
    }
  }
  if (howItWorks) return <MiniDemo onClose={() => setHowItWorks(false)} onStart={() => setChoosing(true)} />
  const rest = preferences.restTimerSeconds
  const profileRows = (
    <>
      <RowButton tone="plain" onClick={() => setProfileOpen(true)} testID="openProfile">
        {t('Profile & body weight')}
      </RowButton>
      <RowButton tone="plain" onClick={() => setSleep(true)}>
        {t('Sleep scores')}
      </RowButton>
    </>
  )
  return (
    <>
      <ScreenHeader title={t('Settings')} />
      <Group
        title={t('Help & Privacy')}
        footer={consent ? t('Consent given on {0}. You can withdraw it by deleting your data or account.', [new Date(consent.accepted_at).toLocaleDateString(locale)]) : undefined}
      >
        <RowButton tone="plain" onClick={() => setHowItWorks(true)} testID="previewOnboarding">
          {t('How it works')}
        </RowButton>
        {!sandbox && (
          <RowButton tone="plain" onClick={() => enter('onboardingTest')} testID="testOnboarding">
            {t('Test onboarding')}
          </RowButton>
        )}
        <RowButton tone="plain" onClick={() => setLegal('privacy')} testID="settingsPrivacyPolicy">
          {t('Privacy policy')}
        </RowButton>
        <RowButton tone="plain" onClick={() => setLegal('about')} testID="settingsAbout">
          {t('About this project')}
        </RowButton>
      </Group>
      {sandbox ? (
        <Group title={t('Local account')}>{profileRows}</Group>
      ) : (
        <AccountGroup onDelete={setDeleting}>{profileRows}</AccountGroup>
      )}
      <section className={styles.group} aria-labelledby="appearance-title">
        <h2 id="appearance-title">{t('Appearance')}</h2>
        <div className={styles.segmented} role="radiogroup" aria-labelledby="appearance-title">
          {appearances.map((choice) => (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={settings.appearance === choice}
              className={settings.appearance === choice ? styles.selected : ''}
              onClick={() => updateSettings({ appearance: choice })}
            >
              {t(titles[choice])}
            </button>
          ))}
        </div>
        <p className={styles.caption}>{t('System follows your device’s appearance.')}</p>
        <button type="button" className={styles.row} onClick={opening.show}>
          {t('Preview Opening')}
        </button>
        <label className={styles.row}>
          <span>{t('Opening Animation')}</span>
          <input type="checkbox" role="switch" className={styles.switch} checked={settings.openingAnimation} onChange={(event) => updateSettings({ openingAnimation: event.target.checked })} />
        </label>
        <p className={styles.caption}>{t('An optional cold-launch welcome, skipped when you have unfinished workouts.')}</p>
      </section>
      <section className={styles.group} aria-labelledby="language-title">
        <h2 id="language-title">{t('Language')}</h2>
        <label className={styles.row}>
          <span>{t('Language')}</span>
          <select value={settings.language} onChange={(event) => updateSettings({ language: event.target.value as LanguageChoice })}>
            <option value="device">{t('Device language')}</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </label>
      </section>
      <Group
        title={t('Feedback')}
        footer={
          platform.haptics.supported
            ? t('Tactile feedback for choices, completed sets, saved changes, rest completion and rewards. Turn off to silence all Motion haptics; system controls may still provide their own feedback. Animations follow Reduce Motion.')
            : t('This browser cannot vibrate (for example Safari on iPhone). The setting applies on devices that support it.')
        }
      >
        <Toggle label={t('Quiet mode')} checked={preferences.quietMode} onChange={(quietMode) => updatePreferences({ quietMode })} />
        <p className={styles.caption}>{t('Hide ranks and large reward presentations. Workouts and earned XP are still saved.')}</p>
        <Toggle label={t('App Haptics')} checked={preferences.haptics} onChange={(haptics) => updatePreferences({ haptics })} />
      </Group>
      <Group title={t('Rest alerts')}>
        <RowButton tone="plain" onClick={() => setNotifications(true)}>
          {t('Rest notifications')}
        </RowButton>
      </Group>
      <Group title={t('Tracking')}>
        <SelectRow<BodyWeightGoal>
          label={t('Body-weight goal')}
          value={profile?.body_weight_goal ?? 'maintain'}
          onChange={(body_weight_goal) => updateProfile({ body_weight_goal })}
          options={bodyWeightGoals.map((goal) => ({ value: goal.value, label: t(goal.title) }))}
        />
        <RowButton onClick={() => setGoalPreview(true)} testID="previewWeightGoalCelebration">
          {t('Preview weight-goal celebration')}
        </RowButton>
        <Toggle label={t('Show body-weight tracking')} checked={preferences.bodyWeightTrackingVisible} onChange={(bodyWeightTrackingVisible) => updatePreferences({ bodyWeightTrackingVisible })} />
        <p className={styles.caption}>{t('Hide weight charts and check-in prompts independently. Weighing is never required for workout progress; existing measurements and XP are kept.')}</p>
        <Toggle label={t('Track Repetitions')} checked={preferences.trackReps} onChange={(trackReps) => updatePreferences({ trackReps })} />
        <div className={styles.slider}>
          <label htmlFor="rest-timer">{t('Rest Timer: {0}m {1}s', [Math.floor(rest / 60), rest % 60])}</label>
          <input
            id="rest-timer"
            type="range"
            min={5}
            max={240}
            step={5}
            value={Math.min(Math.max(rest, 5), 240)}
            aria-valuetext={t('{0} seconds', [rest])}
            onChange={(event) => updatePreferences({ restTimerSeconds: Number(event.target.value) })}
          />
          <span className={styles.sliderEnds}>
            <span>5s</span>
            <span>4 min</span>
          </span>
        </div>
      </Group>
      {sandbox ? (
        <Group title={t('Demo only')}>
          <p className={styles.caption}>{t('All values are synthetic. Changes are discarded when you exit. Import and export are unavailable in the demo.')}</p>
        </Group>
      ) : (
        <>
          <Group
            title={t('Demonstration')}
            footer={t('Explore six weeks of synthetic training in a temporary demo. Your training, awards, settings and drafts stay separate.')}
          >
            <RowButton tone="plain" onClick={() => enter('demo')} testID="enterDemo">
              {t('Explore demo')}
            </RowButton>
          </Group>
          <Group
            title={t('Backup')}
            footer={t('Import adds workouts, drafts, exercises, blueprints, body weight, sleep scores, XP and your profile from a backup of the iOS app; existing records stay unchanged. JSON is the complete backup. CSV is a table of workouts, sets, body weight and sleep scores for spreadsheets.')}
          >
            <RowButton tone="plain" onClick={() => setImporting(true)} testID="importBackup">
              {t('Import from the iOS app')}
            </RowButton>
            <RowButton tone="plain" onClick={() => void download(exportBackup)} testID="exportBackup">
              {t('Export backup (JSON)')}
            </RowButton>
            <RowButton tone="plain" onClick={() => void download(exportCSV)} testID="exportCSV">
              {t('Export table (CSV)')}
            </RowButton>
          </Group>
          <ImportSheet open={importing} onClose={() => setImporting(false)} />
        </>
      )}
      <WorkoutPicker open={choosing} onClose={() => setChoosing(false)} />
      <ConfirmDialog open={message !== null} title={t('Motion')} message={message ? t(message) : ''} onDismiss={() => setMessage(null)} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setMessage(null) }]} />
      <LegalSheet page={legal} onClose={() => setLegal(null)} />
      <DeleteDataSheet mode={deleting} onClose={() => setDeleting(null)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SleepScores open={sleep} onClose={() => setSleep(false)} />
      {goalPreview && (
        <WeightCelebration
          preview
          unit={profile?.body_weight_unit ?? 'kg'}
          result={{ kilograms: profile?.target_weight_kg ?? 70, achievedTarget: profile?.target_weight_kg ?? 70, date: new Date().toISOString(), earnedXP: 0, isCorrection: false }}
          onContinue={() => setGoalPreview(false)}
        />
      )}
      <p className={styles.version}>{t('Version {version}', { version: __APP_VERSION__ })}</p>
      <Sheet open={notifications} onClose={() => setNotifications(false)} title={t('Rest notifications')} leading={<TextButton onClick={() => setNotifications(false)}>{t('Done')}</TextButton>}>
        <RestNotificationSettings />
      </Sheet>
    </>
  )
}
