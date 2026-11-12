import { ChevronDown, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useId, useState } from 'react'
import type { WeightUnit } from '../../data/types'
import { muscleLabel } from '../../domain/catalogue'
import { formatNumber, fromKilograms, loadTolerance } from '../../domain/measurement'
import { trendWeeks, type StrengthTrend, type TrendSeries } from '../../domain/strengthTrend'
import { useT, type Translate } from '../../i18n'
import styles from './trend.module.css'

type Mode = 'muscle' | 'exercise'

const width = 320
const height = 150

const signed = (value: number, locale: string, digits = 1) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0, signDisplay: 'exceptZero', useGrouping: false }).format(value)

/**
 * StrengthTrendCard: one line per muscle group or exercise, starting with whatever moved the most.
 * Muscle series are an index in percent, exercise series the load in the display unit.
 */
export function StrengthTrendCard({ trend, unit }: { trend: StrengthTrend; unit: WeightUnit }) {
  const { t, locale } = useT()
  const selectID = useId()
  const [mode, setMode] = useState<Mode>('muscle')
  const [chosen, setChosen] = useState<Record<Mode, string | null>>({ muscle: null, exercise: null })
  const list = mode === 'muscle' ? trend.muscles : trend.exercises
  const selected = list.find((series) => series.id === chosen[mode]) ?? list[0]
  const name = (series: TrendSeries) => (mode === 'muscle' ? muscleLabel(t, series.name) : series.name)
  const percent = (value: number) => `${signed(value, locale)} %`

  return (
    <section className={styles.card} data-testid="strengthTrend">
      <div className={styles.segmented} role="group" aria-label={t('Show trend by')}>
        {(['muscle', 'exercise'] as const).map((option) => (
          <button key={option} type="button" aria-pressed={mode === option} className={mode === option ? styles.selected : ''} onClick={() => setMode(option)} data-testid={`trendMode-${option}`}>
            {option === 'muscle' ? t('By muscle') : t('By exercise')}
          </button>
        ))}
      </div>
      {!selected ? (
        <div className={styles.empty}>
          <TrendingUp size={24} className={styles.muted} aria-hidden="true" />
          <h3>{t('No strength trend yet.')}</h3>
          <p className={styles.muted}>{t('Finish two workouts with the same exercise within {0} weeks to see its trend here.', [trendWeeks])}</p>
        </div>
      ) : (
        <>
          <div className={styles.subject}>
            <label htmlFor={selectID} className={styles.visuallyHidden}>
              {mode === 'muscle' ? t('Muscle') : t('Exercise')}
            </label>
            <select id={selectID} value={selected.id} onChange={(event) => setChosen({ ...chosen, [mode]: event.target.value })} data-testid="trendSubject">
              {list.map((series) => (
                <option key={series.id} value={series.id}>
                  {`${name(series)} · ${percent(series.percent)}`}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </div>
          <Summary series={selected} mode={mode} unit={unit} locale={locale} t={t} />
          <TrendChart series={selected} mode={mode} unit={unit} label={name(selected)} />
        </>
      )}
    </section>
  )
}

function Summary({ series, mode, unit, locale, t }: { series: TrendSeries; mode: Mode; unit: WeightUnit; locale: string; t: Translate }) {
  const direction = mode === 'exercise' ? (Math.abs(series.change) <= loadTolerance ? 0 : Math.sign(series.change)) : Math.sign(series.change)
  const Icon = direction > 0 ? TrendingUp : direction < 0 ? TrendingDown : Minus
  const title = direction > 0 ? t('Strength gain') : direction < 0 ? t('Strength loss') : t('No change')
  const headline = mode === 'exercise' ? `${signed(fromKilograms(unit, series.change), locale, 2)} ${unit}` : `${signed(series.change, locale)} %`
  const load = (kilograms: number) => formatNumber(fromKilograms(unit, kilograms), locale)
  const range = `${load(series.points[0]!.value)} → ${load(series.points.at(-1)!.value)} ${unit}`
  return (
    <div className={styles.summary} data-testid="trendSummary" data-direction={direction > 0 ? 'gain' : direction < 0 ? 'loss' : 'flat'}>
      <span className={direction < 0 ? styles.iconLoss : styles.icon} aria-hidden="true">
        <Icon size={20} />
      </span>
      <span className={styles.summaryText}>
        <small>{title}</small>
        <strong>{headline}</strong>
      </span>
      {mode === 'exercise' ? (
        <span className={styles.detail}>
          <span>{range}</span>
          <span>{`${signed(series.percent, locale)} %`}</span>
        </span>
      ) : (
        <span className={styles.detail}>{t('Average of {0} exercises', [series.exerciseCount])}</span>
      )}
    </div>
  )
}

function TrendChart({ series, mode, unit, label }: { series: TrendSeries; mode: Mode; unit: WeightUnit; label: string }) {
  const { t, locale } = useT()
  const values = series.points.map((point) => (mode === 'exercise' ? fromKilograms(unit, point.value) : point.value))
  const axisUnit = mode === 'exercise' ? unit : '%'
  const baseline = values[0] ?? 0
  const low = Math.min(...values)
  const high = Math.max(...values)
  const padding = Math.max((high - low) * 0.2, mode === 'exercise' ? fromKilograms(unit, 1) : 2)
  const min = low - padding
  const max = high + padding
  const times = series.points.map((point) => new Date(point.date).getTime())
  const first = Math.min(...times)
  const span = Math.max(Math.max(...times) - first, 1)
  const x = (time: number) => 8 + ((time - first) / span) * (width - 16)
  const y = (value: number) => height - 8 - ((value - min) / (max - min)) * (height - 16)
  const points = times.map((time, index) => [x(time), y(values[index]!)] as const)
  const date = (value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(value))
  const amount = (value: number) => `${formatNumber(value, locale)} ${axisUnit}`
  const area = `${points.map(([px, py]) => `${px},${py}`).join(' ')} ${points.at(-1)![0]},${y(baseline)} ${points[0]![0]},${y(baseline)}`
  return (
    <div className={styles.chart}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label={t('Strength trend of {0} in {1}', [label, axisUnit])}>
        <polygon points={area} className={styles.area} />
        <line x1={0} x2={width} y1={y(baseline)} y2={y(baseline)} className={styles.baseline} />
        <polyline points={points.map(([px, py]) => `${px},${py}`).join(' ')} className={styles.line} />
        {points.map(([px, py], index) => (
          <circle key={series.points[index]!.date} cx={px} cy={py} r={points.length > 20 ? 2.5 : 3.5} className={styles.point}>
            <title>{`${date(series.points[index]!.date)}: ${amount(values[index]!)}`}</title>
          </circle>
        ))}
      </svg>
      <div className={styles.axis} aria-hidden="true">
        <span>{date(series.points[0]!.date)}</span>
        <span>{t('Baseline · {0}', [amount(baseline)])}</span>
        <span>{date(series.points.at(-1)!.date)}</span>
      </div>
    </div>
  )
}
