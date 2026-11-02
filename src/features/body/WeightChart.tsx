import { Target } from 'lucide-react'
import type { BodyWeight, WeightUnit } from '../../data/types'
import { fromKilograms, loadLabel } from '../../domain/measurement'
import { useT } from '../../i18n'
import styles from './body.module.css'

const width = 320
const height = 150

/** BodyWeightChart: line and points in the display unit, optional dashed target line. */
export function WeightChart({ entries, unit, target }: { entries: BodyWeight[]; unit: WeightUnit; target: number | null }) {
  const { t, locale } = useT()
  const goal = target !== null && Number.isFinite(target) && target > 0 ? target : null
  const values = entries.map((entry) => fromKilograms(unit, entry.kilograms))
  const all = goal === null ? values : [...values, fromKilograms(unit, goal)]
  const low = Math.min(...all)
  const high = Math.max(...all)
  const padding = Math.max((high - low) * 0.2, fromKilograms(unit, 1))
  const min = Math.max(0, low - padding)
  const max = high + padding
  const times = entries.map((entry) => new Date(entry.recorded_at).getTime())
  const first = Math.min(...times)
  const span = Math.max(Math.max(...times) - first, 1)
  const x = (time: number) => (entries.length === 1 ? width / 2 : 8 + ((time - first) / span) * (width - 16))
  const y = (value: number) => height - 8 - ((value - min) / (max - min)) * (height - 16)
  const points = times.map((time, index) => [x(time), y(values[index]!)] as const)
  const latest = entries.at(-1)
  const date = (value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(value))
  return (
    <div className={styles.chart}>
      {goal !== null && (
        <>
          <div className={styles.between}>
            <span className={styles.inline}>
              <Target size={16} aria-hidden="true" /> {t('Target weight')}
            </span>
            <span className={styles.number}>{loadLabel(unit, goal, locale)}</span>
          </div>
          {latest && <p className={styles.caption}>{t('Distance to target · {0}', [loadLabel(unit, Math.abs(latest.kilograms - goal), locale)])}</p>}
        </>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label={t('Body weight history in {0}', [unit])}>
        {goal !== null && <line x1={0} x2={width} y1={y(fromKilograms(unit, goal))} y2={y(fromKilograms(unit, goal))} className={styles.targetLine} />}
        {points.length > 1 && <polyline points={points.map(([px, py]) => `${px},${py}`).join(' ')} className={styles.line} />}
        {points.map(([px, py], index) => (
          <circle key={entries[index]!.id} cx={px} cy={py} r={3.5} className={styles.point}>
            <title>{`${date(entries[index]!.recorded_at)}: ${loadLabel(unit, entries[index]!.kilograms, locale)}`}</title>
          </circle>
        ))}
      </svg>
      <div className={styles.axis} aria-hidden="true">
        <span>{entries[0] && date(entries[0].recorded_at)}</span>
        <span>{unit}</span>
        <span>{latest && entries.length > 1 && date(latest.recorded_at)}</span>
      </div>
    </div>
  )
}
