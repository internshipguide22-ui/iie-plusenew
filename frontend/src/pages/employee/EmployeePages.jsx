
import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'  // ← ADD THIS

// ── Design tokens (same as CounselorPages) ─────────────────────────────────────────
const T = {
  navy: '#0f1b2d',
  navyMid: '#1a2e4a',
  navyLight: '#243b55',
  amber: '#f4a940',
  amberLight: '#fcd17a',
  teal: '#2ec4b6',
  rose: '#e84855',
  sage: '#4caf81',
  slate: '#8099b3',
  slateLight: '#b8ccdf',
  white: '#f8fafc',
  border: 'rgba(15,27,45,0.08)',
  shadow: '0 4px 24px rgba(15,27,45,0.10)',
  shadowMd: '0 8px 40px rgba(15,27,45,0.14)',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  .employee-root { font-family: 'DM Sans', sans-serif; color: ${T.navy}; }
  .employee-root h1, .employee-root h2, .employee-root h3, .employee-root h4, .employee-root h5 { font-family: 'Playfair Display', serif; }

  .employee-card {
    background: #fff; border-radius: 16px;
    box-shadow: ${T.shadow}; border: 1px solid ${T.border}; overflow: hidden;
  }
  .employee-card-header {
    padding: 16px 22px; border-bottom: 1px solid ${T.border};
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
  }
  .employee-card-header h5 { margin: 0; font-family: 'Playfair Display'; font-size: 17px; font-weight: 600; }

  .employee-page-header {
    margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid ${T.border};
    display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  }
  .employee-page-header h3 {
    margin: 0 0 4px; font-size: 24px;
    background: linear-gradient(135deg,${T.navy},${T.navyLight});
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .employee-page-header p { margin: 0; color: ${T.slate}; font-size: 13.5px; }

  .employee-table { width: 100%; border-collapse: collapse; }
  .employee-table th {
    background: linear-gradient(135deg,${T.navy},${T.navyMid});
    color: white; font-size: 11px; font-weight: 600;
    letter-spacing: .7px; text-transform: uppercase;
    padding: 13px 14px; text-align: left; white-space: nowrap;
  }
  .employee-table td {
    padding: 12px 14px; border-bottom: 1px solid ${T.border};
    font-size: 13.5px; color: ${T.navy};
  }
  .employee-table tr:last-child td { border-bottom: none; }
  .employee-table tr { transition: background .15s; }
  .employee-table tr:hover td { background: rgba(244,169,64,.04); }

  .employee-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; border-radius: 10px; border: none;
    font-family: 'DM Sans'; font-weight: 600; font-size: 13px;
    cursor: pointer; transition: all .18s; white-space: nowrap;
  }
  .employee-btn-primary { background: ${T.amber}; color: ${T.navy}; }
  .employee-btn-primary:hover { background: ${T.amberLight}; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(244,169,64,.35); }
  .employee-btn-ghost { background: transparent; color: ${T.slate}; border: 1.5px solid ${T.border}; }
  .employee-btn-ghost:hover { background: ${T.white}; color: ${T.navy}; border-color: ${T.slateLight}; }
  .employee-btn-danger { background: ${T.rose}; color: white; }
  .employee-btn-danger:hover { filter: brightness(1.1); }
  .employee-btn-teal { background: ${T.teal}; color: white; }
  .employee-btn-teal:hover { filter: brightness(1.08); }
  .employee-btn-sm { padding: 5px 12px; font-size: 12px; border-radius: 8px; }
  .employee-btn-icon { padding: 7px 10px; border-radius: 8px; }

  .employee-input {
    padding: 9px 13px; border: 1.5px solid ${T.border};
    border-radius: 10px; font-family: 'DM Sans'; font-size: 13px;
    outline: none; transition: border .18s, box-shadow .18s; background: ${T.white};
    width: 100%; box-sizing: border-box; color: ${T.navy};
  }
  .employee-input:focus { border-color: ${T.amber}; box-shadow: 0 0 0 3px rgba(244,169,64,.15); }

  .employee-select {
    padding: 9px 13px; border: 1.5px solid ${T.border};
    border-radius: 10px; font-family: 'DM Sans'; font-size: 13px;
    outline: none; transition: border .18s; background: ${T.white};
    width: 100%; box-sizing: border-box; color: ${T.navy};
    -webkit-appearance: none; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238099b3' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
  }
  .employee-select:focus { border-color: ${T.amber}; box-shadow: 0 0 0 3px rgba(244,169,64,.15); }

  .employee-label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 5px; color: ${T.navy}; }
  .employee-fg { margin-bottom: 16px; }
  .employee-hint { color: ${T.slate}; font-size: 11.5px; margin-top: 4px; display: block; }
  .employee-req { color: ${T.rose}; margin-left: 3px; }

  /* Stat Grid */
  .employee-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 28px;
  }
  .employee-stat-card {
    background: #fff;
    border-radius: 20px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    border: 1px solid ${T.border};
    transition: all 0.2s ease;
    box-shadow: ${T.shadow};
  }
  .employee-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: ${T.shadowMd};
  }
  .employee-stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }
  .employee-stat-value {
    font-size: 28px;
    font-weight: 700;
    color: ${T.navy};
    line-height: 1.2;
  }
  .employee-stat-label {
    font-size: 13px;
    color: ${T.slate};
    font-weight: 500;
  }

  /* Modal */
  .employee-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-y: auto;
  }
  .employee-modal {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-height: 90vh;
    margin: 20px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  .employee-modal-header {
    padding: 20px 28px;
    background: #fff;
    border-bottom: 1px solid ${T.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 20px 20px 0 0;
  }
  .employee-modal-header h5 {
    margin: 0;
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 600;
    color: ${T.navy};
  }
  .employee-modal-close {
    background: #f1f5f9;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: ${T.slate};
  }
  .employee-modal-close:hover {
    background: #e2e8f0;
    color: ${T.navy};
  }
  .employee-modal-body {
    padding: 28px;
    overflow-y: auto;
    flex: 1;
  }

  /* Badge */
  .employee-badge {
    display: inline-flex; align-items: center; padding: 3px 10px;
    border-radius: 20px; font-size: 11.5px; font-weight: 600; white-space: nowrap; letter-spacing: .2px;
  }

  .employee-avatar {
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; color: white; flex-shrink: 0; font-family: 'DM Sans';
  }

  .employee-empty { padding: 60px; text-align: center; color: ${T.slate}; }
  .employee-empty-icon { font-size: 48px; opacity: 0.2; margin-bottom: 16px; }

  .employee-alert-info { background: #e4f2fd; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #1260a0; }
  .employee-alert-success { background: #e8f8f0; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #1a6b3e; }
  .employee-alert-warning { background: #fef5e4; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #8a5a00; }

  .employee-divider { border: none; border-top: 1px solid ${T.border}; margin: 20px 0; }

  .employee-row-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media(max-width:640px) { .employee-row-grid-2 { grid-template-columns: 1fr; } }

  @keyframes employeeSpin { to { transform: rotate(360deg); } }
  .employee-spin {
    width: 40px; height: 40px;
    border: 3px solid ${T.border};
    border-top-color: ${T.amber};
    border-radius: 50%;
    animation: employeeSpin 1s linear infinite;
    margin: 40px auto;
  }

  /* Batch Card Grid */
  .employee-batch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 24px;
    margin-bottom: 30px;
  }
  .employee-batch-card {
    background: #fff;
    border-radius: 20px;
    overflow: hidden;
    transition: all 0.3s ease;
    border: 1px solid ${T.border};
    box-shadow: ${T.shadow};
  }
  .employee-batch-card:hover {
    transform: translateY(-5px);
    box-shadow: ${T.shadowMd};
  }
  .employee-batch-header {
    background: linear-gradient(135deg, ${T.navy}, ${T.navyMid});
    color: #fff;
    padding: 18px;
    text-align: center;
  }
  .employee-batch-header h4 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }
  .employee-batch-header p {
    margin: 5px 0 0;
    font-size: 13px;
    opacity: 0.85;
  }
  .employee-batch-body {
    padding: 18px;
  }
  .employee-batch-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid ${T.border};
    font-size: 13px;
  }
  .employee-batch-row span:first-child {
    font-weight: 600;
    color: ${T.navy};
  }
  .employee-batch-row span:last-child {
    color: ${T.slate};
    text-align: right;
  }
  .employee-batch-footer {
    padding: 15px;
    background: rgba(15,27,45,0.03);
    border-top: 1px solid ${T.border};
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .employee-batch-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
`

// ── Shared components ─────────────────────────────────────────────────────────
function Styles() { return <style>{css}</style> }

const Spin = () => (
  <div style={{ padding: 56, textAlign: 'center' }}>
    <div className="employee-spin" />
  </div>
)

const Empty = ({ msg = 'No data found.', icon = 'fa-inbox' }) => (
  <div className="employee-empty">
    <div className="employee-empty-icon"><i className={`fas ${icon}`} /></div>
    <p style={{ margin: 0, fontFamily: "'Playfair Display'", fontSize: 16 }}>{msg}</p>
  </div>
)

const gradients = [
  'linear-gradient(135deg,#f4a940,#e8843a)',
  'linear-gradient(135deg,#2ec4b6,#1a9e93)',
  'linear-gradient(135deg,#e84855,#c62d39)',
  'linear-gradient(135deg,#4caf81,#2d8a5e)',
  'linear-gradient(135deg,#667eea,#764ba2)',
]

const avatarGrad = (name = '') => gradients[(name.charCodeAt(0) || 0) % gradients.length]

function Avatar({ name = '', size = 34, radius = 9 }) {
  return (
    <div className="employee-avatar" style={{ width: size, height: size, borderRadius: radius, background: avatarGrad(name), fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function Badge({ text, variant = 'default' }) {
  const variants = {
    success: { bg: '#e8f8f0', color: '#1a6b3e' },
    danger: { bg: '#fdeaec', color: '#9b1c27' },
    warning: { bg: '#fef5e4', color: '#8a5a00' },
    info: { bg: '#e4f2fd', color: '#1260a0' },
    teal: { bg: '#e0f7f5', color: '#1a7a72' },
    primary: { bg: '#fef0d9', color: '#8a5a00' },
    approved: { bg: '#d1e7dd', color: '#0a3622' },
    pending: { bg: '#fff3cd', color: '#664d03' },
    default: { bg: '#f0f3f7', color: T.slate },
  }
  const s = variants[variant] || variants.default
  return <span className="employee-badge" style={{ background: s.bg, color: s.color }}>{text}</span>
}

// Modal
function Modal({ open, onClose, title, children, size = 'lg' }) {
  if (!open) return null
  const maxW = { xl: 960, lg: 820, md: 600, sm: 460 }[size] || 820
  return (
    <div className="employee-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="employee-modal" style={{ maxWidth: maxW }}>
        <div className="employee-modal-header">
          <h5>{title}</h5>
          <button className="employee-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="employee-modal-body">{children}</div>
      </div>
    </div>
  )
}

// Page header
function PH({ title, sub, btn }) {
  return (
    <div className="employee-page-header">
      <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
      {btn}
    </div>
  )
}

// Section header
function SH({ title, count, actions }) {
  return (
    <div className="employee-card-header">
      <h5>{title}{count != null && <span style={{ color: T.slate, fontWeight: 400, fontFamily: "'DM Sans'", fontSize: 14, marginLeft: 8 }}>({count})</span>}</h5>
      {actions}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export function EmployeeDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()  // ← ADD THIS

  useEffect(() => {
    api.get('/dashboard/employee/').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="employee-root"><Styles /><Spin /></div>

  const stats = [
    { label: 'My Batches', value: data?.my_batches_count, icon: 'fa-users', color: T.teal, bgColor: 'rgba(46,196,182,0.1)', to: '/employee/batches' },
    { label: 'My Students', value: data?.my_students_count, icon: 'fa-user-graduate', color: T.sage, bgColor: 'rgba(76,175,129,0.1)', to: '/employee/students' },
    { label: 'Materials', value: data?.materials_count, icon: 'fa-book', color: T.navy, bgColor: 'rgba(15,27,45,0.1)', to: '/employee/materials' },
    { label: 'My Graduates', value: data?.completed_students_count, icon: 'fa-graduation-cap', color: T.rose, bgColor: 'rgba(232,72,85,0.1)', to: '/employee/completed' },
  ]

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title={`👋 Welcome, ${data?.employee?.first_name || 'Employee'}!`}
        sub={`${data?.employee?.designation || 'Staff'} — ${data?.employee?.branch || 'Branch'} Branch`}
      />

      <div className="employee-stat-grid">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="employee-stat-card"
            onClick={() => stat.to && navigate(stat.to)}
            style={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 8px 24px ${stat.color}33`
              e.currentTarget.style.borderColor = stat.color
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = ''
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div className="employee-stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
              <i className={`fas ${stat.icon}`} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="employee-stat-value">{stat.value ?? 0}</div>
              <div className="employee-stat-label">{stat.label}</div>
            </div>
            <i className="fas fa-arrow-right" style={{ color: stat.color, opacity: 0.4, fontSize: 12 }} />
          </div>
        ))}
      </div>

      {/* {data?.announcements?.length > 0 && (
        <div className="employee-card">
          <SH title="📢 Recent Announcements" />
          <div style={{ padding: '0 22px 22px 22px' }}>
            {data.announcements.slice(0, 5).map((a, idx) => (
              <div key={a.id} style={{
                padding: '14px 0',
                borderBottom: idx < data.announcements.slice(0, 5).length - 1 ? `1px solid ${T.border}` : 'none'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, color: T.navy }}>{a.title}</div>
                <p style={{ color: T.slate, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{a.message}</p>
                <div style={{ fontSize: 11, color: T.slateLight, marginTop: 8 }}>
                  <i className="far fa-calendar-alt" style={{ marginRight: 6 }} />
                  {new Date(a.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW BATCHES
// ══════════════════════════════════════════════════════════════════════════════
export function ViewBatches() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [attendanceModal, setAttendanceModal] = useState(null)
  const [sessionsModal, setSessionsModal] = useState(null)
  const [studentsModal, setStudentsModal] = useState(null)

  useEffect(() => {
    api.get('/batches/').then(r => setBatches(r.data.results || r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="employee-root"><Styles /><Spin /></div>

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📘 My Batches" sub="View and manage your assigned batches" />

      {batches.length === 0 ? (
        <div className="employee-card">
          <Empty msg="No batches assigned to you." icon="fa-users" />
        </div>
      ) : (
        <div className="employee-batch-grid">
          {batches.map(batch => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onViewAttendance={() => setAttendanceModal(batch)}
              onViewSessions={() => setSessionsModal(batch)}
              onViewStudents={() => setStudentsModal(batch)}
            />
          ))}
        </div>
      )}

      {attendanceModal && <AttendanceModal batch={attendanceModal} onClose={() => setAttendanceModal(null)} />}
      {sessionsModal && <SessionsModal batch={sessionsModal} onClose={() => setSessionsModal(null)} />}
      {studentsModal && <StudentsModal batch={studentsModal} onClose={() => setStudentsModal(null)} />}
    </div>
  )
}

// ─── Batch Card ────────────────────────────────────────────────────────────
function BatchCard({ batch, onViewAttendance, onViewSessions, onViewStudents }) {
  const btn = (label, icon, color, onClick) => (
    <button
      onClick={onClick}
      className="employee-btn employee-btn-sm"
      style={{ background: 'transparent', border: `1.5px solid ${color}`, color }}
      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = color }}
    >
      <i className={`fas ${icon}`} /> {label}
    </button>
  )

  return (
    <div className="employee-batch-card">
      <div className="employee-batch-header">
        <h4>{batch.batch_number}</h4>
        <p>{batch.course_name_display}</p>
      </div>
      <div className="employee-batch-body">
        <div className="employee-batch-row">
          <span>Course Type:</span>
          <span>{batch.course_type || '—'}</span>
        </div>
        <div className="employee-batch-row">
          <span>Timing:</span>
          <span>{batch.batch_timing}</span>
        </div>
        <div className="employee-batch-row">
          <span>Start Date:</span>
          <span>{batch.start_date}</span>
        </div>
        <div className="employee-batch-row">
          <span>End Date:</span>
          <span>{batch.end_date}</span>
        </div>
        <div className="employee-batch-row">
          <span>Branch:</span>
          <span>{batch.branch}</span>
        </div>
      </div>
      <div className="employee-batch-footer">
        <div className="employee-batch-actions">
          <a href={`/employee/attendance?batch_id=${batch.id}`} className="employee-btn employee-btn-sm" style={{ background: T.sage, color: '#fff', textDecoration: 'none' }}>
            <i className="fas fa-check-circle" /> Mark Attendance
          </a>
          {btn('View Attendance', 'fa-eye', T.navy, onViewAttendance)}
        </div>
        <div className="employee-batch-actions">
          {btn('View Sessions', 'fa-list', T.rose, onViewSessions)}
          {btn('View Students', 'fa-users', T.teal, onViewStudents)}
        </div>

      </div>
    </div>
  )
}

// ─── Attendance Records Modal ──────────────────────────────────────────────
function AttendanceModal({ batch, onClose }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/batches/${batch.id}/attendance/`).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [batch.id])

  return (
    <Modal open onClose={onClose} size="xl" title={`📊 Attendance Records — ${batch.batch_number} · ${batch.course_name_display}`}>
      {loading ? <Spin /> : records.length === 0 ? (
        <Empty msg="No attendance records found" icon="fa-clipboard-list" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="employee-table">
            <thead>
              <tr>
                <th>Date</th><th>Student Name</th><th>Batch</th><th>Status</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td style={{ fontWeight: 500 }}>{r.student_name}</td>
                  <td>{r.batch_number}</td>
                  <td>
                    <Badge text={r.status} variant={r.status === 'Present' ? 'success' : 'danger'} />
                  </td>
                  <td>{r.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

// ─── Request Completion Section ────────────────────────────────────────────
function RequestCompletionSection({ batch, students, sessions, onSuccess }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedCounselor, setSelectedCounselor] = useState('')
  const [counselors, setCounselors] = useState([])
  const [topicsCovered, setTopicsCovered] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (batch?.branch && showForm) {
      api.get(`/employees/?designation=counselor&branch=${batch.branch}`)
        .then(r => setCounselors(r.data.results || r.data))
        .catch(err => console.error("Error fetching counselors:", err))
    }
  }, [batch?.branch, showForm])

  const completedCount = sessions.filter(s => s.staff_completed).length
  const totalCount = sessions.length

  const submit = async () => {
    if (!selectedStudent) return toast.error('Select a student')
    if (!selectedCounselor) return toast.error('Select a counselor')
    if (!topicsCovered.trim()) return toast.error('Please describe topics covered')

    setSaving(true)
    try {
      await api.post(`/students/${selectedStudent}/request-completion/`, {
        counselor_id: selectedCounselor,
        topics_covered: topicsCovered,
        sessions_completed: completedCount,
        total_sessions: totalCount,
        message: message,
      })
      toast.success('Completion request sent to counselor!')
      setShowForm(false)
      setSelectedStudent('')
      setSelectedCounselor('')
      setTopicsCovered('')
      setMessage('')
      if (onSuccess) onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 14, color: T.navy }}>
            📤 Request Student Completion
          </span>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: T.slate }}>
            Send a completion request to the counselor for a student
          </p>
        </div>
        <button
          className={`employee-btn ${showForm ? 'employee-btn-danger' : 'employee-btn-primary'} employee-btn-sm`}
          onClick={() => setShowForm(f => !f)}
        >
          <i className={`fas ${showForm ? 'fa-times' : 'fa-paper-plane'}`} />
          {showForm ? 'Cancel' : 'Request'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18 }}>
          <div className="employee-fg">
            <label className="employee-label">Select Student <span className="employee-req">*</span></label>
            <select className="employee-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
              <option value="">Choose student…</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_id})</option>
              ))}
            </select>
          </div>

          <div className="employee-fg">
            <label className="employee-label">Select Counselor <span className="employee-req">*</span></label>
            <select className="employee-select" value={selectedCounselor} onChange={e => setSelectedCounselor(e.target.value)}>
              <option value="">Choose counselor…</option>
              {counselors.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>

          <div className="employee-fg">
            <label className="employee-label">Topics Covered <span className="employee-req">*</span></label>
            <textarea
              className="employee-input"
              rows={3}
              value={topicsCovered}
              onChange={e => setTopicsCovered(e.target.value)}
              placeholder="Describe all topics covered with this student..."
            />
          </div>

          <div className="employee-fg">
            <label className="employee-label">Message to Counselor (optional)</label>
            <input
              className="employee-input"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Any additional notes for the counselor..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <small style={{ color: T.slate, fontSize: 12 }}>
              Sessions: <strong>{completedCount}/{totalCount}</strong> completed
            </small>
            <button
              className="employee-btn employee-btn-primary employee-btn-sm"
              onClick={submit}
              disabled={saving || !selectedStudent || !selectedCounselor || !topicsCovered.trim()}
            >
              {saving ? <><i className="fas fa-spinner fa-spin" /> Sending...</> : <><i className="fas fa-paper-plane" /> Send to Counselor</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sessions Modal (with checkbox workflow + completion request) ────────────────
function SessionsModal({ batch, onClose }) {
  const [data, setData] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [toggling, setToggling] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/batches/${batch.id}/sessions-logsheet/`),
      api.get(`/batches/${batch.id}/students/`),
    ]).then(([dr, sr]) => {
      setData(dr.data)
      setStudents(sr.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [batch.id])

  const sessions = data?.sessions || []
  const completed = sessions.filter(s => s.staff_completed)
  const pending = sessions.filter(s => !s.staff_completed)
  const pct = sessions.length ? Math.round((completed.length / sessions.length) * 100) : 0
  const logsheetUrl = data?.batch?.course_logsheet || data?.logsheet_url
  const tabSessions = tab === 'all' ? sessions : tab === 'done' ? completed : pending

  const handleToggle = async (session) => {
    setToggling(session.id)
    try {
      if (session.staff_completed) {
        await api.post(`/sessions/${session.id}/staff-unmark/`)
        toast.success(`Session ${session.session_number} unmarked`)
      } else {
        await api.post(`/sessions/${session.id}/staff-complete/`)
        toast.success(`Session ${session.session_number} marked complete! Students notified.`)
      }
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed')
    } finally { setToggling(null) }
  }

  const handleExtract = async () => {
    try {
      const r = await api.post(`/batches/${batch.id}/extract-sessions/`)
      setData(prev => ({ ...prev, sessions: r.data.sessions }))
      toast.success(r.data.message)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Extraction failed')
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title={`📋 Sessions — ${batch.batch_number} · ${batch.course_name_display}`}>
      {loading ? <Spin /> : (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>Course Progress</span>
              <span style={{ fontWeight: 700 }}>{pct}% ({completed.length}/{sessions.length} sessions)</span>
            </div>
            <div style={{ height: 8, background: '#e9ecef', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${T.sage}, ${T.teal})`, borderRadius: 4, transition: 'width .5s' }} />
            </div>
          </div>

          <div className="employee-alert-info" style={{ marginBottom: 16 }}>
            <i className="fas fa-users" style={{ marginRight: 8 }} />
            <strong>Students in this batch:</strong>{' '}
            {students.length === 0 ? 'No students assigned yet.' : students.map(s => `${s.first_name} ${s.last_name}`).join(', ')}
          </div>

          {logsheetUrl && (
            <div style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
              <a href={logsheetUrl} target="_blank" rel="noreferrer" className="employee-btn employee-btn-teal employee-btn-sm" style={{ textDecoration: 'none' }}>
                <i className="fas fa-eye" /> View Logsheet
              </a>
              <a href={logsheetUrl} download className="employee-btn employee-btn-primary employee-btn-sm" style={{ textDecoration: 'none' }}>
                <i className="fas fa-download" /> Download Logsheet
              </a>
            </div>
          )}

          {!logsheetUrl && (
            <div className="employee-alert-warning" style={{ marginBottom: 14, textAlign: 'center' }}>
              <i className="fas fa-file-pdf" /> No logsheet uploaded for this course.
            </div>
          )}

          {logsheetUrl && sessions.length === 0 && (
            <div style={{ marginBottom: 14 }}>
              <button className="employee-btn employee-btn-primary w-100" onClick={handleExtract}>
                <i className="fas fa-magic" /> Extract Sessions from Logsheet
              </button>
              <small className="employee-hint">Click to auto-extract sessions from the uploaded PDF logsheet</small>
            </div>
          )}

          {sessions.length > 0 && (
            <div className="employee-alert-info" style={{ marginBottom: 14 }}>
              <i className="fas fa-info-circle" /> <strong>How it works:</strong> Check the box next to a session to mark it as completed. Students will be notified and can confirm or raise a doubt.
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${T.border}`, marginBottom: 12 }}>
            {[['all', `All (${sessions.length})`], ['done', `Completed (${completed.length})`], ['pending', `Pending (${pending.length})`]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{
                  background: 'none', border: 'none', padding: '8px 16px',
                  fontWeight: tab === key ? 700 : 400,
                  color: tab === key ? T.amber : T.slate,
                  borderBottom: tab === key ? `2px solid ${T.amber}` : '2px solid transparent',
                  cursor: 'pointer', fontSize: 13
                }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {sessions.length === 0 ? (
              <Empty msg="No sessions created for this batch yet." icon="fa-list" />
            ) : tabSessions.length === 0 ? (
              <Empty msg="No sessions in this category." icon="fa-filter" />
            ) : tabSessions.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderBottom: `1px solid ${T.border}`,
                background: s.staff_completed ? '#f0fff4' : '#fff',
                borderRadius: 8, marginBottom: 6, transition: 'background .2s'
              }}>
                <div style={{ flexShrink: 0 }}>
                  {toggling === s.id ? (
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: 20, color: T.amber }}></i>
                  ) : (
                    <input
                      type="checkbox"
                      checked={!!s.staff_completed}
                      onChange={() => handleToggle(s)}
                      style={{ width: 20, height: 20, cursor: 'pointer', accentColor: T.sage }}
                      title={s.staff_completed ? 'Click to unmark' : 'Click to mark as completed'}
                    />
                  )}
                </div>

                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: s.staff_completed ? T.sage : '#e9ecef',
                  color: s.staff_completed ? '#fff' : T.slate,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0
                }}>
                  {s.staff_completed ? <i className="fas fa-check" style={{ fontSize: 12 }}></i> : s.session_number}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 14,
                    textDecoration: s.staff_completed ? 'line-through' : 'none',
                    color: s.staff_completed ? T.slate : T.navy
                  }}>
                    {s.title || `Session ${s.session_number}`}
                  </div>
                  {s.topics && (
                    <div style={{ color: T.slate, fontSize: 12, marginTop: 2 }}>
                      {s.topics.length > 80 ? s.topics.substring(0, 80) + '...' : s.topics}
                    </div>
                  )}
                  {s.staff_completed && s.completed_date && (
                    <small style={{ color: T.sage, fontSize: 11 }}>
                      <i className="fas fa-check-circle" /> Completed on {new Date(s.completed_date).toLocaleDateString('en-IN')}
                    </small>
                  )}
                </div>

                <div style={{ flexShrink: 0 }}>
                  <Badge text={s.staff_completed ? '✅ Done' : '⏳ Pending'} variant={s.staff_completed ? 'success' : 'warning'} />
                </div>
              </div>
            ))}
          </div>

          {sessions.length > 0 && students.length > 0 && (
            <RequestCompletionSection batch={batch} students={students} sessions={sessions} onSuccess={load} />
          )}
        </>
      )}
    </Modal>
  )
}

// ─── Students Modal ────────────────────────────────────────────────────────
function StudentsModal({ batch, onClose }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get(`/batches/${batch.id}/students/`).then(r => setStudents(r.data)).finally(() => setLoading(false))
  }, [batch.id])

  const filtered = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.student_id}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Modal open onClose={onClose} size="xl" title={`👥 Students — ${batch.batch_number} · ${batch.course_name_display}`}>
      <div className="employee-fg" style={{ marginBottom: 16 }}>
        <input
          className="employee-input"
          placeholder="Search students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {loading ? <Spin /> : filtered.length === 0 ? (
        <Empty msg="No students in this batch" icon="fa-users" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="employee-table">
            <thead>
              <tr>
                <th>#</th><th>Student ID</th><th>Name</th><th>Email</th><th>Mobile</th><th>Course</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td><Badge text={s.student_id} variant="info" /></td>
                  <td style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</td>
                  <td style={{ fontSize: 12 }}>{s.email}</td>
                  <td>{s.mobile_no}</td>
                  <td>{s.course}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MARK ATTENDANCE
// ══════════════════════════════════════════════════════════════════════════════
export function MarkAttendance() {
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/batches/').then(r => {
      const b = r.data.results || r.data
      setBatches(b)
      const params = new URLSearchParams(window.location.search)
      const bid = params.get('batch_id')
      if (bid) setSelectedBatch(bid)
    })
  }, [])

  useEffect(() => {
    if (!selectedBatch) return setStudents([])
    setLoading(true)
    api.get(`/batches/${selectedBatch}/students/`).then(r => {
      setStudents(r.data)
      const init = {}
      r.data.forEach(s => { init[s.id] = 'Present' })
      setAttendance(init)
    }).finally(() => setLoading(false))
  }, [selectedBatch])

  const submit = async () => {
    if (!selectedBatch) return toast.error('Select a batch first')
    if (students.length === 0) return toast.error('No students in this batch')
    setSaving(true)
    try {
      const data = Object.entries(attendance).map(([student_id, status]) => ({ student_id: parseInt(student_id), status }))
      await api.post('/attendance/mark/', { batch_id: parseInt(selectedBatch), date, attendance: data })
      toast.success('Attendance saved successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📋 Mark Attendance" sub="Record student attendance for a batch" />

      <div className="employee-card">
        <div className="employee-card-body" style={{ padding: 22 }}>
          <div className="employee-row-grid-2" style={{ marginBottom: 24 }}>
            <div className="employee-fg">
              <label className="employee-label">🎓 Select Batch:</label>
              <select className="employee-select" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                <option value="">-- Select Batch --</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batch_number} — {b.course_name_display} ({b.batch_timing})</option>)}
              </select>
            </div>
            <div className="employee-fg">
              <label className="employee-label">📅 Date:</label>
              <input type="date" className="employee-input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          {loading ? <Spin /> : students.length === 0 && selectedBatch ? (
            <Empty msg="No students in this batch" icon="fa-user-graduate" />
          ) : students.length > 0 ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="employee-table">
                  <thead>
                    <tr><th>#</th><th>Student</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</div>
                          <small style={{ color: T.slate }}>{s.student_id}</small>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 20 }}>
                            {['Present', 'Absent', 'Late'].map(st => (
                              <label key={st} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name={`att-${s.id}`}
                                  checked={attendance[s.id] === st}
                                  onChange={() => setAttendance(a => ({ ...a, [s.id]: st }))}
                                />
                                <span style={{ color: st === 'Present' ? T.sage : st === 'Absent' ? T.rose : T.amber }}>{st}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="employee-btn employee-btn-primary" onClick={submit} disabled={saving}>
                  <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`} />
                  {saving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STUDY MATERIALS
// ══════════════════════════════════════════════════════════════════════════════
export function StudyMaterials({ studentView = false }) {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/materials/').then(r => setMaterials(r.data.results || r.data)).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const fileIcon = url => {
    if (!url) return 'fa-file-alt'
    if (url.includes('.pdf')) return 'fa-file-pdf'
    if (url.includes('.doc')) return 'fa-file-word'
    if (url.includes('.ppt')) return 'fa-file-powerpoint'
    if (url.includes('.xls')) return 'fa-file-excel'
    return 'fa-file-alt'
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title="📚 Study Materials"
        sub={studentView ? 'Materials shared with your batch' : 'Upload and manage study materials'}
        btn={!studentView && <button className="employee-btn employee-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-upload" /> Upload Material</button>}
      />

      <div className="employee-card">
        <SH title={`Materials (${materials.length})`} />
        {loading ? <Spin /> : materials.length === 0 ? (
          <Empty msg="No materials uploaded yet" icon="fa-folder-open" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Title</th>
                  {!studentView && <th>Uploaded By</th>}
                  <th>Batch</th>
                  <th>Date</th>
                  <th>File</th>
                  {!studentView && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {materials.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${T.rose}, ${T.amber})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`fas ${fileIcon(m.file)}`} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{m.title}</div>
                          {m.description && <small style={{ color: T.slate }}>{m.description}</small>}
                        </div>
                      </div>
                    </td>
                    {!studentView && <td>{m.uploaded_by_name}</td>}
                    <td>{m.batch_number}</td>
                    <td style={{ fontSize: 12 }}>{m.uploaded_at ? new Date(m.uploaded_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{m.file ? <a href={m.file} target="_blank" rel="noreferrer" className="employee-btn employee-btn-sm employee-btn-ghost" style={{ textDecoration: 'none' }}><i className="fas fa-download" /> Download</a> : <span style={{ color: T.slate, fontSize: 12 }}>No file</span>}</td>
                    {!studentView && <td><button className="employee-btn employee-btn-sm employee-btn-danger" onClick={() => setDeleteId(m.id)}><i className="fas fa-trash-alt" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <MaterialUploadModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {deleteId && (
        <Modal open onClose={() => setDeleteId(null)} title="Delete Material" size="sm">
          <p>Are you sure you want to delete this material?</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="employee-btn employee-btn-danger" onClick={async () => { await api.delete(`/materials/${deleteId}/delete/`); toast.success('Deleted'); setDeleteId(null); load() }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MaterialUploadModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', batch: '' })
  const [file, setFile] = useState(null)
  const [batches, setBatches] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.get('/batches/').then(r => setBatches(r.data.results || r.data)) }, [])

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title); fd.append('batch', form.batch)
      if (form.description) fd.append('description', form.description)
      if (file) fd.append('file', file)
      await api.post('/materials/upload/', fd)
      toast.success('Material uploaded successfully!'); onSaved()
    } catch (err) {
      const d = err.response?.data || {}
      toast.error(d.error || d.detail || Object.values(d)[0]?.[0] || 'Upload failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="📤 Upload Material" size="md">
      <form onSubmit={save}>
        <div className="employee-fg">
          <label className="employee-label">Title <span className="employee-req">*</span></label>
          <input className="employee-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter material title" required />
        </div>
        <div className="employee-fg">
          <label className="employee-label">Batch <span className="employee-req">*</span></label>
          <select className="employee-select" value={form.batch} onChange={e => setForm(p => ({ ...p, batch: e.target.value }))} required>
            <option value="">Select batch…</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.batch_number} — {b.course_name_display}</option>)}
          </select>
        </div>
        <div className="employee-fg">
          <label className="employee-label">Description</label>
          <textarea className="employee-input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
        </div>
        <div className="employee-fg">
          <label className="employee-label">File</label>
          <input type="file" className="employee-input" onChange={e => setFile(e.target.files[0])} style={{ padding: 7 }} />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="employee-btn employee-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="employee-btn employee-btn-primary" disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
            {saving ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE & SUPPORT COMPONENTS (simplified - same UI pattern)
// ══════════════════════════════════════════════════════════════════════════════

function LeaveFormModal({ onClose, onSaved, endpoint, title = "Apply Leave" }) {
  const [form, setForm] = useState({ leave_type: '', start_date: '', end_date: '', reason: '', contact_info: '' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const [noOfDays, setNoOfDays] = useState('')
  useEffect(() => {
    if (form.start_date && form.end_date) {
      const d = Math.max(0, Math.round((new Date(form.end_date) - new Date(form.start_date)) / 86400000) + 1)
      setNoOfDays(d)
    }
  }, [form.start_date, form.end_date])

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post(endpoint, { ...form, no_of_days: noOfDays }); toast.success('Leave application submitted!'); onSaved() }
    catch (err) {
      const d = err.response?.data || {}
      toast.error(d.error || d.detail || 'Submission failed')
    } finally { setSaving(false) }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Modal open onClose={onClose} title={title} size="md">
      <form onSubmit={save}>
        <div className="employee-fg">
          <label className="employee-label">Leave Type <span className="employee-req">*</span></label>
          <select className="employee-select" value={form.leave_type} onChange={e => f('leave_type', e.target.value)} required>
            <option value="">Select Leave Type</option>
            {['Sick Leave', 'Casual Leave', 'Emergency Leave', 'Personal Leave', 'Other'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="employee-row-grid-2">
          <div className="employee-fg">
            <label className="employee-label">Start Date <span className="employee-req">*</span></label>
            <input type="date" className="employee-input" min={today} value={form.start_date} onChange={e => f('start_date', e.target.value)} required />
          </div>
          <div className="employee-fg">
            <label className="employee-label">End Date <span className="employee-req">*</span></label>
            <input type="date" className="employee-input" min={form.start_date || today} value={form.end_date} onChange={e => f('end_date', e.target.value)} required />
          </div>
        </div>
        {noOfDays > 0 && <div className="employee-alert-info" style={{ marginBottom: 16 }}><i className="fas fa-calendar-day" /> Number of days: <strong>{noOfDays}</strong></div>}
        <div className="employee-fg">
          <label className="employee-label">Reason <span className="employee-req">*</span></label>
          <textarea className="employee-input" rows={3} value={form.reason} onChange={e => f('reason', e.target.value)} required />
        </div>
        <div className="employee-fg">
          <label className="employee-label">Contact Info <span className="employee-req">*</span></label>
          <input className="employee-input" value={form.contact_info} onChange={e => f('contact_info', e.target.value)} placeholder="Phone number or email" required />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="employee-btn employee-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="employee-btn employee-btn-primary" disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
            {saving ? 'Submitting...' : 'Submit Leave'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function StaffLeaveApply() {
  const [showForm, setShowForm] = useState(false)
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const load = () => { setLoading(true); api.get('/staff-leave/').then(r => setLeaves(r.data.results || r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  return (
    <div className="employee-root">
      <Styles />
      <PH title="🗓️ Leave Request" sub="Apply for leave and track status" btn={<button className="employee-btn employee-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> Apply Leave</button>} />
      <div className="employee-card">
        <SH title={`My Leave Applications (${leaves.length})`} />
        {loading ? <Spin /> : leaves.length === 0 ? (
          <Empty msg="No leave applications yet" icon="fa-calendar-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.leave_type}</td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td>{l.no_of_days}</td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td><Badge text={l.status} variant={l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'warning'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && <LeaveFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} endpoint="/staff-leave/" title="📋 Apply Leave" />}
    </div>
  )
}

export function CounselorLeaveApply() {
  const [showForm, setShowForm] = useState(false)
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const load = () => { setLoading(true); api.get('/counselor-leave/').then(r => setLeaves(r.data.results || r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  return (
    <div className="employee-root">
      <Styles />
      <PH title="🗓️ Leave Request" sub="Apply for leave and track status" btn={<button className="employee-btn employee-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> Apply Leave</button>} />
      <div className="employee-card">
        <SH title={`My Leave Applications (${leaves.length})`} />
        {loading ? <Spin /> : leaves.length === 0 ? (
          <Empty msg="No leave applications yet" icon="fa-calendar-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.leave_type}</td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td>{l.no_of_days}</td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td><Badge text={l.status} variant={l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'warning'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && <LeaveFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} endpoint="/counselor-leave/" title="📋 Apply Leave" />}
    </div>
  )
}

export function StaffSupportRequest() {
  const [showForm, setShowForm] = useState(false)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const load = () => { setLoading(true); api.get('/staff-support/').then(r => setRequests(r.data.results || r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!message.trim()) return toast.error('Please enter a message')
    setSaving(true)
    try { await api.post('/staff-support/', { message }); toast.success('Request submitted!'); setShowForm(false); setMessage(''); load() }
    catch (err) { toast.error(err.response?.data?.error || 'Submission failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="🎧 Support Request" sub="Get help from admin" btn={<button className="employee-btn employee-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> New Request</button>} />
      <div className="employee-card">
        <SH title={`My Support Requests (${requests.length})`} />
        {loading ? <Spin /> : requests.length === 0 ? (
          <Empty msg="No support requests yet" icon="fa-headset" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Message</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 400 }}>{r.message}</td>
                    <td><Badge text={r.status?.replace('_', ' ')} variant={r.status === 'resolved' ? 'success' : r.status === 'in_progress' ? 'info' : 'warning'} /></td>
                    <td style={{ fontSize: 12 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && (
        <Modal open onClose={() => setShowForm(false)} title="🎧 New Support Request" size="md">
          <div className="employee-fg">
            <label className="employee-label">Message / Issue <span className="employee-req">*</span></label>
            <textarea className="employee-input" rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue in detail..." required />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="employee-btn employee-btn-primary" onClick={submit} disabled={saving}>
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function CounselorSupportRequest() {
  const [showForm, setShowForm] = useState(false)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const load = () => { setLoading(true); api.get('/counselor-support/').then(r => setRequests(r.data.results || r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!message.trim()) return toast.error('Please enter a message')
    setSaving(true)
    try { await api.post('/counselor-support/', { message }); toast.success('Request submitted!'); setShowForm(false); setMessage(''); load() }
    catch (err) { toast.error(err.response?.data?.error || 'Submission failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="🎧 Counselor Support Request" sub="Get help from admin" btn={<button className="employee-btn employee-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> New Request</button>} />
      <div className="employee-card">
        <SH title={`My Support Requests (${requests.length})`} />
        {loading ? <Spin /> : requests.length === 0 ? (
          <Empty msg="No support requests yet" icon="fa-headset" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Message</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 400 }}>{r.message}</td>
                    <td><Badge text={r.status?.replace('_', ' ')} variant={r.status === 'resolved' ? 'success' : r.status === 'in_progress' ? 'info' : 'warning'} /></td>
                    <td style={{ fontSize: 12 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && (
        <Modal open onClose={() => setShowForm(false)} title="🎧 New Support Request" size="md">
          <div className="employee-fg">
            <label className="employee-label">Message / Issue <span className="employee-req">*</span></label>
            <textarea className="employee-input" rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue in detail..." required />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="employee-btn employee-btn-primary" onClick={submit} disabled={saving}>
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function StudentLeaveRequests({ pending = false }) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/student-leave/').then(r => {
      const all = r.data.results || r.data
      setLeaves(pending ? all.filter(l => l.status === 'pending') : all)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [pending])

  const process = async (id, status) => {
    try { await api.patch(`/student-leave/${id}/process/`, { status }); toast.success(`Leave ${status}`); load() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to process') }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title={pending ? "⏳ Pending Leave Requests" : "📋 Leave History"} sub="Student leave applications" />
      <div className="employee-card">
        <SH title={pending ? "Pending Requests" : "History"} count={leaves.length} />
        {loading ? <Spin /> : leaves.length === 0 ? (
          <Empty msg="No leave requests found" icon="fa-calendar-check" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Student</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th>
                  {pending && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.student_name}</td>
                    <td>{l.leave_type}</td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td>{l.number_of_days || l.no_of_days}</td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td><Badge text={l.status} variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'} /></td>
                    {pending && l.status === 'pending' && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="employee-btn employee-btn-sm employee-btn-teal" onClick={() => process(l.id, 'approved')}><i className="fas fa-check" /> Approve</button>
                          <button className="employee-btn employee-btn-sm employee-btn-danger" onClick={() => process(l.id, 'rejected')}><i className="fas fa-times" /> Reject</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}



// ══════════════════════════════════════════════════════════════════════════════
// STAFF COMPLETED STUDENTS - Fixed Width, No Horizontal Scroll WITH ATTENDANCE
// ══════════════════════════════════════════════════════════════════════════════
export function StaffCompletedStudents() {
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter states
  const [filters, setFilters] = useState({
    batch: '',
    course: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })

  // Statistics
  const [stats, setStats] = useState({
    totalGraduates: 0,
    totalSessions: 0,
    totalBatches: 0
  })

  // Available filter options
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])

  useEffect(() => {
    loadCompletedStudents()
  }, [])

  // Function to fetch attendance for a single student
  const fetchStudentAttendance = async (studentId) => {
    try {
      const response = await api.get(`/attendance/?student=${studentId}`)
      const records = response.data.results || response.data || []
      const present = records.filter(r => r.status === 'Present' || r.status === 'present').length
      const total = records.length
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0
      return {
        attendance_percentage: percentage,
        present_count: present,
        total_attendance: total
      }
    } catch (err) {
      console.error(`Error fetching attendance for student ${studentId}:`, err)
      return { attendance_percentage: 0, present_count: 0, total_attendance: 0 }
    }
  }

  // Function to fetch test scores for a student
  const fetchStudentTestScores = async (studentId) => {
    try {
      const response = await api.get(`/test-results/?student=${studentId}`)
      const results = response.data.results || response.data || []
      if (results.length === 0) return 0
      const totalPercentage = results.reduce((sum, t) => sum + (t.percentage || 0), 0)
      return Math.round(totalPercentage / results.length)
    } catch (err) {
      console.error(`Error fetching test scores for student ${studentId}:`, err)
      return 0
    }
  }

  const loadCompletedStudents = async () => {
    setLoading(true)
    try {
      const response = await api.get('/completed-students/')
      let data = response.data.results || response.data || []

      // Fetch attendance and test scores for each student
      const studentsWithData = await Promise.all(
        data.map(async (student) => {
          const [attendance, avgScore] = await Promise.all([
            fetchStudentAttendance(student.id),
            fetchStudentTestScores(student.id)
          ])

          return {
            ...student,
            attendance_percentage: attendance.attendance_percentage,
            present_count: attendance.present_count,
            total_attendance: attendance.total_attendance,
            average_test_score: avgScore
          }
        })
      )

      setStudents(studentsWithData)

      const uniqueBatches = [...new Set(studentsWithData.map(s => s.batch_number).filter(Boolean))]
      const uniqueCourses = [...new Set(studentsWithData.map(s => s.course_name || s.course).filter(Boolean))]
      setBatches(uniqueBatches)
      setCourses(uniqueCourses)

      const totalSessions = studentsWithData.reduce((sum, s) => sum + (s.completed_sessions_count || s.total_sessions || 0), 0)
      setStats({
        totalGraduates: studentsWithData.length,
        totalSessions: totalSessions,
        totalBatches: uniqueBatches.length
      })

      applyFilters(studentsWithData, filters)
    } catch (err) {
      console.error("Error loading completed students:", err)
      toast.error("Failed to load completed students")
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (data, currentFilters) => {
    let filtered = [...data]

    if (currentFilters.batch) {
      filtered = filtered.filter(s => s.batch_number === currentFilters.batch)
    }
    if (currentFilters.course) {
      filtered = filtered.filter(s => (s.course_name || s.course) === currentFilters.course)
    }
    if (currentFilters.dateFrom) {
      filtered = filtered.filter(s => new Date(s.completion_date) >= new Date(currentFilters.dateFrom))
    }
    if (currentFilters.dateTo) {
      filtered = filtered.filter(s => new Date(s.completion_date) <= new Date(currentFilters.dateTo))
    }
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase()
      filtered = filtered.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchLower) ||
        s.student_id?.toLowerCase().includes(searchLower) ||
        (s.course_name || s.course)?.toLowerCase().includes(searchLower) ||
        s.batch_number?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredStudents(filtered)
    setCurrentPage(1)
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    applyFilters(students, newFilters)
  }

  const clearFilters = () => {
    const resetFilters = { batch: '', course: '', dateFrom: '', dateTo: '', search: '' }
    setFilters(resetFilters)
    applyFilters(students, resetFilters)
  }

  const downloadReport = async (studentId, studentName) => {
    try {
      toast.loading(`Downloading report for ${studentName}…`, { id: 'dl' })

      const token = localStorage.getItem('access')
        || localStorage.getItem('token')
        || localStorage.getItem('accessToken')
        || ''

      const res = await fetch(`/api/completed-students/${studentId}/report/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^";\n]+)"?/)
      const filename = match ? match[1] : `${studentName.replace(/\s+/g, '_')}_Report.pdf`

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('Report downloaded!', { id: 'dl' })
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to download report.', { id: 'dl' })
    }
  }

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return '—'
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return `${diffDays}d`
  }

  const getSessionPercentage = (completed, total) => {
    if (!total || total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  if (loading) {
    return (
      <div className="employee-root">
        <Styles />
        <Spin />
      </div>
    )
  }

  return (
    <div className="employee-root">
      <Styles />

      <PH
        title="🎓 My Graduates"
        sub="Students who have successfully completed your batches"
      />

      {/* Statistics Cards */}
      <div className="employee-stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="employee-stat-card" style={{ background: `linear-gradient(135deg, ${T.sage}, ${T.sage}cc)`, color: 'white' }}>
          <div className="employee-stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <i className="fas fa-graduation-cap" />
          </div>
          <div>
            <div className="employee-stat-value" style={{ color: 'white' }}>{stats.totalGraduates}</div>
            <div className="employee-stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Total Graduates</div>
          </div>
        </div>

        <div className="employee-stat-card" style={{ background: `linear-gradient(135deg, ${T.amber}, ${T.amber}cc)`, color: 'white' }}>
          <div className="employee-stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <i className="fas fa-layer-group" />
          </div>
          <div>
            <div className="employee-stat-value" style={{ color: 'white' }}>{stats.totalBatches}</div>
            <div className="employee-stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Batches</div>
          </div>
        </div>

        <div className="employee-stat-card" style={{ background: `linear-gradient(135deg, ${T.teal}, ${T.teal}cc)`, color: 'white' }}>
          <div className="employee-stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <i className="fas fa-calendar-check" />
          </div>
          <div>
            <div className="employee-stat-value" style={{ color: 'white' }}>{stats.totalSessions}</div>
            <div className="employee-stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Total Sessions</div>
          </div>
        </div>
      </div>

      {/* Completed Students Table */}
      <div className="employee-card">
        <div className="employee-card-header" style={{ background: `linear-gradient(135deg, ${T.sage}, ${T.sage}cc)`, color: 'white' }}>
          <h5 style={{ color: 'white', margin: 0 }}>
            <i className="fas fa-graduation-cap" style={{ marginRight: 8 }} /> My Graduated Students
          </h5>
          <Badge text={`${filteredStudents.length} Records`} variant="success" />
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <i className="fas fa-graduation-cap" style={{ fontSize: 48, color: T.slate, marginBottom: 16, opacity: 0.3 }} />
            <h4 style={{ color: T.slate }}>No graduates yet</h4>
            <p style={{ color: T.slateLight }}>Students who complete your batches will appear here.</p>
          </div>
        ) : (
          <>
            {/* Filter Bar */}
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: `1px solid ${T.border}`, display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <input
                className="employee-input"
                style={{ padding: '6px 10px', fontSize: '12px', width: '180px' }}
                placeholder="🔍 Search by name, ID..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <select
                className="employee-select"
                style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
                value={filters.batch}
                onChange={(e) => handleFilterChange('batch', e.target.value)}
              >
                <option value="">All Batches</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select
                className="employee-select"
                style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
              >
                <option value="">All Courses</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="date"
                className="employee-input"
                style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
                placeholder="From"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
              <span style={{ fontSize: '12px', color: T.slate }}>to</span>
              <input
                type="date"
                className="employee-input"
                style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
                placeholder="To"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
              <button
                className="employee-btn employee-btn-sm employee-btn-ghost"
                onClick={clearFilters}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <i className="fas fa-times" /> Clear
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${T.navy}, ${T.navyMid})`, color: 'white' }}>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '40px' }}>#</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'left', width: '130px' }}>Student</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '90px' }}>Student ID</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '90px' }}>Batch</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'left', width: '100px' }}>Course</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '80px' }}>Sessions</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '60px' }}>Duration</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '80px' }}>Completed</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '100px' }}>Attendance</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '60px' }}>Avg Score</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '70px' }}>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((x, idx) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1
                    const attendancePercentage = x.attendance_percentage || 0
                    const avgScore = x.average_test_score || 0
                    const completedSessions = x.completed_sessions_count || x.sessions_completed || 0
                    const totalSessions = x.total_sessions_count || x.total_sessions || 0
                    const sessionPercentage = getSessionPercentage(completedSessions, totalSessions)

                    // Get color based on attendance percentage
                    const getAttendanceColor = () => {
                      if (attendancePercentage >= 75) return T.sage
                      if (attendancePercentage >= 60) return T.amber
                      return T.rose
                    }

                    return (
                      <tr key={x.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: '10px 8px', fontSize: '12px', color: T.slate, textAlign: 'center' }}>{globalIndex}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Avatar name={x.first_name} size={28} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '12px' }}>{x.first_name} {x.last_name || ''}</div>
                              <div style={{ fontSize: '9px', color: T.slate }}>{x.email?.split('@')[0] || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <Badge text={x.student_id} variant="info" />
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <Badge text={x.batch_number} variant="primary" />
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '11px' }}>
                          <div><strong>{x.course_name || x.course || '—'}</strong></div>
                          <div style={{ fontSize: '9px', color: T.slate }}>{x.branch || '—'}</div>
                        </td>

                        {/* Sessions Column */}
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '50px', background: '#e9ecef', borderRadius: '4px', height: '4px' }}>
                              <div style={{ height: '100%', width: `${sessionPercentage}%`, background: T.sage, borderRadius: '4px' }} />
                            </div>
                            <span style={{ fontSize: '10px' }}>{completedSessions}/{totalSessions}</span>
                          </div>
                        </td>

                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          {calculateDuration(x.batch_start_date, x.batch_end_date)}
                        </td>

                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <Badge text={new Date(x.completion_date).toLocaleDateString('en-IN')} variant="success" />
                        </td>

                        {/* ATTENDANCE COLUMN - Enhanced with detailed view */}
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          {attendancePercentage > 0 ? (
                            <div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                <div style={{ width: '60px', background: '#e9ecef', borderRadius: '4px', height: '6px' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${attendancePercentage}%`,
                                    background: getAttendanceColor(),
                                    borderRadius: '4px'
                                  }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: getAttendanceColor() }}>
                                  {attendancePercentage}%
                                </span>
                              </div>
                              <div style={{ fontSize: '9px', color: T.slate }}>
                                ({x.present_count || 0}/{x.total_attendance || 0} days)
                              </div>
                            </div>
                          ) : (
                            <Badge text="Not Marked" variant="warning" />
                          )}
                        </td>

                        {/* Average Score Column */}
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <Badge
                            text={`${avgScore}%`}
                            variant={avgScore >= 70 ? 'success' : avgScore >= 50 ? 'warning' : 'danger'}
                          />
                        </td>

                        {/* Report Download Button */}
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <button
                            className="employee-btn employee-btn-success employee-btn-sm"
                            onClick={() => downloadReport(x.id, `${x.first_name} ${x.last_name || ''}`)}
                            title="Download Report"
                            style={{ padding: '4px 8px', fontSize: '10px' }}
                          >
                            <i className="fas fa-download" /> Report
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px', gap: '4px', flexWrap: 'wrap' }}>
                <button className="employee-btn employee-btn-ghost employee-btn-sm" onClick={() => goToPage(1)} disabled={currentPage === 1} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-double-left" />
                </button>
                <button className="employee-btn employee-btn-ghost employee-btn-sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-left" />
                </button>

                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`employee-btn ${currentPage === pageNum ? 'employee-btn-primary' : 'employee-btn-ghost'} employee-btn-sm`}
                      onClick={() => goToPage(pageNum)}
                      style={{ padding: '4px 8px', minWidth: '28px' }}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button className="employee-btn employee-btn-ghost employee-btn-sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-right" />
                </button>
                <button className="employee-btn employee-btn-ghost employee-btn-sm" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-double-right" />
                </button>
              </div>
            )}

            <div style={{ padding: '8px 16px', borderTop: `1px solid ${T.border}`, fontSize: '11px', color: T.slate, textAlign: 'center' }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} entries
            </div>
          </>
        )}
      </div>
    </div>
  )
}



