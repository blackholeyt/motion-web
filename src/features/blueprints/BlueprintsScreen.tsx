import { useT } from '../../i18n'
import { PhaseNotice } from '../../ui/PhaseNotice'
import { ScreenHeader } from '../../ui/ScreenHeader'

export function BlueprintsScreen() {
  const { t } = useT()
  return (
    <>
      <ScreenHeader title={t('Blueprints')} />
      <PhaseNotice phase={2} />
    </>
  )
}
