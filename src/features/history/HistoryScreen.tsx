import { History } from 'lucide-react'
import { useT } from '../../i18n'
import { EmptyState } from '../../ui/components'
import { PhaseNotice } from '../../ui/PhaseNotice'
import { ScreenHeader } from '../../ui/ScreenHeader'

export function HistoryScreen() {
  const { t } = useT()
  return (
    <>
      <ScreenHeader title={t('The work you put in.')} subtitle={t('{count} saved sessions', { count: 0 })} />
      <EmptyState icon={<History size={40} />} title={t('Your story starts here')} detail={t('Finish a workout to save it here.')} />
      <PhaseNotice phase={2} />
    </>
  )
}
