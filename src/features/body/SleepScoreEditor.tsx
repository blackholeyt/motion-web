import { useState } from 'react'
import { validSleepScore } from '../../domain/body'
import { dayKey } from '../../domain/measurement'
import { useT } from '../../i18n'
import { saveSleepScore, useSleepScores } from '../../store/body'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, RowButton, TextButton, TextRow } from '../../ui/controls'

/** SleepScoreEditor: copy the score shown in Apple Health for a date. */
export function SleepScoreEditor({ date, onClose }: { date: Date; onClose: () => void }) {
  const { t } = useT()
  const scores = useSleepScores()
  const day = dayKey(date)
  const existing = scores?.find((entry) => entry.day === day)
  const [input, setInput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const text = input ?? (existing ? String(existing.score) : '')
  const value = validSleepScore(text)
  const save = async (score: number | null) => {
    try {
      const [y, m, d] = day.split('-').map(Number)
      await saveSleepScore(score, new Date(y!, m! - 1, d!))
      onClose()
    } catch (failure) {
      setError((failure as Error).message)
    }
  }
  return (
    <Sheet
      open
      onClose={onClose}
      title={t('Apple Sleep Score')}
      leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}
      trailing={
        <TextButton strong disabled={value === null} onClick={() => save(value)} testID="saveSleepScore">
          {t('Save')}
        </TextButton>
      }
    >
      <Group footer={t('Copy the Apple Sleep Score shown in Health for this date. Motion does not calculate or automatically import this score.')}>
        <TextRow label={t('Score (0–100)')} value={text} onChange={setInput} inputMode="numeric" autoFocus />
      </Group>
      {existing && (
        <Group>
          <RowButton tone="destructive" onClick={() => save(null)}>
            {t('Delete score')}
          </RowButton>
        </Group>
      )}
      <ConfirmDialog open={error !== null} title={t('Apple Sleep Score')} message={error ? t(error) : ''} onDismiss={() => setError(null)} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setError(null) }]} />
    </Sheet>
  )
}
