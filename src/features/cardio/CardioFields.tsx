import { cardioActivities, draftKilometers, draftSeconds, paceInvalid, timeFromPace, type CardioDraft } from '../../domain/cardio'
import { paceLabel } from '../../domain/measurement'
import { useT } from '../../i18n'
import { Group, SelectRow, TextRow } from '../../ui/controls'
import styles from './cardio.module.css'

/** CardioFields: activity, time, distance and optional pace. */
export function CardioFields({ draft, onChange, isBlueprint = false, title }: { draft: CardioDraft; onChange: (draft: CardioDraft) => void; isBlueprint?: boolean; title?: string }) {
  const { t, locale } = useT()
  const seconds = draftSeconds(draft)
  const kilometers = draftKilometers(draft)
  const paced = draft.pace.trim() !== ''
  const change = (value: Partial<CardioDraft>) => {
    const next = { ...draft, ...value }
    onChange(isBlueprint ? timeFromPace(next, locale) : next)
  }
  return (
    <Group
      title={title}
      footer={
        isBlueprint
          ? t('Enter time and distance, or pace and distance. Pace accepts 5:30 or decimal minutes (5.5 or 5,5) and automatically updates target time. Clear pace to edit time directly.')
          : t('Enter elapsed minutes and distance in {0}. Leave pace empty to calculate it, or enter matching min:sec per {0}. Use up to two decimal places, without grouping.', [draft.unit])
      }
    >
      <SelectRow label={t('Activity')} value={draft.activity} onChange={(activity) => change({ activity })} options={cardioActivities.map((value) => ({ value, label: t(value) }))} />
      {isBlueprint && paced ? (
        <div className={styles.readonly}>
          <span>{t('Time · minutes')}</span>
          <span>{draft.minutes}</span>
        </div>
      ) : (
        <TextRow label={t('Time · minutes')} value={draft.minutes} onChange={(minutes) => change({ minutes })} inputMode="decimal" />
      )}
      <TextRow label={t('Distance · {0}', [draft.unit])} value={draft.distance} onChange={(distance) => change({ distance })} inputMode="decimal" />
      <TextRow label={t('Pace · min:sec/{0} (optional)', [draft.unit])} value={draft.pace} onChange={(pace) => change({ pace })} />
      {paceInvalid(draft) && (
        <p className={styles.error} role="alert">
          {t('Enter pace as min:sec (5:30) or decimal minutes (5.5 or 5,5).')}
        </p>
      )}
      {seconds !== null && kilometers !== null && (
        <div className={styles.readonly}>
          <span>{t('Calculated pace')}</span>
          <span data-testid="calculatedPace">{paceLabel(draft.unit, seconds / kilometers)}</span>
        </div>
      )}
    </Group>
  )
}
