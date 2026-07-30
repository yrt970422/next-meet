import { NavLink, Outlet } from 'react-router-dom'
import './AppShell.css'

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 11.1 12 5l7.5 6.1v7.1a1.3 1.3 0 0 1-1.3 1.3H5.8a1.3 1.3 0 0 1-1.3-1.3z" />
      <path d="M9.2 19.5v-5.2h5.6v5.2M8.3 7.9 12 4.8l3.7 3.1" />
    </svg>
  )
}

function CycleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.3 4.8v3M17.7 4.8v3M4.5 9h15" />
      <rect x="4.5" y="6.2" width="15" height="13.3" rx="2.4" />
      <path d="m9 14.1 2 2 4.2-4.2" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.5v2.1M12 17.4v2.1M4.5 12h2.1M17.4 12h2.1M6.7 6.7l1.5 1.5M15.8 15.8l1.5 1.5M17.3 6.7l-1.5 1.5M8.2 15.8l-1.5 1.5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="12" cy="12" r="1.4" />
    </svg>
  )
}

const links = [
  { to: '/', label: '首页', icon: <HomeIcon />, end: true },
  { to: '/cycle', label: '周期', icon: <CycleIcon />, end: false },
  { to: '/settings', label: '设置', icon: <SettingsIcon />, end: false },
]

export function AppShell() {
  return (
    <div className="app-shell">
      <main className="app-shell__main">
        <Outlet />
      </main>

      <nav className="app-shell__nav" aria-label="主要导航">
        {links.map((link) => (
          <NavLink
            className={({ isActive }) =>
              `app-shell__nav-link ${
                isActive ? 'app-shell__nav-link--active' : ''
              }`
            }
            end={link.end}
            key={link.to}
            to={link.to}
          >
            <span className="app-shell__nav-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
