import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { db, onDatabaseChange } from '../data/db'
import { AccessCodeSheet } from '../features/account/AccessCodeSheet'
import { GuestDataPrompt } from '../features/account/GuestDataPrompt'
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
import { DemoBanner } from '../features/demo/DemoBanner'
import { SandboxPreparing } from '../features/demo/SandboxPreparing'
import { useSandboxPreparing } from './sandbox'
import { Onboarding } from '../features/onboarding/Onboarding'
import { loadOnboarding, needsIntroduction, useOnboarding } from '../features/onboarding/state'
import { ConsentScreen } from '../features/privacy/ConsentScreen'
import { DeletionNotice } from '../features/privacy/DeletionNotice'
import { needsConsent, useConsent } from '../privacy/consent'

// Hash routing works from any static host, offline and inside a future Capacitor shell.
export function App() {
  useApplyTheme()
  const { language } = useT()
  const database = useSyncExternalStore(onDatabaseChange, () => db.name)
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  return (
    <HashRouter>
      <OpeningProvider>
        <DemoBanner />
        <ConsentGate>
        <IntroductionGate key={database}>
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
        </IntroductionGate>
        </ConsentGate>
        <AccessCodeSheet />
        <GuestDataPrompt />
        <DeletionNotice />
        <InstallHint />
        <UpdateNotice />
      </OpeningProvider>
    </HashRouter>
  )
}

/** Consent on this device comes before everything else (phase 6). */
function ConsentGate({ children }: { children: ReactNode }) {
  const consent = useConsent()
  return needsConsent(consent) ? <ConsentScreen /> : children
}

/** ProfileGateView: the introduction replaces the app until it is completed or skipped. */
function IntroductionGate({ children }: { children: ReactNode }) {
  const progress = useOnboarding()
  const preparing = useSandboxPreparing()
  useEffect(() => {
    if (!progress) void loadOnboarding()
  }, [progress])
  if (preparing) return <SandboxPreparing kind={preparing} />
  if (!progress) return null
  return needsIntroduction(progress) ? <Onboarding progress={progress} /> : children
}
