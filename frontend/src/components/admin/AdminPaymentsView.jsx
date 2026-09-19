import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Check, ChevronDown, ChevronUp, Copy, RotateCcw, X } from 'lucide-react'
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

function PaymentCard({ item, kind, onAction, busyId }) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // 'APPROVE' | 'REJECT' | null
  const noteRef = useRef(null)

  const isBusy = busyId === item.id
  const payoutTarget =
    kind === 'deposits'
      ? item.utr_number
      : item.payout_details?.upiId ||
        item.payout_details?.accountNumber ||
        item.payout_details?.ifsc ||
        '—'

  async function copy(value) {
    if (value && value !== '—') await navigator.clipboard?.writeText(String(value))
  }

  function startAction(action) {
    setConfirmAction(action)
    setNote('')
    setExpanded(true)
    setTimeout(() => noteRef.current?.focus(), 50)
  }

  function cancelAction() {
    setConfirmAction(null)
    setNote('')
  }

  async function submitAction() {
    await onAction(item, confirmAction, note.trim())
    setConfirmAction(null)
    setNote('')
  }

  return (
    <article className="admin-payment-card" key={item.id}>
      <div className="admin-payment-main">
        <div>
          <strong>{money(item.amount)}</strong>
          <span className={`admin-payment-status status-${item.status?.toLowerCase()}`}>{item.status}</span>
        </div>
        <button
          className="admin-expand-btn"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Collapse' : 'Expand details'}
        >
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      <div className="admin-payment-meta">
        <span>
          User: <code>{item.user_id?.slice(0, 16)}…</code>
        </span>
        <span>
          {kind === 'deposits' ? `Order: ${item.order_ref || '—'}` : `Method: ${item.payout_method || '—'}`}
        </span>
        <span>
          {kind === 'deposits' ? 'UTR' : 'Payout'}:{' '}
          <code>{payoutTarget || 'Not provided'}</code>
          {payoutTarget && payoutTarget !== '—' && (
            <button className="admin-copy-btn" onClick={() => copy(payoutTarget)} title="Copy">
              <Copy size={13} />
            </button>
          )}
        </span>
        <small className="admin-payment-date">{date(item.created_at)}</small>
      </div>

      {/* Expandable detail panel */}
      {expanded && (
        <div className="admin-payment-detail-panel">
          {kind === 'withdrawals' && item.payout_details && Object.keys(item.payout_details).length > 0 && (
            <div className="admin-payout-details">
              {Object.entries(item.payout_details).map(([k, v]) => (
                <div key={k} className="admin-detail-row">
                  <span className="admin-detail-key">{k}:</span>
                  <code>{String(v)}</code>
                  <button className="admin-copy-btn" onClick={() => copy(String(v))} title="Copy">
                    <Copy size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {item.admin_notes && (
            <div className="admin-detail-row">
              <span className="admin-detail-key">Note:</span>
              <span>{item.admin_notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Inline Approve / Reject actions */}
      {item.status === 'PENDING' && (
        <div className="admin-payment-actions">
          {confirmAction ? (
            <div className="admin-confirm-panel">
              <p className="admin-confirm-label">
                {confirmAction === 'APPROVE' ? '✅ Confirm approval of' : '❌ Confirm rejection of'}{' '}
                <strong>{money(item.amount)}</strong>?
              </p>
              <textarea
                ref={noteRef}
                className="admin-note-input"
                placeholder="Optional note (e.g. UTR verified, date matched)"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
              />
              <div className="admin-confirm-btns">
                <button
                  className={`admin-action-btn ${confirmAction === 'APPROVE' ? 'approve' : 'reject'}`}
                  disabled={isBusy}
                  onClick={submitAction}
                >
                  {isBusy ? 'Processing…' : confirmAction === 'APPROVE' ? 'Yes, Approve' : 'Yes, Reject'}
                </button>
                <button className="admin-action-btn cancel" onClick={cancelAction}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                className="admin-action-btn approve"
                disabled={isBusy}
                onClick={() => startAction('APPROVE')}
              >
                <Check size={14} /> Approve
              </button>
              <button
                className="admin-action-btn reject"
                disabled={isBusy}
                onClick={() => startAction('REJECT')}
              >
                <X size={14} /> Reject
              </button>
            </>
          )}
        </div>
      )}
    </article>
  )
}

export default function AdminPaymentsView({ refreshToken }) {
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
      setItems(
        kind === 'deposits'
          ? await fetchAdminDeposits(status)
          : await fetchAdminWithdrawals(status)
      )
    } catch (err) {
      setError(err.message || 'Failed to load payment queue')
    } finally {
      setLoading(false)
    }
  }, [kind, status, refreshToken])

  useEffect(() => { load() }, [load])

  const handleAction = async (item, action, notes) => {
    setBusyId(item.id)
    try {
      if (kind === 'deposits') await adminVerifyDeposit(item.id, action, notes)
      else await adminVerifyWithdrawal(item.id, action, notes)
      await load()
    } catch (err) {
      setError(err.message || `Failed to ${action.toLowerCase()} payment`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-subpage-container">
      <div className="admin-payments-toolbar">
        <div className="admin-filter-tabs">
          <button
            className={`admin-filter-pill ${kind === 'deposits' ? 'active' : ''}`}
            onClick={() => setKind('deposits')}
          >
            <ArrowDownToLine size={14} /> Deposits / UTR
          </button>
          <button
            className={`admin-filter-pill ${kind === 'withdrawals' ? 'active' : ''}`}
            onClick={() => setKind('withdrawals')}
          >
            <ArrowUpFromLine size={14} /> Withdrawals
          </button>
        </div>
        <select
          className="admin-payment-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="PENDING">Pending queue</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All records</option>
        </select>
        <button className="admin-btn-secondary" onClick={load} disabled={loading}>
          <RotateCcw size={14} /> Refresh
        </button>
      </div>

      <p className="admin-risk-disclaimer">
        {kind === 'deposits'
          ? 'Verify UTR, amount, and date against your merchant bank statement before approving. A submitted UTR alone is not payment proof.'
          : 'Approve only after the bank/UPI transfer is completed. Rejecting a pending withdrawal automatically refunds the reserved amount to the user wallet.'}
      </p>

      {error && <div className="admin-payment-error">{error}</div>}

      {loading ? (
        <div className="admin-empty-box">Loading payment queue…</div>
      ) : items.length === 0 ? (
        <div className="admin-empty-box">
          No {status.toLowerCase()} {kind}.
        </div>
      ) : (
        <div className="admin-payments-list">
          {items.map((item) => (
            <PaymentCard
              key={item.id}
              item={item}
              kind={kind}
              onAction={handleAction}
              busyId={busyId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
