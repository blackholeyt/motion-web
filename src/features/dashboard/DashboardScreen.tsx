import { ArrowUpRight, Dumbbell } from 'lucide-react'
import { useT } from '../../i18n'
import { SectionTitle } from '../../ui/components'
import { PhaseNotice } from '../../ui/PhaseNotice'
import styles from './dashboard.module.css'

export function DashboardScreen() {
  const { t, locale } = useT()
  const date = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.date}>{date}</p>
        <h1 className={styles.greeting}>{t('Your training,\nin perspective.')}</h1>
      </header>
      <button type="button" className={styles.start} disabled aria-describedby="start-phase">
        <span className={styles.startTop}>
          <span className={styles.startLabel}>
            <Dumbbell size={14} aria-hidden="true" /> {t('YOUR NEXT SESSION')}
          </span>
          <span className={styles.startArrow} aria-hidden="true">
            <ArrowUpRight size={22} />
          </span>
        </span>
        <span className={styles.startTitle}>{t('Start workout')}</span>
        <span className={styles.startSubtitle}>{t('Choose your blueprint. Make it count.')}</span>
      </button>
      <PhaseNotice id="start-phase" phase={2} />
      <SectionTitle title={t('Calendar weeks')} subtitle={t('Monday–Sunday · 5 full weeks and this week')} />
      <PhaseNotice phase={3} />
    </div>
  )
}
