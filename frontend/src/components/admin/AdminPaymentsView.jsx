import React, { useCallback, useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Check, Copy, X } from 'lucide-react'
import {
  adminVerifyDeposit,
  adminVerifyWithdrawal,
  fetchAdminDeposits,
  fetchAdminWithdrawals,
} from '../../api/client.js'

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function date(value) {
  return value ? new Date(value).toLocaleString('en-IN') : '—'
}

export default function AdminPaymentsView({ adminKey, refreshToken }) {
  const [kind, setKind] = useState('deposits')
  const [status, setStatus] = useState('PENDING')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(kind === 'deposits'
        ? await fetchAdminDeposits(adminKey, status)
        : await fetchAdminWithdrawals(adminKey, status))
    } catch (err) {
      setError(err.message || 'Failed to load payment queue')
    } finally {
      setLoading(false)
    }
  }, [adminKey, kind, status, refreshToken])

  useEffect(() => { load() }, [load])

  const review = async (item, action) => {
    const label = action === 'APPROVE' ? 'approve' : 'reject'
    const notes = window.prompt(`Optional note for this ${label} action:`) || ''
    if (!window.confirm(`Confirm ${label} of ${money(item.amount)}?`)) return
    setBusyId(item.id)
    try {
      if (kind === 'deposits') await adminVerifyDeposit(adminKey, item.id, action, notes)
      else await adminVerifyWithdrawal(adminKey, item.id, action, notes)
      await load()
    } catch (err) {
      setError(err.message || `Failed to ${label} payment`)
    } finally {
      setBusyId(null)
    }
  }

  const copy = async (value) => {
    if (value) await navigator.clipboard?.writeText(String(value))
  }

  return (
    <div className="admin-subpage-container">
      <div className="admin-payments-toolbar">
        <div className="admin-filter-tabs">
          <button className={`admin-filter-pill ${kind === 'deposits' ? 'active' : ''}`} onClick={() => setKind('deposits')}>
            <ArrowDownToLine size={14} /> Deposits / UTR
          </button>
          <button className={`admin-filter-pill ${kind === 'withdrawals' ? 'active' : ''}`} onClick={() => setKind('withdrawals')}>
            <ArrowUpFromLine size={14} /> Withdrawals
          </button>
        </div>
        <select className="admin-payment-select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="PENDING">Pending queue</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All records</option>
        </select>
        <button className="admin-btn-secondary" onClick={load} disabled={loading}>Refresh</button>
      </div>
      <p className="admin-risk-disclaimer">
        {kind === 'deposits'
          ? 'Verify UTR, amount, date and merchant bank statement before approving. A submitted UTR alone is not payment proof.'
          : 'Approve only after the bank transfer is completed. Rejecting a pending withdrawal refunds the reserved wallet amount.'}
      </p>
      {error && <div className="admin-payment-error">{error}</div>}
      {loading ? <div className="admin-empty-box">Loading payment queue…</div> : items.length === 0 ? (
        <div className="admin-empty-box">No {status.toLowerCase()} {kind}.</div>
      ) : (
        <div className="admin-payments-list">
          {items.map((item) => {
            const detail = kind === 'deposits' ? item.utr_number : item.payout_details?.upiId || item.payout_details?.accountNumber
            return (
              <article className="admin-payment-card" key={item.id}>
                <div className="admin-payment-main">
                  <div>
                    <strong>{money(item.amount)}</strong>
                    <span className="admin-payment-status">{item.status}</span>
                  </div>
                  <small>{date(item.created_at)}</small>
                </div>
                <div className="admin-payment-meta">
                  <span>User: <code>{item.user_id}</code></span>
                  <span>{kind === 'deposits' ? `Order: ${item.order_ref || '—'}` : `Method: ${item.payout_method || '—'}`}</span>
                  <span>{kind === 'deposits' ? 'UTR' : 'Payout'}: <code>{detail || 'Not provided'}</code>{detail && <button className="admin-copy-btn" onClick={() => copy(detail)} title="Copy"><Copy size={13} /></button>}</span>
                </div>
                {item.status === 'PENDING' && (
                  <div className="admin-payment-actions">
                    <button className="admin-action-btn approve" disabled={busyId === item.id} onClick={() => review(item, 'APPROVE')}><Check size={14} /> Approve</button>
                    <button className="admin-action-btn reject" disabled={busyId === item.id} onClick={() => review(item, 'REJECT')}><X size={14} /> Reject</button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
