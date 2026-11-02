import { useState } from 'react'
import { newCardioDraft, draftValid, type CardioDraft } from '../../domain/cardio'
import { useT } from '../../i18n'
import { createCardioBlueprint } from '../../store/cardio'
import { useHaptics } from '../../store/hooks'
import { useProfile } from '../../store/profile'
import { Sheet } from '../../ui/Sheet'
import { Group, TextButton, TextRow } from '../../ui/controls'
import { CardioFields } from './CardioFields'

/** CardioBlueprintEditor: name and targets for a cardio blueprint. */
export function CardioBlueprintSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <Editor onClose={onClose} /> : null
}

function Editor({ onClose }: { onClose: () => void }) {
  const { t } = useT()
  const haptic = useHaptics()
  const [name, setName] = useState('')
  const unit = useProfile()?.distance_unit ?? 'km'
  const [draft, setDraft] = useState<CardioDraft>(() => newCardioDraft(unit))
  const save = async () => {
    await createCardioBlueprint(name, draft)
    haptic('action')
    onClose()
  }
  return (
    <Sheet
      open
      onClose={onClose}
      title={t('Cardio blueprint')}
      leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}
      trailing={
        <TextButton strong disabled={!name.trim() || !draftValid(draft)} onClick={save} testID="saveCardioBlueprint">
          {t('Save')}
        </TextButton>
      }
    >
      <CardioBlueprintForm name={name} onName={setName} draft={draft} onDraft={setDraft} />
    </Sheet>
  )
}

export function CardioBlueprintForm({ name, onName, draft, onDraft, hideName }: { name: string; onName: (name: string) => void; draft: CardioDraft; onDraft: (draft: CardioDraft) => void; hideName?: boolean }) {
  const { t } = useT()
  return (
    <>
      {!hideName && (
        <Group>
          <TextRow label={t('Blueprint name')} value={name} onChange={onName} autoFocus />
        </Group>
      )}
      <CardioFields draft={draft} onChange={onDraft} isBlueprint title={t('Targets')} />
    </>
  )
}
