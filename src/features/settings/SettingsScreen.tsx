import { useState } from 'react'
import { useT } from '../../i18n'
import { platform } from '../../platform'
import { updateSettings, useSettings, type Appearance, type LanguageChoice } from '../../settings/deviceSettings'
import { updatePreferences, usePreferences } from '../../store/profile'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { Sheet } from '../../ui/Sheet'
import { Group, RowButton, SelectRow, TextButton, Toggle } from '../../ui/controls'
import { useOpening } from '../opening/OpeningContext'
import { RestNotificationSettings } from './RestNotificationSettings'
import { ProfileSheet } from '../body/ProfileSheet'
import { SleepScores } from '../body/SleepScores'
import { WeightCelebration } from '../body/WeightCelebration'
import { bodyWeightGoals, type BodyWeightGoal } from '../../domain/body'
import { updateProfile, useProfile } from '../../store/profile'
import styles from './settings.module.css'

const appearances: Appearance[] = ['dark', 'light', 'system']
const titles: Record<Appearance, string> = { dark: 'Dark', light: 'Light', system: 'System' }

export function SettingsScreen() {
  const { t } = useT()
  const settings = useSettings()
  const preferences = usePreferences()
  const opening = useOpening()
  const [notifications, setNotifications] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [sleep, setSleep] = useState(false)
  const [goalPreview, setGoalPreview] = useState(false)
  const profile = useProfile()
  const rest = preferences.restTimerSeconds
  return (
    <>
      <ScreenHeader title={t('Settings')} />
      <Group title={t('Local account')} footer={t('Stored on this device for now. Account sign-in and cloud backup arrive in a later version.')}>
        <RowButton tone="plain" onClick={() => setProfileOpen(true)} testID="openProfile">
          {t('Profile & body weight')}
        </RowButton>
        <RowButton tone="plain" onClick={() => setSleep(true)}>
          {t('Sleep scores')}
        </RowButton>
      </Group>
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
