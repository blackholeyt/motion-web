import { useT } from '../../i18n'
import { updateSettings, useSettings, type Appearance, type LanguageChoice } from '../../settings/deviceSettings'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { useOpening } from '../opening/OpeningContext'
import styles from './settings.module.css'

const appearances: Appearance[] = ['dark', 'light', 'system']
const titles: Record<Appearance, string> = { dark: 'Dark', light: 'Light', system: 'System' }

export function SettingsScreen() {
  const { t } = useT()
  const settings = useSettings()
  const opening = useOpening()
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
          <input
            type="checkbox"
            role="switch"
            className={styles.switch}
            checked={settings.openingAnimation}
            onChange={(event) => updateSettings({ openingAnimation: event.target.checked })}
          />
        </label>
        <p className={styles.caption}>{t('An optional cold-launch welcome, skipped when you have unfinished workouts.')}</p>
      </section>
      <section className={styles.group} aria-labelledby="language-title">
        <h2 id="language-title">{t('Language')}</h2>
        <label className={styles.row}>
          <span>{t('Language')}</span>
          <select
            value={settings.language}
            onChange={(event) => updateSettings({ language: event.target.value as LanguageChoice })}
          >
            <option value="device">{t('Device language')}</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </label>
      </section>
      <p className={styles.version}>{t('Version {version}', { version: __APP_VERSION__ })}</p>
    </>
  )
}
