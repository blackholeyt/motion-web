import { Check, Lock, MapPin } from 'lucide-react'
import { ranks, XP, type Progress } from '../../domain/progress'
import { useT } from '../../i18n'
import { Sheet } from '../../ui/Sheet'
import { TextButton } from '../../ui/controls'
import { rankIcons } from './ProgressCard'
import styles from './progress.module.css'

/** WorkoutRanksView.swift: "Your progression". */
export function RanksSheet({ open, progress, onClose }: { open: boolean; progress: Progress; onClose: () => void }) {
  const { t, locale } = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t('Your progression')} trailing={<TextButton strong onClick={onClose}>{t('Done')}</TextButton>}>
      <div className={styles.ranks}>
        <h2>{t('Built one session at a time.')}</h2>
        <p className={styles.muted}>{t('Your rank reflects the XP you’ve earned in Motion. Keep training at your own pace; time away never takes XP away.')}</p>
        <ul className={styles.card}>
          {ranks.map((rank) => {
            const Icon = rankIcons[rank.index]!
            const current = rank.index === progress.rank.index
            const unlocked = rank.index < progress.rank.index
            return (
              <li key={rank.name} className={styles.rankRow}>
                <span className={current ? styles.rankCurrent : styles.muted}>
                  <Icon size={24} aria-hidden />
                </span>
                <span className={styles.rankText}>
                  <strong>{t(rank.name)}</strong>
                  <small>{t('Level {0} · {1} XP', [rank.firstLevel, new Intl.NumberFormat(locale).format(rank.minimumXP)])}</small>
                </span>
                <span className={current ? styles.xp : styles.muted} aria-label={t(current ? 'Current rank' : unlocked ? 'Unlocked' : 'Not yet unlocked')}>
                  {current ? <MapPin size={18} aria-hidden="true" /> : unlocked ? <Check size={18} aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
                </span>
              </li>
            )
          })}
        </ul>
        <h3>{t('The rhythm of progress')}</h3>
        <p className={styles.muted}>
          {t('Start at Level 1. The first level-up takes 200 XP. Each next level costs 50 XP more, up to 600 XP per level from Level 9 onward. Unlock a new rank every five levels through Legend at Level 26; levels continue after that.')}
        </p>
        <p className={styles.actionText}>
          {t('Complete a workout: +{0} XP', [XP.completion])}
          <br />
          {t('Comparable load or rep improvement: +{0} XP per exercise', [XP.improvement])}
          <br />
          {t('Load record: +{0} XP per exercise', [XP.record])}
        </p>
        <p className={styles.muted}>
          {t('Compare with the most recent session for the same exercise identity, measurement, explicit targets and complete working sets. A load record must also exceed the all-time recorded load. One bonus per exercise: 25 XP for load or reps, or 75 XP for a load record, never both. First sessions and missing context earn completion XP only. Consistency acknowledgments carry no extra XP.')}
        </p>
        <p className={styles.muted}>
          {t('Optional body-weight check-in: +25 XP once per calendar day. Updating again that day or editing history earns no extra XP. Deleting a measurement preserves the day’s award. The reward is for checking in, regardless of weight direction.')}
        </p>
        <p className={styles.muted}>
          {t('Workout XP starts with newly completed workouts. Imported workouts earn no extra XP. Editing history preserves awards; deleting a workout removes its XP. Restoring a backup does not award extra XP.')}
        </p>
      </div>
    </Sheet>
  )
}
