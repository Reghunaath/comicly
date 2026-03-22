import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'

export function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <nav
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      <Link
        to={user ? '/create' : '/login'}
        style={{
          fontFamily: 'var(--heading)',
          fontWeight: 700,
          fontSize: '20px',
          color: 'var(--accent)',
          textDecoration: 'none',
          letterSpacing: '-0.5px',
        }}
      >
        Comicly
      </Link>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NavLink to="/create">Create</NavLink>
          <NavLink to="/library">Library</NavLink>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '4px 12px',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: '14px',
            }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        color: 'var(--text)',
        textDecoration: 'none',
        fontSize: '14px',
        padding: '4px 12px',
        borderRadius: '6px',
      }}
    >
      {children}
    </Link>
  )
}
