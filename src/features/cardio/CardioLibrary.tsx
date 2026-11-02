import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Blueprint } from '../../data/types'
import { cardioActivities } from '../../domain/cardio'
import { useT } from '../../i18n'
import { deleteBlueprint } from '../../store/blueprints'
import { useBlueprints } from '../../store/hooks'
import { ConfirmDialog } from '../../ui/Sheet'
import { Group, RowButton } from '../../ui/controls'
import { CardioBlueprintSheet } from './CardioBlueprintSheet'
import styles from './cardio.module.css'

/** CardioLibraryView: start an activity or a cardio blueprint. */
export function CardioLibrary() {
  const { t } = useT()
  const navigate = useNavigate()
  const blueprints = (useBlueprints() ?? []).filter((blueprint) => blueprint.cardio_type !== null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Blueprint | null>(null)
  const open = (query: string) => navigate(`/cardio?${query}`, { state: { returnTo: '/blueprints' } })
  return (
    <div className={styles.list}>
      <Group title={t('Start cardio')}>
        {cardioActivities.map((activity) => (
          <RowButton key={activity} tone="plain" onClick={() => open(`activity=${encodeURIComponent(activity)}`)}>
            {t(activity)}
          </RowButton>
        ))}
      </Group>
      <Group title={t('Cardio blueprints')}>
        {blueprints.map((blueprint) => (
          <div key={blueprint.id} className={styles.readonly}>
            <RowButton tone="plain" onClick={() => open(`blueprint=${blueprint.id}`)} testID={`cardio-${blueprint.name}`}>
              {blueprint.name}
            </RowButton>
            <button type="button" className={styles.delete} aria-label={t('Delete {0}', [blueprint.name])} onClick={() => setDeleting(blueprint)}>
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
        ))}
        <RowButton onClick={() => setCreating(true)} testID="createCardioBlueprint">
          <Plus size={18} aria-hidden="true" /> {t('Create cardio blueprint')}
        </RowButton>
      </Group>
      <CardioBlueprintSheet open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog
        open={deleting !== null}
        title={t('Delete this blueprint?')}
        onDismiss={() => setDeleting(null)}
        actions={[
          {
            label: t('Delete'),
            role: 'destructive',
            onSelect: async () => {
              const blueprint = deleting!
              setDeleting(null)
              await deleteBlueprint(blueprint)
            },
          },
          { label: t('Cancel'), role: 'cancel', onSelect: () => setDeleting(null) },
        ]}
      />
    </div>
  )
}
