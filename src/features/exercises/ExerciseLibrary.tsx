import { Link2 } from 'lucide-react'
import { useState } from 'react'
import type { Exercise } from '../../data/types'
import { useT } from '../../i18n'
import { createLibraryExercise } from '../../store/library'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, TextButton, TextRow } from '../../ui/controls'
import { ExerciseBrowser } from './ExerciseBrowser'
import { ExerciseEditor } from './ExerciseEditor'
import { HistoryLinks } from './HistoryLinks'
import styles from './exercises.module.css'

/** ExerciseLibraryView.swift: browse, edit, create and review history links. */
export function ExerciseLibrary({ creating, onCreated }: { creating: boolean; onCreated: () => void }) {
  const { t } = useT()
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [links, setLinks] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    setName('')
    onCreated()
  }
  const create = async () => {
    try {
      await createLibraryExercise(name)
      close()
    } catch (failure) {
      close()
      setError((failure as Error).message)
    }
  }
  return (
    <div className={styles.library}>
      <button type="button" className={styles.linksButton} onClick={() => setLinks(true)}>
        <Link2 size={18} aria-hidden="true" /> {t('History links')}
      </button>
      <ExerciseBrowser onSelect={setEditing} />
      {editing && <ExerciseEditor key={editing.id} exercise={editing} onClose={() => setEditing(null)} />}
      <HistoryLinks open={links} onClose={() => setLinks(false)} />
      <Sheet
        open={creating}
        onClose={close}
        title={t('New Exercise')}
        leading={<TextButton onClick={close}>{t('Cancel')}</TextButton>}
        trailing={
          <TextButton strong disabled={!name.trim()} onClick={create} testID="saveNewExercise">
            {t('Save')}
          </TextButton>
        }
      >
        <Group>
          <TextRow label={t('Exercise name')} value={name} onChange={setName} autoFocus />
        </Group>
      </Sheet>
      <ConfirmDialog open={error !== null} title={t('Exercise')} message={error ? t(error) : ''} onDismiss={() => setError(null)} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setError(null) }]} />
    </div>
  )
}
