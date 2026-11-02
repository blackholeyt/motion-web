import { ArrowDown, ArrowRightCircle, ArrowUp, Dumbbell, Footprints, Info, Plus, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { Blueprint } from '../../data/types'
import { newSchedule, nextTicket, withEditedRevision, type TrainingSchedule } from '../../domain/schedule'
import { dayKey, startOfDay } from '../../domain/measurement'
import { useT } from '../../i18n'
import { entriesFor, isStartable } from '../../store/blueprints'
import { useBlueprints, usePlan } from '../../store/hooks'
import { planProblem, savePlan } from '../../store/plan'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, RowButton, SelectRow, TextButton, Toggle } from '../../ui/controls'
import styles from './plan.module.css'

/** Monday first, as in the iOS editor (Apple weekdays 2…7, then 1). */
const orderedDays = [2, 3, 4, 5, 6, 7, 1]

export function weekdayName(day: number, locale: string, style: 'long' | 'short' = 'long') {
  // 2026-11-01 is a Sunday, so day N falls on 2026-11-(N).
  return new Intl.DateTimeFormat(locale, { weekday: style }).format(new Date(2026, 10, day))
}

export function TrainingPlanEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useT()
  const plan = usePlan()
  const blueprints = useBlueprints() ?? []
  const [state, setState] = useState<TrainingSchedule>(newSchedule())
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const problem = useLiveQuery(() => planProblem(state, blueprints), [state, blueprints])

  useEffect(() => {
    if (open) setState(plan?.schedule ?? newSchedule())
  }, [open])

  const name = (id: string) => blueprints.find((blueprint) => blueprint.id === id)?.name ?? t('Missing blueprint')
  const setEntries = (entries: TrainingSchedule['entries'], cursorEntry?: string) => {
    const cursor = Math.max(0, entries.findIndex((entry) => entry.id === cursorEntry))
    setState({ ...state, entries, cursor: entries.length ? cursor : 0 })
  }
  const currentID = state.entries[state.cursor]?.id
  const move = (index: number, offset: number) => {
    const entries = [...state.entries]
    const [moved] = entries.splice(index, 1)
    entries.splice(index + offset, 0, moved!)
    setEntries(entries, currentID)
  }
  const next = nextTicket(state, new Date())
  const nextEntry = next && state.entries.find((entry) => entry.id === next.entryID)

  const save = async () => {
    try {
      await savePlan(withEditedRevision(plan?.schedule ?? null, state))
      onClose()
    } catch (failure) {
      setError(t((failure as Error).message))
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Training plan')}
      leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}
      trailing={
        <TextButton strong onClick={save} disabled={state.enabled && !!problem} testID="saveTrainingPlan">
          {t('Save')}
        </TextButton>
      }
    >
      <Group footer={t('Optional. Pausing keeps your order and progress. Other workouts stay independent.')}>
        <Toggle label={t('Training plan active')} checked={state.enabled} onChange={(enabled) => setState({ ...state, enabled })} />
      </Group>
      <Group footer={t('Changing the mode clears the draft assignments. Cancel keeps your saved plan.')}>
        <SelectRow
          label={t('Planning')}
          value={state.mode}
          options={[
            { value: 'rotation', label: t('Rotation') },
            { value: 'weekdays', label: t('Fixed weekdays') },
          ]}
          onChange={(mode) => setState({ ...state, mode, entries: [], cursor: 0, weekdays: [] })}
        />
        <label className={styles.dateRow}>
          <span>{t('Start date')}</span>
          <input
            type="date"
            value={dayKey(new Date(state.startDate))}
            onChange={(event) => event.target.value && setState({ ...state, startDate: new Date(`${event.target.value}T00:00:00`).toISOString() })}
          />
        </label>
      </Group>
      {state.mode === 'rotation' ? (
        <>
          <Group title={t('Rotation order')} footer={t('Blueprints can appear more than once. Use Edit to reorder. A completed session advances one position.')}>
            {state.entries.map((entry, index) => (
              <div key={entry.id} className={styles.entry}>
                <span className={styles.number}>{index + 1}</span>
                <span className={styles.name}>{name(entry.blueprintID)}</span>
                {index === state.cursor && <ArrowRightCircle size={20} className={styles.next} aria-label={t('Next session')} />}
                <button type="button" aria-label={t('Move up')} disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp size={18} />
                </button>
                <button type="button" aria-label={t('Move down')} disabled={index === state.entries.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown size={18} />
                </button>
                <button type="button" aria-label={t('Delete')} onClick={() => setEntries(state.entries.filter((candidate) => candidate.id !== entry.id), currentID === entry.id ? undefined : currentID)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <RowButton onClick={() => setAdding(true)} disabled={state.entries.length >= 100} testID="addPlanBlueprint">
              <Plus size={18} aria-hidden="true" /> {t('Add blueprint')}
            </RowButton>
            {state.entries.length > 0 && (
              <SelectRow
                label={t('Next position')}
                value={String(state.cursor)}
                options={state.entries.map((entry, index) => ({ value: String(index), label: `${index + 1}. ${name(entry.blueprintID)}` }))}
                onChange={(value) => setState({ ...state, cursor: Number(value) })}
              />
            )}
          </Group>
          <Group title={t('Training days')} footer={t('Optional. Leave all days off for a rotation without dates.')}>
            {orderedDays.map((day) => (
              <Toggle
                key={day}
                label={weekdayName(day, locale)}
                checked={state.weekdays.includes(day)}
                onChange={(on) => setState({ ...state, weekdays: on ? [...state.weekdays, day] : state.weekdays.filter((candidate) => candidate !== day) })}
              />
            ))}
          </Group>
        </>
      ) : (
        <Group title={t('Weekly assignments')}>
          {orderedDays.map((day) => {
            const assigned = state.entries.find((entry) => entry.weekday === day)
            const missing = assigned && !blueprints.some((blueprint) => blueprint.id === assigned.blueprintID)
            return (
              <SelectRow
                key={day}
                label={weekdayName(day, locale)}
                value={assigned?.blueprintID ?? ''}
                options={[
                  { value: '', label: t('Rest day') },
                  ...(missing ? [{ value: assigned.blueprintID, label: t('Missing blueprint') }] : []),
                  ...blueprints.map((blueprint) => ({ value: blueprint.id, label: blueprint.name })),
                ]}
                onChange={(id) => {
                  const entries = state.entries.filter((entry) => entry.weekday !== day)
                  if (id) entries.push({ id: crypto.randomUUID(), blueprintID: id, weekday: day })
                  setState({ ...state, entries })
                }}
              />
            )
          })}
        </Group>
      )}
      <Group title={t('Preview')}>
        <div className={styles.preview}>
          {problem ? (
            <span className={styles.problem}>
              <Info size={18} aria-hidden="true" /> {t(problem)}
            </span>
          ) : !state.enabled ? (
            t('Plan paused. You can still choose any workout.')
          ) : next && nextEntry ? (
            <>
              <span className={styles.previewRow}>
                <span>{t('Next session')}</span>
                <strong>{name(nextEntry.blueprintID)}</strong>
              </span>
              {(state.weekdays.length > 0 || state.mode === 'weekdays' || new Date(next.date) > startOfDay(new Date())) && (
                <span className={styles.muted}>{new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(next.date))}</span>
              )}
            </>
          ) : null}
        </div>
      </Group>
      <p className={styles.muted}>
        {t('Sessions started from your plan advance it when saved. Matching cardio logged manually or imported from Apple Health also completes today’s due rotation slot, once per day. Older imports do not advance the rotation. Missed rotation days keep the same next workout; fixed weekdays move to the next scheduled day.')}
      </p>
      <p className={styles.muted}>{t('Changing assignments, dates or the next position disconnects unfinished sessions from the plan. Those workouts remain available.')}</p>
      <TrainingBlueprintChoices
        open={adding}
        onClose={() => setAdding(false)}
        onSelect={(blueprint) => {
          setEntries([...state.entries, { id: crypto.randomUUID(), blueprintID: blueprint.id }], currentID ?? undefined)
          setAdding(false)
        }}
      />
      <ConfirmDialog open={error !== null} title={t('Training plan')} message={error ?? ''} onDismiss={() => setError(null)} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setError(null) }]} />
    </Sheet>
  )
}

export function TrainingBlueprintChoices({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (blueprint: Blueprint) => void }) {
  const { t } = useT()
  const blueprints = useBlueprints() ?? []
  const startable = useLiveQuery(async () => {
    const result: Record<string, boolean> = {}
    for (const blueprint of blueprints) result[blueprint.id] = isStartable(blueprint, await entriesFor(blueprint.id))
    return result
  }, [blueprints])
  return (
    <Sheet open={open} onClose={onClose} title={t('Choose blueprint')} leading={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}>
      <Group>
        {blueprints.length === 0 && <p className={styles.preview}>{t('Create a blueprint first, then add it to your plan.')}</p>}
        {blueprints.map((blueprint) => (
          <RowButton key={blueprint.id} tone="plain" disabled={!startable?.[blueprint.id]} onClick={() => onSelect(blueprint)} testID={`planChoice-${blueprint.name}`}>
            {blueprint.cardio_type ? <Footprints size={18} aria-hidden="true" /> : <Dumbbell size={18} aria-hidden="true" />} {blueprint.name}
          </RowButton>
        ))}
      </Group>
    </Sheet>
  )
}

