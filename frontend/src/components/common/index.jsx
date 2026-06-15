import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'

export function Spinner() {
  return <div className="spinner" />
}

export function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="empty-state">
      {Icon && <Icon />}
      <h4>{title || 'No data found'}</h4>
      {desc && <p style={{ marginTop: 6, fontSize: 13 }}>{desc}</p>}
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    pending: 'warning', approved: 'success', rejected: 'danger',
    active: 'success', inactive: 'secondary', completed: 'info',
    Present: 'success', Absent: 'danger', Late: 'warning',
    in_progress: 'info', resolved: 'success',
    published: 'success', draft: 'secondary',
    passed: 'success', failed: 'danger',
    Pending: 'warning', Approved: 'success', Rejected: 'danger',
  }
  const cls = map[status] || 'secondary'
  return <span className={`badge badge-${cls}`}>{status}</span>
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search-box">
      <Search />
      <input className="form-control" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function Modal({ open, onClose, title, children, maxWidth = 560 }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose}><X size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title = 'Confirm', message, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  )
}

export function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', justifyContent: 'flex-end' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <button className="btn-icon btn" onClick={() => onChange(page - 1)} disabled={page === 1}><ChevronLeft size={15} /></button>
      <button className="btn-icon btn" onClick={() => onChange(page + 1)} disabled={page >= totalPages}><ChevronRight size={15} /></button>
    </div>
  )
}

export function FormField({ label, required, children, error }) {
  return (
    <div className="form-group">
      {label && <label>{label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}</label>}
      {children}
      {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
    </div>
  )
}
