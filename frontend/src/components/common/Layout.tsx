import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
