import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'
import { ConfirmModal } from '../../components/common/index.jsx'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

// ── Design tokens (match AdminPages) ─────────────────────────────────────────
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

  .ls-root { font-family: 'DM Sans', sans-serif; color: ${T.navy}; }
  .ls-root h1, .ls-root h2, .ls-root h3, .ls-root h4, .ls-root h5 { font-family: 'Playfair Display', serif; }

  .ls-card {
    background: #fff; border-radius: 16px;
    box-shadow: ${T.shadow}; border: 1px solid ${T.border}; overflow: hidden;
  }
  .ls-card-header {
    padding: 16px 22px; border-bottom: 1px solid ${T.border};
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
  }
  .ls-card-header h5 { margin: 0; font-family: 'Playfair Display'; font-size: 17px; font-weight: 600; }

  .ls-page-header {
    margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid ${T.border};
    display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  }
  .ls-page-header h3 {
    margin: 0 0 4px; font-size: 24px;
    background: linear-gradient(135deg,${T.navy},${T.navyLight});
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .ls-page-header p { margin: 0; color: ${T.slate}; font-size: 13.5px; }

  .ls-table { width: 100%; border-collapse: collapse; }
  .ls-table th {
    background: linear-gradient(135deg,${T.navy},${T.navyMid});
    color: white; font-size: 11px; font-weight: 600;
    letter-spacing: .7px; text-transform: uppercase;
    padding: 13px 14px; text-align: left; white-space: nowrap;
  }
  .ls-table td {
    padding: 12px 14px; border-bottom: 1px solid ${T.border};
    font-size: 13.5px; color: ${T.navy};
  }
  .ls-table tr:last-child td { border-bottom: none; }
  .ls-table tr { transition: background .15s; }
  .ls-table tr:hover td { background: rgba(244,169,64,.04); }

  .ls-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; border-radius: 10px; border: none;
    font-family: 'DM Sans'; font-weight: 600; font-size: 13px;
    cursor: pointer; transition: all .18s; white-space: nowrap;
  }
  .ls-btn-primary { background: ${T.amber}; color: ${T.navy}; }
  .ls-btn-primary:hover { background: ${T.amberLight}; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(244,169,64,.35); }
  .ls-btn-ghost { background: transparent; color: ${T.slate}; border: 1.5px solid ${T.border}; }
  .ls-btn-ghost:hover { background: ${T.white}; color: ${T.navy}; border-color: ${T.slateLight}; }
  .ls-btn-danger { background: ${T.rose}; color: white; }
  .ls-btn-danger:hover { filter: brightness(1.1); }
  .ls-btn-teal { background: ${T.teal}; color: white; }
  .ls-btn-teal:hover { filter: brightness(1.08); }
  .ls-btn-sm { padding: 5px 12px; font-size: 12px; border-radius: 8px; }
  .ls-btn-icon { padding: 7px 10px; border-radius: 8px; }

  .ls-input {
    padding: 9px 13px; border: 1.5px solid ${T.border};
    border-radius: 10px; font-family: 'DM Sans'; font-size: 13px;
    outline: none; transition: border .18s, box-shadow .18s; background: ${T.white};
    width: 100%; box-sizing: border-box; color: ${T.navy};
  }
  .ls-input:focus { border-color: ${T.amber}; box-shadow: 0 0 0 3px rgba(244,169,64,.15); }
  .ls-input:read-only { background: #f5f7fa; color: ${T.slate}; }

  .ls-select {
    padding: 9px 13px; border: 1.5px solid ${T.border};
    border-radius: 10px; font-family: 'DM Sans'; font-size: 13px;
    outline: none; transition: border .18s; background: ${T.white};
    width: 100%; box-sizing: border-box; color: ${T.navy};
    -webkit-appearance: none; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238099b3' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
  }
  .ls-select:focus { border-color: ${T.amber}; box-shadow: 0 0 0 3px rgba(244,169,64,.15); }

  .ls-label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 5px; color: ${T.navy}; }
  .ls-fg { margin-bottom: 16px; }
  .ls-hint { color: ${T.slate}; font-size: 11.5px; margin-top: 4px; display: block; }
  .ls-req { color: ${T.rose}; margin-left: 3px; }

  /* Modal - Normal full page behavior */
  .ls-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-y: auto;
  }
  .ls-modal {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-height: 90vh;
    margin: 20px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  .ls-modal-header {
    padding: 20px 28px;
    background: #fff;
    border-bottom: 1px solid ${T.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 20px 20px 0 0;
  }
  .ls-modal-header h5 {
    margin: 0;
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 600;
    color: ${T.navy};
  }
  .ls-modal-close {
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
  .ls-modal-close:hover {
    background: #e2e8f0;
    color: ${T.navy};
  }
  .ls-modal-body {
    padding: 28px;
    overflow-y: auto;
    flex: 1;
  }

  /* Badge */
  .ls-badge {
    display: inline-flex; align-items: center; padding: 3px 10px;
    border-radius: 20px; font-size: 11.5px; font-weight: 600; white-space: nowrap; letter-spacing: .2px;
  }

  .ls-avatar {
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; color: white; flex-shrink: 0; font-family: 'DM Sans';
  }

  .ls-empty { padding: 60px; text-align: center; color: ${T.slate}; }
  .ls-empty-icon { font-size: 36px; opacity: .18; margin-bottom: 12px; }

  .ls-alert-info { background: #e4f2fd; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #1260a0; }
  .ls-alert-success { background: #e8f8f0; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #1a6b3e; }
  .ls-alert-warning { background: #fef5e4; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #8a5a00; }

  .ls-divider { border: none; border-top: 1px solid ${T.border}; margin: 20px 0; }

  .ls-row-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media(max-width:640px) { .ls-row-grid-2 { grid-template-columns: 1fr; } }
`

// ── Shared components ─────────────────────────────────────────────────────────
function Styles() { return <style>{css}</style> }

const Spin = () => (
  <div style={{ padding: 56, textAlign: 'center' }}>
    <div style={{ width: 34, height: 34, border: `3px solid ${T.border}`, borderTopColor: T.amber, borderRadius: '50%', animation: 'lsSpin 1s linear infinite', margin: '0 auto' }} />
    <style>{`@keyframes lsSpin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

const Empty = ({ msg = 'No data found.' }) => (
  <div className="ls-empty"><div className="ls-empty-icon"><i className="fas fa-inbox" /></div><p style={{ margin: 0, fontFamily: "'Playfair Display'", fontSize: 16 }}>{msg}</p></div>
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
    <div className="ls-avatar" style={{ width: size, height: size, borderRadius: radius, background: avatarGrad(name), fontSize: size * 0.38 }}>
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
    default: { bg: '#f0f3f7', color: T.slate },
  }
  const s = variants[variant] || variants.default
  return <span className="ls-badge" style={{ background: s.bg, color: s.color }}>{text}</span>
}

// Form field helper
const FG = ({ label, required, children, hint }) => (
  <div className="ls-fg">
    <label className="ls-label">{label}{required && <span className="ls-req">*</span>}</label>
    {children}
    {hint && <span className="ls-hint">{hint}</span>}
  </div>
)

const Inp = (props) => <input className="ls-input" {...props} />
const Sel = ({ children, ...props }) => <select className="ls-select" {...props}>{children}</select>

// Modal - Normal full page behavior, no animations
function Modal({ open, onClose, title, children, size = 'lg' }) {
  if (!open) return null
  const maxW = { xl: 960, lg: 820, md: 600, sm: 460 }[size] || 820
  return (
    <div className="ls-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ls-modal" style={{ maxWidth: maxW }}>
        <div className="ls-modal-header">
          <h5>{title}</h5>
          <button className="ls-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ls-modal-body">{children}</div>
      </div>
    </div>
  )
}

// Page header
function PH({ title, sub, btn }) {
  return (
    <div className="ls-page-header">
      <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
      {btn}
    </div>
  )
}

// Section header (table header bar)
function SH({ title, count, actions }) {
  return (
    <div className="ls-card-header">
      <h5>{title}{count != null && <span style={{ color: T.slate, fontWeight: 400, fontFamily: "'DM Sans'", fontSize: 14, marginLeft: 8 }}>({count})</span>}</h5>
      {actions}
    </div>
  )
}

// ── Designation badge helper ──────────────────────────────────────────────────
const desigVariant = { counselor: 'info', trainer: 'teal', mentor: 'primary', hr: 'warning', admin_staff: 'default' }

// ══════════════════════════════════════════════════════════════════════════════
// EMPLOYEES LIST
// ══════════════════════════════════════════════════════════════════════════════
export function EmployeesList() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [nextStaffId, setNextStaffId] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get('/employees/').then(r => setData(r.data.results || r.data)).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const openAdd = async () => {
    try { const r = await api.get('/generate/staff-id/'); setNextStaffId(r.data.staff_id) } catch { setNextStaffId('') }
    setEditItem(null); setShowForm(true)
  }

  const filtered = data.filter(e =>
    `${e.first_name} ${e.last_name} ${e.staff_id} ${e.designation} ${e.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="ls-root">
      <Styles />
      <PH title="👨‍💼 Employees" sub="Manage trainers, mentors, counselors & staff"
        btn={<button className="ls-btn ls-btn-primary" onClick={openAdd}><i className="fas fa-plus" />Add Employee</button>} />

      <div className="ls-card">
        <SH title="All Employees" count={filtered.length} actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="ls-input" style={{ width: 220 }} placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="ls-btn ls-btn-ghost ls-btn-icon" onClick={load}><i className="fas fa-sync-alt" /></button>
          </div>
        } />
        {loading ? <Spin /> : filtered.length === 0 ? <Empty msg="No employees found." /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ls-table">
              <thead>
                <tr><th>#</th><th>Employee</th><th>Designation</th><th>Branch</th><th>Email</th><th>Mobile</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e.id}>
                    <td style={{ color: T.slate, fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={e.first_name} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{e.first_name} {e.last_name || ''}</div>
                          <div style={{ fontSize: 11, color: T.slate }}>{e.staff_id}</div>
                        </div>
                      </div>
                    </td>
                    <td><Badge text={e.designation} variant={desigVariant[e.designation] || 'default'} /></td>
                    <td style={{ fontSize: 13 }}>{e.branch}</td>
                    <td style={{ fontSize: 12, color: T.slate }}>{e.email}</td>
                    <td style={{ fontSize: 13 }}>{e.mobile_no}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="ls-btn ls-btn-ghost ls-btn-sm" onClick={() => { setEditItem(e); setShowForm(true) }}><i className="fas fa-edit" /> Edit</button>
                        <button className="ls-btn ls-btn-danger ls-btn-sm" onClick={() => setDeleteId(e.id)}><i className="fas fa-trash-alt" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <EmployeeForm item={editItem} nextStaffId={nextStaffId} onClose={() => setShowForm(false)}
        onSaved={(newId) => { setShowForm(false); load(); if (newId) setNextStaffId(newId) }} />}
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => {
        try { await api.delete(`/employees/${deleteId}/`); toast.success('Employee deleted'); setDeleteId(null); load() }
        catch { toast.error('Delete failed') }
      }} title="Delete Employee" message="Are you sure? This cannot be undone." danger />
    </div>
  )
}

function EmployeeForm({ item, nextStaffId, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    employee_name: item ? `${item.first_name} ${item.last_name || ''}`.trim() : '',
    email: item?.email || '',
    role: item?.designation || 'mentor',
    mobile_no: item?.mobile_no || '',
    date_of_birth: item?.date_of_birth || '',
    branch: item?.branch || '100ft',
    address: item?.address || '',
    gender: item?.gender || 'Male',
  })
  const [photo, setPhoto] = useState(null)
  const [idProof, setIdProof] = useState(null)
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const fd = new FormData()
      if (isEdit) {
        const parts = form.employee_name.trim().split(' ', 2)
        fd.append('first_name', parts[0] || '')
        fd.append('last_name', parts[1] || '')
        fd.append('email', form.email)
        fd.append('designation', form.role)
        fd.append('mobile_no', form.mobile_no)
        fd.append('date_of_birth', form.date_of_birth)
        fd.append('branch', form.branch)
        fd.append('address', form.address)
        fd.append('gender', form.gender)
        if (photo) fd.append('photo', photo)
        if (idProof) fd.append('id_proof', idProof)
        await api.patch(`/employees/${item.id}/`, fd)
        toast.success('Employee updated!')
        onSaved()
      } else {
        Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
        if (photo) fd.append('photo', photo)
        if (idProof) fd.append('id_proof', idProof)
        const r = await api.post('/employees/create/', fd)
        toast.success(r.data.message || 'Employee added!')
        onSaved(r.data.next_staff_id)
      }
    } catch (err) {
      const d = err.response?.data || {}
      toast.error(d.error || d.detail || Object.values(d)[0]?.[0] || 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? `Edit Employee — ${item.staff_id}` : 'Add Employee'}>
      <form onSubmit={save} encType="multipart/form-data">
        <div className="ls-row-grid-2">
          <div>
            <FG label="Staff ID" hint="Auto-generated by system">
              <Inp value={isEdit ? item.staff_id : (nextStaffId || 'Auto-generated')} readOnly />
            </FG>
            <FG label="Employee Name" required>
              <Inp value={form.employee_name} onChange={e => f('employee_name', e.target.value)} placeholder="Full name" required />
            </FG>
            <FG label="Email" required>
              <Inp type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="email@example.com" required />
            </FG>
            <FG label="Role" required>
              <Sel value={form.role} onChange={e => f('role', e.target.value)} required>
                <option value="" disabled>Select Role</option>
                {['counselor', 'mentor'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ')}</option>)}
              </Sel>
            </FG>
            <FG label="Mobile No" required>
              <Inp type="tel" maxLength={10} value={form.mobile_no} onChange={e => f('mobile_no', e.target.value)} placeholder="10-digit number" required />
            </FG>
            <FG label="Date of Birth" required>
              <Inp type="date" value={form.date_of_birth} onChange={e => f('date_of_birth', e.target.value)} required />
            </FG>
            {!isEdit && (
              <div className="ls-alert-info">
                <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
                Login: <strong>Username</strong> = Email &nbsp;·&nbsp; <strong>Password</strong> = Mobile No
              </div>
            )}
          </div>
          <div>
            <FG label="Profile Photo" hint="Optional — JPG, PNG">
              <Inp type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} />
            </FG>
            <FG label="ID Proof" hint="Optional — PDF, JPG, PNG">
              <Inp type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setIdProof(e.target.files[0])} />
            </FG>
            <FG label="Branch" required>
              <Sel value={form.branch} onChange={e => f('branch', e.target.value)} required>
                <option value="" disabled>Select Branch</option>
                <option value="100ft">100 Feet</option>
                <option value="hopes">Hopes</option>
                <option value="kuniyamuthur">Kuniyamuthur</option>
              </Sel>
            </FG>
            <FG label="Address">
              <Inp value={form.address} onChange={e => f('address', e.target.value)} placeholder="Optional" />
            </FG>
            <FG label="Gender" required>
              <Sel value={form.gender} onChange={e => f('gender', e.target.value)} required>
                <option value="" disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Sel>
            </FG>
          </div>
        </div>
        <hr className="ls-divider" />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button type="submit" className="ls-btn ls-btn-primary" disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-user-plus'}`} />
            {saving ? 'Saving...' : isEdit ? 'Update Employee' : 'Add Employee'}
          </button>
          <button type="button" className="ls-btn ls-btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STUDENTS LIST - with role-based permissions
// ══════════════════════════════════════════════════════════════════════════════
export function StudentsList({ adminView = true }) {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [assignModal, setAssignModal] = useState(null)

  // Determine user role
  const isAdmin = user?.user_type === 'admin'
  const isCounselor = user?.designation === 'counselor'

  // Permissions based on role
  const canEdit = isCounselor        // Only counselor can edit
  const canDelete = isCounselor      // Only counselor can delete
  const canAssign = isCounselor      // Only counselor can assign
  const canAdd = isCounselor         // Only counselor can add

  const load = useCallback(() => {
    setLoading(true)

    // Load students separately
    api.get('/students/')
      .then(sr => {
        setData(sr.data.results || sr.data || [])
      })
      .catch(err => {
        console.error('Error loading students:', err)
        setData([])
      })

    // Load courses separately - THIS FIXES THE COURSE DROPDOWN
    api.get('/courses/')
      .then(cr => {
        const courseData = cr.data.results || cr.data || []
        console.log('Courses loaded:', courseData.length)
        setCourses(courseData)
      })
      .catch(err => {
        console.error('Error loading courses:', err)
        toast.error('Failed to load courses')
        setCourses([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const branches = [...new Set(data.map(s => s.branch).filter(Boolean))]
  const filtered = data.filter(s => {
    const ms = `${s.first_name} ${s.last_name} ${s.student_id} ${s.email} ${s.course}`.toLowerCase().includes(search.toLowerCase())
    const mb = !branchFilter || s.branch === branchFilter
    return ms && mb
  })

  return (
    <div className="ls-root">
      <Styles />
      <PH title="👨‍🎓 Students" sub="Manage enrolled students"
        btn={canAdd && <button className="ls-btn ls-btn-primary" onClick={() => { setEditItem(null); setShowForm(true) }}><i className="fas fa-user-plus" />Add Student</button>} />

      <div className="ls-card">
        <SH title="All Students" count={filtered.length} actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="ls-input" style={{ width: 200 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="ls-btn ls-btn-ghost ls-btn-icon" onClick={load}><i className="fas fa-sync-alt" /></button>
          </div>
        } />
        {loading ? <Spin /> : filtered.length === 0 ? <Empty msg="No students found." /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ls-table">
              <thead>
                <tr>
                  <th>#</th><th>Student</th><th>Mobile</th><th>Course</th>
                  <th>Branch</th><th>Assigned Staff</th><th>Batch</th>
                  {/* Show action columns only for counselor (not admin) */}
                  {canEdit && <><th>Actions</th><th>Assign to Staff</th></>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: T.slate, fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={s.first_name} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</div>
                          <div style={{ fontSize: 11, color: T.slate }}>{s.student_id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{s.mobile_no}</td>
                    <td style={{ fontSize: 13 }}>{s.course}</td>
                    <td style={{ fontSize: 13 }}>{s.branch}</td>
                    <td>{s.assigned_staff_name ? <Badge text={s.assigned_staff_name} variant="teal" /> : <Badge text="Not Assigned" variant="warning" />}</td>
                    <td>{s.assigned_batch_number ? <Badge text={s.assigned_batch_number} variant="info" /> : <Badge text="—" />}</td>

                    {/* Actions column - only for counselor */}
                    {canEdit && (
                      <>
                        <td>
                          <button
                            className="ls-btn ls-btn-ghost ls-btn-sm"
                            onClick={() => { setEditItem(s); setShowForm(true) }}
                          >
                            <i className="fas fa-edit" /> Edit
                          </button>
                          <button className="ls-btn ls-btn-danger ls-btn-sm" onClick={() => setDeleteId(s.id)}>
                            <i className="fas fa-trash-alt" />
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {canAssign && (
                              <button className="ls-btn ls-btn-teal ls-btn-sm" onClick={() => setAssignModal(s)}>
                                <i className="fas fa-user-plus" /> Assign
                              </button>
                            )}

                            {s.assigned_staff && canAssign && (
                              <button className="ls-btn ls-btn-ghost ls-btn-sm" onClick={async () => {
                                if (!window.confirm('Remove assignment?')) return
                                await api.delete(`/students/${s.student_id}/remove-staff/`)
                                toast.success('Assignment removed'); load()
                              }}><i className="fas fa-user-times" /></button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Forms - only show for counselor */}
      {canAdd && showForm && <StudentForm item={editItem} courses={courses} counselorBranch={isCounselor ? user?.branch : null} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {canAssign && assignModal && (<AssignModal
        student={assignModal}
        counselorBranch={user?.branch}
        onClose={() => setAssignModal(null)}
        onSaved={() => { setAssignModal(null); load() }}
      />
      )}
      {/* // Replace your current Delete ConfirmModal with this: */}


      {canDelete && <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          const idToDelete = deleteId;
          setDeleteId(null);

          // Optimistically remove from UI immediately
          setData(prevData => prevData.filter(s => s.id !== idToDelete));
          toast.success('Student removed successfully');

          // Fire and forget - don't wait for response
          api.delete(`/students/${idToDelete}/`)
            .catch(err => {
              console.error('Delete error (ignored):', err);
              // Even on error, we already removed from UI
              // But reload to ensure consistency
              load();
            });

          // Reload in background to ensure data consistency
          setTimeout(() => load(), 1000);
        }}
        title="Remove Student"
        message="Remove this student? This cannot be undone."
        danger
      />}
    </div>
  )
}

function StudentForm({ item, courses, counselorBranch, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    student_id: item?.student_id || '',
    first_name: item?.first_name || '',
    last_name: item?.last_name || '',
    email: item?.email || '',
    mobile_no: item?.mobile_no || '',
    date_of_birth: item?.date_of_birth || '',
    city: item?.city || '',
    state: item?.state || '',
    qualification: item?.qualification || '',
    course: item?.course || '',
    gender: item?.gender || 'Male',
    branch: counselorBranch || item?.branch || '',
  })
  const [photo, setPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleBranchChange = async (branch) => {
    f('branch', branch)
    if (!isEdit && branch) {
      try { const r = await api.get(`/generate/student-id/?branch=${branch}`); f('student_id', r.data.student_id) } catch { }
    }
  }

  useEffect(() => {
    if (!isEdit && form.branch) {
      api.get(`/generate/student-id/?branch=${form.branch}`).then(r => f('student_id', r.data.student_id)).catch(() => { })
    }
  }, [])

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== undefined) fd.append(k, v) })
      if (photo) fd.append('photo', photo)
      if (isEdit) { await api.patch(`/students/${item.id}/`, fd); toast.success('Student updated!') }
      else { const r = await api.post('/students/create/', fd); toast.success(r.data.message || 'Student added!') }
      onSaved()
    } catch (err) {
      const d = err.response?.data || {}
      toast.error(d.error || d.detail || Object.values(d)[0]?.[0] || 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Student' : 'Add Student'}>
      <form onSubmit={save}>
        <div className="ls-row-grid-2">
          <div>
            <FG label="Student ID" required hint="Auto-generated based on branch">
              <Inp value={form.student_id} readOnly />
            </FG>
            <FG label="First Name" required><Inp value={form.first_name} onChange={e => f('first_name', e.target.value)} placeholder="First name" required /></FG>
            <FG label="Last Name"><Inp value={form.last_name} onChange={e => f('last_name', e.target.value)} placeholder="Last name" /></FG>
            <FG label="Email" required><Inp type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="email@example.com" required /></FG>
            <FG label="Mobile No" required><Inp type="tel" maxLength={10} value={form.mobile_no} onChange={e => f('mobile_no', e.target.value)} placeholder="10-digit number" required /></FG>
            <FG label="Date of Birth" required><Inp type="date" value={form.date_of_birth} onChange={e => f('date_of_birth', e.target.value)} required /></FG>
            <FG label="Photo" hint="Optional"><Inp type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} /></FG>
            {!isEdit && <div className="ls-alert-info"><i className="fas fa-info-circle" style={{ marginRight: 8 }} />Login: <strong>Username</strong> = Email · <strong>Password</strong> = Mobile</div>}
          </div>
          <div>
            <FG label="Qualification" required><Inp value={form.qualification} onChange={e => f('qualification', e.target.value)} placeholder="e.g. B.Sc Computer Science" required /></FG>
            <FG label="Course" required>
              <Sel value={form.course} onChange={e => f('course', e.target.value)} required>
                <option value="" disabled>Select Course</option>
                {courses && courses.length > 0 ? (
                  courses.map(c => (
                    <option key={c.id} value={c.course_name}>
                      {c.course_name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No courses available - please contact admin</option>
                )}
              </Sel>
              {courses.length === 0 && (
                <span className="ls-hint" style={{ color: T.rose, marginTop: 4, display: 'block' }}>
                  <i className="fas fa-exclamation-triangle" /> No courses found. Please add courses in Admin → Courses.
                </span>
              )}
            </FG>
            <FG label="Branch" required>
              {counselorBranch
                ? <><Inp value={counselorBranch} readOnly /><span className="ls-hint"><i className="fas fa-info-circle" style={{ marginRight: 4 }} />Restricted to your branch</span></>
                : <Sel value={form.branch} onChange={e => handleBranchChange(e.target.value)} required>
                  <option value="" disabled>Select Branch</option>
                  <option value="100ft">100 Feet</option>
                  <option value="hopes">Hopes</option>
                  <option value="kuniyamuthur">Kuniyamuthur</option>
                </Sel>}
            </FG>
            <FG label="Gender" required>
              <Sel value={form.gender} onChange={e => f('gender', e.target.value)} required>
                <option value="" disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Others">Others</option>
              </Sel>
            </FG>
            <FG label="City" required><Inp value={form.city} onChange={e => f('city', e.target.value)} placeholder="City" required /></FG>
            <FG label="State" required><Inp value={form.state} onChange={e => f('state', e.target.value)} placeholder="State" required /></FG>
          </div>
        </div>
        <hr className="ls-divider" />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button type="submit" className="ls-btn ls-btn-primary" disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-user-plus'}`} />
            {saving ? 'Saving...' : isEdit ? 'Update Student' : 'Add Student'}
          </button>
          <button type="button" className="ls-btn ls-btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}


function AssignModal({ student, counselorBranch, onClose, onSaved }) {
  const [emps, setEmps] = useState([])
  const [batches, setBatches] = useState([])
  const [staffId, setStaffId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // ✅ Filter employees by counselor's branch AND only trainers/mentors
    const url = counselorBranch
      ? `/employees/?branch=${counselorBranch}`
      : '/employees/'
    api.get(url).then(r => {
      const all = r.data.results || r.data || []
      // ✅ Extra safety: filter only trainer/mentor, exclude counselors
      const filtered = all.filter(e =>
        ['trainer', 'mentor'].includes(e.designation?.toLowerCase())
      )
      setEmps(filtered)
    })
  }, [counselorBranch])

  useEffect(() => {
    if (!staffId) {
      setBatches([])
      setBatchId('')
      return
    }
    setLoadingBatches(true)
    setBatchId('')
    api.get(`/trainer-batches/${staffId}/`)
      .then(r => {
        const data = r.data.results || r.data || []
        setBatches(data)
      })
      .catch(() => {
        api.get(`/batches/?faculty=${staffId}`)
          .then(res => setBatches(res.data.results || res.data || []))
          .catch(() => { })
      })
      .finally(() => setLoadingBatches(false))
  }, [staffId])

  return (
    <Modal open onClose={onClose} title={`Assign — ${student.first_name} ${student.last_name}`} size="md">

      {/* Branch info */}
      {counselorBranch && (
        <div className="ls-alert-info" style={{ marginBottom: 14 }}>
          <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
          Showing staff from <strong>{counselorBranch}</strong> branch only
        </div>
      )}

      <FG label="Select Trainer / Mentor">
        <Sel value={staffId} onChange={e => { setStaffId(e.target.value); setBatchId('') }}>
          <option value="">— Select Staff —</option>
          {emps.map(e => (
            <option key={e.id} value={e.id}>
              {e.first_name} {e.last_name || ''} — {e.designation} ({e.branch})
            </option>
          ))}
        </Sel>
      </FG>

      <FG label="Select Batch">
        {!staffId ? (
          <div className="ls-alert-info">
            <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
            Please select a staff member first to see their batches.
          </div>
        ) : loadingBatches ? (
          <div style={{ textAlign: 'center', padding: 12 }}>
            <i className="fas fa-spinner fa-spin" style={{ color: T.amber }} /> Loading batches...
          </div>
        ) : batches.length === 0 ? (
          <div className="ls-alert-warning">
            <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />
            This staff member has no batches assigned.
          </div>
        ) : (
          <Sel value={batchId} onChange={e => setBatchId(e.target.value)}>
            <option value="">— Select Batch —</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.batch_number} — {b.course_name_display || b.course_name} ({b.batch_timing})
              </option>
            ))}
          </Sel>
        )}
      </FG>

      <hr className="ls-divider" />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button
          className="ls-btn ls-btn-primary"
          disabled={saving || !staffId || !batchId}
          onClick={async () => {
            if (!staffId || !batchId) return toast.error('Select both staff and batch')
            setSaving(true)
            try {
              await api.post(`/students/${student.student_id}/assign-staff/`, {
                staff_id: staffId,
                batch_id: batchId,
              })
              toast.success('Assigned successfully!')
              onSaved()
            } catch (err) {
              toast.error(err.response?.data?.error || 'Assignment failed')
            } finally {
              setSaving(false)
            }
          }}
        >
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-user-check'}`} />
          {saving ? 'Assigning...' : 'Assign'}
        </button>
        <button className="ls-btn ls-btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// COURSES LIST
// ══════════════════════════════════════════════════════════════════════════════
export function CoursesList() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const typeVar = { software: 'info', cloud: 'teal', hardware: 'warning' }

  const load = () => { setLoading(true); api.get('/courses/').then(r => setData(r.data.results || r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  return (
    <div className="ls-root">
      <Styles />
      <PH title="📚 Courses" sub="Manage available courses"
        btn={<button className="ls-btn ls-btn-primary" onClick={() => { setEditItem(null); setShowForm(true) }}><i className="fas fa-plus" />Add Course</button>} />

      <div className="ls-card">
        <SH title="All Courses" count={data.length} />
        {loading ? <Spin /> : data.length === 0 ? <Empty msg="No courses found." /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ls-table">
              <thead><tr><th>#</th><th>Course Name</th><th>Type</th><th>Fee</th><th>Logsheet</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {data.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: T.slate, fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.course_name}</td>
                    <td><Badge text={c.course_type} variant={typeVar[c.course_type] || 'default'} /></td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: T.sage }}>
                      {c.fee ? `₹${Number(c.fee).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      {c.course_logsheet
                        ? <a href={c.course_logsheet} target="_blank" rel="noreferrer" className="ls-btn ls-btn-ghost ls-btn-sm"><i className="fas fa-file-pdf" /> View PDF</a>
                        : <span style={{ color: T.slateLight, fontSize: 12 }}>No file</span>}
                    </td>
                    <td style={{ fontSize: 12, color: T.slate }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="ls-btn ls-btn-ghost ls-btn-sm" onClick={() => { setEditItem(c); setShowForm(true) }}><i className="fas fa-edit" /></button>
                        <button className="ls-btn ls-btn-danger ls-btn-sm" onClick={() => setDeleteId(c.id)}><i className="fas fa-trash-alt" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <CourseForm item={editItem} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => {
        try { await api.delete(`/courses/${deleteId}/`); toast.success('Course deleted'); setDeleteId(null); load() }
        catch { toast.error('Cannot delete — may have linked batches') }
      }} title="Delete Course" message="Delete this course? This cannot be undone." danger />
    </div>
  )
}

// Replace your existing CourseForm with this updated version:

function CourseForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    course_name: item?.course_name || '',
    course_type: item?.course_type || '',
    fee: item?.fee || ''
  })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [courseTypes, setCourseTypes] = useState([])  // ← Add this
  const [loadingTypes, setLoadingTypes] = useState(false)  // ← Add this

  // ← Add this useEffect to fetch course types
  useEffect(() => {
    setLoadingTypes(true)
    api.get('/admin/course-types/')
      .then(r => {
        const types = r.data || []
        // Filter only active course types
        const activeTypes = types.filter(t => t.is_active)
        setCourseTypes(activeTypes)
      })
      .catch(err => {
        console.error('Failed to load course types:', err)
        toast.error('Could not load course types')
      })
      .finally(() => setLoadingTypes(false))
  }, [])

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const fd = new FormData()
      fd.append('course_name', form.course_name)
      if (form.course_type) fd.append('course_type', form.course_type)
      if (form.fee) fd.append('fee', form.fee)
      if (file) fd.append('course_logsheet', file)
      if (item) { await api.patch(`/courses/${item.id}/`, fd); toast.success('Course updated!') }
      else { await api.post('/courses/', fd); toast.success('Course added!') }
      onSaved()
    } catch (err) {
      const d = err.response?.data || {}
      toast.error(d.course_name?.[0] || d.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={item ? 'Edit Course' : 'Add Course'} size="sm">
      <form onSubmit={save}>
        <FG label="Course Name" required>
          <Inp value={form.course_name} onChange={e => setForm(p => ({ ...p, course_name: e.target.value }))} placeholder="e.g. Python Programming" required />
        </FG>

        {/* ── DYNAMIC COURSE TYPE DROPDOWN ── */}
        <FG label="Course Type" required>
          {loadingTypes ? (
            <div style={{ padding: '10px', textAlign: 'center' }}>
              <i className="fas fa-spinner fa-spin" /> Loading types...
            </div>
          ) : courseTypes.length === 0 ? (
            <div className="ls-alert-warning">
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />
              No active course types found. Please add them in Admin → Course Types first.
            </div>
          ) : (
            <Sel
              value={form.course_type}
              onChange={e => setForm(p => ({ ...p, course_type: e.target.value }))}
              required
            >
              <option value="" disabled>Select type</option>
              {courseTypes.map(type => (
                <option key={type.id} value={type.value}>
                  {type.name}
                </option>
              ))}
            </Sel>
          )}
          {courseTypes.length > 0 && (
            <span className="ls-hint">
              <i className="fas fa-info-circle" style={{ marginRight: 4 }} />
              Showing {courseTypes.length} active course type(s)
            </span>
          )}
        </FG>

        <FG label="Course Fee (₹)">
          <Inp
            type="number"
            value={form.fee}
            onChange={e => setForm(p => ({ ...p, fee: e.target.value }))}
            placeholder="e.g. 15000"
          />
        </FG>

        <FG label={`Logsheet PDF${!item ? ' *' : ''}`} hint="Only PDF, max 10MB">
          <Inp type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} required={!item} />
        </FG>

        <hr className="ls-divider" />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button type="submit" className="ls-btn ls-btn-primary" disabled={saving || loadingTypes}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
            {saving ? 'Saving...' : item ? 'Update Course' : 'Add Course'}
          </button>
          <button type="button" className="ls-btn ls-btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}

export function BatchesList({ staffView = false }) {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')

  // Determine user role
  const isAdmin = user?.user_type === 'admin'
  const isCounselor = user?.designation === 'counselor'

  // Permissions
  const showActions = !staffView && isCounselor
  const canAdd = !staffView && isCounselor

  const load = () => {
    setLoading(true);
    api.get('/batches/').then(r => {
      const batches = r.data.results || r.data || []
      // Transform the data to ensure we have the display fields
      const transformed = batches.map(batch => ({
        ...batch,
        // Map course_name to display string
        course_name_display: batch.course_name_display ||
          (batch.course_name?.title) ||
          batch.course_name?.name ||
          batch.course_name ||
          '—',
        // Map faculty to display name
        faculty_name: batch.faculty_name ||
          (batch.faculty?.first_name ? `${batch.faculty.first_name} ${batch.faculty.last_name || ''}`.trim() : null) ||
          batch.faculty?.username ||
          '—',
        // Ensure branch is available
        branch: batch.branch || '—'
      }))
      setData(transformed)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // Get unique branches for filter
  const branches = [...new Set(data.map(b => b.branch).filter(b => b && b !== '—'))]

  // Filter batches based on search and branch
  const filteredData = data.filter(batch => {
    const searchLower = search.toLowerCase()
    const matchesSearch = search === '' || (
      batch.batch_number?.toLowerCase().includes(searchLower) ||
      batch.course_name_display?.toLowerCase().includes(searchLower) ||
      batch.faculty_name?.toLowerCase().includes(searchLower) ||
      batch.branch?.toLowerCase().includes(searchLower) ||
      batch.batch_timing?.toLowerCase().includes(searchLower) ||
      batch.course_type?.toLowerCase().includes(searchLower)
    )
    const matchesBranch = !branchFilter || batch.branch === branchFilter
    return matchesSearch && matchesBranch
  })

  return (
    <div className="ls-root">
      <Styles />
      <PH title="👥 Batches" sub="Manage course batches"
        btn={canAdd && <button className="ls-btn ls-btn-primary" onClick={() => { setEditItem(null); setShowForm(true) }}><i className="fas fa-plus" />Create Batch</button>} />

      {/* Branch Filter */}
      {branches.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

          {branches.map(branch => (
            <button
              key={branch}
              className={`ls-btn ls-btn-sm ${branchFilter === branch ? 'ls-btn-primary' : 'ls-btn-ghost'}`}
              onClick={() => setBranchFilter(branch)}
            >
              {branch}
            </button>
          ))}
        </div>
      )}

      <div className="ls-card">
        <SH title="All Batches" count={filteredData.length} actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="ls-input"
              style={{ width: 200 }}
              placeholder="Search batches..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="ls-btn ls-btn-ghost ls-btn-icon" onClick={load} title="Refresh">
              <i className="fas fa-sync-alt" />
            </button>
          </div>
        } />
        {loading ? <Spin /> : filteredData.length === 0 ? (
          <div className="ls-empty">
            <div className="ls-empty-icon"><i className="fas fa-users" /></div>
            <p style={{ fontFamily: "'Playfair Display'", fontSize: 16, margin: '0 0 16px' }}>
              {search || branchFilter ? `No batches found matching your filters.` : "No batches found."}
            </p>
            {canAdd && <button className="ls-btn ls-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" />Create Batch</button>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ls-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Batch</th>
                  <th>Type</th>
                  <th>Course</th>
                  <th>Fee</th>          {/* ← ADD */}
                  <th>Faculty</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Timing</th>
                  <th>Branch</th>
                  <th>Logsheet</th>
                  {showActions && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((b, i) => (
                  <tr key={b.id}>
                    <td style={{ color: T.slate, fontSize: 12 }}>{i + 1}</td>
                    <td><Badge text={b.batch_number} variant="primary" /></td>
                    <td>{b.course_type ? <Badge text={b.course_type} variant="info" /> : '—'}</td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{b.course_name_display}</td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: T.sage }}>
                      {b.course_fee ? `₹${Number(b.course_fee).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ fontSize: 13 }}>{b.faculty_name}</td>
                    <td style={{ fontSize: 12 }}>{b.start_date}</td>
                    <td style={{ fontSize: 12 }}>{b.end_date}</td>
                    <td style={{ fontSize: 11, color: T.slate, maxWidth: 140 }}>{b.batch_timing}</td>
                    <td><Badge text={b.branch} variant="info" /></td>
                    <td style={{ textAlign: 'center' }}>
                      {b.course_logsheet
                        ? <a href={b.course_logsheet} target="_blank" rel="noreferrer" className="ls-btn ls-btn-danger ls-btn-sm"><i className="fas fa-file-pdf" /> View</a>
                        : <span style={{ color: T.slateLight, fontSize: 12 }}>—</span>}
                    </td>
                    {showActions && (
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                          <button
                            className="ls-btn ls-btn-ghost ls-btn-sm"
                            onClick={() => { setEditItem(b); setShowForm(true) }}
                            title="Edit Batch"
                          >
                            <i className="fas fa-edit" /> Edit
                          </button>
                          <button
                            className="ls-btn ls-btn-danger ls-btn-sm"
                            onClick={() => setDeleteId(b.id)}
                            title="Delete Batch"
                          >
                            <i className="fas fa-trash-alt" /> Remove
                          </button>
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

      {/* Batch Form */}
      {canAdd && showForm && (
        <BatchForm
          item={editItem}
          counselorBranch={isCounselor ? user?.branch : null}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}

      {/* Delete Confirmation */}
      {showActions && (
        <ConfirmModal
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={async () => {
            try {
              await api.delete(`/batches/${deleteId}/`);
              toast.success('Batch deleted');
              setDeleteId(null);
              load()
            } catch {
              toast.error('Delete failed')
            }
          }}
          title="Delete Batch"
          message="This will also delete all associated sessions and assignments. Cannot be undone!"
          danger
        />
      )}
    </div>
  )
}


function BatchForm({ item, counselorBranch, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    batch_number: item?.batch_number || '',
    course_type: item?.course_type || '',
    course_name: item?.course_name || '',
    faculty: item?.faculty || '',
    start_date: item?.start_date || '',
    end_date: item?.end_date || '',
    branch: counselorBranch || item?.branch || '',
    batch_timing: item?.batch_timing || '',
  })
  const [logsheetFile, setLogsheetFile] = useState(null)
  const [courses, setCourses] = useState([])
  const [emps, setEmps] = useState([])
  const [saving, setSaving] = useState(false)
  const [courseLogsheetUrl, setCourseLogsheetUrl] = useState(item?.course_logsheet || null)
  const [courseFee, setCourseFee] = useState(null)   // ← ADD THIS
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    api.get('/courses/').then(r => {
      const list = r.data.results || r.data
      setCourses(list)
      if (isEdit && item?.course_name) {
        const sel = list.find(c => String(c.id) === String(item.course_name))
        if (sel?.course_logsheet) setCourseLogsheetUrl(sel.course_logsheet)
        if (sel?.fee) setCourseFee(sel.fee)   // ← ADD THIS
      }
    })
    const url = counselorBranch ? `/employees/?branch=${counselorBranch}` : '/employees/'
    api.get(url).then(r => setEmps(r.data.results || r.data))
  }, [counselorBranch])

  const handleBranchChange = async (branch) => {
    f('branch', branch)
    if (!isEdit && branch) {
      try { const r = await api.get(`/generate/batch-number/?branch=${branch}`); f('batch_number', r.data.batch_number) } catch { }
    }
  }

  useEffect(() => {
    if (!isEdit && counselorBranch && !form.batch_number) {
      api.get(`/generate/batch-number/?branch=${counselorBranch}`).then(r => f('batch_number', r.data.batch_number)).catch(() => { })
    }
  }, [])

  const handleCourseChange = (courseId) => {
    f('course_name', courseId)
    const sel = courses.find(c => String(c.id) === String(courseId))
    setCourseLogsheetUrl(sel?.course_logsheet || null)
    setCourseFee(sel?.fee || null)   // ← ADD THIS
    setLogsheetFile(null)
  }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (logsheetFile) fd.append('course_logsheet', logsheetFile)
      if (isEdit) { await api.patch(`/batches/${item.id}/`, fd); toast.success('Batch updated!') }
      else { const r = await api.post('/batches/create/', fd); toast.success(r.data.message || 'Batch created!') }
      onSaved()
    } catch (err) {
      const d = err.response?.data || {}
      toast.error(d.error || d.detail || Object.values(d)[0]?.[0] || 'Save failed')
    } finally { setSaving(false) }
  }

  const timings = [
    'Morning (10:00 AM - 11:00 PM)',
    'Afternoon (11:00 PM - 12:00 PM)',
    'Afternoon (12:00 PM - 1:00 PM)',
    'Afternoon (1:00 PM - 2:00 PM)',
    'Evening (3:00 PM - 4:00 PM)',
    'Evening (4:00 PM - 5:00 PM)',
    'Evening (5:00 PM - 6:00 PM)',
    'Evening (6:00 PM - 7:00 PM)',
    'Saturday (10:00 AM - 2:00 PM)',
    'Saturday (3:00 PM - 5:00 PM)',
    'Sunday (10:00 AM - 2:00 PM)',
  ]

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Batch' : 'Create Batch'}>
      {counselorBranch && (
        <div className="ls-alert-info" style={{ marginBottom: 18 }}>
          <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
          Creating batch for <strong>{counselorBranch}</strong> branch
        </div>
      )}
      <form onSubmit={save}>
        <div className="ls-row-grid-2">
          <div>
            <FG label="Batch ID" required hint="Auto-generated based on branch">
              <div style={{ display: 'flex', gap: 8 }}>
                <Inp value={form.batch_number} readOnly onChange={e => f('batch_number', e.target.value)} placeholder="Auto-generated" required style={{ flex: 1 }} />
              </div>
            </FG>
            <FG label="Course Type" required>
              <Sel value={form.course_type} onChange={e => f('course_type', e.target.value)} required>
                <option value="" disabled>Select type</option>
                <option value="software">Software</option>
                <option value="cloud">Cloud</option>
                <option value="hardware">Hardware &amp; Networking</option>
              </Sel>
            </FG>
            <FG label="Course" required>
              <Sel value={form.course_name} onChange={e => handleCourseChange(e.target.value)} required>
                <option value="" disabled>Select course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
              </Sel>
            </FG>

            {/* ── Course Fee Display ─────────────────────────────────── */}
            {courseFee && (
              <div style={{
                background: '#fef5e4',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
                border: '1px solid rgba(244,169,64,0.3)'
              }}>
                <i className="fas fa-indian-rupee-sign" style={{ color: T.amber, fontSize: 16 }} />
                <div>
                  <div style={{ fontSize: 11, color: T.slate, fontWeight: 500 }}>COURSE FEE</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#8a5a00' }}>
                    ₹{Number(courseFee).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}
            {/* ─────────────────────────────────────────────────────────── */}

            {/* Logsheet */}
            <FG label="Course Logsheet">
              {courseLogsheetUrl && !logsheetFile ? (
                <div style={{ background: '#e8f8f0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <i className="fas fa-file-pdf" style={{ color: T.sage, fontSize: 16 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1a6b3e' }}>Logsheet loaded from course ✅</span>
                  <a href={courseLogsheetUrl} target="_blank" rel="noreferrer" className="ls-btn ls-btn-teal ls-btn-sm">View</a>
                </div>
              ) : logsheetFile ? (
                <div style={{ background: '#e4f2fd', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <i className="fas fa-file-pdf" style={{ color: '#1260a0', fontSize: 16 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1260a0' }}>{logsheetFile.name}</span>
                  <button type="button" className="ls-btn ls-btn-ghost ls-btn-sm" onClick={() => setLogsheetFile(null)}><i className="fas fa-times" /></button>
                </div>
              ) : null}
              {courseLogsheetUrl && !logsheetFile ? (
                <button type="button" className="ls-btn ls-btn-ghost ls-btn-sm" onClick={() => document.getElementById('ls-override').click()}>
                  <i className="fas fa-upload" /> Upload different PDF
                </button>
              ) : null}
              <input id="ls-override" type="file" accept=".pdf"
                style={{ display: courseLogsheetUrl && !logsheetFile ? 'none' : 'block', marginTop: 8 }}
                className="ls-input"
                onChange={e => { if (e.target.files[0]) setLogsheetFile(e.target.files[0]); e.target.value = '' }} />
            </FG>

            <FG label="Faculty" required>
              <Sel value={form.faculty} onChange={e => f('faculty', e.target.value)} required>
                <option value="" disabled>Select faculty</option>
                {emps.filter(e => ['trainer', 'mentor'].includes(e.designation)).map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.designation}</option>
                ))}
              </Sel>
              {counselorBranch && <span className="ls-hint">Showing faculty from {counselorBranch} branch only</span>}
            </FG>
          </div>

          <div>
            <FG label="Start Date" required><Inp type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} required /></FG>
            <FG label="End Date" required><Inp type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} required /></FG>
            <FG label="Branch" required>
              {counselorBranch
                ? <><Inp value={counselorBranch} readOnly /><span className="ls-hint">Restricted to your branch</span></>
                : <Sel value={form.branch} onChange={e => handleBranchChange(e.target.value)} required>
                  <option value="" disabled>Select branch</option>
                  <option value="100ft">100 Feet</option>
                  <option value="hopes">Hopes</option>
                  <option value="kuniyamuthur">Kuniyamuthur</option>
                </Sel>}
            </FG>
            <FG label="Batch Timing" required>
              <Sel value={form.batch_timing} onChange={e => f('batch_timing', e.target.value)} required>
                <option value="" disabled>Select timing</option>
                {timings.map(t => <option key={t} value={t}>{t}</option>)}
              </Sel>
            </FG>
          </div>
        </div>

        <hr className="ls-divider" />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button type="submit" className="ls-btn ls-btn-primary" disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
            {saving ? 'Saving...' : isEdit ? 'Update Batch' : 'Create Batch'}
          </button>
          <button type="button" className="ls-btn ls-btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// ADMIN COURSE TYPES — manage dynamic course types
// Route: /admin/course-types
// ══════════════════════════════════════════════════════════════════════════════
export function AdminCourseTypes() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/admin/course-types/')
      .then(r => setTypes(r.data || []))
      .catch(() => toast.error('Failed to load course types'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return toast.error('Enter a course type name')
    setSaving(true)
    try {
      await api.post('/admin/course-types/', { name: newName.trim() })
      toast.success(`"${newName}" added!`)
      setNewName('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add')
    } finally { setSaving(false) }
  }

  const handleToggle = async (ct) => {
    try {
      await api.patch(`/admin/course-types/${ct.id}/`, { is_active: !ct.is_active })
      toast.success(ct.is_active ? 'Deactivated' : 'Activated')
      load()
    } catch { toast.error('Failed to update') }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/course-types/${id}/`)
      toast.success('Deleted')
      setDeleteId(null)
      load()
    } catch { toast.error('Failed to delete') }
  }

  const active = types.filter(t => t.is_active)
  const inactive = types.filter(t => !t.is_active)

  return (
    <div className="ls-root">
      <Styles />
      <PH title="🏷️ Course Types" sub="Manage course types that appear in dropdowns" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Types', value: types.length, icon: 'fa-tags', bg: 'rgba(46,196,182,.1)', color: '#2ec4b6' },
          { label: 'Active', value: active.length, icon: 'fa-check-circle', bg: 'rgba(76,175,129,.1)', color: '#4caf81' },
          { label: 'Inactive', value: inactive.length, icon: 'fa-eye-slash', bg: 'rgba(244,169,64,.1)', color: '#f4a940' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 16, padding: 20,
            display: 'flex', alignItems: 'center', gap: 14,
            border: '1px solid rgba(15,27,45,0.08)', boxShadow: '0 4px 24px rgba(15,27,45,0.08)'
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: s.bg, color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
            }}>
              <i className={`fas ${s.icon}`} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#0f1b2d' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#8099b3' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Type */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid rgba(15,27,45,0.08)',
        boxShadow: '0 4px 24px rgba(15,27,45,0.08)', marginBottom: 24, overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid rgba(15,27,45,0.08)',
          fontFamily: "'Playfair Display'", fontSize: 17, fontWeight: 600
        }}>
          ➕ Add New Course Type
        </div>
        <form onSubmit={handleAdd} style={{ padding: '20px 22px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            className="ls-input"
            style={{ flex: 1, minWidth: 220 }}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Artificial Intelligence, Networking..."
          />
          <button type="submit" className="ls-btn ls-btn-primary" disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
            {saving ? 'Adding…' : 'Add Type'}
          </button>
        </form>
        <div style={{ padding: '0 22px 16px', fontSize: 12, color: '#8099b3' }}>
          <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
          The slug (value) is auto-generated from the name. It will appear in all "Course Type" dropdowns instantly.
        </div>
      </div>

      {/* Types Table */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid rgba(15,27,45,0.08)',
        boxShadow: '0 4px 24px rgba(15,27,45,0.08)', overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid rgba(15,27,45,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontFamily: "'Playfair Display'", fontSize: 17, fontWeight: 600 }}>
            All Course Types <span style={{ color: '#8099b3', fontWeight: 400, fontSize: 14 }}>({types.length})</span>
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="ls-spin" />
          </div>
        ) : types.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#8099b3' }}>
            <i className="fas fa-tags" style={{ fontSize: 48, opacity: 0.2, display: 'block', marginBottom: 16 }} />
            No course types yet. Add one above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ls-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Name</th>
                  <th>Slug / Value</th>
                  <th>Created</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map((ct, idx) => (
                  <tr key={ct.id}>
                    <td style={{ color: '#8099b3', fontSize: 12 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, fontSize: 14 }}>{ct.name}</td>
                    <td>
                      <code style={{
                        background: '#f0f3f7', padding: '3px 8px', borderRadius: 6,
                        fontSize: 12, color: '#1a2e4a'
                      }}>{ct.value}</code>
                    </td>
                    <td style={{ fontSize: 12, color: '#8099b3' }}>
                      {ct.created_at ? new Date(ct.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <span style={{
                        background: ct.is_active ? '#e8f8f0' : '#f0f3f7',
                        color: ct.is_active ? '#4caf81' : '#8099b3',
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600
                      }}>
                        {ct.is_active ? '✓ Active' : '⏸ Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="ls-btn ls-btn-sm"
                          onClick={() => handleToggle(ct)}
                          style={{
                            background: ct.is_active ? '#fef5e4' : '#e8f8f0',
                            color: ct.is_active ? '#f4a940' : '#4caf81',
                            border: 'none', padding: '5px 10px'
                          }}
                          title={ct.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <i className={`fas ${ct.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                          {ct.is_active ? ' On' : ' Off'}
                        </button>
                        <button
                          className="ls-btn ls-btn-sm ls-btn-danger"
                          onClick={() => setDeleteId(ct.id)}
                          title="Delete"
                        >
                          <i className="fas fa-trash-alt" />
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

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
          onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%',
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#fdeaec',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 28, color: '#e84855'
            }}>
              <i className="fas fa-exclamation-triangle" />
            </div>
            <h5 style={{ margin: '0 0 8px', fontFamily: "'Playfair Display'" }}>Delete Course Type?</h5>
            <p style={{ color: '#8099b3', fontSize: 13, margin: '0 0 24px' }}>
              This cannot be undone. Existing courses with this type won't be affected.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="ls-btn ls-btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="ls-btn ls-btn-danger" onClick={() => handleDelete(deleteId)}>
                <i className="fas fa-trash-alt" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
