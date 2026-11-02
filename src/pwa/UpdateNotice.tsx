import { useRegisterSW } from 'virtual:pwa-register/react'
import { useT } from '../i18n'
import styles from './pwa.module.css'

/** Registers the service worker; with autoUpdate a reload offer appears when a new build is waiting. */
export function UpdateNotice() {
  const { t } = useT()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className={styles.toast} role="status">
      <span>{t('A new version is ready.')}</span>
      <button type="button" onClick={() => void updateServiceWorker(true)}>
        {t('Reload')}
      </button>
    </div>
  )
}
