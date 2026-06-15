import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'

export default function AppLayout({ role }) {
  const { user } = useAuth()
  const roleLabel = {
    admin: 'Administrator',
    employee: user?.designation || 'Employee',
    student: 'Student',
    counselor: 'Counselor'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f6f9' }}>
      <Sidebar role={role} />
      <div style={{ marginLeft: 250, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top navbar */}
        <nav style={{
          background: '#fff', borderBottom: '1px solid #e8ecef',
          padding: '0 24px', height: 60, display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 1px 4px rgba(0,0,0,.06)'
        }}>
          <div style={{ fontSize: 13, color: '#8d9498' }}>
            <i className="fas fa-home" style={{ marginRight: 6 }}></i>
            {roleLabel[role]} Portal
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1a2035' }}>
                {user?.name || user?.username}
              </div>
              <div style={{ fontSize: 11.5, color: '#8d9498', textTransform: 'capitalize' }}>
                {roleLabel[role]}
              </div>
            </div>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: '#1572e8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 15
            }}>
              {(user?.name || user?.username || 'U')[0].toUpperCase()}
            </div>
          </div>
        </nav>

        {/* Page content */}
        <main style={{ padding: '24px', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
