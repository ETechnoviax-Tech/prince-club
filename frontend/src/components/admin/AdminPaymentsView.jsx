import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Landmark,
  Phone,
  RotateCcw,
  Smartphone,
  X,
} from 'lucide-react'
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
  const [copiedKey, setCopiedKey] = useState(null)
  const noteRef = useRef(null)

  const isBusy = busyId === item.id

  const userMobile =
    item.user_phone ||
    (/^\d{10}$/.test(item.username) ? item.username : null) ||
    item.username ||
    item.user_id?.slice(0, 10)

  const targetUpi =
    item.target_upi ||
    item.payout_details?.upiId ||
    item.payout_details?.upi_id ||
    item.payout_details?.upi ||
    (item.payout_method === 'UPI' ? item.payout_details?.accountNumber : null)

  const depositUpi = item.upi_id || item.upi_vpa || '—'

  const acNum = item.account_number || item.payout_details?.accountNumber
  const ifscCode = item.ifsc || item.payout_details?.ifsc
  const holderName = item.holder_name || item.payout_details?.holderName

  async function copy(value, key) {
    if (!value || value === '—') return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(value))
      } else {
        const el = document.createElement('textarea')
        el.value = String(value)
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1800)
    } catch (_) {}
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
          <span className="admin-method-badge">
            {kind === 'deposits' ? 'Deposit / QR' : item.payout_method || 'UPI Payout'}
          </span>
        </div>
        <button
          className="admin-expand-btn"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Collapse' : 'Expand details'}
        >
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* User Information Strip */}
      <div className="admin-user-identity-strip">
        <span className="user-mob-badge" title="Registered User Mobile Number">
          <Phone size={13} className="mob-icon" />
          <span className="mob-label">Mobile:</span>
          <strong className="mob-val">{userMobile || '—'}</strong>
          {userMobile && userMobile !== '—' && (
            <button
              className={`admin-copy-mini-btn ${copiedKey === `mob_${item.id}` ? 'copied' : ''}`}
              onClick={() => copy(userMobile, `mob_${item.id}`)}
              title="Copy Mobile Number"
            >
              {copiedKey === `mob_${item.id}` ? <Check size={11} /> : <Copy size={11} />}
            </button>
          )}
        </span>
        <span className="user-uid-pill" title="User ID">
          UID: <code>{item.user_id?.slice(0, 10)}…</code>
        </span>
        <small className="admin-payment-date">{date(item.created_at)}</small>
      </div>

      {/* TARGET DESTINATION BOX FOR WITHDRAWALS: "Kis UPI mein withdrawal karna hai" */}
      {kind === 'withdrawals' && (
        <div className="admin-payout-target-box">
          <div className="payout-box-header">
            <Smartphone size={15} className="payout-header-icon" />
            <span className="payout-box-title">SEND WITHDRAWAL TO (TARGET UPI / ACCOUNT):</span>
          </div>

          {item.payout_method === 'UPI' || targetUpi ? (
            <div className="target-upi-row">
              <div className="target-upi-val-box">
                <span className="upi-field-tag">DESTINATION UPI ID</span>
                <code className="target-upi-val">{targetUpi || 'UPI Not Provided'}</code>
              </div>
              {targetUpi && (
                <button
                  className={`admin-copy-pill-btn ${copiedKey === `upi_${item.id}` ? 'copied' : ''}`}
                  onClick={() => copy(targetUpi, `upi_${item.id}`)}
                  title="Copy Target UPI ID"
                >
                  {copiedKey === `upi_${item.id}` ? (
                    <>
                      <Check size={13} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copy UPI ID
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="target-bank-grid">
              <div className="target-bank-item">
                <span className="bank-sub-label">A/C Number:</span>
                <code>{acNum || '—'}</code>
                {acNum && (
                  <button
                    className={`admin-copy-mini-btn ${copiedKey === `ac_${item.id}` ? 'copied' : ''}`}
                    onClick={() => copy(acNum, `ac_${item.id}`)}
                    title="Copy Account Number"
                  >
                    {copiedKey === `ac_${item.id}` ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                )}
              </div>
              <div className="target-bank-item">
                <span className="bank-sub-label">IFSC Code:</span>
                <code>{ifscCode || '—'}</code>
                {ifscCode && (
                  <button
                    className={`admin-copy-mini-btn ${copiedKey === `ifsc_${item.id}` ? 'copied' : ''}`}
                    onClick={() => copy(ifscCode, `ifsc_${item.id}`)}
                    title="Copy IFSC Code"
                  >
                    {copiedKey === `ifsc_${item.id}` ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                )}
              </div>
              <div className="target-bank-item">
                <span className="bank-sub-label">Holder Name:</span>
                <strong>{holderName || '—'}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TARGET / VERIFICATION BOX FOR DEPOSITS: User Mobile, Deposit UPI, and UTR */}
      {kind === 'deposits' && (
        <div className="admin-deposit-target-box">
          <div className="deposit-row-item">
            <span className="deposit-field-tag">DEPOSIT RECEIVER UPI (VPA)</span>
            <code className="deposit-val">{depositUpi}</code>
            {depositUpi && (
              <button
                className={`admin-copy-mini-btn ${copiedKey === `dep_upi_${item.id}` ? 'copied' : ''}`}
                onClick={() => copy(depositUpi, `dep_upi_${item.id}`)}
                title="Copy Deposit UPI"
              >
                {copiedKey === `dep_upi_${item.id}` ? <Check size={11} /> : <Copy size={11} />}
              </button>
            )}
          </div>
          <div className="deposit-row-item highlight-utr-item">
            <span className="deposit-field-tag">SUBMITTED UTR NUMBER</span>
            <code className="utr-code-val">{item.utr_number || 'Not Submitted'}</code>
            {item.utr_number && (
              <button
                className={`admin-copy-pill-btn utr-copy-btn ${copiedKey === `utr_${item.id}` ? 'copied' : ''}`}
                onClick={() => copy(item.utr_number, `utr_${item.id}`)}
                title="Copy UTR Number"
              >
                {copiedKey === `utr_${item.id}` ? (
                  <>
                    <Check size={12} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy UTR
                  </>
                )}
              </button>
            )}
          </div>
          {item.order_ref && (
            <div className="deposit-row-item">
              <span className="deposit-field-tag">ORDER REF</span>
              <code>{item.order_ref}</code>
            </div>
          )}
        </div>
      )}

      {/* Expandable detail panel */}
      {expanded && (
        <div className="admin-payment-detail-panel">
          {kind === 'withdrawals' && item.payout_details && Object.keys(item.payout_details).length > 0 && (
            <div className="admin-payout-details">
              {Object.entries(item.payout_details).map(([k, v]) => (
                <div key={k} className="admin-detail-row">
                  <span className="admin-detail-key">{k}:</span>
                  <code>{String(v)}</code>
                  <button className="admin-copy-btn" onClick={() => copy(String(v), `det_${k}_${item.id}`)} title="Copy">
                    {copiedKey === `det_${k}_${item.id}` ? <Check size={11} /> : <Copy size={11} />}
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
                placeholder="Optional note (e.g. UTR verified, payout transferred)"
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
