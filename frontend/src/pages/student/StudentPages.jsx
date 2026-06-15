import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'  // ← ADD THIS

// ── Design tokens ─────────────────────────────────────────────────────────
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

// ── Global Styles ─────────────────────────────────────────────────────────
export function StudentStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

      .student-root {
        font-family: 'DM Sans', sans-serif;
        color: ${T.navy};
      }
      .student-root h1, .student-root h2, .student-root h3, 
      .student-root h4, .student-root h5 {
        font-family: 'Playfair Display', serif;
      }

      .student-card {
        background: #fff;
        border-radius: 16px;
        box-shadow: ${T.shadow};
        border: 1px solid ${T.border};
        overflow: hidden;
        margin-bottom: 24px;
      }
      .student-card-header {
        padding: 16px 22px;
        border-bottom: 1px solid ${T.border};
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
      }
      .student-card-header h5 {
        margin: 0;
        font-family: 'Playfair Display';
        font-size: 17px;
        font-weight: 600;
      }

      .student-page-header {
        margin-bottom: 24px;
        padding-bottom: 18px;
        border-bottom: 2px solid ${T.border};
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
      }
      .student-page-header h3 {
        margin: 0 0 4px;
        font-size: 24px;
        background: linear-gradient(135deg, ${T.navy}, ${T.navyLight});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .student-page-header p {
        margin: 0;
        color: ${T.slate};
        font-size: 13.5px;
      }

      .student-table {
        width: 100%;
        border-collapse: collapse;
      }
      .student-table th {
        background: linear-gradient(135deg, ${T.navy}, ${T.navyMid});
        color: white;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: .7px;
        text-transform: uppercase;
        padding: 13px 14px;
        text-align: left;
        white-space: nowrap;
      }
      .student-table td {
        padding: 12px 14px;
        border-bottom: 1px solid ${T.border};
        font-size: 13.5px;
        color: ${T.navy};
      }
      .student-table tr:last-child td {
        border-bottom: none;
      }
      .student-table tr:hover td {
        background: rgba(244,169,64,.04);
      }

      .student-btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 9px 18px;
        border-radius: 10px;
        border: none;
        font-family: 'DM Sans';
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: all .18s;
        white-space: nowrap;
        text-decoration: none;
      }
      .student-btn-primary {
        background: ${T.amber};
        color: ${T.navy};
      }
      .student-btn-primary:hover {
        background: ${T.amberLight};
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(244,169,64,.35);
      }
      .student-btn-ghost {
        background: transparent;
        color: ${T.slate};
        border: 1.5px solid ${T.border};
      }
      .student-btn-ghost:hover {
        background: ${T.white};
        color: ${T.navy};
        border-color: ${T.slateLight};
      }
      .student-btn-danger {
        background: ${T.rose};
        color: white;
      }
      .student-btn-success {
        background: ${T.sage};
        color: white;
      }
      .student-btn-sm {
        padding: 5px 12px;
        font-size: 12px;
        border-radius: 8px;
      }

      .student-input {
        padding: 9px 13px;
        border: 1.5px solid ${T.border};
        border-radius: 10px;
        font-family: 'DM Sans';
        font-size: 13px;
        outline: none;
        background: ${T.white};
        width: 100%;
        box-sizing: border-box;
        color: ${T.navy};
      }
      .student-input:focus {
        border-color: ${T.amber};
        box-shadow: 0 0 0 3px rgba(244,169,64,.15);
      }
      .student-select {
        padding: 9px 13px;
        border: 1.5px solid ${T.border};
        border-radius: 10px;
        font-family: 'DM Sans';
        font-size: 13px;
        outline: none;
        background: ${T.white};
        width: 100%;
        box-sizing: border-box;
        color: ${T.navy};
      }
      .student-label {
        display: block;
        font-weight: 600;
        font-size: 13px;
        margin-bottom: 5px;
        color: ${T.navy};
      }
      .student-fg {
        margin-bottom: 16px;
      }

      .student-stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 28px;
      }
      .student-stat-card {
        background: #fff;
        border-radius: 20px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        border: 1px solid ${T.border};
        box-shadow: ${T.shadow};
      }
      .student-stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }
      .student-stat-value {
        font-size: 28px;
        font-weight: 700;
        color: ${T.navy};
        line-height: 1.2;
      }
      .student-stat-label {
        font-size: 13px;
        color: ${T.slate};
        font-weight: 500;
      }

      .student-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
      }
      .student-modal {
        background: #fff;
        border-radius: 20px;
        width: 100%;
        max-height: 90vh;
        margin: 20px;
        display: flex;
        flex-direction: column;
      }
      .student-modal-header {
        padding: 20px 28px;
        border-bottom: 1px solid ${T.border};
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .student-modal-header h5 {
        margin: 0;
        font-family: 'Playfair Display', serif;
        font-size: 20px;
        font-weight: 600;
        color: ${T.navy};
      }
      .student-modal-close {
        background: #f1f5f9;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        color: ${T.slate};
      }
      .student-modal-body {
        padding: 28px;
        overflow-y: auto;
        flex: 1;
      }

      .student-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11.5px;
        font-weight: 600;
        white-space: nowrap;
      }

      .student-empty {
        padding: 60px;
        text-align: center;
        color: ${T.slate};
      }
      .student-empty-icon {
        font-size: 48px;
        opacity: 0.2;
        margin-bottom: 16px;
      }

      .student-alert-info {
        background: #e4f2fd;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 13px;
        color: #1260a0;
      }
      .student-alert-warning {
        background: #fef5e4;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 13px;
        color: #8a5a00;
      }

      .student-divider {
        border: none;
        border-top: 1px solid ${T.border};
        margin: 20px 0;
      }
      .student-row-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      @media (max-width: 640px) {
        .student-row-grid-2 {
          grid-template-columns: 1fr;
        }
      }

      .student-session-card {
        background: #fff;
        border-radius: 16px;
        padding: 18px;
        border: 1px solid ${T.border};
        margin-bottom: 12px;
      }

      @keyframes studentSpin {
        to { transform: rotate(360deg); }
      }
      .student-spin {
        width: 40px;
        height: 40px;
        border: 3px solid ${T.border};
        border-top-color: ${T.amber};
        border-radius: 50%;
        animation: studentSpin 1s linear infinite;
        margin: 40px auto;
      }
    `}</style>
  )
}

// ── Shared Components ──────────────────────────────────────────────────────
export function StudentSpin() {
  return (
    <div style={{ padding: 56, textAlign: 'center' }}>
      <div className="student-spin" />
    </div>
  )
}

export function StudentEmpty({ msg = 'No data found.', icon = 'fa-inbox' }) {
  return (
    <div className="student-empty">
      <div className="student-empty-icon"><i className={`fas ${icon}`} /></div>
      <p style={{ margin: 0, fontFamily: "'Playfair Display'", fontSize: 16 }}>{msg}</p>
    </div>
  )
}

export function StudentBadge({ text, variant = 'default' }) {
  const variants = {
    success: { bg: '#e8f8f0', color: '#1a6b3e' },
    danger: { bg: '#fdeaec', color: '#9b1c27' },
    warning: { bg: '#fef5e4', color: '#8a5a00' },
    info: { bg: '#e4f2fd', color: '#1260a0' },
    pending: { bg: '#fff3cd', color: '#664d03' },
    default: { bg: '#f0f3f7', color: T.slate },
  }
  const s = variants[variant] || variants.default
  return <span className="student-badge" style={{ background: s.bg, color: s.color }}>{text}</span>
}

export function StudentModal({ open, onClose, title, children, size = 'lg' }) {
  if (!open) return null
  const maxW = { xl: 960, lg: 820, md: 600, sm: 460 }[size] || 820
  return (
    <div className="student-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="student-modal" style={{ maxWidth: maxW }}>
        <div className="student-modal-header">
          <h5>{title}</h5>
          <button className="student-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="student-modal-body">{children}</div>
      </div>
    </div>
  )
}

export function StudentPageHeader({ title, sub, btn }) {
  return (
    <div className="student-page-header">
      <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
      {btn}
    </div>
  )
}

export function StudentSectionHeader({ title, count, actions }) {
  return (
    <div className="student-card-header">
      <h5>{title}{count != null && <span style={{ color: T.slate, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>({count})</span>}</h5>
      {actions}
    </div>
  )
}

export function StudentDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()  // ← ADD THIS

  useEffect(() => {
    api.get('/dashboard/student/').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="student-root"><StudentStyles /><StudentSpin /></div>

  const stats = [
    { label: 'Announcements', value: data?.announcements_count ?? data?.announcements?.length ?? 0, icon: 'fa-bullhorn', color: T.teal, bgColor: 'rgba(46,196,182,0.1)', to: '/student/announcements' },
    { label: 'Attendance %', value: `${data?.attendance_percentage ?? 0}%`, icon: 'fa-calendar-check', color: T.sage, bgColor: 'rgba(76,175,129,0.1)', to: '/student/attendance' },
    { label: 'Classes Attended', value: data?.present_classes ?? 0, icon: 'fa-check-circle', color: T.navy, bgColor: 'rgba(15,27,45,0.1)', to: '/student/attendance' },
    { label: 'Total Classes', value: data?.total_classes ?? 0, icon: 'fa-book-open', color: T.amber, bgColor: 'rgba(244,169,64,0.1)', to: '/student/attendance' },
    { label: 'Completed Sessions', value: data?.completed_sessions_count ?? 0, icon: 'fa-check-double', color: T.sage, bgColor: 'rgba(76,175,129,0.1)', to: '/student/sessions' },
    { label: 'Tests', value: data?.tests_count ?? 0, icon: 'fa-file-alt', color: T.navy, bgColor: 'rgba(15,27,45,0.1)', to: '/student/tests' },
    { label: 'Quizzes', value: data?.quizzes_count ?? 0, icon: 'fa-question-circle', color: T.teal, bgColor: 'rgba(46,196,182,0.1)', to: '/student/quiz' },
    { label: 'Study Materials', value: data?.materials_count ?? 0, icon: 'fa-book', color: T.amber, bgColor: 'rgba(244,169,64,0.1)', to: '/student/materials' },
    { label: 'Fee Status', value: 'View', icon: 'fa-rupee-sign', color: T.rose, bgColor: 'rgba(232,72,85,0.1)', to: '/student/fee' },
  ]

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader
        title={`👋 Welcome, ${data?.student?.first_name || 'Student'}!`}
        sub={`Student ID: ${data?.student?.student_id || '—'} · Batch: ${data?.student?.assigned_batch_number || 'Not assigned'}`}
      />
      <div className="student-stat-grid">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="student-stat-card"
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
            <div className="student-stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
              <i className={`fas ${stat.icon}`} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="student-stat-value">{stat.value}</div>
              <div className="student-stat-label">{stat.label}</div>
            </div>
            <i className="fas fa-arrow-right" style={{ color: stat.color, opacity: 0.4, fontSize: 12 }} />
          </div>
        ))}
      </div>
      {data?.announcements?.length > 0 && (
        <div className="student-card">
          <StudentSectionHeader title="📢 Recent Announcements" />
          <div style={{ padding: '0 22px 22px 22px' }}>
            {data.announcements.slice(0, 5).map((a, idx) => (
              <div key={a.id} style={{
                padding: '14px 0',
                borderBottom: idx < data.announcements.slice(0, 5).length - 1 ? `1px solid ${T.border}` : 'none'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, color: T.navy }}>
                  {a.title}
                  {a.is_important && <StudentBadge text="Important" variant="danger" style={{ marginLeft: 8 }} />}
                </div>
                <p style={{ color: T.slate, fontSize: 13, margin: 0 }}>{a.message}</p>
                <div style={{ fontSize: 11, color: T.slateLight, marginTop: 8 }}>
                  <i className="far fa-calendar-alt" style={{ marginRight: 6 }} />
                  {new Date(a.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── STUDENT ATTENDANCE ─────────────────────────────────────────────────────
export function StudentAttendance() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/attendance/?student=me').then(r => setRecords(r.data.results || r.data)).finally(() => setLoading(false))
  }, [])

  const present = records.filter(r => r.status === 'Present').length
  const pct = records.length ? Math.round(present / records.length * 100) : 0

  const stats = [
    { label: 'Attendance Rate', value: `${pct}%`, icon: 'fa-chart-line', color: T.sage, bgColor: 'rgba(76,175,129,0.1)' },
    { label: 'Present Days', value: present, icon: 'fa-check-circle', color: T.navy, bgColor: 'rgba(15,27,45,0.1)' },
    { label: 'Absent Days', value: records.length - present, icon: 'fa-times-circle', color: T.rose, bgColor: 'rgba(232,72,85,0.1)' },
  ]

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="📋 My Attendance" sub="Track your attendance records" />
      <div className="student-stat-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="student-stat-card">
            <div className="student-stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
              <i className={`fas ${stat.icon}`} />
            </div>
            <div>
              <div className="student-stat-value">{stat.value}</div>
              <div className="student-stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="student-card">
        <StudentSectionHeader title="Attendance Records" count={records.length} />
        {loading ? <StudentSpin /> : records.length === 0 ? (
          <StudentEmpty msg="No attendance records found" icon="fa-calendar-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="student-table">
              <thead><tr><th>Date</th><th>Batch</th><th>Status</th></tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>{r.batch_number}</td>
                    <td><StudentBadge text={r.status} variant={r.status === 'Present' ? 'success' : 'danger'} /></td>
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

// ── STUDENT SESSIONS ──────────────────────────────────────────────────────
export function StudentSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [doubtModal, setDoubtModal] = useState(null)
  const [doubtText, setDoubtText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/sessions/student/')
      .then(r => setSessions(r.data.results || r.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleMarkComplete = async (session) => {
    if (!window.confirm(`Mark Session ${session.session_number}: "${session.title}" as completed?`)) return
    setActionLoading(session.id)
    try {
      await api.post('/sessions/student-complete/', { session_id: session.id })
      toast.success('Session marked as completed!')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to mark completed')
    } finally { setActionLoading(null) }
  }

  const handleRaiseDoubt = async () => {
    if (!doubtText.trim()) return toast.error('Please describe your doubt')
    setSubmitting(true)
    try {
      await api.post('/sessions/student-doubt/', { session_id: doubtModal.id, doubt_text: doubtText })
      toast.success('Doubt raised! Your trainer has been notified.')
      setDoubtModal(null)
      setDoubtText('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to raise doubt')
    } finally { setSubmitting(false) }
  }

  const completedCount = sessions.filter(s => s.student_status === 'completed').length
  const pct = sessions.length ? Math.round((completedCount / sessions.length) * 100) : 0

  if (loading) return <div className="student-root"><StudentStyles /><StudentSpin /></div>

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="📋 My Sessions" sub="Track your course progress and confirm completed sessions" />
      {sessions.length > 0 && (
        <div className="student-card" style={{ marginBottom: 20 }}>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Course Progress</span>
              <span style={{ fontWeight: 700, color: T.sage }}>{pct}% ({completedCount}/{sessions.length})</span>
            </div>
            <div style={{ height: 8, background: '#e9ecef', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${T.sage}, ${T.teal})`, borderRadius: 4 }} />
            </div>
          </div>
        </div>
      )}
      {sessions.length === 0 ? (
        <div className="student-card"><StudentEmpty msg="No sessions available yet" icon="fa-list" /></div>
      ) : (
        sessions.map((s) => {
          const isCompleted = s.student_status === 'completed'
          const isDoubt = s.student_status === 'doubt'
          const hasResponse = s.has_response === true
          const canTakeAction = s.staff_completed && !isCompleted && !isDoubt && !hasResponse
          let statusText = '', statusVariant = ''
          if (isCompleted) { statusText = 'Completed'; statusVariant = 'success' }
          else if (isDoubt) { statusText = 'Doubt Raised'; statusVariant = 'warning' }
          else if (hasResponse || canTakeAction) { statusText = 'Ready to Confirm'; statusVariant = 'info' }
          else { statusText = 'Waiting for Trainer'; statusVariant = 'default' }
          return (
            <div key={s.id} className="student-session-card" style={{ borderLeft: `4px solid ${isCompleted ? T.sage : isDoubt ? T.amber : canTakeAction ? T.teal : T.slateLight}` }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: isCompleted ? T.sage : isDoubt ? T.amber : canTakeAction ? T.teal : '#e9ecef', color: isCompleted || canTakeAction ? '#fff' : isDoubt ? T.navy : T.slate, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                  {isCompleted ? <i className="fas fa-check" /> : s.session_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div><h6 style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{s.title || `Session ${s.session_number}`}</h6></div>
                    <StudentBadge text={statusText} variant={statusVariant} />
                  </div>
                  {hasResponse && s.doubt_response && !isCompleted && (
                    <div className="student-alert-info" style={{ marginTop: 12 }}>
                      <strong>Trainer's Response:</strong> {s.doubt_response}
                      <div style={{ marginTop: 10 }}><button className="student-btn student-btn-sm student-btn-success" onClick={() => handleMarkComplete(s)} disabled={actionLoading === s.id}>{actionLoading === s.id ? 'Processing...' : '✅ Mark as Completed'}</button></div>
                    </div>
                  )}
                  {canTakeAction && !hasResponse && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <button className="student-btn student-btn-sm student-btn-success" onClick={() => handleMarkComplete(s)} disabled={actionLoading === s.id}>{actionLoading === s.id ? 'Processing...' : '✅ Mark as Completed'}</button>
                      <button className="student-btn student-btn-sm student-btn-primary" onClick={() => { setDoubtModal(s); setDoubtText('') }}>❓ Have a Doubt</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
      {doubtModal && (
        <StudentModal open onClose={() => { setDoubtModal(null); setDoubtText('') }} title="❓ Raise a Doubt" size="md">
          <div className="student-alert-info" style={{ marginBottom: 16 }}>Session {doubtModal.session_number}: {doubtModal.title}</div>
          <textarea className="student-input" rows={4} placeholder="Describe your doubt..." value={doubtText} onChange={e => setDoubtText(e.target.value)} />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="student-btn student-btn-ghost" onClick={() => { setDoubtModal(null); setDoubtText('') }}>Cancel</button>
            <button className="student-btn student-btn-primary" onClick={handleRaiseDoubt} disabled={submitting || !doubtText.trim()}>{submitting ? 'Submitting...' : 'Submit Doubt'}</button>
          </div>
        </StudentModal>
      )}
    </div>
  )
}

// ── STUDENT NOTIFICATIONS ─────────────────────────────────────────────────
export function StudentNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/notifications/student/').then(r => setNotifications(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read/`)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="🔔 Notifications" sub="Updates from your trainer" btn={unread > 0 && <StudentBadge text={`${unread} new`} variant="danger" />} />
      <div className="student-card">
        {loading ? <StudentSpin /> : notifications.length === 0 ? <StudentEmpty msg="No notifications yet" icon="fa-bell-slash" /> : (
          <div style={{ padding: '0 22px 22px 22px' }}>
            {notifications.map(n => (
              <div key={n.id} onClick={() => !n.is_read && markRead(n.id)} style={{ padding: 16, marginBottom: 12, background: n.is_read ? '#fff' : '#f0f7ff', border: `1px solid ${n.is_read ? T.border : T.teal}`, borderRadius: 12, cursor: n.is_read ? 'default' : 'pointer' }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${T.teal}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-bell" style={{ color: T.teal }} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{n.title}</strong><small style={{ color: T.slate }}>{n.created_at}</small></div>
                    <p style={{ margin: '4px 0 0', fontSize: 13 }}>{n.message}</p>
                    {!n.is_read && <small style={{ color: T.teal, marginTop: 8, display: 'block' }}>Click to mark as read</small>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── STUDENT LEAVE ─────────────────────────────────────────────────────────
export function StudentLeave() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/student-leave/').then(r => setLeaves(r.data.results || r.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const pendingCount = leaves.filter(l => l.status === 'pending').length
  const approvedCount = leaves.filter(l => l.status === 'approved').length
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="📋 Leave Applications" sub="Apply for leave and track your requests" btn={<button className="student-btn student-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> Apply Leave</button>} />
      <div className="student-stat-grid">
        <div className="student-stat-card" style={{ background: '#fef5e4', border: 'none' }}><div className="student-stat-icon" style={{ background: 'rgba(244,169,64,0.1)', color: T.amber }}><i className="fas fa-clock" /></div><div><div className="student-stat-value">{pendingCount}</div><div className="student-stat-label">Pending</div></div></div>
        <div className="student-stat-card" style={{ background: '#e8f8f0', border: 'none' }}><div className="student-stat-icon" style={{ background: 'rgba(76,175,129,0.1)', color: T.sage }}><i className="fas fa-check-circle" /></div><div><div className="student-stat-value">{approvedCount}</div><div className="student-stat-label">Approved</div></div></div>
        <div className="student-stat-card" style={{ background: '#fdeaec', border: 'none' }}><div className="student-stat-icon" style={{ background: 'rgba(232,72,85,0.1)', color: T.rose }}><i className="fas fa-times-circle" /></div><div><div className="student-stat-value">{rejectedCount}</div><div className="student-stat-label">Rejected</div></div></div>
      </div>
      <div className="student-card">
        <StudentSectionHeader title="My Leave History" count={leaves.length} />
        {loading ? <StudentSpin /> : leaves.length === 0 ? <StudentEmpty msg="No leave applications yet" icon="fa-calendar-alt" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="student-table">
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Staff Remarks</th></tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td>{l.leave_type}</td><td>{l.start_date}</td><td>{l.end_date}</td><td>{l.number_of_days || l.no_of_days}</td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td><StudentBadge text={l.status} variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'pending'} /></td>
                    <td style={{ fontSize: 12 }}>{l.staff_remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && <StudentLeaveForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function StudentLeaveForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ start_date: '', end_date: '', leave_type: 'casual', reason: '', contact_info: '' })
  const [saving, setSaving] = useState(false)
  const [calculatedDays, setCalculatedDays] = useState(0)

  useEffect(() => {
    if (form.start_date && form.end_date) {
      const start = new Date(form.start_date), end = new Date(form.end_date)
      setCalculatedDays(Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1)
    }
  }, [form.start_date, form.end_date])

  const save = async e => {
    e.preventDefault()
    if (!form.start_date || !form.end_date || !form.reason.trim()) return toast.error('Please fill all required fields')
    setSaving(true)
    try {
      await api.post('/student-leave/', { ...form, number_of_days: calculatedDays })
      toast.success('Leave application submitted!')
      onSaved()
    } catch { toast.error('Failed to submit') }
    finally { setSaving(false) }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <StudentModal open onClose={onClose} title="Apply for Leave" size="md">
      <form onSubmit={save}>
        <div className="student-fg"><label className="student-label">Leave Type *</label><select className="student-select" value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))} required><option value="sick">Sick Leave</option><option value="casual">Casual Leave</option><option value="emergency">Emergency Leave</option><option value="personal">Personal Leave</option><option value="other">Other</option></select></div>
        <div className="student-row-grid-2"><div className="student-fg"><label className="student-label">From Date *</label><input className="student-input" type="date" value={form.start_date} min={today} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required /></div><div className="student-fg"><label className="student-label">To Date *</label><input className="student-input" type="date" value={form.end_date} min={form.start_date || today} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} required /></div></div>
        <div className="student-fg"><label className="student-label">Number of Days</label><input className="student-input" type="number" value={calculatedDays} readOnly style={{ background: '#f8f9fa' }} /></div>
        <div className="student-fg"><label className="student-label">Reason *</label><textarea className="student-input" rows={3} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Please provide a detailed reason..." required /></div>
        <div className="student-fg"><label className="student-label">Contact Info (Optional)</label><input className="student-input" type="text" value={form.contact_info} onChange={e => setForm(p => ({ ...p, contact_info: e.target.value }))} placeholder="Phone number" /></div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}><button type="button" className="student-btn student-btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="student-btn student-btn-primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit Leave'}</button></div>
      </form>
    </StudentModal>
  )
}

// ── StudentMaterials ────────────────────────────────────────────────────────
export function StudentMaterials() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.get('/materials/').then(r => setMaterials(r.data.results || r.data)).finally(() => setLoading(false)) }, [])

  const fileIcon = url => {
    if (!url) return 'fa-file-alt'
    if (url.includes('.pdf')) return 'fa-file-pdf'
    if (url.includes('.doc')) return 'fa-file-word'
    return 'fa-file-alt'
  }

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="📚 Study Materials" sub="Materials shared with your batch" />
      <div className="student-card">
        <StudentSectionHeader title="Materials" count={materials.length} />
        {loading ? <StudentSpin /> : materials.length === 0 ? <StudentEmpty msg="No materials available yet" icon="fa-folder-open" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="student-table">
              <thead><tr><th>Title</th><th>Batch</th><th>Date</th><th>File</th></tr></thead>
              <tbody>
                {materials.map(m => (
                  <tr key={m.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${T.amber}, ${T.rose})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className={`fas ${fileIcon(m.file)}`} /></div><span style={{ fontWeight: 600 }}>{m.title}</span></div></td>
                    <td><StudentBadge text={m.batch_number} variant="info" /></td>
                    <td style={{ fontSize: 12 }}>{m.uploaded_at ? new Date(m.uploaded_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{m.file ? <a href={m.file} target="_blank" rel="noreferrer" className="student-btn student-btn-sm student-btn-ghost" style={{ textDecoration: 'none' }}><i className="fas fa-download" /> Download</a> : '—'}</td>
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

// ── StudentSupport ──────────────────────────────────────────────────────────
export function StudentSupport() {
  const [requests, setRequests] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => { setLoading(true); api.get('/student-support/').then(r => setRequests(r.data.results || r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="🎧 Support Request" sub="Get help from admin" btn={<button className="student-btn student-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> New Request</button>} />
      <div className="student-card">
        <StudentSectionHeader title="My Support Requests" count={requests.length} />
        {loading ? <StudentSpin /> : requests.length === 0 ? <StudentEmpty msg="No support requests yet" icon="fa-headset" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="student-table">
              <thead><tr><th>Message</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 400 }}>{r.message}</td>
                    <td><StudentBadge text={r.status?.replace('_', ' ')} variant={r.status === 'resolved' ? 'success' : r.status === 'in_progress' ? 'info' : 'pending'} /></td>
                    <td style={{ fontSize: 12 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && (
        <StudentModal open onClose={() => setShowForm(false)} title="New Support Request" size="md">
          <div className="student-fg"><label className="student-label">Message / Issue *</label><textarea className="student-input" rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue in detail..." required /></div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="student-btn student-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="student-btn student-btn-primary" disabled={saving || !message} onClick={async () => { setSaving(true); try { await api.post('/student-support/', { message }); toast.success('Request submitted!'); setShowForm(false); setMessage(''); load() } catch { toast.error('Failed') } finally { setSaving(false) } }}>{saving ? 'Submitting...' : 'Submit Request'}</button>
          </div>
        </StudentModal>
      )}
    </div>
  )
}


// ── STUDENT TESTS (For QuizTest model - Manual Tests) ─────────────────────────────────────────
export function StudentTests() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTest, setActiveTest] = useState(null)
  const [testResults, setTestResults] = useState([])

  const loadTests = async () => {
    setLoading(true)
    try {
      const [testsRes, resultsRes] = await Promise.all([
        api.get('/student-tests/'),
        api.get('/test-results/')
      ])

      const allTests = testsRes.data.results || testsRes.data || []
      const completedTests = resultsRes.data.results || resultsRes.data || []

      // ── DEBUG: paste this output here ────────────────────────
      console.log('TEST OBJECT:', JSON.stringify(allTests[0]))
      console.log('RESULT OBJECT:', JSON.stringify(completedTests[0]))
      // ─────────────────────────────────────────────────────────

      const completedTestIds = new Set()
      completedTests.forEach(r => {
        if (r.test_id != null) completedTestIds.add(Number(r.test_id))
        if (r.test != null) completedTestIds.add(Number(r.test))
      })

      const availableTests = allTests.filter(test => {
        const tid = Number(test.test_id || test.id)
        return !completedTestIds.has(tid)
      })

      setTests(availableTests)
      setTestResults(completedTests)

    } catch (err) {
      toast.error('Failed to load tests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTests() }, [])

  const startTest = async (test) => {
    try {
      const testId = test.test_id || test.id
      const response = await api.get(`/tests/${testId}/questions/`)
      setActiveTest({ ...test, questions: response.data.questions })
    } catch (err) {
      console.error("Error loading questions:", err)
      toast.error("Failed to load test questions")
    }
  }

  if (activeTest) {
    return <TakeTestComponent test={activeTest} onDone={() => { setActiveTest(null); loadTests() }} />
  }

  if (loading) {
    return (
      <div className="student-root">
        <StudentStyles />
        <StudentSpin />
      </div>
    )
  }

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader
        title="📋 My Tests"
        sub="Tests assigned by your trainer"
      />

      {/* Available Tests */}
      {tests.length > 0 && (
        <div className="student-card" style={{ marginBottom: 20 }}>
          <StudentSectionHeader title="Available Tests" count={tests.length} />
          <div style={{ padding: '0 22px 22px 22px' }}>
            <div className="student-row-grid-2">
              {tests.map(test => (
                <div key={test.id} className="student-card" style={{ padding: 0 }}>
                  <div style={{ padding: 18 }}>
                    <h5 style={{ margin: 0 }}>{test.test_title}</h5>
                    {test.test_description && (
                      <p style={{ color: T.slate, fontSize: 12, marginBottom: 12 }}>
                        {test.test_description}
                      </p>
                    )}
                    <div style={{ marginBottom: 16 }}>
                      <StudentBadge text={`${test.total_questions || 0} Questions`} variant="info" />
                    </div>
                    <button
                      className="student-btn student-btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => startTest(test)}
                      disabled={test.total_questions === 0}
                    >
                      {test.total_questions === 0 ? '⚠️ No Questions' : '▶️ Start Test'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Completed Tests History */}
      {/* Completed Tests History */}
      {testResults.length > 0 && (
        <div className="student-card" style={{ marginTop: 20 }}>
          <StudentSectionHeader title="📊 Completed Tests History" count={testResults.length} />
          <div style={{ overflowX: 'auto' }}>
            <table className="student-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, idx) => (
                  <tr key={result.id || idx}>
                    <td style={{ fontWeight: 600 }}>{result.test_title || 'Test'}</td>
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
                        <strong>{(result.percentage || 0).toFixed(1)}%</strong>
                      </div>
                    </td>
                    <td>
                      <StudentBadge
                        text={(result.percentage || 0) >= 50 ? '✅ Passed' : '❌ Failed'}
                        variant={(result.percentage || 0) >= 50 ? 'success' : 'danger'}
                      />
                    </td>
                    <td style={{ fontSize: 12, color: T.slate }}>
                      {result.submitted_at
                        ? new Date(result.submitted_at).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No tests message */}
      {tests.length === 0 && testResults.length === 0 && (
        <div className="student-card">
          <StudentEmpty msg="No tests assigned yet" icon="fa-file-alt" />
        </div>
      )}

      {/* All completed message */}
      {tests.length === 0 && testResults.length > 0 && (
        <div className="student-card">
          <div className="student-empty">
            <div className="student-empty-icon">
              <i className="fas fa-trophy" style={{ color: T.amber, fontSize: 48 }} />
            </div>
            <p style={{ fontFamily: "'Playfair Display'", fontSize: 16, fontWeight: 600 }}>
              🎉 Congratulations! 🎉
            </p>
            <p style={{ color: T.slate, marginTop: 8 }}>
              You've completed all assigned tests!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


// ── TAKE TEST COMPONENT (For QuizTest model) ─────────────────────────────────────────
function TakeTestComponent({ test, onDone }) {
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const questions = test.questions || []

  // In TakeTestComponent, update the submitTest function:

  const submitTest = async () => {
    const answeredCount = Object.keys(answers).length
    if (answeredCount < questions.length && !window.confirm(`You have answered ${answeredCount}/${questions.length} questions. Submit anyway?`)) {
      return
    }

    setSubmitting(true)
    try {
      const response = await api.post(`/tests/${test.test_id}/take/`, { answers })

      // Show success message
      toast.success('Test submitted successfully!')

      // Set result data from response
      if (response.data) {
        setResult(response.data)
      }

      // Wait 2 seconds then go back to test list (which will refresh and hide this test)
      setTimeout(() => {
        onDone()  // This calls loadTests() in parent
      }, 2000)

    } catch (err) {
      console.error("Submission error:", err)
      toast.error(err.response?.data?.error || 'Failed to submit test')
      setSubmitting(false)
    }
  }

  if (result) {
    const passed = result.percentage >= 50
    return (
      <div className="student-root">
        <StudentStyles />
        <div className="student-card" style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
          <div style={{ padding: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>{passed ? '🎉' : '😔'}</div>
            <h3 style={{ color: passed ? T.sage : T.rose }}>
              {passed ? 'Congratulations!' : 'Better Luck Next Time'}
            </h3>
            <div style={{ fontSize: 48, fontWeight: 700, color: passed ? T.sage : T.rose, margin: '16px 0' }}>
              {result.percentage}%
            </div>
            <p>Your Score: <strong>{result.score}/{result.total_questions}</strong></p>
            <button className="student-btn student-btn-primary" onClick={onDone}>
              Back to Tests
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="student-root">
        <StudentStyles />
        <StudentPageHeader title={test.test_title} />
        <div className="student-card" style={{ textAlign: 'center', padding: 60 }}>
          <i className="fas fa-exclamation-triangle fa-3x" style={{ color: T.amber, marginBottom: 16 }} />
          <h5>No questions available for this test</h5>
          <button className="student-btn student-btn-primary" onClick={onDone}>
            Back to Tests
          </button>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const answeredCount = Object.keys(answers).length

  return (
    <div className="student-root">
      <StudentStyles />
      <div className="student-page-header" style={{ justifyContent: 'space-between' }}>
        <div>
          <h3>{test.test_title}</h3>
          <p>Question {current + 1} of {questions.length}</p>
        </div>
        <button className="student-btn student-btn-ghost student-btn-sm" onClick={onDone}>
          Exit
        </button>
      </div>

      <div className="student-row-grid-2" style={{ alignItems: 'start' }}>
        {/* Question Card */}
        <div className="student-card">
          <div style={{ padding: 24 }}>
            <div className="student-alert-info" style={{ marginBottom: 20 }}>
              Progress: {answeredCount} / {questions.length} answered ({Math.round(answeredCount / questions.length * 100)}%)
            </div>

            <h5 style={{ marginBottom: 20 }}>
              {current + 1}. {q.question_text}
            </h5>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'option1', label: 'A', value: q.option1 },
                { key: 'option2', label: 'B', value: q.option2 },
                { key: 'option3', label: 'C', value: q.option3 },
                { key: 'option4', label: 'D', value: q.option4 }
              ].filter(opt => opt.value && opt.value.trim()).map((opt) => (
                <label
                  key={opt.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: `2px solid ${answers[q.id] === opt.key ? T.amber : T.border}`,
                    background: answers[q.id] === opt.key ? `${T.amber}10` : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={opt.key}
                    checked={answers[q.id] === opt.key}
                    onChange={() => setAnswers({ ...answers, [q.id]: opt.key })}
                    style={{ accentColor: T.amber }}
                  />
                  <span style={{ fontWeight: 600 }}>{opt.label}.</span>
                  <span>{opt.value}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <button
                className="student-btn student-btn-ghost"
                onClick={() => setCurrent(c => c - 1)}
                disabled={current === 0}
              >
                ← Previous
              </button>
              {current < questions.length - 1 ? (
                <button className="student-btn student-btn-primary" onClick={() => setCurrent(c => c + 1)}>
                  Next →
                </button>
              ) : (
                <button
                  className="student-btn student-btn-success"
                  onClick={submitTest}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Test'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigator Card */}
        <div className="student-card">
          <div className="student-card-header">
            <h5>Question Navigator</h5>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {questions.map((_, idx) => {
                const isAnswered = answers[questions[idx].id]
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrent(idx)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: isAnswered ? T.sage : (current === idx ? T.amber : '#e9ecef'),
                      color: isAnswered || current === idx ? '#fff' : T.slate,
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
            <div className="student-divider" />
            <div>
              <p><span style={{ color: T.sage }}>●</span> Answered ({answeredCount})</p>
              <p><span style={{ color: '#e9ecef' }}>●</span> Unanswered ({questions.length - answeredCount})</p>
              <p><span style={{ color: T.amber }}>●</span> Current Question</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



// ── STUDENT QUIZ LIST (Excel Quizzes) ─────────────────────────────────────
export function StudentQuizList() {
  const [quizzes, setQuizzes] = useState([])
  const [completedQuizzes, setCompletedQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeQuiz, setActiveQuiz] = useState(null)

  const loadQuizzes = async () => {
    setLoading(true)
    try {
      const response = await api.get('/quiz/student/')
      const allQuizzes = response.data.results || response.data || []
      const available = [], completed = []
      allQuizzes.forEach(quiz => {
        if (quiz.max_attempts > 0 && quiz.user_attempts >= quiz.max_attempts) completed.push(quiz)
        else available.push(quiz)
      })
      setQuizzes(available)
      setCompletedQuizzes(completed)
    } catch { toast.error('Failed to load quizzes') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadQuizzes() }, [])

  if (activeQuiz) return <TakeQuiz quiz={activeQuiz} onDone={() => { setActiveQuiz(null); loadQuizzes() }} />

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="📝 Excel Quizzes" sub="Attempt your assigned quizzes" />
      {loading ? <StudentSpin /> : quizzes.length === 0 && completedQuizzes.length === 0 ? (
        <div className="student-card"><StudentEmpty msg="No quizzes assigned yet" icon="fa-question-circle" /></div>
      ) : (
        <>
          {quizzes.length > 0 && (
            <>
              <h4 className="student-card-header" style={{ marginBottom: 16 }}>📌 Available Quizzes</h4>
              <div className="student-row-grid-2">
                {quizzes.map(q => (
                  <div key={q.id} className="student-card" style={{ padding: 0 }}>
                    <div style={{ padding: 18 }}>
                      <h5 style={{ margin: 0 }}>{q.title}</h5>
                      {q.description && <p style={{ color: T.slate, fontSize: 12, marginBottom: 12 }}>{q.description}</p>}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        <StudentBadge text={`${q.total_questions} Questions`} variant="info" />
                        <StudentBadge text={`${q.duration_minutes} min`} variant="warning" />
                        <StudentBadge text={`Pass: ${q.passing_marks}%`} variant="default" />
                      </div>
                      {q.user_attempts > 0 && q.best_score && <div className="student-alert-info" style={{ marginBottom: 12, padding: '6px 12px' }}><i className="fas fa-star" /> Best Score: {q.best_score}%</div>}
                      <button className="student-btn student-btn-primary" style={{ width: '100%' }} onClick={() => setActiveQuiz(q)}>{q.user_attempts > 0 ? '🔄 Retake Quiz' : '▶️ Start Quiz'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {completedQuizzes.length > 0 && (
            <div className="student-card" style={{ marginTop: 20 }}>
              <StudentSectionHeader title="📊 Completed Quizzes History" count={completedQuizzes.length} />
              <div style={{ overflowX: 'auto' }}>
                <table className="student-table">
                  <thead><tr><th>Quiz Name</th><th>Questions</th><th>Best Score</th><th>Attempts</th><th>Max Attempts</th><th>Status</th></tr></thead>
                  <tbody>
                    {completedQuizzes.map(quiz => (
                      <tr key={quiz.id}>
                        <td style={{ fontWeight: 600 }}>{quiz.title}</td>
                        <td>{quiz.total_questions}</td>
                        <td><StudentBadge text={`${quiz.best_score || 0}%`} variant={quiz.best_score >= quiz.passing_marks ? 'success' : 'danger'} /></td>
                        <td>{quiz.user_attempts}</td>
                        <td>{quiz.max_attempts || '∞'}</td>
                        <td><StudentBadge text="Completed" variant="success" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TakeQuiz({ quiz, onDone }) {
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState(quiz.duration_minutes * 60)
  const [quizStarted, setQuizStarted] = useState(false)

  const questions = quiz.questions || []

  useEffect(() => {
    if (!quizStarted || result) return
    if (timeLeft <= 0) { submitQuiz(); return }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, quizStarted, result])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const submitQuiz = async () => {
    const answeredCount = Object.keys(answers).length
    if (answeredCount < questions.length && !window.confirm(`You have answered ${answeredCount}/${questions.length} questions. Submit anyway?`)) return
    setSubmitting(true)
    try {
      const response = await api.post(`/quiz/${quiz.id}/take/`, { answers })
      const resultResponse = await api.get(`/quiz/result/${response.data.attempt_id}/`)
      setResult(resultResponse.data)
      toast.success('Quiz submitted successfully!')
    } catch { toast.error('Submission failed') }
    finally { setSubmitting(false) }
  }

  if (!quizStarted && !result) {
    return (
      <div className="student-root">
        <StudentStyles />
        <StudentPageHeader title={quiz.title} btn={<button className="student-btn student-btn-ghost" onClick={onDone}>Exit</button>} />
        <div className="student-card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>📝</div>
            <h3>Ready to start?</h3>
            <div style={{ margin: '20px 0' }}><p><strong>Duration:</strong> {quiz.duration_minutes} minutes</p><p><strong>Questions:</strong> {questions.length}</p><p><strong>Passing marks:</strong> {quiz.passing_marks}%</p></div>
            <button className="student-btn student-btn-primary" onClick={() => setQuizStarted(true)}>Start Quiz</button>
          </div>
        </div>
      </div>
    )
  }

  if (result) {
    const passed = result.percentage >= quiz.passing_marks
    return (
      <div className="student-root">
        <StudentStyles />
        <StudentPageHeader title={`Quiz Result: ${quiz.title}`} btn={<button className="student-btn student-btn-ghost" onClick={onDone}>Back to Quizzes</button>} />
        <div className="student-card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: 32 }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>{passed ? '🎉' : '😔'}</div>
            <h3 style={{ color: passed ? T.sage : T.rose }}>{passed ? 'Congratulations!' : 'Better Luck Next Time'}</h3>
            <div style={{ fontSize: 48, fontWeight: 700, color: passed ? T.sage : T.rose, margin: '16px 0' }}>{result.percentage}%</div>
            <p>Your Score: <strong>{result.score}/{result.total_marks}</strong></p>
            <p>Correct: {result.correct_count} | Wrong: {result.wrong_count}</p>
            <button className="student-btn student-btn-primary" onClick={onDone}>Back to Quizzes</button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const answeredCount = Object.keys(answers).length

  return (
    <div className="student-root">
      <StudentStyles />
      <div className="student-page-header" style={{ justifyContent: 'space-between' }}>
        <div><h3>{quiz.title}</h3><p>Question {current + 1} of {questions.length}</p></div>
        <div><div className="student-badge" style={{ background: T.rose, color: '#fff', fontSize: 14, marginBottom: 8 }}><i className="fas fa-hourglass-half" /> Time Left: {formatTime(timeLeft)}</div><button className="student-btn student-btn-ghost student-btn-sm" onClick={onDone}>Exit</button></div>
      </div>
      <div className="student-row-grid-2" style={{ alignItems: 'start' }}>
        <div className="student-card">
          <div style={{ padding: 24 }}>
            <div className="student-alert-info" style={{ marginBottom: 20 }}>Progress: {answeredCount} / {questions.length} answered ({Math.round(answeredCount / questions.length * 100)}%)</div>
            <h5 style={{ marginBottom: 20 }}>{current + 1}. {q.question_text}</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['A', q.option_a], ['B', q.option_b], ['C', q.option_c], ['D', q.option_d]].filter(([, val]) => val && val.trim()).map(([key, opt]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, border: `2px solid ${answers[q.id] === key ? T.amber : T.border}`, background: answers[q.id] === key ? `${T.amber}10` : '#fff', cursor: 'pointer' }}>
                  <input type="radio" name={`q-${q.id}`} value={key} checked={answers[q.id] === key} onChange={() => setAnswers(prev => ({ ...prev, [q.id]: key }))} style={{ accentColor: T.amber }} />
                  <span style={{ fontWeight: 600 }}>{key}.</span> <span>{opt}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <button className="student-btn student-btn-ghost" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>← Previous</button>
              {current < questions.length - 1 ? <button className="student-btn student-btn-primary" onClick={() => setCurrent(c => c + 1)}>Next →</button> : <button className="student-btn student-btn-success" onClick={submitQuiz} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Quiz'}</button>}
            </div>
          </div>
        </div>
        <div className="student-card">
          <div className="student-card-header"><h5>Question Navigator</h5></div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {questions.map((_, idx) => {
                const isAnswered = answers[questions[idx].id]
                return <button key={idx} onClick={() => setCurrent(idx)} style={{ width: 40, height: 40, borderRadius: 10, background: isAnswered ? T.sage : (current === idx ? T.amber : '#e9ecef'), color: isAnswered || current === idx ? '#fff' : T.slate, border: 'none', fontWeight: 600, cursor: 'pointer' }}>{idx + 1}</button>
              })}
            </div>
            <div className="student-divider" />
            <div className="student-hint"><p><span style={{ color: T.sage }}>●</span> Answered ({answeredCount})</p><p><span style={{ color: '#e9ecef' }}>●</span> Unanswered ({questions.length - answeredCount})</p><p><span style={{ color: T.amber }}>●</span> Current Question</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PaymentRequestButton({ feeId, balance, fmt }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', payment_mode: 'cash', notes: '' })
  const [screenshot, setScreenshot] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Enter valid amount')
    if (parseFloat(form.amount) > parseFloat(balance)) return toast.error(`Amount cannot exceed balance of ${fmt(balance)}`)
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('fee_id', feeId)
      fd.append('amount', form.amount)
      fd.append('payment_mode', form.payment_mode)
      fd.append('notes', form.notes)
      if (screenshot) fd.append('screenshot', screenshot)

      await api.post('/student/fee/payment-request/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Payment request sent! Admin will verify and record it.')
      setShowForm(false)
      setForm({ amount: '', payment_mode: 'cash', notes: '' })
      setScreenshot(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request')
    } finally { setSubmitting(false) }
  }

  return (
    <>
      <button
        className="student-btn student-btn-primary"
        onClick={() => setShowForm(true)}
        style={{ width: '100%' }}
      >
        <i className="fas fa-paper-plane" /> I Have Paid — Notify Admin
      </button>

      {showForm && (
        <StudentModal open onClose={() => setShowForm(false)} title="💸 Payment Notification" size="md">
          <div className="student-alert-info" style={{ marginBottom: 16 }}>
            <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
            This will notify the admin that you have made a payment. Admin will verify and record it.
          </div>

          <div className="student-fg">
            <label className="student-label">Amount Paid (₹) *</label>
            <input
              className="student-input"
              type="number"
              placeholder={`Max: ${fmt(balance)}`}
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              max={balance}
              min={1}
            />
          </div>

          <div className="student-fg">
            <label className="student-label">Payment Mode *</label>
            <select className="student-select" value={form.payment_mode} onChange={e => setForm(p => ({ ...p, payment_mode: e.target.value }))}>
              <option value="cash">💵 Cash</option>
              <option value="upi">📱 UPI</option>
              <option value="bank_transfer">🏦 Bank Transfer</option>
              <option value="cheque">📝 Cheque</option>
            </select>
          </div>

          <div className="student-fg">
            <label className="student-label">Transaction ID / Notes (optional)</label>
            <input
              className="student-input"
              placeholder="e.g. UPI transaction ID, reference number..."
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>

          {/* ── Screenshot field ────────────────────────────────── */}
          <div className="student-fg">
            <label className="student-label">Payment Screenshot (optional)</label>
            {screenshot ? (
              <div style={{ background: '#e8f8f0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <i className="fas fa-image" style={{ color: T.sage, fontSize: 16 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1a6b3e' }}>{screenshot.name}</span>
                <button
                  type="button"
                  className="student-btn student-btn-sm student-btn-ghost"
                  onClick={() => setScreenshot(null)}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            ) : (
              <input
                className="student-input"
                type="file"
                accept="image/*"
                onChange={e => setScreenshot(e.target.files[0] || null)}
              />
            )}
            <small style={{ color: T.slate, fontSize: 11 }}>Upload screenshot of your payment (JPG, PNG)</small>
          </div>
          {/* ─────────────────────────────────────────────────────── */}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="student-btn student-btn-ghost" onClick={() => { setShowForm(false); setScreenshot(null) }}>Cancel</button>
            <button className="student-btn student-btn-primary" onClick={submit} disabled={submitting}>
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
              {submitting ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </StudentModal>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STUDENT FEE DETAILS
// ══════════════════════════════════════════════════════════════════════════════
export function StudentFeeDetails() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/student/fee/').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

  const downloadBill = async (feeId) => {
    try {
      toast.loading('Downloading bill...', { id: 'bill' })
      const token = localStorage.getItem('access') || localStorage.getItem('token') || ''
      const res = await fetch(`/api/fees/${feeId}/bill/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="?([^";\n]+)"?/)
      const filename = match ? match[1] : `Fee_Receipt.pdf`
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = filename
      document.body.appendChild(link); link.click(); link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Bill downloaded!', { id: 'bill' })
    } catch {
      toast.error('Failed to download bill', { id: 'bill' })
    }
  }

  if (loading) return <div className="student-root"><StudentStyles /><StudentSpin /></div>

  const fee = data?.fee
  const transactions = data?.transactions || []

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="💰 Fee Details" sub="Your course fee and payment history" />

      {!fee ? (
        <div className="student-card">
          <StudentEmpty msg="No fee record found. Please contact your counselor." icon="fa-rupee-sign" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="student-stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="student-stat-card" style={{ background: '#fef5e4', border: 'none' }}>
              <div className="student-stat-icon" style={{ background: 'rgba(244,169,64,0.1)', color: T.amber }}>
                <i className="fas fa-rupee-sign" />
              </div>
              <div>
                <div className="student-stat-value" style={{ fontSize: 20 }}>{fmt(fee.total_fee)}</div>
                <div className="student-stat-label">Total Fee</div>
              </div>
            </div>
            <div className="student-stat-card" style={{ background: '#e8f8f0', border: 'none' }}>
              <div className="student-stat-icon" style={{ background: 'rgba(76,175,129,0.1)', color: T.sage }}>
                <i className="fas fa-check-circle" />
              </div>
              <div>
                <div className="student-stat-value" style={{ fontSize: 20 }}>{fmt(fee.amount_paid)}</div>
                <div className="student-stat-label">Amount Paid</div>
              </div>
            </div>
            <div className="student-stat-card" style={{ background: fee.balance > 0 ? '#fdeaec' : '#e8f8f0', border: 'none' }}>
              <div className="student-stat-icon" style={{ background: fee.balance > 0 ? 'rgba(232,72,85,0.1)' : 'rgba(76,175,129,0.1)', color: fee.balance > 0 ? T.rose : T.sage }}>
                <i className={`fas ${fee.balance > 0 ? 'fa-clock' : 'fa-check-double'}`} />
              </div>
              <div>
                <div className="student-stat-value" style={{ fontSize: 20, color: fee.balance > 0 ? T.rose : T.sage }}>{fmt(fee.balance)}</div>
                <div className="student-stat-label">Balance Due</div>
              </div>
            </div>
          </div>

          {/* Fee Summary Card */}
          <div className="student-card" style={{ marginBottom: 20 }}>
            <div className="student-card-header">
              <h5>📋 Fee Summary</h5>
              <StudentBadge
                text={fee.is_fully_paid ? '✅ Fully Paid' : '⏳ Payment Pending'}
                variant={fee.is_fully_paid ? 'success' : 'danger'}
              />
            </div>
            <div style={{ padding: '20px 22px' }}>
              {/* Progress Bar */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
                  <span>Payment Progress</span>
                  <span style={{ color: T.sage }}>
                    {fee.total_fee > 0 ? Math.round((fee.amount_paid / fee.total_fee) * 100) : 0}%
                  </span>
                </div>
                <div style={{ height: 10, background: '#e9ecef', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${fee.total_fee > 0 ? (fee.amount_paid / fee.total_fee) * 100 : 0}%`,
                    background: `linear-gradient(90deg, ${T.sage}, ${T.teal})`,
                    borderRadius: 6,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['Course', fee.course_name],
                  ['Batch', fee.batch_number],
                  ['Total Fee', fmt(fee.total_fee)],
                  ['Amount Paid', fmt(fee.amount_paid)],
                  ['Balance Due', fmt(fee.balance)],
                  ['Status', fee.is_fully_paid ? 'Fully Paid' : 'Pending'],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: T.white, borderRadius: 10, padding: '12px 16px', border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 11, color: T.slate, fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Pending message — no pay button, just info */}
              {!fee.is_fully_paid && (
                <div className="student-alert-warning" style={{ marginTop: 16 }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
                  You have a pending balance of <strong>{fmt(fee.balance)}</strong>. Please contact your counselor to make the payment.
                </div>
              )}
            </div>
          </div>

          {/* Payment History */}
          {transactions.length > 0 && (
            <div className="student-card">
              <div className="student-card-header">
                <h5>📜 Payment History</h5>
                <StudentBadge text={`${transactions.length} Transactions`} variant="info" />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Amount</th>
                      <th>Payment Mode</th>
                      <th>Notes</th>
                      <th>Date</th>
                      <th>Bill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, i) => (
                      <tr key={t.id}>
                        <td style={{ color: T.slate, fontSize: 12 }}>{i + 1}</td>
                        <td style={{ fontWeight: 700, color: T.sage }}>{fmt(t.amount)}</td>
                        <td>
                          <StudentBadge
                            text={t.payment_mode?.replace('_', ' ').toUpperCase()}
                            variant="info"
                          />
                        </td>
                        <td style={{ fontSize: 12, color: T.slate }}>{t.notes || '—'}</td>
                        <td style={{ fontSize: 12 }}>
                          {t.paid_at ? new Date(t.paid_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td>
                          <button
                            className="student-btn student-btn-sm student-btn-success"
                            onClick={() => downloadBill(fee.id)}
                          >
                            <i className="fas fa-download" /> Bill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Download full receipt if fully paid */}
              {fee.is_fully_paid && (
                <div style={{ padding: '16px 22px', borderTop: `1px solid ${T.border}` }}>
                  <button
                    className="student-btn student-btn-success"
                    onClick={() => downloadBill(fee.id)}
                    style={{ width: '100%' }}
                  >
                    <i className="fas fa-file-invoice" /> Download Fee Receipt
                  </button>
                </div>
              )}
            </div>
          )}

          {/* No transactions yet */}
          {transactions.length === 0 && (
            <div className="student-card">
              <StudentEmpty msg="No payments recorded yet. Contact your counselor." icon="fa-receipt" />
            </div>
          )}
        </>
      )}
    </div>
  )
}