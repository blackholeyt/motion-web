import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../../data/db'
import type { TrainingPlanTicket, Workout } from '../../data/types'
import { useT } from '../../i18n'
import { platform } from '../../platform'
import { ConfirmDialog } from '../../ui/Sheet'
import * as engine from './engine'

export interface StartState {
  planTicket?: TrainingPlanTicket
  retrospectiveDate?: string
  returnTo?: string
}

/**
 * /workout/new: resolves the "Unfinished workout" conflict, then creates the session
 * and replaces the route with /workout/:id so a reload resumes the same draft.
 */
export function StartWorkout() {
  const { t } = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const state = (useLocation().state ?? {}) as StartState
  const [conflict, setConflict] = useState<Workout | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  const blueprintID = params.get('blueprint')
  const retrospectiveDate = state.retrospectiveDate ? new Date(state.retrospectiveDate) : undefined
  const returnTo = state.returnTo ?? (blueprintID ? `/blueprints/${blueprintID}` : '/')

  const startNew = async () => {
    try {
      let id: string
      if (blueprintID) {
        const blueprint = await db.blueprints.get(blueprintID)
        if (!blueprint || blueprint.deleted_at) throw new engine.WorkoutError('This routine is no longer available. Choose another starting point.')
        id = await engine.startFromBlueprint(blueprint, { retrospectiveDate, planTicket: state.planTicket })
      } else {
        id = await engine.startFreestyle({ retrospectiveDate })
      }
      navigate(`/workout/${id}`, { replace: true, state: { returnTo } })
    } catch (failure) {
      setError(t((failure as Error).message))
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      const draft = retrospectiveDate ? undefined : await engine.latestDraft()
      if (draft) setConflict(draft)
      else await startNew()
    })()
  }, []) // Runs once per visit; the route is replaced afterwards.

  return (
    <>
      <ConfirmDialog
        open={conflict !== null && !confirmDiscard}
        title={t('Unfinished workout')}
        message={t('{0} is unfinished. Resume it, or keep it for later before starting another.', [conflict?.name ?? t('Your workout')])}
        onDismiss={() => navigate(returnTo, { replace: true })}
        actions={[
          { label: t('Resume unfinished workout'), onSelect: () => navigate(`/workout/${conflict!.id}`, { replace: true, state: { returnTo } }) },
          { label: t('Keep for later and start new'), onSelect: () => { setConflict(null); void startNew() } },
          { label: t('Discard and start new'), role: 'destructive', onSelect: () => setConfirmDiscard(true) },
          { label: t('Cancel'), role: 'cancel', onSelect: () => navigate(returnTo, { replace: true }) },
        ]}
      />
      <ConfirmDialog
        open={confirmDiscard}
        title={t('Discard unfinished workout?')}
        message={t('This permanently deletes this draft and its sets.')}
        onDismiss={() => navigate(returnTo, { replace: true })}
        actions={[
          {
            label: t('Discard'),
            role: 'destructive',
            onSelect: async () => {
              if (conflict) {
                await engine.discardDraft(conflict.id)
                platform.notifications.cancel(`motion.rest.${conflict.id}`)
              }
              setConfirmDiscard(false)
              setConflict(null)
              await startNew()
            },
          },
          { label: t('Cancel'), role: 'cancel', onSelect: () => navigate(returnTo, { replace: true }) },
        ]}
      />
      <ConfirmDialog open={error !== null} title={t('Workout')} message={error ?? ''} onDismiss={() => navigate(returnTo, { replace: true })} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => navigate(returnTo, { replace: true }) }]} />
    </>
  )
}
