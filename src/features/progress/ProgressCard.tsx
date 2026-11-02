import { Crown, Diamond, Info, Leaf, Shield, Star, Zap, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { Progress, RewardFrame, XPAward } from '../../domain/progress'
import { useT } from '../../i18n'
import { RanksSheet } from './RanksSheet'
import styles from './progress.module.css'

export const rankIcons: LucideIcon[] = [Diamond, Zap, Shield, Crown, Star, Leaf]

/** WorkoutProgressCard.swift: level, XP track, next rank and the award breakdown. */
export function ProgressCard({ progress, award, frame }: { progress: Progress; award?: XPAward | null; frame?: RewardFrame }) {
  const { t, locale } = useT()
  const [rules, setRules] = useState(false)
  const shown = frame?.progress ?? progress
  const RankIcon = rankIcons[shown.rank.index]!
  const number = (value: number) => new Intl.NumberFormat(locale).format(value)
  return (
    <section className={styles.card} data-testid="progressCard">
      <div className={styles.cardTop}>
        <span className={styles.rank}>
          <RankIcon size={14} aria-hidden /> {t(shown.rank.name).toUpperCase()}
        </span>
        <button type="button" className={styles.info} onClick={() => setRules(true)} aria-label={t('Ranks and workout XP')}>
          <Info size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.levelRow}>
        <span className={styles.level} aria-label={t('Level {0}', [progress.level])}>
          {t('Level {0}', [shown.level])}
        </span>
        <span className={styles.xp}>{award ? `+${award.total} XP` : `${number(progress.totalXP)} XP`}</span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={t('Level {0} progress', [progress.level])}
        aria-valuemin={0}
        aria-valuemax={progress.requiredXP}
        aria-valuenow={progress.levelXP}
        aria-valuetext={t('{0} of {1} XP', [progress.levelXP, progress.requiredXP])}
      >
        <span className={styles.fill} style={{ width: `${Math.min(Math.max(shown.fraction, 0), 1) * 100}%`, boxShadow: frame?.pulse ? `0 0 ${6 + frame.pulse * 6}px var(--action)` : undefined }} />
      </div>
      <p className={styles.caption}>{t('{0} XP to Level {1}', [shown.remainingXP, shown.level + 1])}</p>
      <p className={styles.caption}>
        {progress.nextRank && progress.nextRankXP !== null
          ? t('{0} at Level {1} · {2} XP away', [t(progress.nextRank.name), progress.nextRank.firstLevel, number(progress.nextRankXP)])
          : t('Legend rank · Your next level is always ahead.')}
      </p>
      {award ? (
        <div className={styles.award}>
          <AwardRow title={t('Workout complete')} xp={award.completionXP} />
          {award.improvements > 0 && <AwardRow title={t('Load or rep improvements · {0}', [award.improvements])} xp={award.improvementXP} />}
          {award.records > 0 && <AwardRow title={t('Load records · {0}', [award.records])} xp={award.recordXP} />}
        </div>
      ) : (
        progress.totalXP === 0 && <p className={styles.muted}>{t('Your next completed workout starts your climb.')}</p>
      )}
      <RanksSheet open={rules} progress={progress} onClose={() => setRules(false)} />
    </section>
  )
}

function AwardRow({ title, xp }: { title: string; xp: number }) {
  return (
    <div className={styles.awardRow}>
      <span>{title}</span>
      <span>+{xp} XP</span>
    </div>
  )
}
