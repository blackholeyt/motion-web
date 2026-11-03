import { useRef, useState } from 'react'
import { useT, type Translate } from '../../i18n'
import { formatNumber, loadLabel } from '../../domain/measurement'
import { ImportError, type ImportErrorCode, type ImportIssue } from '../../import/errors'
import { previewImport, readImportFile, runImport, type ImportCounts, type ImportSource, type ImportSummary, type SampleWorkout } from '../../import/importer'
import { useProfile } from '../../store/profile'
import { useSandbox } from '../../app/sandbox'
import { Sheet } from '../../ui/Sheet'
import { Group, PrimaryButton, RowButton, TextButton } from '../../ui/controls'
import styles from './import.module.css'

/*
 * Import of the iOS app's backup (phase 5a) and its older CSV files (phase 5b): choose the file,
 * read the preview, import, read the report. Every step before "Import" only reads; the import itself is one transaction.
 */

type Step =
  | { kind: 'choose' }
  | { kind: 'reading' }
  | { kind: 'preview'; source: ImportSource; summary: ImportSummary }
  | { kind: 'importing'; source: ImportSource; summary: ImportSummary }
  | { kind: 'done'; summary: ImportSummary }
  | { kind: 'failed'; error: ImportError }

const errorTexts: Record<ImportErrorCode, string> = {
  tooLarge: 'The file is too large. Motion backups have at most 32 MB as JSON and 64 MB as CSV.',
  unreadable: 'This file is not a Motion backup. Choose the JSON file from “Export Backup” or the CSV file from “Export CSV” in the iOS app.',
  csvMalformed: 'The CSV file is damaged or incomplete.',
  csvRow: 'The CSV file is damaged in row {0}.',
  wrongType: 'This is not a backup of the Motion iOS app.',
  unsupportedVersion: 'This Motion backup version is not supported.',
  invalid: 'The backup did not pass the checks of the Motion app.',
  conflict: 'Some workouts in this file use exercise or set IDs that already belong to other workouts on this device.',
  sandbox: 'Import and export are unavailable in the demo.',
}

const countRows: { key: keyof ImportCounts; label: string }[] = [
  { key: 'workouts', label: 'Workouts' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'sets', label: 'Completed sets' },
  { key: 'exercises', label: 'Exercises' },
  { key: 'routines', label: 'Blueprints' },
  { key: 'bodyWeights', label: 'Body weight entries' },
  { key: 'sleepScores', label: 'Sleep scores' },
  { key: 'xpReceipts', label: 'XP receipts' },
  { key: 'records', label: 'Exercises with a record' },
  { key: 'xp', label: 'XP' },
]

const pathNames: Record<string, string> = {
  workouts: 'Workout',
  exercises: 'Exercise',
  sets: 'Set',
  library: 'Library exercise',
  routines: 'Blueprint',
  weights: 'Body weight',
  weightRewards: 'Daily XP receipt',
  workoutAwards: 'Workout XP receipt',
  sleepScores: 'Sleep score',
  undoHistory: 'Undo step',
  rows: 'Row',
}

/** "workouts[3].exercises[0].sets[2]" → "Workout 4 › Exercise 1 › Set 3". */
function place(path: string, t: Translate): string {
  if (path === '') return t('Whole file')
  return path
    .split('.')
    .map((part) => {
      const match = /^(\w+)\[(\d+)\]$/.exec(part)
      if (match) return `${t(pathNames[match[1]!] ?? match[1]!)} ${Number(match[2]) + 1}`
      return t(pathNames[part] ?? part)
    })
    .join(' › ')
}

