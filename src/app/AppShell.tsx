import { Link, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: '首页' },
  { to: '/cards', label: '卡片' },
  { to: '/achievements', label: '成就' },
  { to: '/history', label: '历史' },
  { to: '/settings', label: '设置' },
]

export function AppShell() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 20, fontFamily: 'system-ui' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>下一场见</h1>
        <p style={{ margin: 0, color: '#666' }}>一个温柔陪伴的成长养成体验</p>
      </header>

      <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {links.map((link) => (
          <Link key={link.to} to={link.to} style={{ textDecoration: 'none', color: '#2563eb' }}>
            {link.label}
          </Link>
        ))}
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  )
}
