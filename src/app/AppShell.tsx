import { NavLink, Outlet } from 'react-router-dom'
import { TrendingUp, History as HistoryIcon, LayoutGrid, ListChecks, Settings as SettingsIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { useT } from '../i18n'
import styles from './shell.module.css'

const tabs: { to: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }>; sidebarOnly?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
  { to: '/blueprints', label: 'Blueprints', icon: ListChecks },
  { to: '/history', label: 'History', icon: HistoryIcon },
  // Rarely needed while training: on phones it opens from the gear on the dashboard.
  { to: '/settings', label: 'Settings', icon: SettingsIcon, sidebarOnly: true },
]

/** Bottom tab bar on phones, a sidebar from tablet width. */
export function AppShell() {
  const { t } = useT()
  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Motion">
        <span className={styles.brand} aria-hidden="true">
          MOTION
        </span>
        {tabs.map(({ to, label, icon: Icon, sidebarOnly }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''} ${sidebarOnly ? styles.sidebarOnly : ''}`}
          >
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
