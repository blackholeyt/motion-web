import { Play } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../data/db'
import { live } from '../../data/repo'
import { useT } from '../../i18n'
import { platform } from '../../platform'
import { useDrafts } from '../../store/hooks'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, Menu, TextButton } from '../../ui/controls'
import { discardDraft } from './engine'
import styles from './drafts.module.css'

/** WorkoutDraftLinks.swift: "Continue workout" and "Unfinished workouts (N)". */
export function DraftLinks({ returnTo }: { returnTo: string }) {
  const { t } = useT()
  const navigate = useNavigate()
  const drafts = useDrafts() ?? []
  const [listing, setListing] = useState(false)
  const latest = drafts[0]
  if (!latest) return null
  return (
    <div className={styles.links}>
      <button type="button" className={styles.resume} onClick={() => navigate(`/workout/${latest.id}`, { state: { returnTo } })} data-testid="resumeWorkout">
        <span className={styles.resumeTitle}>
          <Play size={16} fill="currentColor" aria-hidden="true" /> {t('Continue workout')}
        </span>
        <span className={styles.muted}>{t(latest.name)}</span>
      </button>
      <TextButton onClick={() => setListing(true)}>{t('Unfinished workouts ({0})', [drafts.length])}</TextButton>
      <DraftList open={listing} onClose={() => setListing(false)} returnTo={returnTo} />
    </div>
  )
}

function DraftList({ open, onClose, returnTo }: { open: boolean; onClose: () => void; returnTo: string }) {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const drafts = useDrafts() ?? []
  const [discarding, setDiscarding] = useState<string | null>(null)
  const completedCounts = useLiveQuery(async () => {
    const counts: Record<string, number> = {}
    for (const draft of drafts) counts[draft.id] = live(await db.set_logs.where('workout_id').equals(draft.id).toArray()).filter((set) => set.is_completed).length
    return counts
  }, [drafts.map((draft) => draft.updated_at).join()])
  return (
    <Sheet open={open} onClose={onClose} title={t('Unfinished workouts')} leading={<TextButton onClick={onClose}>{t('Done')}</TextButton>}>
      {drafts.length === 0 ? (
        <p className={styles.muted}>{t('No unfinished workouts')}</p>
      ) : (
        <Group>
          {drafts.map((draft) => (
            <div key={draft.id} className={styles.draft}>
              <button
                type="button"
                className={styles.draftOpen}
                onClick={() => {
                  onClose()
                  navigate(`/workout/${draft.id}`, { state: { returnTo } })
                }}
              >
                <strong>{t(draft.name)}</strong>
                <small>{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(draft.performed_at))}</small>
                <small className={styles.muted}>{t('{0} completed sets', [completedCounts?.[draft.id] ?? 0])}</small>
              </button>
              <Menu label={t('Discard')} icon={<span className={styles.discard}>{t('Discard')}</span>} items={[{ label: t('Discard'), role: 'destructive', onSelect: () => setDiscarding(draft.id) }]} />
            </div>
          ))}
        </Group>
      )}
      <ConfirmDialog
        open={discarding !== null}
        title={t('Discard unfinished workout?')}
        message={t('This permanently deletes this draft and its sets.')}
        onDismiss={() => setDiscarding(null)}
        actions={[
          {
            label: t('Discard'),
            role: 'destructive',
            onSelect: async () => {
              const id = discarding!
              setDiscarding(null)
              await discardDraft(id)
              platform.notifications.cancel(`motion.rest.${id}`)
            },
          },
          { label: t('Cancel'), role: 'cancel', onSelect: () => setDiscarding(null) },
        ]}
      />
    </Sheet>
  )
}