export function StaffAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewModal, setViewModal] = useState(null)

  useEffect(() => {
    api.get('/announcements/')
      .then(r => setAnnouncements(r.data.results || r.data || []))
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false))
  }, [])

  const TYPE_META = {
    important: { bg: '#fdeaec', color: '#e84855', label: 'Important', icon: 'fa-exclamation-triangle' },
    holiday: { bg: '#fef5e4', color: '#f4a940', label: 'Holiday', icon: 'fa-umbrella-beach' },
    event: { bg: '#e8f8f0', color: '#4caf81', label: 'Event', icon: 'fa-calendar-star' },
    update: { bg: '#e4f2fd', color: '#2ec4b6', label: 'Update', icon: 'fa-sync-alt' },
    general: { bg: '#f0f3f7', color: '#8099b3', label: 'General', icon: 'fa-bullhorn' },
    exam: { bg: '#e4f2fd', color: '#1a2e4a', label: 'Exam', icon: 'fa-file-alt' },
    course: { bg: '#e8f8f0', color: '#4caf81', label: 'Course', icon: 'fa-book-open' },
  }
  const TypeBadge = ({ type }) => {
    const m = TYPE_META[type] || TYPE_META.general
    return (
      <span style={{
        background: m.bg, color: m.color, padding: '4px 12px', borderRadius: 20,
        fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5
      }}>
        <i className={`fas ${m.icon}`} style={{ fontSize: 10 }} /> {m.label}
      </span>
    )
  }

  const important = announcements.filter(a => a.announcement_type === 'important').length
  const recent = announcements.filter(a => (Date.now() - new Date(a.created_at)) < 7 * 24 * 60 * 60 * 1000).length

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📢 Admin Announcements" sub="Important updates and notices from admin" />

      <div className="employee-stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total', value: announcements.length, icon: 'fa-bullhorn', bg: 'rgba(46,196,182,.1)', color: T.teal },
          { label: 'Important', value: important, icon: 'fa-exclamation-triangle', bg: 'rgba(232,72,85,.1)', color: T.rose },
          { label: 'This Week', value: recent, icon: 'fa-calendar-week', bg: 'rgba(244,169,64,.1)', color: T.amber },
        ].map(s => (
          <div key={s.label} className="employee-stat-card">
            <div className="employee-stat-icon" style={{ background: s.bg, color: s.color }}>
              <i className={`fas ${s.icon}`} />
            </div>
            <div>
              <div className="employee-stat-value">{s.value}</div>
              <div className="employee-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="employee-card">
        <SH title="📢 Admin Announcements" count={announcements.length} />
        {loading ? <Spin /> : announcements.length === 0 ? (
          <Empty msg="No announcements yet." icon="fa-bullhorn" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>From</th>
                  <th style={{ width: 100 }}>Date</th>
                  <th style={{ width: 70 }}>View</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann, idx) => (
                  <tr key={ann.id}>
                    <td style={{ fontSize: 12, color: T.slate }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ann.title}</div>
                      <div style={{ color: T.slate, fontSize: 11, marginTop: 3 }}>
                        {ann.message?.substring(0, 55)}{ann.message?.length > 55 ? '…' : ''}
                      </div>
                    </td>
                    <td><TypeBadge type={ann.announcement_type} /></td>
                    <td style={{ fontSize: 12, color: T.slate }}>
                      <i className="fas fa-user-shield" style={{ marginRight: 5, color: T.teal }} />
                      {ann.created_by_name || 'Admin'}
                    </td>
                    <td style={{ fontSize: 12, color: T.slate }}>
                      {new Date(ann.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <button
                        className="employee-btn employee-btn-sm"
                        style={{ background: '#f0f3f7', color: '#1a2e4a', border: 'none' }}
                        onClick={() => setViewModal(ann)}
                      >
                        <i className="fas fa-eye" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
          onClick={e => e.target === e.currentTarget && setViewModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
            margin: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${T.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>📄 Announcement</h5>
              <button onClick={() => setViewModal(null)}
                style={{
                  background: '#f1f5f9', border: 'none', width: 32, height: 32,
                  borderRadius: 8, cursor: 'pointer', fontSize: 14
                }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <TypeBadge type={viewModal.announcement_type} />
                <span style={{
                  background: '#e8f8f0', color: '#4caf81', padding: '3px 10px',
                  borderRadius: 20, fontSize: 11, fontWeight: 600
                }}>✓ Published</span>
              </div>
              <h4 style={{ margin: '0 0 10px', color: T.navy }}>{viewModal.title}</h4>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: T.slate }}>
                  <i className="fas fa-user-shield" style={{ marginRight: 5, color: T.teal }} />
                  {viewModal.created_by_name || 'Admin'}
                </span>
                <span style={{ fontSize: 12, color: T.slate }}>
                  <i className="fas fa-calendar" style={{ marginRight: 5 }} />
                  {new Date(viewModal.created_at).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{
                background: '#f8fafc', borderRadius: 10, padding: '16px 18px',
                lineHeight: 1.75, fontSize: 14, color: T.navyMid, whiteSpace: 'pre-wrap'
              }}>
                {viewModal.message}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function StaffDoubts() {
  const [doubts, setDoubts] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyModal, setReplyModal] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => { setLoading(true); api.get('/doubts/staff/').then(r => setDoubts(r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const handleReply = async () => {
    if (!replyText.trim()) return toast.error('Reply cannot be empty')
    setSubmitting(true)
    try {
      await api.post(`/doubts/${replyModal.id}/reply/`, { reply: replyText })
      toast.success('Reply sent! Student has been notified.')
      setReplyModal(null); setReplyText(''); load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed')
    } finally { setSubmitting(false) }
  }

  const pending = doubts.filter(d => !d.is_resolved)
  const resolved = doubts.filter(d => d.is_resolved)

  return (
    <div className="employee-root">
      <Styles />
      <PH title="❓ Student Doubts" sub="Respond to student doubts about sessions" />

      <div className="employee-stat-grid" style={{ marginBottom: 24 }}>
        <div className="employee-stat-card" style={{ background: '#fff3cd', border: 'none' }}>
          <div><div className="employee-stat-value">{pending.length}</div><div className="employee-stat-label">⏳ Pending Doubts</div></div>
        </div>
        <div className="employee-stat-card" style={{ background: '#d1e7dd', border: 'none' }}>
          <div><div className="employee-stat-value">{resolved.length}</div><div className="employee-stat-label">✅ Resolved</div></div>
        </div>
      </div>

      <div className="employee-card">
        <SH title={`All Student Doubts (${doubts.length})`} />
        {loading ? <Spin /> : doubts.length === 0 ? (
          <Empty msg="All Clear! No doubts raised." icon="fa-check-circle" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr><th>#</th><th>Student</th><th>Session</th><th>Doubt</th><th>Raised On</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {doubts.map((d, i) => (
                  <tr key={d.id}>
                    <td>{i + 1}</td>
                    <td><strong>{d.student_name}</strong><br /><small>{d.student_id}</small></td>
                    <td>Session {d.session_number}<br /><small>{d.session_title?.substring(0, 30)}</small></td>
                    <td style={{ maxWidth: 250 }}>{d.doubt_text}</td>
                    <td style={{ fontSize: 12 }}>{d.raised_at}</td>
                    <td><Badge text={d.is_resolved ? 'Resolved' : 'Pending'} variant={d.is_resolved ? 'success' : 'warning'} /></td>
                    <td>
                      {!d.is_resolved && (
                        <button className="employee-btn employee-btn-sm employee-btn-primary" onClick={() => { setReplyModal(d); setReplyText('') }}>
                          <i className="fas fa-reply" /> Reply
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {replyModal && (
        <Modal open onClose={() => { setReplyModal(null); setReplyText('') }} title="💬 Reply to Doubt" size="md">
          <div className="employee-alert-info" style={{ marginBottom: 16 }}>
            <strong>{replyModal.student_name}</strong> — Session {replyModal.session_number}
          </div>
          <div className="employee-alert-warning" style={{ marginBottom: 16 }}>
            <strong>Student's Doubt:</strong>
            <p style={{ margin: '8px 0 0' }}>{replyModal.doubt_text}</p>
          </div>
          <div className="employee-fg">
            <label className="employee-label">Your Reply</label>
            <textarea className="employee-input" rows={4} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => { setReplyModal(null); setReplyText('') }}>Cancel</button>
            <button className="employee-btn employee-btn-primary" onClick={handleReply} disabled={submitting || !replyText.trim()}>
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
              {submitting ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function ViewStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadStudents = async () => {
    setLoading(true)
    try {
      // First get trainer's batches
      const batchesRes = await api.get('/batches/')
      const batches = batchesRes.data.results || batchesRes.data || []

      // Get students from each batch
      let allStudents = []
      for (const batch of batches) {
        try {
          const studentsRes = await api.get(`/batches/${batch.id}/students/`)
          const batchStudents = studentsRes.data || []
          allStudents = [...allStudents, ...batchStudents.map(s => ({
            ...s,
            batch_number: batch.batch_number
          }))]
        } catch (err) {
          console.error(`Error loading students for batch ${batch.id}:`, err)
        }
      }

      // Remove duplicates
      const uniqueStudents = Array.from(
        new Map(allStudents.map(s => [s.id, s])).values()
      )

      setStudents(uniqueStudents)
      console.log(`Loaded ${uniqueStudents.length} students from ${batches.length} batches`)

    } catch (err) {
      console.error('Failed to load students:', err)
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStudents() }, [])

  const filtered = students.filter(s =>
    `${s.first_name} ${s.last_name || ''} ${s.student_id}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title="👨‍🎓 My Students"
        sub="Students from your batches"
        btn={
          <button className="employee-btn employee-btn-sm employee-btn-primary" onClick={loadStudents}>
            <i className="fas fa-sync-alt" /> Refresh
          </button>
        }
      />

      <div className="employee-card">
        <SH title="Student List" count={filtered.length} actions={
          <input
            className="employee-input"
            style={{ width: 250 }}
            placeholder="🔍 Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        } />

        {loading ? <Spin /> : filtered.length === 0 ? (
          <Empty msg="No students found in your batches" icon="fa-user-graduate" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Batch</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Course</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td><Badge text={s.student_id} variant="info" /></td>
                    <td><div style={{ fontWeight: 500 }}>{s.first_name} {s.last_name || ''}</div></td>
                    <td><Badge text={s.batch_number || '—'} variant="primary" /></td>
                    <td style={{ fontSize: 12 }}>{s.email}</td>
                    <td>{s.mobile_no}</td>
                    <td>{s.course}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export function StaffStudentLeaveRequests() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/staff/student-leave/').then(r => {
      setLeaves(r.data.results || r.data || [])
    }).catch(err => {
      toast.error("Failed to load leave requests")
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const processLeave = async (id, action) => {
    if (!window.confirm(`${action === 'approved' ? 'Approve' : 'Reject'} this leave request?`)) return
    try {
      await api.patch(`/staff/student-leave/${id}/process/`, { status: action })
      toast.success(`Leave ${action} successfully!`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process leave')
    }
  }

  const pendingLeaves = leaves.filter(l => l.status === 'pending')
  const processedLeaves = leaves.filter(l => l.status !== 'pending')
  const displayLeaves = showHistory ? processedLeaves : pendingLeaves

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📋 Student Leave Requests" sub="Manage leave requests from your students" />

      <div className="employee-stat-grid">
        <div className="employee-stat-card" style={{ background: '#fff3cd', border: 'none' }}>
          <div><div className="employee-stat-value">{pendingLeaves.length}</div><div className="employee-stat-label">⏳ Pending Requests</div></div>
        </div>
        <div className="employee-stat-card" style={{ background: '#d1e7dd', border: 'none' }}>
          <div><div className="employee-stat-value">{processedLeaves.filter(l => l.status === 'approved').length}</div><div className="employee-stat-label">✅ Approved</div></div>
        </div>
        <div className="employee-stat-card" style={{ background: '#f8d7da', border: 'none' }}>
          <div><div className="employee-stat-value">{processedLeaves.filter(l => l.status === 'rejected').length}</div><div className="employee-stat-label">❌ Rejected</div></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: `2px solid ${T.border}` }}>
        <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', padding: '10px 20px', fontWeight: !showHistory ? 700 : 400, color: !showHistory ? T.amber : T.slate, borderBottom: !showHistory ? `2px solid ${T.amber}` : 'none', cursor: 'pointer' }}>
          ⏳ Pending Requests ({pendingLeaves.length})
        </button>
        <button onClick={() => setShowHistory(true)} style={{ background: 'none', border: 'none', padding: '10px 20px', fontWeight: showHistory ? 700 : 400, color: showHistory ? T.amber : T.slate, borderBottom: showHistory ? `2px solid ${T.amber}` : 'none', cursor: 'pointer' }}>
          📋 Processed History ({processedLeaves.length})
        </button>
      </div>

      <div className="employee-card">
        {loading ? <Spin /> : displayLeaves.length === 0 ? (
          <Empty msg={`No ${showHistory ? 'processed' : 'pending'} leave requests`} icon="fa-inbox" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr><th>Student</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Applied On</th><th>Status</th>{!showHistory && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {displayLeaves.map(l => (
                  <tr key={l.id}>
                    <td><strong>{l.student_name}</strong><br /><small>{l.student_id}</small></td>
                    <td>{l.leave_type}</td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td><Badge text={`${l.number_of_days} days`} variant="warning" /></td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td style={{ fontSize: 12 }}>{l.applied_at ? new Date(l.applied_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td><Badge text={l.status} variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'} /></td>
                    {!showHistory && l.status === 'pending' && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="employee-btn employee-btn-sm employee-btn-teal" onClick={() => processLeave(l.id, 'approved')}><i className="fas fa-check" /> Approve</button>
                          <button className="employee-btn employee-btn-sm employee-btn-danger" onClick={() => processLeave(l.id, 'rejected')}><i className="fas fa-times" /> Reject</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export function StaffOwnLeaveHistory() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/staff-leave/').then(r => {
      setLeaves(r.data.results || r.data || [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📋 My Leave History" sub="View your own leave applications" />
      <div className="employee-card">
        <SH title="Leave Applications" count={leaves.length} />
        {loading ? <Spin /> : leaves.length === 0 ? (
          <Empty msg="No leave applications found" icon="fa-calendar-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.leave_type}</td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td>{l.no_of_days}</td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td><Badge text={l.status} variant={l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'warning'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST MANAGEMENT COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

export function CreateTest() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Please enter a test title'); return }
    setSaving(true)
    try {
      const response = await api.post('/tests/', { title, description })
      toast.success('Test created successfully!')
      window.location.href = `/employee/tests/${response.data.id}/add-questions`
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create test')
    } finally { setSaving(false) }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📝 Create Test" sub="Create a new test for your students" />
      <div className="employee-card" style={{ maxWidth: 600 }}>
        <div className="employee-card-body" style={{ padding: 22 }}>
          <form onSubmit={handleSubmit}>
            <div className="employee-fg">
              <label className="employee-label">Test Title <span className="employee-req">*</span></label>
              <input type="text" className="employee-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter test title" required />
            </div>
            <div className="employee-fg">
              <label className="employee-label">Description</label>
              <textarea className="employee-input" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter test description (optional)" />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="employee-btn employee-btn-ghost" onClick={() => window.history.back()}>Cancel</button>
              <button type="submit" className="employee-btn employee-btn-primary" disabled={saving}>
                <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
                {saving ? 'Creating...' : 'Create Test'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export function ViewTests() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedTest, setSelectedTest] = useState(null)
  const [deleteId, setDeleteId] = useState(null)  // Add state for delete confirmation

  useEffect(() => { loadTests(); loadBatches() }, [])

  const loadTests = async () => {
    try {
      const response = await api.get('/tests/')
      const testsData = response.data.results || response.data || []

      // Get question counts for each test
      const testsWithCount = await Promise.all(testsData.map(async (test) => {
        try {
          let questionCount = 0

          try {
            const questionsRes = await api.get(`/tests/${test.id}/questions/`)
            if (questionsRes.data.count !== undefined) {
              questionCount = questionsRes.data.count
            } else if (questionsRes.data.questions) {
              questionCount = questionsRes.data.questions.length
            } else if (Array.isArray(questionsRes.data)) {
              questionCount = questionsRes.data.length
            } else if (questionsRes.data.results) {
              questionCount = questionsRes.data.results.length
            }
          } catch (err) {
            console.log(`No questions endpoint for test ${test.id}`)
          }

          return { ...test, question_count: questionCount }
        } catch (err) {
          console.error(`Error getting questions for test ${test.id}:`, err)
          return { ...test, question_count: 0 }
        }
      }))

      setTests(testsWithCount)
    } catch (err) {
      console.error('Failed to load tests:', err)
      toast.error('Failed to load tests')
    } finally {
      setLoading(false)
    }
  }

  const loadBatches = async () => {
    try {
      const response = await api.get('/batches/')
      setBatches(response.data.results || response.data || [])
    } catch (err) {
      console.error('Failed to load batches', err)
    }
  }

  const assignTest = async () => {
    if (!selectedTest || !selectedBatch) {
      toast.error('Please select a test and batch')
      return
    }
    try {
      await api.post('/assigned-tests/', { test: selectedTest.id, batch: selectedBatch })
      toast.success(`Test "${selectedTest.title}" assigned to batch successfully!`)
      setShowAssignModal(false)
      setSelectedTest(null)
      setSelectedBatch('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign test')
    }
  }

  const deleteTest = async () => {
    if (!deleteId) return

    try {
      await api.delete(`/tests/${deleteId}/`)
      toast.success('Test deleted successfully!')
      setDeleteId(null)
      loadTests()  // Refresh the list
    } catch (err) {
      console.error('Delete error:', err)
      toast.error(err.response?.data?.error || 'Failed to delete test')
    }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title="📋 View & Assign Tests"
        sub="Manage your tests and assign them to batches"
        btn={
          <button className="employee-btn employee-btn-primary" onClick={() => window.location.href = '/employee/tests/create'}>
            <i className="fas fa-plus" /> Create Test
          </button>
        }
      />

      <div className="employee-card">
        <SH title={`My Tests (${tests.length})`} />
        {loading ? <Spin /> : tests.length === 0 ? (
          <Empty msg="No tests created yet" icon="fa-file-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Questions</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map(test => (
                  <tr key={test.id}>
                    <td style={{ fontWeight: 600 }}>{test.title}</td>
                    <td style={{ maxWidth: 200 }}>{test.description || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge text={test.question_count || 0} variant={test.question_count > 0 ? 'success' : 'warning'} />
                    </td>
                    <td style={{ fontSize: 12 }}>{new Date(test.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="employee-btn employee-btn-sm employee-btn-primary"
                          onClick={() => { setSelectedTest(test); setShowAssignModal(true) }}
                          disabled={test.question_count === 0}
                          title={test.question_count === 0 ? "Cannot assign test with no questions" : "Assign test to batch"}
                        >
                          <i className="fas fa-plus" /> Assign
                        </button>
                        <button
                          className="employee-btn employee-btn-sm employee-btn-ghost"
                          onClick={() => window.location.href = `/employee/tests/${test.id}/add-questions`}
                        >
                          <i className="fas fa-edit" /> Edit
                        </button>
                        <button
                          className="employee-btn employee-btn-sm employee-btn-danger"
                          onClick={() => setDeleteId(test.id)}
                          title="Delete Test"
                        >
                          <i className="fas fa-trash-alt" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Test Modal */}
      {showAssignModal && (
        <Modal open onClose={() => setShowAssignModal(false)} title="Assign Test to Batch" size="md">
          <div className="employee-fg">
            <label className="employee-label">Test: <strong>{selectedTest?.title}</strong></label>
            {selectedTest?.question_count === 0 && (
              <div className="employee-alert-warning" style={{ marginTop: 8, padding: '8px 12px', fontSize: 12 }}>
                <i className="fas fa-exclamation-triangle" /> This test has no questions. Please add questions first.
              </div>
            )}
          </div>
          <div className="employee-fg">
            <label className="employee-label">Select Batch <span className="employee-req">*</span></label>
            <select className="employee-select" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
              <option value="">-- Select Batch --</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_number} - {batch.course_name_display}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => setShowAssignModal(false)}>Cancel</button>
            <button
              className="employee-btn employee-btn-primary"
              onClick={assignTest}
              disabled={selectedTest?.question_count === 0}
            >
              Assign Test
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal open onClose={() => setDeleteId(null)} title="Delete Test" size="sm">
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#fdeaec',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <i className="fas fa-trash-alt" style={{ fontSize: 28, color: '#e84855' }} />
            </div>
            <h4 style={{ marginBottom: 8, fontSize: 18 }}>Are you sure?</h4>
            <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>
              Delete this test? This action cannot be undone.
              <br />
              <strong>Note: This will also delete all questions in this test.</strong>
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="employee-btn employee-btn-ghost"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="employee-btn employee-btn-danger"
                onClick={deleteTest}
              >
                Delete Test
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}


export function TestResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState('')
  const [batches, setBatches] = useState([])
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    api.get('/batches/').then(r => setBatches(r.data.results || r.data || []))
  }, [])

  const loadResults = async (batchId) => {
    if (!batchId) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      const response = await api.get(`/staff/test-results/?batch_id=${batchId}`)
      const resultsData = response.data.results || response.data || []
      setResults(resultsData)
    } catch (err) {
      console.error('Failed to load test results:', err)
      toast.error('Failed to load test results')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleBatchChange = (e) => {
    const batchId = e.target.value
    setSelectedBatch(batchId)
    loadResults(batchId)
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📊 Test Results" sub="Select a batch to view student test performances" />

      <div className="employee-card" style={{ marginBottom: 20 }}>
        <div style={{ padding: 20 }}>
          <label className="employee-label">Select Batch</label>
          <select
            className="employee-select"
            style={{ maxWidth: 350 }}
            value={selectedBatch}
            onChange={handleBatchChange}
          >
            <option value="">— Select a Batch —</option>
            {batches.map(batch => (
              <option key={batch.id} value={batch.id}>
                {batch.batch_number} — {batch.course_name_display}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="employee-card">
        <SH title="Test Results" count={results.length} />

        {!searched ? (
          <div style={{ padding: 60, textAlign: 'center', color: T.slate }}>
            <i className="fas fa-hand-point-up" style={{ fontSize: 40, opacity: 0.2, marginBottom: 16, display: 'block' }} />
            <p style={{ fontFamily: "'Playfair Display'", fontSize: 16 }}>Select a batch above to view results</p>
          </div>
        ) : loading ? (
          <Spin />
        ) : results.length === 0 ? (
          <Empty msg="No test results found for this batch" icon="fa-file-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Test Title</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Submitted Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr key={result.id || idx}>
                    <td style={{ color: T.slate, fontSize: 12 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{result.student_name || '—'}</td>
                    <td style={{ fontSize: 12 }}>{result.student_id || '—'}</td>
                    <td style={{ fontSize: 13 }}>{result.test_title || '—'}</td>
                    <td>{result.score || 0}/{result.total_questions || 0}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#e9ecef', borderRadius: 3, minWidth: 60 }}>
                          <div style={{
                            height: '100%',
                            width: `${result.percentage || 0}%`,
                            background: (result.percentage || 0) >= 50 ? T.sage : T.rose,
                            borderRadius: 3
                          }} />
                        </div>
                        <strong style={{ fontSize: 12 }}>{(result.percentage || 0).toFixed(1)}%</strong>
                      </div>
                    </td>
                    <td>
                      <Badge
                        text={(result.percentage || 0) >= 50 ? 'Passed' : 'Failed'}
                        variant={(result.percentage || 0) >= 50 ? 'success' : 'danger'}
                      />
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {result.submitted_at
                        ? new Date(result.submitted_at).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export function AddQuestions() {
  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState([])
  const [existingQuestions, setExistingQuestions] = useState([])

  const testId = window.location.pathname.split('/')[3]

  useEffect(() => {
    loadTest()
    loadExistingQuestions()
  }, [])

  const loadTest = async () => {
    try {
      const response = await api.get(`/tests/${testId}/`)
      setTest(response.data)
    } catch (err) {
      toast.error('Failed to load test')
    }
  }

  const loadExistingQuestions = async () => {
    try {
      const response = await api.get(`/tests/${testId}/questions/`)
      let existingQ = []

      // Handle different response formats
      if (response.data.results) {
        existingQ = response.data.results
      } else if (Array.isArray(response.data)) {
        existingQ = response.data
      } else if (response.data.questions) {
        existingQ = response.data.questions
      }

      setExistingQuestions(existingQ)

      // If there are existing questions, load them into the form
      if (existingQ.length > 0) {
        const formattedQuestions = existingQ.map(q => ({
          id: q.id,
          question_text: q.question_text,
          option1: q.option1,
          option2: q.option2,
          option3: q.option3 || '',
          option4: q.option4 || '',
          correct_answer: getCorrectAnswerLetter(q)
        }))
        setQuestions(formattedQuestions)
      } else {
        // Start with one empty question if no questions exist
        setQuestions([{ id: null, question_text: '', option1: '', option2: '', option3: '', option4: '', correct_answer: '1' }])
      }
    } catch (err) {
      console.error("Error loading questions:", err)
      setQuestions([{ id: null, question_text: '', option1: '', option2: '', option3: '', option4: '', correct_answer: '1' }])
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get correct answer letter from stored value
  const getCorrectAnswerLetter = (q) => {
    const correctAnswer = q.correct_answer?.toLowerCase()
    if (correctAnswer === 'a' || correctAnswer === '1' || correctAnswer === q.option1) return '1'
    if (correctAnswer === 'b' || correctAnswer === '2' || correctAnswer === q.option2) return '2'
    if (correctAnswer === 'c' || correctAnswer === '3' || correctAnswer === q.option3) return '3'
    if (correctAnswer === 'd' || correctAnswer === '4' || correctAnswer === q.option4) return '4'
    return '1'
  }

  const addQuestion = () => {
    setQuestions([...questions, {
      id: null,
      question_text: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correct_answer: '1'
    }])
  }

  const removeQuestion = (index) => {
    if (questions.length === 1) {
      toast.error('At least one question is required');
      return
    }
    const newQuestions = [...questions]
    newQuestions.splice(index, 1)
    setQuestions(newQuestions)
  }

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions]
    newQuestions[index][field] = value
    setQuestions(newQuestions)
  }

  const saveQuestions = async () => {
    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text.trim()) {
        toast.error(`Please enter question ${i + 1} text`);
        return
      }
      if (!q.option1.trim() || !q.option2.trim()) {
        toast.error(`Please enter at least options 1 and 2 for question ${i + 1}`);
        return
      }
    }

    setSaving(true)
    try {
      // Get existing question IDs
      const existingIds = existingQuestions.map(q => q.id)
      const currentIds = questions.filter(q => q.id).map(q => q.id)

      // Find questions to delete (exist in DB but not in current list)
      const idsToDelete = existingIds.filter(id => !currentIds.includes(id))

      // Delete removed questions
      for (const id of idsToDelete) {
        try {
          await api.delete(`/questions/${id}/delete/`)
        } catch (err) {
          console.error(`Error deleting question ${id}:`, err)
        }
      }

      // Update existing questions and add new ones
      for (const q of questions) {
        const payload = {
          question_text: q.question_text,
          option1: q.option1,
          option2: q.option2,
          option3: q.option3 || '',
          option4: q.option4 || '',
          correct_answer: q.correct_answer
        }

        if (q.id) {
          // UPDATE existing question
          await api.put(`/questions/${q.id}/update/`, payload)
        } else {
          // ADD new question
          await api.post(`/tests/${testId}/add-question/`, payload)
        }
      }

      toast.success(`${questions.length} question(s) saved successfully!`)
      window.location.href = '/employee/tests'
    } catch (err) {
      console.error("Save error:", err)
      toast.error(err.response?.data?.error || 'Failed to save questions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="employee-root"><Styles /><Spin /></div>

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title={`📝 ${existingQuestions.length > 0 ? 'Edit' : 'Add'} Questions to "${test?.title}"`}
        sub={existingQuestions.length > 0 ? "Edit existing questions - changes will be saved directly" : "Manually type questions and options for your test"}
      />

      <div className="employee-card">
        <div className="employee-card-header" style={{ justifyContent: 'space-between' }}>
          <h5>Questions ({questions.length})</h5>
          <button className="employee-btn employee-btn-sm employee-btn-teal" onClick={addQuestion}>
            <i className="fas fa-plus" /> Add Question
          </button>
        </div>

        <div className="employee-modal-body">
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="employee-card" style={{ marginBottom: 20, background: '#f8fafc' }}>
              <div className="employee-card-header" style={{ background: 'transparent' }}>
                <strong>Question {idx + 1}</strong>
                {q.id && <Badge text="Existing" variant="info" style={{ marginLeft: 8 }} />}
                <button className="employee-btn employee-btn-sm employee-btn-danger" onClick={() => removeQuestion(idx)}>
                  <i className="fas fa-trash" /> Remove
                </button>
              </div>
              <div style={{ padding: 20 }}>
                <div className="employee-fg">
                  <label className="employee-label">Question Text *</label>
                  <textarea
                    className="employee-input"
                    rows={2}
                    value={q.question_text}
                    onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                    placeholder="Enter your question here..."
                  />
                </div>

                <div className="employee-row-grid-2">
                  <div className="employee-fg">
                    <label className="employee-label">Option 1 *</label>
                    <div className="employee-input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                      <span style={{ background: T.amber, padding: '8px 12px', borderRadius: '8px 0 0 8px', color: T.navy, fontWeight: 600 }}>A</span>
                      <input className="employee-input" style={{ border: 'none', flex: 1 }} value={q.option1} onChange={e => updateQuestion(idx, 'option1', e.target.value)} placeholder="Option 1" />
                    </div>
                  </div>
                  <div className="employee-fg">
                    <label className="employee-label">Option 2 *</label>
                    <div className="employee-input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                      <span style={{ background: T.sage, padding: '8px 12px', borderRadius: '8px 0 0 8px', color: '#fff', fontWeight: 600 }}>B</span>
                      <input className="employee-input" style={{ border: 'none', flex: 1 }} value={q.option2} onChange={e => updateQuestion(idx, 'option2', e.target.value)} placeholder="Option 2" />
                    </div>
                  </div>
                  <div className="employee-fg">
                    <label className="employee-label">Option 3</label>
                    <div className="employee-input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                      <span style={{ background: T.teal, padding: '8px 12px', borderRadius: '8px 0 0 8px', color: '#fff', fontWeight: 600 }}>C</span>
                      <input className="employee-input" style={{ border: 'none', flex: 1 }} value={q.option3} onChange={e => updateQuestion(idx, 'option3', e.target.value)} placeholder="Option 3 (optional)" />
                    </div>
                  </div>
                  <div className="employee-fg">
                    <label className="employee-label">Option 4</label>
                    <div className="employee-input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                      <span style={{ background: T.rose, padding: '8px 12px', borderRadius: '8px 0 0 8px', color: '#fff', fontWeight: 600 }}>D</span>
                      <input className="employee-input" style={{ border: 'none', flex: 1 }} value={q.option4} onChange={e => updateQuestion(idx, 'option4', e.target.value)} placeholder="Option 4 (optional)" />
                    </div>
                  </div>
                </div>

                <div className="employee-fg">
                  <label className="employee-label">Correct Answer *</label>
                  <select
                    className="employee-select"
                    style={{ width: 'auto' }}
                    value={q.correct_answer}
                    onChange={e => updateQuestion(idx, 'correct_answer', e.target.value)}
                  >
                    <option value="1">Option 1 (A)</option>
                    <option value="2">Option 2 (B)</option>
                    <option value="3">Option 3 (C)</option>
                    <option value="4">Option 4 (D)</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => window.location.href = '/employee/tests'}>
              Cancel
            </button>
            <button className="employee-btn employee-btn-primary" onClick={saveQuestions} disabled={saving}>
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {saving ? 'Saving...' : 'Save All Questions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



export function UploadQuiz() {
  const defaultQuizForm = { title: '', description: '', category: '', batch_id: 'practice_all', duration_minutes: 30, passing_marks: 35, start_date: '', end_date: '', difficulty: 'medium', shuffle_questions: true, shuffle_options: false, number_of_questions: 0 }
  const [form, setForm] = useState(defaultQuizForm)
  const [file, setFile] = useState(null)
  const [batches, setBatches] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.get('/batches/').then(r => setBatches(r.data.results || r.data)) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !file) { toast.error('Quiz title and CSV file are required'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title); fd.append('description', form.description)
      fd.append('assignment_scope', form.batch_id === 'practice_all' ? 'practice_all' : 'batch')
      if (form.batch_id && form.batch_id !== 'practice_all') fd.append('batch', form.batch_id)
      fd.append('duration_minutes', form.duration_minutes); fd.append('passing_marks', form.passing_marks); fd.append('difficulty', form.difficulty)
      fd.append('category', form.category); fd.append('start_date', form.start_date); fd.append('end_date', form.end_date)
      fd.append('shuffle_questions', form.shuffle_questions); fd.append('shuffle_options', form.shuffle_options); fd.append('number_of_questions', form.number_of_questions)
      fd.append('source_file', file)
      await api.post('/quiz/upload/', fd)
      toast.success('Quiz uploaded successfully!')
      setForm(defaultQuizForm)
      setFile(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="Upload Quiz" sub="Upload quiz from Excel/CSV file" />
      <div className="employee-card" style={{ maxWidth: 700 }}>
        <div className="employee-card-body" style={{ padding: 22 }}>
          <form onSubmit={handleSubmit}>
            <div className="employee-fg"><label className="employee-label">Quiz Title *</label><input className="employee-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="employee-fg"><label className="employee-label">Description</label><textarea className="employee-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="employee-fg"><label className="employee-label">Category</label><input className="employee-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Aptitude, Technical, Grammar..." /></div>
            <div className="employee-fg"><label className="employee-label">Quiz Audience</label><select className="employee-select" value={form.batch_id} onChange={e => setForm({ ...form, batch_id: e.target.value })}><option value="practice_all">Practice Test - All Students</option>{batches.map(b => <option key={b.id} value={b.id}>{b.batch_number}</option>)}</select><small className="employee-hint">Practice Test - All Students appears in mobile Home Practice Test for public users and every student. Selecting a batch shows it only for that batch's students.</small></div>
            <div className="employee-row-grid-2">
              <div className="employee-fg"><label className="employee-label">Duration (minutes)</label><input type="number" className="employee-input" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) })} /></div>
              <div className="employee-fg"><label className="employee-label">Passing Marks (%)</label><input type="number" className="employee-input" value={form.passing_marks} onChange={e => setForm({ ...form, passing_marks: parseInt(e.target.value) })} /></div>
            </div>
            <div className="employee-row-grid-2">
              <div className="employee-fg"><label className="employee-label">Start Date</label><input type="datetime-local" className="employee-input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="employee-fg"><label className="employee-label">End Date</label><input type="datetime-local" className="employee-input" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="employee-row-grid-2">
              <div className="employee-fg"><label className="employee-label">Number of Questions</label><input type="number" min="0" className="employee-input" value={form.number_of_questions} onChange={e => setForm({ ...form, number_of_questions: parseInt(e.target.value) || 0 })} /><small className="employee-hint">0 means use full uploaded pool.</small></div>
              <div className="employee-fg"><label className="employee-label">Randomization</label><label className="employee-hint"><input type="checkbox" checked={form.shuffle_questions} onChange={e => setForm({ ...form, shuffle_questions: e.target.checked })} /> Shuffle Questions</label><br /><label className="employee-hint"><input type="checkbox" checked={form.shuffle_options} onChange={e => setForm({ ...form, shuffle_options: e.target.checked })} /> Shuffle Options</label></div>
            </div>
            <div className="employee-fg"><label className="employee-label">Quiz File (CSV) *</label><input type="file" className="employee-input" style={{ padding: 7 }} onChange={e => setFile(e.target.files[0])} accept=".csv" required /><small className="employee-hint">Required columns: Question, OptionA, OptionB, OptionC, OptionD, CorrectAnswer</small></div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="submit" className="employee-btn employee-btn-primary" disabled={saving}><i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-upload'}`} /> {saving ? 'Uploading...' : 'Upload Quiz'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export function ManageQuizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadQuizzes() }, [])

  const loadQuizzes = async () => {
    try {
      // This endpoint should return ONLY quizzes uploaded by the logged-in staff
      const response = await api.get('/quiz/')
      const allQuizzes = response.data.results || response.data || []

      // Filter on frontend as backup (but backend should already filter)
      setQuizzes(allQuizzes)
    } catch (err) {
      console.error('Failed to load quizzes:', err)
      toast.error('Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  const togglePublish = async (quizId, isPublished) => {
    try {
      await api.patch(`/quiz/${quizId}/toggle-publish/`)
      toast.success(`Quiz ${isPublished ? 'unpublished' : 'published'} successfully!`)
      loadQuizzes()
    } catch (err) {
      toast.error('Failed to update quiz status')
    }
  }

  const deleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return
    try {
      await api.delete(`/quiz/${quizId}/delete/`)
      toast.success('Quiz deleted successfully!')
      loadQuizzes()
    } catch (err) {
      toast.error('Failed to delete quiz')
    }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title="Manage Quizzes"
        sub="View, publish, and manage your uploaded quizzes"
        btn={
          <button className="employee-btn employee-btn-primary" onClick={() => window.location.href = '/employee/quiz/upload'}>
            <i className="fas fa-upload" /> Upload Quiz
          </button>
        }
      />
      <div className="employee-card">
        <SH title={`My Quizzes (${quizzes.length})`} />
        {loading ? <Spin /> : quizzes.length === 0 ? (
          <Empty msg="You haven't uploaded any quizzes yet" icon="fa-question-circle" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Batch</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map(quiz => (
                  <tr key={quiz.id}>
                    <td style={{ fontWeight: 600 }}>{quiz.title}</td>
                    <td>{quiz.batch_number}</td>
                    <td style={{ textAlign: 'center' }}>{quiz.total_questions || 0}</td>
                    <td>{quiz.duration_minutes} min</td>
                    <td>
                      <Badge
                        text={quiz.is_published ? 'Published' : 'Draft'}
                        variant={quiz.is_published ? 'success' : 'warning'}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className={`employee-btn employee-btn-sm ${quiz.is_published ? 'employee-btn-warning' : 'employee-btn-teal'}`}
                          style={{ background: quiz.is_published ? T.amber : T.teal, color: '#fff' }}
                          onClick={() => togglePublish(quiz.id, quiz.is_published)}
                        >
                          <i className={`fas ${quiz.is_published ? 'fa-eye-slash' : 'fa-eye'}`} />
                          {quiz.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          className="employee-btn employee-btn-sm employee-btn-danger"
                          onClick={() => deleteQuiz(quiz.id)}
                        >
                          <i className="fas fa-trash" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}



function LegacyStaffQuizResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)  // Changed to false initially
  const [error, setError] = useState(null)
  const [selectedBatch, setSelectedBatch] = useState('')
  const [batches, setBatches] = useState([])
  const [hasSearched, setHasSearched] = useState(false)  // New state to track if search was performed

  useEffect(() => {
    loadBatches()
    // Don't load results initially - wait for batch selection
  }, [])

  const loadBatches = async () => {
    try {
      const response = await api.get('/batches/')
      const batchData = response.data.results || response.data || []
      setBatches(batchData)
    } catch (err) {
      console.error('Failed to load batches:', err)
    }
  }

  const loadResults = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch first')
      return
    }

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      // Try multiple possible endpoints
      let response = null
      let success = false

      const endpoints = [
        '/api/quiz/staff-results/',
        '/quiz/staff-results/',
        '/staff-quiz-results/',
        '/api/staff-quiz-results/'
      ]

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying quiz results endpoint: ${endpoint}`)
          response = await api.get(endpoint)
          if (response && response.data) {
            success = true
            console.log(`Success with endpoint: ${endpoint}`)
            break
          }
        } catch (err) {
          console.log(`Failed with endpoint: ${endpoint}`, err.response?.status)
          continue
        }
      }

      if (!success || !response) {
        throw new Error('No quiz results endpoint available')
      }

      // Handle different response formats
      let resultsData = []
      if (response.data.results) {
        resultsData = response.data.results
      } else if (Array.isArray(response.data)) {
        resultsData = response.data
      } else {
        resultsData = []
      }

      console.log('Loaded quiz results:', resultsData.length)

      // Filter results for selected batch
      const filteredForBatch = resultsData.filter(r => {
        const resultBatchId = parseInt(r.batch_id) || parseInt(r.batch?.id)
        const selectedBatchId = parseInt(selectedBatch)
        return resultBatchId === selectedBatchId
      })

      setResults(filteredForBatch)

      if (filteredForBatch.length === 0) {
        setError('No quiz results available for this batch')
      } else {
        setError(null)
      }

    } catch (err) {
      console.error('Failed to load quiz results:', err)
      setError(err.response?.data?.error || err.message || 'Failed to load quiz results')
      toast.error('Failed to load quiz results')
    } finally {
      setLoading(false)
    }
  }

  // Handle batch selection change
  const handleBatchChange = (e) => {
    const batchId = e.target.value
    setSelectedBatch(batchId)
    if (batchId) {
      loadResults()  // Load results when batch is selected
    } else {
      setResults([])  // Clear results when no batch selected
      setHasSearched(false)
      setError(null)
    }
  }

  if (loading) {
    return (
      <div className="employee-root">
        <Styles />
        <Spin />
      </div>
    )
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title="📊 Quiz Results"
        sub="Select a batch to view student quiz performances"
      />

      {error && (
        <div className="employee-alert-warning" style={{ marginBottom: 20, padding: 12 }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />
          {error}
        </div>
      )}

      <div className="employee-card" style={{ marginBottom: 20 }}>
        <div style={{ padding: 20 }}>
          <label className="employee-label">Select Batch *</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              className="employee-select"
              style={{ maxWidth: 300, flex: 1 }}
              value={selectedBatch}
              onChange={handleBatchChange}
            >
              <option value="" disabled>
                -- Select a Batch --
              </option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_number}
                </option>
              ))}
            </select>
            <button
              className="employee-btn employee-btn-sm employee-btn-primary"
              onClick={loadResults}
              disabled={!selectedBatch}
            >
              <i className="fas fa-search" /> View Results
            </button>
          </div>
        </div>
      </div>

      <div className="employee-card">
        <SH title="Quiz Results" count={results.length} />

        {!hasSearched ? (
          <Empty msg="Please select a batch to view quiz results" icon="fa-chart-line" />
        ) : results.length === 0 ? (
          <Empty msg="No quiz results available for this batch" icon="fa-chart-line" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Quiz Title</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => {
                  const passingMarks = result.passing_marks || 50
                  const percentage = result.percentage || 0
                  const isPassed = percentage >= passingMarks

                  return (
                    <tr key={result.id || idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>
                        {result.student_name || result.student?.first_name || '—'}
                      </td>
                      <td>{result.student_id || result.student?.student_id || '—'}</td>
                      <td>{result.quiz_title || result.quiz?.title || '—'}</td>
                      <td>{result.score || 0}/{result.total_marks || result.total_questions || 0}</td>
                      <td>
                        <strong>{percentage.toFixed(1)}%</strong>
                      </td>
                      <td>
                        <Badge
                          text={isPassed ? 'Passed' : 'Failed'}
                          variant={isPassed ? 'success' : 'danger'}
                        />
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {result.submitted_at ? new Date(result.submitted_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


export function StaffQuizResults() {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState([])
  const [results, setResults] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [filters, setFilters] = useState({ quiz: '', candidate: '', date_from: '', date_to: '', status: '' })

  const query = () => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => { if (value) params.append(key, value) })
    return params.toString()
  }

  const loadResults = async () => {
    setLoading(true)
    try {
      const qs = query()
      const { data } = await api.get(`/quiz/results-dashboard/${qs ? `?${qs}` : ''}`)
      setAnalytics(data.analytics || [])
      setResults(data.results || [])
      setQuizzes(data.quizzes || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load quiz results')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadResults() }, [])

  const exportResults = (format) => {
    const qs = query()
    window.open(`/api/quiz/results-export/${format}/${qs ? `?${qs}` : ''}`, '_blank')
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="Quiz Management" sub="Quiz-wise analytics and candidate results" />

      <div className="employee-card" style={{ marginBottom: 18 }}>
        <SH title="Quiz Results" count={results.length} />
        <div className="employee-row-grid-2" style={{ padding: 18 }}>
          <div className="employee-fg"><label className="employee-label">Quiz</label><select className="employee-select" value={filters.quiz} onChange={e => setFilters({ ...filters, quiz: e.target.value })}><option value="">All Quizzes</option>{quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}</select></div>
          <div className="employee-fg"><label className="employee-label">Candidate</label><input className="employee-input" value={filters.candidate} onChange={e => setFilters({ ...filters, candidate: e.target.value })} placeholder="Name, email, student ID" /></div>
          <div className="employee-fg"><label className="employee-label">From</label><input type="date" className="employee-input" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} /></div>
          <div className="employee-fg"><label className="employee-label">To</label><input type="date" className="employee-input" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} /></div>
          <div className="employee-fg"><label className="employee-label">Status</label><select className="employee-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">All</option><option value="pass">Pass</option><option value="fail">Fail</option></select></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <button className="employee-btn employee-btn-primary" onClick={loadResults}>Apply</button>
            <button className="employee-btn employee-btn-ghost" onClick={() => setFilters({ quiz: '', candidate: '', date_from: '', date_to: '', status: '' })}>Clear</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 18px', justifyContent: 'flex-end' }}>
          <button className="employee-btn employee-btn-sm employee-btn-ghost" onClick={() => exportResults('csv')}>Export CSV</button>
          <button className="employee-btn employee-btn-sm employee-btn-ghost" onClick={() => exportResults('excel')}>Export Excel</button>
          <button className="employee-btn employee-btn-sm employee-btn-ghost" onClick={() => exportResults('pdf')}>Export PDF</button>
        </div>
      </div>

      <div className="employee-row-grid-2" style={{ marginBottom: 18 }}>
        {analytics.map(a => (
          <div key={a.quiz_id} className="employee-card" style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 10px' }}>{a.quiz_title}</h4>
            <div className="employee-hint">Candidates: {a.total_candidates} | Avg: {a.average_score}% | High: {a.highest_score}% | Low: {a.lowest_score}%</div>
            <div style={{ marginTop: 8 }}><Badge text={`Pass ${a.pass_count}`} variant="success" /> <Badge text={`Fail ${a.fail_count}`} variant="danger" /></div>
          </div>
        ))}
      </div>

      <div className="employee-card">
        <SH title="Candidate-wise Results" count={results.length} />
        {loading ? <Spin /> : results.length === 0 ? <Empty msg="No quiz results found" icon="fa-chart-line" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Candidate</th><th>Quiz</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Attempted</th><th>Percentage</th><th>Status</th><th>Submitted</th><th>Details</th></tr></thead>
              <tbody>{results.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.student_name}</strong><br /><small>{r.student_id}</small></td>
                  <td>{r.quiz_title}</td>
                  <td>{r.score}/{r.total_marks}</td>
                  <td>{r.correct_count}</td>
                  <td>{r.wrong_count}</td>
                  <td>{r.attempted_count}/{r.total_questions}</td>
                  <td><Badge text={`${r.percentage}%`} variant={r.status === 'Pass' ? 'success' : 'danger'} /></td>
                  <td>{r.status}</td>
                  <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '-'}</td>
                  <td><button className="employee-btn employee-btn-sm employee-btn-ghost" onClick={() => window.open(`/api/quiz/result/${r.id}/`, '_blank')}>View</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// BRANCH ANNOUNCEMENTS — counselor-created announcements for this branch
// Used by both Mentor (/employee/branch-announcements)
//      and Student (/student/branch-announcements)
// ══════════════════════════════════════════════════════════════════════════════
export function BranchAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewModal, setViewModal] = useState(null)

  useEffect(() => {
    api.get('/branch-announcements/')
      .then(r => setAnnouncements(r.data.results || r.data || []))
      .catch(() => toast.error('Failed to load branch announcements'))
      .finally(() => setLoading(false))
  }, [])

  const TYPE_META = {
    important: { bg: '#fdeaec', color: '#e84855', label: 'Important', icon: 'fa-exclamation-triangle' },
    holiday: { bg: '#fef5e4', color: '#f4a940', label: 'Holiday', icon: 'fa-umbrella-beach' },
    event: { bg: '#e8f8f0', color: '#4caf81', label: 'Event', icon: 'fa-calendar-star' },
    update: { bg: '#e4f2fd', color: '#2ec4b6', label: 'Update', icon: 'fa-sync-alt' },
    general: { bg: '#f0f3f7', color: '#8099b3', label: 'General', icon: 'fa-bullhorn' },
    exam: { bg: '#e4f2fd', color: '#1a2e4a', label: 'Exam', icon: 'fa-file-alt' },
    course: { bg: '#e8f8f0', color: '#4caf81', label: 'Course', icon: 'fa-book-open' },
  }

  const TypeBadge = ({ type }) => {
    const m = TYPE_META[type] || TYPE_META.general
    return (
      <span style={{
        background: m.bg, color: m.color, padding: '4px 12px', borderRadius: 20,
        fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5
      }}>
        <i className={`fas ${m.icon}`} style={{ fontSize: 10 }} /> {m.label}
      </span>
    )
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📍 Branch Announcements" sub="Announcements from your branch counselor" />

      {/* Stats */}
      <div className="employee-stat-grid" style={{ marginBottom: 24 }}>
        <div className="employee-stat-card">
          <div className="employee-stat-icon" style={{ background: 'rgba(46,196,182,.1)', color: '#2ec4b6' }}>
            <i className="fas fa-map-marker-alt" />
          </div>
          <div>
            <div className="employee-stat-value">{announcements.length}</div>
            <div className="employee-stat-label">Total</div>
          </div>
        </div>
        <div className="employee-stat-card">
          <div className="employee-stat-icon" style={{ background: 'rgba(232,72,85,.1)', color: '#e84855' }}>
            <i className="fas fa-exclamation-triangle" />
          </div>
          <div>
            <div className="employee-stat-value">{announcements.filter(a => a.announcement_type === 'important').length}</div>
            <div className="employee-stat-label">Important</div>
          </div>
        </div>
        <div className="employee-stat-card">
          <div className="employee-stat-icon" style={{ background: 'rgba(244,169,64,.1)', color: '#f4a940' }}>
            <i className="fas fa-calendar-week" />
          </div>
          <div>
            <div className="employee-stat-value">
              {announcements.filter(a => (Date.now() - new Date(a.created_at)) < 7 * 24 * 60 * 60 * 1000).length}
            </div>
            <div className="employee-stat-label">This Week</div>
          </div>
        </div>
      </div>

      <div className="employee-card">
        <SH title="📍 Branch Announcements" count={announcements.length} />
        {loading ? <Spin /> : announcements.length === 0 ? (
          <Empty msg="No branch announcements yet." icon="fa-map-marker-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>From</th>
                  <th style={{ width: 100 }}>Date</th>
                  <th style={{ width: 70 }}>View</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann, idx) => (
                  <tr key={ann.id}>
                    <td style={{ fontSize: 12, color: '#8099b3' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ann.title}</div>
                      <div style={{ color: '#8099b3', fontSize: 11, marginTop: 3 }}>
                        {ann.message?.substring(0, 55)}{ann.message?.length > 55 ? '…' : ''}
                      </div>
                    </td>
                    <td><TypeBadge type={ann.announcement_type} /></td>
                    <td style={{ fontSize: 12, color: '#8099b3' }}>
                      <i className="fas fa-user-tie" style={{ marginRight: 5, color: '#f4a940' }} />
                      {ann.created_by_name || 'Counselor'}
                    </td>
                    <td style={{ fontSize: 12, color: '#8099b3' }}>
                      {new Date(ann.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <button
                        className="employee-btn employee-btn-sm"
                        style={{ background: '#f0f3f7', color: '#1a2e4a', border: 'none' }}
                        onClick={() => setViewModal(ann)}
                      >
                        <i className="fas fa-eye" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
          onClick={e => e.target === e.currentTarget && setViewModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
            margin: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid #e9ecef',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>📄 Announcement</h5>
              <button onClick={() => setViewModal(null)}
                style={{
                  background: '#f1f5f9', border: 'none', width: 32, height: 32,
                  borderRadius: 8, cursor: 'pointer', fontSize: 14
                }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <TypeBadge type={viewModal.announcement_type} />
              </div>
              <h4 style={{ margin: '0 0 10px', color: '#0f1b2d' }}>{viewModal.title}</h4>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#8099b3' }}>
                  <i className="fas fa-user-tie" style={{ marginRight: 5, color: '#f4a940' }} />
                  {viewModal.created_by_name || 'Counselor'}
                </span>
                <span style={{ fontSize: 12, color: '#8099b3' }}>
                  <i className="fas fa-calendar" style={{ marginRight: 5 }} />
                  {new Date(viewModal.created_at).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{
                background: '#f8fafc', borderRadius: 10, padding: '16px 18px',
                lineHeight: 1.75, fontSize: 14, color: '#1a2e4a', whiteSpace: 'pre-wrap'
              }}>
                {viewModal.message}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
