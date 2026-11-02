import { NavLink, Outlet } from 'react-router-dom'
import { History as HistoryIcon, LayoutGrid, ListChecks, Settings as SettingsIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { useT } from '../i18n'
import styles from './shell.module.css'

const tabs: { to: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/blueprints', label: 'Blueprints', icon: ListChecks },
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

/** Bottom tab bar on phones, a sidebar from tablet width; same four tabs as the iOS app. */
export function AppShell() {
  const { t } = useT()
  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Motion">
        <span className={styles.brand} aria-hidden="true">
          MOTION
        </span>
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
            <Icon size={24} strokeWidth={1.75} />
            <span>{t(label)}</span>
          </NavLink>
        ))}
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
