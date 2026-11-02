import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BlueprintDetailScreen } from '../features/blueprints/BlueprintDetailScreen'
import { BlueprintsScreen } from '../features/blueprints/BlueprintsScreen'
import { StarterPlansScreen } from '../features/blueprints/StarterPlansScreen'
import { DashboardScreen } from '../features/dashboard/DashboardScreen'
import { HistoryScreen } from '../features/history/HistoryScreen'
import { OpeningProvider } from '../features/opening/OpeningContext'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { StartWorkout } from '../features/workout/StartWorkout'
import { WorkoutScreen } from '../features/workout/WorkoutScreen'
import { CardioScreen } from '../features/cardio/CardioScreen'
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
            <Route path="blueprints/starter" element={<StarterPlansScreen />} />
            <Route path="blueprints/:id" element={<BlueprintDetailScreen />} />
            <Route path="history" element={<HistoryScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="workout/new" element={<StartWorkout />} />
          <Route path="workout/:id" element={<WorkoutScreen />} />
          <Route path="cardio" element={<CardioScreen />} />
        </Routes>
        <InstallHint />
        <UpdateNotice />
      </OpeningProvider>
    </HashRouter>
  )
}
