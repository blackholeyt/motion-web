import { ArrowRight, Dumbbell, Shuffle, Sparkles } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n'
import { entriesFor, isStartable } from '../../store/blueprints'
import { useBlueprints } from '../../store/hooks'
import { PhaseNotice } from '../../ui/PhaseNotice'
import { Sheet } from '../../ui/Sheet'
import { TextButton } from '../../ui/controls'
import styles from './dashboard.module.css'

/** DashboardBlueprintPicker.swift ("Start workout"). Cardio sessions arrive in phase 3. */
export function WorkoutPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const navigate = useNavigate()
  const [cardio, setCardio] = useState(false)
  const blueprints = (useBlueprints() ?? []).filter((blueprint) => (blueprint.cardio_type !== null) === cardio)
  const details = useLiveQuery(async () => {
    const result: Record<string, { startable: boolean; exercises: number; sets: number }> = {}
    for (const blueprint of blueprints) {
      const entries = await entriesFor(blueprint.id)
      result[blueprint.id] = { startable: isStartable(blueprint, entries), exercises: entries.length, sets: entries.reduce((sum, { entry }) => sum + entry.target_sets, 0) }
    }
    return result
  }, [blueprints.map((blueprint) => blueprint.id).join()])

  const go = (path: string) => {
    onClose()
    navigate(path, { state: { returnTo: '/' } })
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('Start workout')} fullScreen trailing={<TextButton onClick={onClose}>{t('Cancel')}</TextButton>}>
      <div className={styles.picker}>
        <div>
          <h2 className={styles.pickerTitle}>{t('Make time for you.')}</h2>
          <p className={styles.muted}>{t('Choose your training. Find your rhythm.')}</p>
        </div>
        <div className={styles.segmented} role="radiogroup" aria-label={t('Training type')}>
          {[false, true].map((value) => (
            <button key={String(value)} type="button" role="radio" aria-checked={cardio === value} className={cardio === value ? styles.selected : ''} onClick={() => setCardio(value)}>
              {t(value ? 'Cardio' : 'Strength')}
            </button>
          ))}
        </div>
        {cardio ? (
          <PhaseNotice phase={3} />
        ) : (
          <>
            <Choice title={t('Freestyle strength')} subtitle={t('Build your session as you go')} icon={<Shuffle size={24} />} prominent onClick={() => go('/workout/new?freestyle=1')} testID="Freestyle strength" />
            <button type="button" className={styles.link} onClick={() => go('/blueprints/starter')}>
              <Sparkles size={16} aria-hidden="true" /> {t('Browse Starter Plans')}
            </button>
            <div className={styles.pickerHead}>
              <span>{t('YOUR BLUEPRINTS')}</span>
              <TextButton onClick={() => go('/blueprints')}>{t('Manage')}</TextButton>
            </div>
            {blueprints.length === 0 && <p className={styles.emptyBox}>{t('No strength blueprints yet. Start freestyle or create a plan in Blueprints.')}</p>}
            {blueprints.map((blueprint) => (
              <Choice
                key={blueprint.id}
                title={blueprint.name}
                subtitle={t('{0} exercises · {1} sets', [details?.[blueprint.id]?.exercises ?? 0, details?.[blueprint.id]?.sets ?? 0])}
                icon={<Dumbbell size={24} />}
                disabled={!details?.[blueprint.id]?.startable}
                onClick={() => go(`/workout/new?blueprint=${blueprint.id}`)}
                testID={`chooseBlueprint-${blueprint.name}`}
              />
            ))}
          </>
        )}
      </div>
    </Sheet>
  )
}

export function Choice({ title, subtitle, icon, prominent, disabled, onClick, testID }: { title: string; subtitle: string; icon: ReactNode; prominent?: boolean; disabled?: boolean; onClick: () => void; testID?: string }) {
  return (
    <button type="button" className={`${styles.choice} ${prominent ? styles.prominent : ''}`} disabled={disabled} onClick={onClick} data-testid={testID}>
      <span className={styles.choiceIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.choiceText}>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  )
}

