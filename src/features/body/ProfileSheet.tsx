import { useState } from 'react'
import type { DistanceUnit, Profile, WeightUnit } from '../../data/types'
import { parseBodyWeight, validName } from '../../domain/body'
import { loadInput } from '../../domain/measurement'
import { useT } from '../../i18n'
import { saveProfile } from '../../store/body'
import { usePreferences, useProfile } from '../../store/profile'
import { ConfirmDialog, Sheet } from '../../ui/Sheet'
import { Group, RowButton, SelectRow, TextButton, TextRow } from '../../ui/controls'
import { WeightHistory } from './WeightHistory'

const weightUnits = [
  { value: 'kg' as const, label: 'kg' },
  { value: 'lb' as const, label: 'lb' },
]

/** LocalProfileView: name, three units and target weight. */
export function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile()
  return open && profile ? <Editor profile={profile} onClose={onClose} /> : null
}

function Editor({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { t, locale } = useT()
  const showWeight = usePreferences().bodyWeightTrackingVisible
  const [name, setName] = useState(profile.name === 'Motion' ? '' : profile.name)
  const [unit, setUnit] = useState<WeightUnit>(profile.body_weight_unit)
  const [target, setTarget] = useState(profile.target_weight_kg != null ? loadInput(profile.body_weight_unit, profile.target_weight_kg, locale) : '')
  const [loadUnit, setLoadUnit] = useState<WeightUnit>(profile.load_unit)
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(profile.distance_unit)
  const [message, setMessage] = useState<string | null>(null)
  const [history, setHistory] = useState(false)
  const targetKg = target.trim() === '' ? null : parseBodyWeight(target, unit)
  const valid = validName(name) && (target.trim() === '' || targetKg !== null)
  const changeUnit = (next: WeightUnit) => {
    if (targetKg !== null) setTarget(loadInput(next, targetKg, locale))
    setUnit(next)
  }
  const save = async () => {
    try {
      await saveProfile({ name, body_weight_unit: unit, target_weight_kg: targetKg, load_unit: loadUnit, distance_unit: distanceUnit })
      setMessage('Profile saved.')
    } catch (failure) {
      setMessage((failure as Error).message)
    }
  }
  return (
    <Sheet open onClose={onClose} title={t('Your profile')} trailing={<TextButton strong onClick={onClose}>{t('Done')}</TextButton>}>
      <Group
        title={t('Your local profile')}
        footer={t('Saved measurements keep their original meaning. Open editors retain their labeled units until reopened. Use ungrouped numbers with a decimal point or comma, up to two decimal places.')}
      >
        <TextRow label={t('Name')} value={name} onChange={setName} />
        <SelectRow label={t('Body weight unit')} value={unit} onChange={changeUnit} options={weightUnits} />
        <TextRow label={t('Target weight ({0})', [unit])} value={target} onChange={setTarget} inputMode="decimal" />
        <SelectRow label={t('Exercise load')} value={loadUnit} onChange={setLoadUnit} options={weightUnits} />
        <SelectRow<DistanceUnit>
          label={t('Distance and pace')}
          value={distanceUnit}
          onChange={setDistanceUnit}
          options={[
            { value: 'km', label: 'km' },
            { value: 'mi', label: 'mi' },
          ]}
        />
        <RowButton onClick={save} disabled={!valid} testID="saveProfile">
          {t('Save profile')}
        </RowButton>
      </Group>
      <Group footer={t('Your profile and measurements are stored on this device for now. Account sign-in and cloud backup arrive in a later version.')}>
        {showWeight && (
          <RowButton tone="plain" onClick={() => setHistory(true)}>
            {t('Weight history')}
          </RowButton>
        )}
      </Group>
      <WeightHistory open={history} onClose={() => setHistory(false)} />
      <ConfirmDialog open={message !== null} title={t('Profile')} message={message ? t(message) : ''} onDismiss={() => setMessage(null)} actions={[{ label: t('OK'), role: 'cancel', onSelect: () => setMessage(null) }]} />
    </Sheet>
  )
}
