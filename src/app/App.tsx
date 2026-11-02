import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BlueprintsScreen } from '../features/blueprints/BlueprintsScreen'
import { DashboardScreen } from '../features/dashboard/DashboardScreen'
import { HistoryScreen } from '../features/history/HistoryScreen'
import { OpeningProvider } from '../features/opening/OpeningContext'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { useT } from '../i18n'
import { InstallHint } from '../pwa/InstallHint'
import { UpdateNotice } from '../pwa/UpdateNotice'
import { useApplyTheme } from '../ui/useTheme'
import { AppShell } from './AppShell'

// Hash routing works from any static host, offline and inside a future Capacitor shell.
export function App() {
  useApplyTheme()
  const { language } = useT()
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  return (
    <HashRouter>
      <OpeningProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardScreen />} />
            <Route path="blueprints" element={<BlueprintsScreen />} />
            <Route path="history" element={<HistoryScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <InstallHint />
        <UpdateNotice />
      </OpeningProvider>
    </HashRouter>
  )
}
