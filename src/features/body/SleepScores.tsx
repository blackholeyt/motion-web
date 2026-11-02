import { useState } from 'react'
import { useT } from '../../i18n'
import { useSleepScores } from '../../store/body'
import { Sheet } from '../../ui/Sheet'
import { Group, RowButton, TextButton } from '../../ui/controls'
import { SleepScoreEditor } from './SleepScoreEditor'

/** SleepSettingsView, manual part: every entered score. */
export function SleepScores({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useT()
  const scores = useSleepScores() ?? []
  const [editing, setEditing] = useState<Date | null>(null)
  const date = (day: string) => {
    const [y, m, d] = day.split('-').map(Number)
    return new Date(y!, m! - 1, d!)
  }
  return (
    <Sheet open={open} onClose={onClose} title={t('Sleep scores')} trailing={<TextButton strong onClick={onClose}>{t('Done')}</TextButton>}>
      <Group title={t('Manually entered scores')} footer={t('Scores are stored on this device and included in full Motion backups. Automatic sleep duration and stages from Apple Health need the native app.')}>
        <RowButton onClick={() => setEditing(new Date())}>{t('Add Apple Sleep Score')}</RowButton>
        {scores.map((entry) => (
          <RowButton key={entry.id} tone="plain" onClick={() => setEditing(date(entry.day))}>
            <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date(entry.day))}</span>
              <span>{entry.score}/100</span>
            </span>
          </RowButton>
        ))}
      </Group>
      {editing && <SleepScoreEditor date={editing} onClose={() => setEditing(null)} />}
    </Sheet>
  )
}
