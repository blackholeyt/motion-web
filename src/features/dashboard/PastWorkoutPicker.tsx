import { Shuffle } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dayKey } from '../../domain/measurement'
import { useT } from '../../i18n'
import { entriesFor } from '../../store/blueprints'
import { useBlueprints } from '../../store/hooks'
import { Sheet } from '../../ui/Sheet'
import { Group, RowButton, TextButton, Toggle } from '../../ui/controls'
import styles from './dashboard.module.css'

/** PastWorkoutPicker.swift: a completed workout on an earlier date, with usual sets and XP. */
export function PastWorkoutPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const navigate = useNavigate()
  const [day, setDay] = useState(() => dayKey(new Date()))
  const [includeTime, setIncludeTime] = useState(false)
  const [time, setTime] = useState('12:00')
  const blueprints = (useBlueprints() ?? []).filter((blueprint) => !blueprint.cardio_type)
  const counts = useLiveQuery(async () => {
    const result: Record<string, number> = {}
    for (const blueprint of blueprints) result[blueprint.id] = (await entriesFor(blueprint.id)).length
    return result
  }, [blueprints.map((blueprint) => blueprint.id).join()])

  const sessionDate = () => {
    const date = new Date(`${day}T${includeTime ? time : '00:00'}:00`)
    return (date > new Date() ? new Date() : date).toISOString()
  }
  const go = (query: string) => {
    onClose()
    navigate(`/workout/new?${query}`, { state: { retrospectiveDate: sessionDate(), returnTo: '/' } })
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('Log past workout')} fullScreen leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}>
      <Group footer={t('Record a completed workout with your usual sets and XP.')}>
        <label className={styles.formRow}>
          <span>{t('Date')}</span>
          <input type="date" value={day} max={dayKey(new Date())} onChange={(event) => event.target.value && setDay(event.target.value)} data-testid="pastDate" />
        </label>
        <Toggle label={t('Include time')} checked={includeTime} onChange={setIncludeTime} />
        {includeTime && (
          <label className={styles.formRow}>
            <span>{t('Time')}</span>
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </label>
        )}
      </Group>
      <Group title={t('Training')}>
        <RowButton onClick={() => go('freestyle=1')} testID="pastFreestyle">
          <Shuffle size={18} aria-hidden="true" /> {t('Freestyle strength')}
        </RowButton>
      </Group>
      <Group title={t('Your blueprints')}>
        {blueprints.length === 0 && <p className={styles.emptyRow}>{t('No strength blueprints yet. Start freestyle to add exercises.')}</p>}
        {blueprints.map((blueprint) => (
          <RowButton key={blueprint.id} tone="plain" disabled={!counts?.[blueprint.id]} onClick={() => go(`blueprint=${blueprint.id}`)} testID={`pastBlueprint-${blueprint.name}`}>
            <span className={styles.stack}>
              <strong>{blueprint.name}</strong>
              <small>{t('{0} exercises', [counts?.[blueprint.id] ?? 0])}</small>
            </span>
          </RowButton>
        ))}
      </Group>
    </Sheet>
  )
}
