import { useState } from 'react'
import { useT } from '../../i18n'
import { platform } from '../../platform'
import { updatePreferences, usePreferences } from '../../store/profile'
import { Group, RowButton } from '../../ui/controls'

/**
 * RestNotificationPreferences.swift with web-honest texts: background alerts are best
 * effort, see docs/PLATTFORM.md.
 */
export function RestNotificationSettings() {
  const { t } = useT()
  const preferences = usePreferences()
  const [permission, setPermission] = useState(platform.notifications.permission())
  const status =
    permission === 'unsupported'
      ? t('Notifications are not supported in this browser. Your in-app timer works without them.')
      : permission === 'denied'
        ? t('System permission: denied')
        : permission === 'default'
          ? t('System permission: not requested')
          : preferences.restNotifications
            ? t('Rest notifications are on')
            : t('System permission allowed · rest notifications off')
  return (
    <>
      <Group title={t('Optional alerts')}>
        <p style={{ margin: 0, padding: '12px 16px' }}>
          {t('Get a rest-completion alert while Motion is in the background, where your browser allows it. No account or marketing messages. In the foreground, the timer provides feedback instead.')}
        </p>
        <p style={{ margin: 0, padding: '0 16px 12px', color: 'var(--secondary-text)' }}>{status}</p>
        {preferences.restNotifications ? (
          <RowButton onClick={() => updatePreferences({ restNotifications: false })}>{t('Turn off rest notifications')}</RowButton>
        ) : (
          <RowButton
            disabled={permission === 'denied' || permission === 'unsupported'}
            onClick={async () => {
              const result = await platform.notifications.requestPermission()
              setPermission(result)
              await updatePreferences({ restNotifications: result === 'granted' })
            }}
          >
            {t('Enable rest notifications')}
          </RowButton>
        )}
      </Group>
      <Group title={t('Timer behavior')}>
        <p style={{ margin: 0, padding: '12px 16px' }}>
          {t('Undoing or editing the set that started rest cancels that timer. Undo never restarts an earlier timer. Skip ends rest now; Cancel dismisses it. Restart starts the last interval again.')}
        </p>
        <p style={{ margin: 0, padding: '0 16px 12px' }}>
          {t('On iPhone, web apps are paused in the background, so an alert may arrive late or not at all. The timer is always correct when you return. Keep Motion open during rest for reliable feedback.')}
        </p>
      </Group>
    </>
  )
}
