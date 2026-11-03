import { useState } from 'react'
import type { BodyWeight, WeightUnit } from '../../data/types'
import { parseBodyWeight } from '../../domain/body'
import { loadInput } from '../../domain/measurement'
import { useT } from '../../i18n'
import { checkIn, correctWeight, type CheckInResult } from '../../store/body'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, TextButton, TextRow } from '../../ui/controls'
import { WeightCelebration } from './WeightCelebration'
import styles from './body.module.css'

/** BodyWeightEditor: today's check-in, or a correction of a saved measurement. */
export function BodyWeightEditor({ unit, entry, onClose }: { unit: WeightUnit; entry?: BodyWeight; onClose: () => void }) {
  const { t, locale } = useT()
  const original = entry ? loadInput(unit, entry.kilograms, locale) : ''
  const [text, setText] = useState(original)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const kilograms = entry && text === original ? entry.kilograms : parseBodyWeight(text, unit)
  const save = async () => {
    if (kilograms === null) return
    try {
      const saved = entry ? await correctWeight(entry, kilograms) : await checkIn(kilograms)
      setResult(saved)
    } catch (failure) {
      setError((failure as Error).message)
    }
  }
  if (result) return <WeightCelebration result={result} unit={unit} onContinue={onClose} />
  return (
    <Sheet
      open
      onClose={onClose}
      title={t(entry ? 'Edit weight' : 'Update weight')}
      leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}
      trailing={
        <TextButton strong disabled={kilograms === null} onClick={save} testID="saveWeight">
          {t('Save')}
        </TextButton>
      }
    >
      <Group
        title={t(entry ? 'Correct measurement' : 'Today’s check-in')}
        footer={t(entry ? 'This changes the saved measurement, keeping its date. No extra XP is awarded.' : 'Save today’s weight for +25 XP, once per day. Further updates replace today’s measurement.')}
      >
        <TextRow label={t('Weight in {0}', [unit])} value={text} onChange={setText} inputMode="decimal" autoFocus />
        {text !== '' && kilograms === null && (
          <p className={styles.error} role="alert">
            {t('Enter a valid weight (1–700 kg or equivalent in lb).')}
          </p>
        )}
      </Group>
      <ConfirmDialog open={error !== null} title={t('Couldn’t save')} message={error ? t(error) : ''} onDismiss={() => setError(null)} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setError(null) }]} />
    </Sheet>
  )
}
