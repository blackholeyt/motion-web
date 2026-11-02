import { Share, SquarePlus, X } from 'lucide-react'
import { useT } from '../i18n'
import { updateSettings, useSettings } from '../settings/deviceSettings'
import { currentEnvironment, installHintKind } from './installState'
import styles from './pwa.module.css'

export function InstallHint() {
  const { t } = useT()
  const { installHintDismissed } = useSettings()
  const kind = installHintKind(currentEnvironment())
  if (kind === 'none' || installHintDismissed) return null
  const dismiss = () => updateSettings({ installHintDismissed: true })
  return (
    <aside className={styles.sheet} aria-labelledby="install-title" data-testid="install-hint">
      <div className={styles.sheetHeader}>
        <img src="./icons/apple-touch-icon.png" alt="" width={44} height={44} className={styles.icon} />
        <h2 id="install-title">{t('Install Motion')}</h2>
        <button type="button" className={styles.close} onClick={dismiss} aria-label={t('Not now')}>
          <X size={20} />
        </button>
      </div>
      <p>{t('Add Motion to your Home Screen to open it like an app and train offline.')}</p>
      {kind === 'ios-other-browser' ? (
        <p>{t('Open in Safari to install Motion on your iPhone.')}</p>
      ) : (
        <ol className={styles.steps}>
          <li>
            {t('Tap Share in Safari’s toolbar.')}
            <Share size={18} aria-hidden="true" className={styles.inlineIcon} />
          </li>
          <li>
            {t('Choose “Add to Home Screen”.')}
            <SquarePlus size={18} aria-hidden="true" className={styles.inlineIcon} />
          </li>
          <li>{t('Tap “Add”, then open Motion from your Home Screen.')}</li>
        </ol>
      )}
      <button type="button" className={styles.secondary} onClick={dismiss}>
        {t('Not now')}
      </button>
    </aside>
  )
}
