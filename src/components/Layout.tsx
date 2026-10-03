import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

type Theme = 'light' | 'dark'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/import', label: 'Import' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/categories', label: 'Categories' },
  { to: '/merchants', label: 'Merchants' },
  { to: '/rules', label: 'Rules' },
  { to: '/accounts', label: 'Accounts' },
]

export function Layout() {
  const [theme, setTheme] = useState<Theme>(() =>
    window.localStorage.getItem('expense-tracker-theme') === 'dark' ? 'dark' : 'light',
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('expense-tracker-theme', theme)
  }, [theme])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Ledger</strong>
          <span>Expense tracker</span>
        </div>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          <span className="theme-toggle-icon" aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          <span className={`theme-toggle-track ${theme}`} aria-hidden="true"><span /></span>
        </button>
        <nav className="nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
