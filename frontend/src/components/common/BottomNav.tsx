import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/',        label: 'Home',    icon: '☕' },
  { to: '/beans',   label: 'Beans',   icon: '🫘' },
  { to: '/history', label: 'History', icon: '📈' },
  { to: '/machines',label: 'Machine', icon: '⚙️'  },
]

export default function BottomNav() {
  return (
    <nav style={{
      display: 'flex',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-card)',
      height: 'var(--nav-height)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            textDecoration: 'none',
            color: isActive ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: '0.65rem',
            fontWeight: isActive ? 600 : 400,
          })}
        >
          <span style={{ fontSize: '1.4rem' }}>{icon}</span>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
