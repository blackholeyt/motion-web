import { FlaskConical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { exitSandbox, useSandbox } from '../../app/sandbox'
import { useT } from '../../i18n'
import styles from './demo.module.css'

/** DemoChrome: a persistent label and exit while the demo or onboarding test runs. */
export function DemoBanner() {
  const { t } = useT()
  const sandbox = useSandbox()
  const navigate = useNavigate()
  if (!sandbox) return null
  const leave = async () => {
    await exitSandbox()
    navigate('/settings', { replace: true })
  }
  return (
    <div className={styles.banner} role="region" aria-label={t('Demo')}>
      <span className={styles.label}>
        <FlaskConical size={16} aria-hidden="true" /> {t(sandbox.kind === 'demo' ? 'DEMO · Synthetic data' : 'Onboarding test · Changes are not saved')}
      </span>
      <button type="button" onClick={leave} data-testid={sandbox.kind === 'demo' ? 'exitDemo' : 'closeOnboardingTest'}>
        {t(sandbox.kind === 'demo' ? 'Exit demo' : 'Close')}
      </button>
    </div>
  )
}
