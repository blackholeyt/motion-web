import { useLiveQuery } from 'dexie-react-hooks'
import { Link2, Link2Off } from 'lucide-react'
import { useT } from '../../i18n'
import { useLibrary } from '../../store/hooks'
import { linkSnapshot, linkableSnapshots } from '../../store/library'
import { Sheet } from '../../ui/Sheet'
import { TextButton } from '../../ui/controls'
import styles from './exercises.module.css'

const unlinked = '__unlinked__'

/** ExerciseHistoryMappingView.swift: link history entries to a library exercise explicitly. */
export function HistoryLinks({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useT()
  const library = useLibrary() ?? []
  const entries = useLiveQuery(linkableSnapshots, []) ?? []
  const label = (exerciseID: string | null) => {
    if (exerciseID === null) return t('Unlinked · choose exercise')
    const exercise = library.find((candidate) => candidate.id === exerciseID)
    return exercise ? t('Linked: {0}', [exercise.name]) : t('Deleted exercise · change link')
  }
  return (
    <Sheet open={open} onClose={onClose} title={t('History links')} trailing={<TextButton strong onClick={onClose}>{t('Done')}</TextButton>}>
      <p className={styles.muted}>{t('Historical names stay unchanged. Choose a library exercise only when you know it is the same movement. Leaving an entry unlinked keeps its results separate. Mapping never changes earned XP.')}</p>
      <ul className={styles.links}>
        {entries.map(({ snapshot, workout }) => (
          <li key={snapshot.id} className={styles.link}>
            <strong>{snapshot.exercise_name}</strong>
            <small>
              {t(workout.name)} · {new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(workout.performed_at))}
            </small>
            <label className={styles.linkSelect}>
              {snapshot.exercise_id ? <Link2 size={16} aria-hidden="true" /> : <Link2Off size={16} aria-hidden="true" />}
              <span className={styles.visuallyHidden}>{label(snapshot.exercise_id)}</span>
              <select value={snapshot.exercise_id ?? unlinked} onChange={(event) => linkSnapshot(snapshot.id, event.target.value === unlinked ? null : event.target.value)} data-testid={`history-link-${snapshot.exercise_name}`}>
                <option value={unlinked}>{t('Leave unlinked')}</option>
                {snapshot.exercise_id && !library.some((exercise) => exercise.id === snapshot.exercise_id) && <option value={snapshot.exercise_id}>{label(snapshot.exercise_id)}</option>}
                {library.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name} · {exercise.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
