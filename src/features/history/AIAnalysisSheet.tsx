import { ExternalLink, Share } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSandbox } from '../../app/sandbox'
import { useT } from '../../i18n'
import { aiPeriods, aiTargets, buildAIExport, type AIExport, type AIPeriod } from '../../store/aiAnalysis'
import { downloadFile } from '../../ui/download'
import { Group, PrimaryButton, RowButton, SelectRow, TextButton } from '../../ui/controls'
import { Sheet } from '../../ui/Sheet'
import styles from './history.module.css'

type Step = 'idle' | 'shared' | 'opened'

/** Copying is best effort: the prompt is also visible below and shared as text. */
function copy(text: string) {
  void navigator.clipboard?.writeText(text).catch(() => undefined)
}

function canShare(file: File) {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

/** "Analyse with AI": hands the training of a period and a ready prompt to ChatGPT, Claude or Perplexity. */
export function AIAnalysisSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, language } = useT()
  const sandbox = useSandbox()
  const [period, setPeriod] = useState<AIPeriod>(8)
  const [data, setData] = useState<AIExport | null>(null)
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)

  // Built ahead of the tap: share and window.open must run straight from the click.
  useEffect(() => {
    if (!open) return
    let current = true
    setData(null)
    setStep('idle')
    setError(null)
    buildAIExport(period, language)
      .then((result) => current && setData(result))
      .catch((failure: Error) => current && setError(failure.message))
    return () => {
      current = false
    }
  }, [open, period, language])

  const blocked = Boolean(sandbox) || !data || data.workouts === 0

  const share = async () => {
    if (!data) return
    copy(data.prompt)
    try {
      await navigator.share({ files: [data.file], text: data.prompt, title: t('Analyse with AI') })
      setStep('shared')
    } catch (failure) {
      if ((failure as DOMException).name === 'AbortError') return
      // Some apps accept the file only without text; the prompt is on the clipboard then.
      try {
        await navigator.share({ files: [data.file] })
        setStep('shared')
      } catch (second) {
        if ((second as DOMException).name !== 'AbortError') setError((second as Error).message)
      }
    }
  }

  const openIn = (url: string) => {
    if (!data) return
    copy(data.prompt)
    downloadFile(data.file)
    window.open(url, '_blank', 'noopener')
    setStep('opened')
  }

  const periodLabel = (value: AIPeriod) => (value === null ? t('Everything') : t('Last {0} weeks', [value]))

  return (
    <Sheet open={open} onClose={onClose} title={t('Analyse with AI')} trailing={<TextButton strong onClick={onClose}>{t('Done')}</TextButton>}>
      <p className={styles.muted}>
        {t('Motion prepares your training as a file and writes the question for the AI. Your muscle-building guide is the basis of the analysis. Motion itself sends nothing.')}
      </p>
      <Group
        footer={
          sandbox
            ? t('Import and export are unavailable in the demo.')
            : data
              ? t('{0} workouts in this period', [data.workouts])
              : t('Preparing…')
        }
      >
        <SelectRow
          label={t('Period')}
          value={String(period)}
          options={aiPeriods.map((value) => ({ value: String(value), label: periodLabel(value) }))}
          onChange={(value) => setPeriod(value === 'null' ? null : (Number(value) as AIPeriod))}
        />
      </Group>

      {data && canShare(data.file) && (
        <Group footer={t('Choose ChatGPT, Claude or Perplexity in the share sheet. File and question are attached.')}>
          <PrimaryButton onClick={() => void share()} disabled={blocked} testID="aiShare">
            <Share size={18} aria-hidden="true" /> {t('Share with AI app')}
          </PrimaryButton>
        </Group>
      )}

      <Group
        title={t('Open in the browser')}
        footer={t('The file is downloaded and the question copied. Drag the file into the chat and paste the question (⌘V or Ctrl+V).')}
      >
        {aiTargets.map((target) => (
          <RowButton key={target.id} onClick={() => openIn(target.url)} disabled={blocked} testID={`aiOpen-${target.id}`}>
            <span className={styles.aiTarget}>
              {t('Open in {0}', [target.label])} <ExternalLink size={16} aria-hidden="true" />
            </span>
          </RowButton>
        ))}
      </Group>

      {step !== 'idle' && (
        <p className={styles.aiHint} role="status">
          {step === 'shared'
            ? t('If the question is missing in the chat, paste it: it is on your clipboard.')
            : t('Chat opened. Add the file from your downloads and paste the question.')}
        </p>
      )}

      {data && (
        <details className={styles.aiPrompt}>
          <summary>{t('Show question')}</summary>
          <pre>{data.prompt}</pre>
          <TextButton onClick={() => copy(data.prompt)}>{t('Copy question')}</TextButton>
        </details>
      )}

      {error && (
        <p className={styles.aiHint} role="alert">
          {t(error)}
        </p>
      )}
    </Sheet>
  )
}
