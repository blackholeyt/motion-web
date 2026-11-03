import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../../data/db'
import type { TrainingPlanTicket } from '../../data/types'
import { newCardioDraft, draftPace, draftValid, withDistance, withSeconds, type CardioDraft } from '../../domain/cardio'
import { paceLabel } from '../../domain/measurement'
import type { XPAward } from '../../domain/progress'
import { useT } from '../../i18n'
import { finishCardio } from '../../store/cardio'
import { useHaptics } from '../../store/hooks'
import { useProfile } from '../../store/profile'
import { ConfirmDialog } from '../../ui/Sheet'
import { Group, PrimaryButton, TextButton } from '../../ui/controls'
import { Celebration } from '../progress/Celebration'
import { CardioFields } from './CardioFields'
import styles from './cardio.module.css'

/** CardioSessionView: a blueprint, a planned slot or a freestyle activity. */
export function CardioScreen() {
  const [params] = useSearchParams()
  const blueprintID = params.get('blueprint')
  const blueprint = useLiveQuery(async () => (blueprintID ? ((await db.blueprints.get(blueprintID)) ?? null) : null), [blueprintID])
  const profile = useProfile()
  if (blueprint === undefined || !profile) return null
  return <CardioSession key={blueprint?.id ?? 'freestyle'} blueprint={blueprint} activity={params.get('activity') ?? 'Running'} />
}

function CardioSession({ blueprint, activity }: { blueprint: import('../../data/types').Blueprint | null; activity: string }) {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const haptic = useHaptics()
  const profile = useProfile()
  const unit = profile?.distance_unit ?? 'km'
  const loadUnit = profile?.load_unit ?? 'kg'
  const routeState = (useLocation().state ?? {}) as { returnTo?: string; planTicket?: TrainingPlanTicket }
  const returnTo = routeState.returnTo ?? '/'
  const [draft, setDraft] = useState<CardioDraft>(() => {
    const start = newCardioDraft(unit, blueprint?.cardio_type ?? activity)
    return withDistance(withSeconds(start, blueprint?.cardio_minutes != null ? blueprint.cardio_minutes * 60 : null, locale), blueprint?.cardio_distance_km ?? null, locale)
  })
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<{ award: XPAward; totalXP: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const leave = () => navigate(returnTo, { replace: true })

  const finish = async () => {
    try {
      const saved = await finishCardio(draft, { blueprint: blueprint ?? undefined, planTicket: routeState.planTicket ?? null, notes })
      haptic('success')
      setResult(saved)
    } catch (failure) {
      setError((failure as Error).message)
    }
  }

  if (result) {
    const summary = `${draft.minutes} min · ${draft.distance} ${draft.unit} · ${paceLabel(draft.unit, draftPace(draft) ?? 0)}`
    return (
      <Celebration
        recap={{ name: blueprint?.name ?? draft.activity, setCount: 0, warmUpCount: 0, improvements: [], records: [], repImprovements: [], comparableCount: 0, consistencyDays: null, improvedExerciseCount: 0, bonusExerciseCount: 0 }}
        award={result.award}
        totalXP={result.totalXP}
        records={[]}
        unit={loadUnit}
        detail={`${t(blueprint?.name ?? draft.activity)} · ${summary}`}
        note={t('Duration and distance saved. Training conditions and intended effort are not recorded, so no improvement claim is made.')}
        onContinue={leave}
      />
    )
  }

  return (
    <div className={styles.screen}>
      <header className={styles.bar}>
        <TextButton onClick={leave}>
          <ChevronLeft size={20} aria-hidden="true" /> {t('Back')}
        </TextButton>
        <h1>{blueprint?.name ?? t('Freestyle cardio')}</h1>
        <span />
      </header>
      <CardioFields draft={draft} onChange={setDraft} title={t('Cardio session')} />
      <Group title={t('Workout notes')}>
        <textarea className={styles.notes} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} aria-label={t('Workout notes')} />
      </Group>
      <Group footer={t('100 XP for completion. Duration and distance are recorded separately; pace alone does not establish improvement.')}>
        <PrimaryButton onClick={finish} disabled={!draftValid(draft)} testID="finishCardio">
          {t('Finish cardio')}
        </PrimaryButton>
      </Group>
      <ConfirmDialog open={error !== null} title={t('Cardio')} message={error ? t(error) : ''} onDismiss={() => setError(null)} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setError(null) }]} />
    </div>
  )
}