export function ImportSheet({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported?: () => void }) {
  const { t, locale } = useT()
  const sandbox = useSandbox()
  const [step, setStep] = useState<Step>(() => (sandbox ? { kind: 'failed', error: new ImportError('sandbox') } : { kind: 'choose' }))
  const input = useRef<HTMLInputElement>(null)
  const close = () => {
    if (step.kind === 'reading' || step.kind === 'importing') return
    const imported = step.kind === 'done'
    setStep(sandbox ? { kind: 'failed', error: new ImportError('sandbox') } : { kind: 'choose' })
    onClose()
    if (imported) onImported?.()
  }
  const fail = (error: unknown) => {
    if (error instanceof ImportError) setStep({ kind: 'failed', error })
    else setStep({ kind: 'failed', error: new ImportError('unreadable') })
  }
  const read = async (file: File | undefined) => {
    if (!file) return
    setStep({ kind: 'reading' })
    try {
      const source = await readImportFile(file)
      setStep({ kind: 'preview', source, summary: await previewImport(source) })
    } catch (error) {
      fail(error)
    }
  }
  const start = async (source: ImportSource, summary: ImportSummary) => {
    setStep({ kind: 'importing', source, summary })
    try {
      setStep({ kind: 'done', summary: await runImport(source) })
    } catch (error) {
      fail(error)
    }
  }
  const chooser = (
    <input
      ref={input}
      type="file"
      accept=".json,.csv,application/json,text/csv,text/comma-separated-values"
      className={styles.file}
      data-testid="importFile"
      onChange={(event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        void read(file)
      }}
    />
  )
  const busy = step.kind === 'reading' || step.kind === 'importing'
  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('Import from the iOS app')}
      leading={step.kind !== 'done' ? <TextButton onClick={close} disabled={busy}>{t('Cancel')}</TextButton> : undefined}
      trailing={step.kind === 'done' ? <TextButton strong onClick={close} testID="importDone">{t('Done')}</TextButton> : undefined}
    >
      {chooser}
      {(step.kind === 'choose' || step.kind === 'reading') && (
        <Group
          footer={t('In the iOS app open Settings and use “Export Backup” (JSON) or “Export CSV”. Older Motion CSV files and the simple workout CSV work too. Send the file to this device, for example with AirDrop or the Files app. Nothing is imported before you confirm the preview.')}
        >
          <RowButton onClick={() => input.current?.click()} disabled={step.kind === 'reading'} testID="chooseImportFile">
            {step.kind === 'reading' ? t('Checking file…') : t('Choose backup file')}
          </RowButton>
        </Group>
      )}
      {(step.kind === 'preview' || step.kind === 'importing') && (
        <Preview summary={step.summary} t={t} locale={locale}>
          <PrimaryButton onClick={() => void start(step.source, step.summary)} disabled={step.kind === 'importing'} testID="confirmImport">
            {step.kind === 'importing' ? t('Importing…') : t('Import')}
          </PrimaryButton>
        </Preview>
      )}
      {step.kind === 'done' && <Report summary={step.summary} t={t} />}
      {step.kind === 'failed' && (
        <>
          <div className={styles.failure} role="alert" data-testid="importError">
            <strong>{t('Nothing was imported.')}</strong>
            <p>{t(errorTexts[step.error.code], [step.error.detail.row ?? ''])}</p>
          </div>
          {step.error.detail.issues && <Issues issues={step.error.detail.issues} t={t} />}
          {!sandbox && (
            <Group>
              <RowButton onClick={() => input.current?.click()}>{t('Choose another file')}</RowButton>
            </Group>
          )}
        </>
      )}
    </Sheet>
  )
}

function Issues({ issues, t }: { issues: ImportIssue[]; t: Translate }) {
  return (
    <Group title={t('Problems found')} footer={issues.length >= 50 ? t('Only the first 50 problems are shown.') : undefined}>
      {issues.map((issue, index) => (
        <div key={index} className={styles.issue}>
          <span>{place(issue.path, t)}</span>
          <span className={styles.muted}>{t(issue.reason)}</span>
        </div>
      ))}
    </Group>
  )
}

