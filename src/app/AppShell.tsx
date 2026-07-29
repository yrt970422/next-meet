import { NavLink, Outlet } from 'react-router-dom'
import './AppShell.css'

const links = [
  { to: '/', label: '首页', icon: '⌂', end: true },
  { to: '/cycle', label: '周期', icon: '○', end: false },
  { to: '/settings', label: '设置', icon: '⚙', end: false },
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
            <span aria-hidden="true">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
