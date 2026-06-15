import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { Spinner } from '../../components/common'
import { GraduationCap, Users, BookOpen, Briefcase, Award, UserCheck, TrendingUp, ArrowRight } from 'lucide-react'

function StatCard({ label, value, icon: Icon, color, to, onClick }) {
  return (
    <div className="card stat-card" style={{ cursor: to ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="stat-icon" style={{ background: color + '22', color }}>
        <Icon />
      </div>
      <div>
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/dashboard/admin/').then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const cards = [
    { label: 'Active Students', value: stats?.student_count, icon: GraduationCap, color: '#4f46e5', to: '/admin/students' },
    { label: 'Mentors / Trainers', value: stats?.mentor_count, icon: UserCheck, color: '#06b6d4', to: '/admin/employees' },
    { label: 'Courses', value: stats?.course_count, icon: BookOpen, color: '#10b981', to: '/admin/courses' },
    { label: 'Batches', value: stats?.batch_count, icon: Briefcase, color: '#f59e0b', to: '/admin/batches' },
    { label: 'Completed Students', value: stats?.completed_count, icon: Award, color: '#8b5cf6', to: '/admin/completed' },
    { label: 'Counselors', value: stats?.counselor_count, icon: Users, color: '#ec4899', to: '/admin/employees' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Overview of IIE Connect platform</p>
      </div>

      <div className="stat-grid">
        {cards.map(c => (
          <StatCard key={c.label} {...c} onClick={() => c.to && navigate(c.to)} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Add New Student', to: '/admin/students' },
              { label: 'Add Employee', to: '/admin/employees' },
              { label: 'Create New Batch', to: '/admin/batches' },
              { label: 'Post Announcement', to: '/admin/announcements' },
              { label: 'View Completed Students', to: '/admin/completed' },
            ].map(item => (
              <button key={item.label} className="btn btn-secondary" style={{ justifyContent: 'space-between' }} onClick={() => navigate(item.to)}>
                {item.label} <ArrowRight size={14} />
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Platform Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Total Employees', value: (stats?.mentor_count || 0) + (stats?.counselor_count || 0) + (stats?.trainer_count || 0) },
              { label: 'Active Students', value: stats?.student_count },
              { label: 'Total Courses', value: stats?.course_count },
              { label: 'Running Batches', value: stats?.batch_count },
              { label: 'Completed Students', value: stats?.completed_count },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>{row.label}</span>
                <span style={{ fontWeight: 600 }}>{row.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
