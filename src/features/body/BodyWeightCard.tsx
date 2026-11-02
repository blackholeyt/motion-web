import { PlusCircle, Scale } from 'lucide-react'
import { useState } from 'react'
import { loadLabel } from '../../domain/measurement'
import { useT } from '../../i18n'
import { useBodyWeights } from '../../store/body'
import { useProfile } from '../../store/profile'
import { BodyWeightEditor } from './BodyWeightEditor'
import { WeightChart } from './WeightChart'
import { WeightHistory } from './WeightHistory'
import styles from './body.module.css'

/** BodyWeightDashboardCard. */
export function BodyWeightCard() {
  const { t, locale } = useT()
  const profile = useProfile()
  const unit = profile?.body_weight_unit ?? 'kg'
  const entries = useBodyWeights() ?? []
  const [checkingIn, setCheckingIn] = useState(false)
  const [history, setHistory] = useState(false)
  const latest = entries.at(-1)
  return (
    <section className={styles.card} data-testid="bodyWeightCard">
      <div className={styles.between}>
        <h2 className={styles.title}>
          <Scale size={18} aria-hidden="true" /> {t('Body weight')}
        </h2>
        <button type="button" className={styles.link} onClick={() => setHistory(true)} data-testid="weightHistory">
          {t('History')}
        </button>
      </div>
      {latest ? (
        <>
          <span className={styles.big}>{loadLabel(unit, latest.kilograms, locale)}</span>
          <span className={styles.caption}>{t('Latest check-in · {0}', [new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(latest.recorded_at))])}</span>
          <WeightChart entries={entries.slice(-30)} unit={unit} target={profile?.target_weight_kg ?? null} />
          <span className={styles.caption}>{t(entries.length === 1 ? 'Your first point is saved. Future check-ins build your trend.' : 'Your last 30 check-ins. Every direction is shown equally.')}</span>
        </>
      ) : (
        <>
          <span className={styles.lead}>{t('Start with one check-in.')}</span>
          <span className={styles.muted}>{t('See your weight over time, at your own pace.')}</span>
        </>
      )}
      <button type="button" className={styles.primary} onClick={() => setCheckingIn(true)} data-testid="updateWeight">
        <PlusCircle size={18} aria-hidden="true" /> {t('Update weight')}
      </button>
      <span className={styles.caption}>{t('+25 XP for your first check-in each day')}</span>
      {checkingIn && <BodyWeightEditor unit={unit} onClose={() => setCheckingIn(false)} />}
      <WeightHistory open={history} onClose={() => setHistory(false)} />
    </section>
  )
}
