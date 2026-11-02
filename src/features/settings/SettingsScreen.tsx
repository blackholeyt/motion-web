import { useState } from 'react'
import { useT } from '../../i18n'
import { platform } from '../../platform'
import { updateSettings, useSettings, type Appearance, type LanguageChoice } from '../../settings/deviceSettings'
import { updatePreferences, usePreferences } from '../../store/profile'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { Sheet } from '../../ui/Sheet'
import { Group, RowButton, TextButton, Toggle } from '../../ui/controls'
import { useOpening } from '../opening/OpeningContext'
import { RestNotificationSettings } from './RestNotificationSettings'
import styles from './settings.module.css'

const appearances: Appearance[] = ['dark', 'light', 'system']
const titles: Record<Appearance, string> = { dark: 'Dark', light: 'Light', system: 'System' }

export function SettingsScreen() {
  const { t } = useT()
  const settings = useSettings()
  const preferences = usePreferences()
  const opening = useOpening()
  const [notifications, setNotifications] = useState(false)
  const rest = preferences.restTimerSeconds
  return (
    <>
      <ScreenHeader title={t('Settings')} />
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
        <Toggle label={t('App Haptics')} checked={preferences.haptics} onChange={(haptics) => updatePreferences({ haptics })} />
      </Group>
      <Group title={t('Rest alerts')}>
        <RowButton tone="plain" onClick={() => setNotifications(true)}>
          {t('Rest notifications')}
        </RowButton>
      </Group>
      <Group title={t('Tracking')}>
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
      <p className={styles.version}>{t('Version {version}', { version: __APP_VERSION__ })}</p>
      <Sheet open={notifications} onClose={() => setNotifications(false)} title={t('Rest notifications')} leading={<TextButton onClick={() => setNotifications(false)}>{t('Done')}</TextButton>}>
        <RestNotificationSettings />
      </Sheet>
    </>
  )
}