function CountTable({ summary, t, report }: { summary: ImportSummary; t: Translate; report: boolean }) {
  return (
    <table className={styles.counts}>
      <thead>
        <tr>
          <td />
          <th scope="col">{t('In file')}</th>
          <th scope="col">{report ? t('Added') : t('New')}</th>
          <th scope="col">{t('Already here')}</th>
        </tr>
      </thead>
      <tbody>
        {countRows.map(({ key, label }) => (
          <tr key={key} data-testid={`count-${key}`}>
            <th scope="row">{t(label)}</th>
            <td>{summary.file[key]}</td>
            <td>{summary.added[key]}</td>
            <td>{summary.file[key] - summary.added[key]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Preview({ summary, t, locale, children }: { summary: ImportSummary; t: Translate; locale: string; children: React.ReactNode }) {
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  return (
    <div className={styles.stack} data-testid="importPreview">
      <p className={styles.lead}>
        {summary.origin.kind === 'backup'
          ? t('{0} · exported {1}', [summary.fileName, date(summary.exportedAt)])
          : t('{0} · newest entry {1}', [summary.fileName, date(summary.exportedAt)])}
      </p>
      {summary.origin.kind === 'olderCSV' && (
        <p className={styles.muted} data-testid="olderFormat">
          {t('Older Motion CSV (version {0}). It has no settings, sleep scores or training plan; this device keeps its own.', [summary.origin.version])}
        </p>
      )}
      {summary.origin.kind === 'workoutCSV' && (
        <p className={styles.muted} data-testid="olderFormat">
          {t('Simple workout CSV. It only holds completed workouts with their sets, without XP, routines or body weight.')}
        </p>
      )}
      {summary.previous && (
        <p className={styles.notice} role="status" data-testid="alreadyImported">
          {t('This backup was already imported on {0}. Records that already exist are skipped, so importing again adds nothing twice.', [date(summary.previous.imported_at)])}
        </p>
      )}
      <CountTable summary={summary} t={t} report={false} />
      {summary.file.healthWorkouts > 0 && (
        <p className={styles.muted}>{t('{0} workouts from Apple Health or Strava are skipped. They stay in your file for the native app.', [summary.file.healthWorkouts])}</p>
      )}
      <p className={styles.muted}>{t('No XP is calculated: workouts keep the XP they earned in the iOS app. Your profile and training settings are taken from the backup; a training plan only when this device has none.')}</p>
      {summary.samples.length > 0 && (
        <Group title={t('Latest workouts in the file')}>
          {summary.samples.map((sample, index) => (
            <Sample key={index} sample={sample} t={t} date={date} />
          ))}
        </Group>
      )}
      {children}
    </div>
  )
}

function Sample({ sample, t, date }: { sample: SampleWorkout; t: Translate; date: (iso: string) => string }) {
  const { locale } = useT()
  const unit = useProfile()?.load_unit ?? 'kg'
  const set = (value: SampleWorkout['exercises'][number]['sets'][number], measurement: string) => {
    const parts: string[] = []
    if (measurement === 'Duration') parts.push(`${formatNumber(value.duration ?? 0, locale, 0)} s`)
    else {
      if (value.weight > 0 || measurement === 'Load & reps') parts.push(loadLabel(unit, value.weight, locale))
      if (value.reps !== null) parts.push(`× ${value.reps}`)
    }
    const notes = [value.warmUp ? t('Warm-up') : null, value.completed ? null : t('open')].filter(Boolean)
    return `${parts.join(' ')}${notes.length > 0 ? ` (${notes.join(', ')})` : ''}`
  }
  return (
    <div className={styles.sample}>
      <div className={styles.sampleHead}>
        <strong>{sample.name}</strong>
        <span className={styles.muted}>
          {date(sample.performedAt)}
          {sample.completed ? '' : ` · ${t('Draft')}`}
        </span>
      </div>
      {sample.exercises.map((exercise, index) => (
        <p key={index} className={styles.sampleLine}>
          <span>{exercise.name}</span>
          <span className={styles.muted}>{exercise.sets.map((value) => set(value, exercise.measurement)).join(' · ') || t('No sets')}</span>
        </p>
      ))}
    </div>
  )
}

function Report({ summary, t }: { summary: ImportSummary; t: Translate }) {
  return (
    <div className={styles.stack} data-testid="importReport">
      <p className={styles.lead}>{t('Import finished. Compare these numbers with the iOS app.')}</p>
      <CountTable summary={summary} t={t} report />
      {summary.file.healthWorkouts > 0 && <p className={styles.muted}>{t('Skipped: {0} workouts from Apple Health or Strava.', [summary.file.healthWorkouts])}</p>}
      <p className={styles.muted}>{t('Everything new is saved on this device and, when you are signed in, backed up to your account in the background.')}</p>
    </div>
  )
}
