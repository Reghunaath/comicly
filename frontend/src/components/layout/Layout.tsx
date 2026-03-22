import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '32px 24px' }}>
        <Outlet />
      </main>
    </div>
  )
}
