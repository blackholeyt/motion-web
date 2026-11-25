import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../../data/db'
import type { TrainingPlanTicket } from '../../data/types'
import { newCardioDraft, draftValid, withDistance, withSeconds, type CardioDraft } from '../../domain/cardio'
import { distanceLabel, paceLabel } from '../../domain/measurement'
import { useT } from '../../i18n'
import { finishCardio } from '../../store/cardio'
import { useProfile } from '../../store/profile'
import { ConfirmDialog } from '../../ui/Sheet'
import { Group, PrimaryButton, TextButton } from '../../ui/controls'
import { Celebration, durationLabel } from '../progress/Celebration'
import { CardioFields } from './CardioFields'
import styles from './cardio.module.css'
import { Loading, SkeletonBar, SkeletonBlock } from '../../ui/Skeleton'

/** CardioSessionView: a blueprint, a planned slot or a freestyle activity. */
export function CardioScreen() {
  const [params] = useSearchParams()
  const blueprintID = params.get('blueprint')
  const blueprint = useLiveQuery(async () => (blueprintID ? ((await db.blueprints.get(blueprintID)) ?? null) : null), [blueprintID])
  const profile = useProfile()
  if (blueprint === undefined || !profile)
    return (
      <Loading page>
        <SkeletonBar />
        <SkeletonBlock height={34} width="60%" />
        <SkeletonBlock height={260} radius="var(--radius-card)" />
      </Loading>
    )
  return <CardioSession key={blueprint?.id ?? 'freestyle'} blueprint={blueprint} activity={params.get('activity') ?? 'Running'} />
}

function CardioSession({ blueprint, activity }: { blueprint: import('../../data/types').Blueprint | null; activity: string }) {
  const { t, locale } = useT()
  const navigate = useNavigate()
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
  const [result, setResult] = useState<Awaited<ReturnType<typeof finishCardio>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const leave = () => navigate(returnTo, { replace: true })

  const finish = async () => {
    try {
      const saved = await finishCardio(draft, { blueprint: blueprint ?? undefined, planTicket: routeState.planTicket ?? null, notes })
      setResult(saved)
    } catch (failure) {
      setError((failure as Error).message)
    }
  }

  if (result) {
    const { workout } = result
    const stats = [
      workout.cardio_seconds != null ? { label: t('Duration'), value: durationLabel(workout.cardio_seconds) } : null,
      workout.cardio_distance_km != null ? { label: t('Distance'), value: distanceLabel(unit, workout.cardio_distance_km, locale) } : null,
      workout.cardio_pace_s_per_km != null ? { label: t('Pace'), value: paceLabel(unit, workout.cardio_pace_s_per_km) } : null,
      { label: t('Activity'), value: t(workout.cardio_type ?? 'Cardio') },
    ].filter((stat) => stat !== null)
    return (
      <Celebration
        name={workout.name}
        stats={stats}
        recap={null}
        award={result.award}
        totalXP={result.totalXP}
        weeks={result.weeks}
        unit={loadUnit}
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
