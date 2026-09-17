import React from 'react'
import { ArrowUpRight, ArrowDownRight, X } from 'lucide-react'

export function AdminBalanceModal({
  user,
  onClose,
  adjustAmount,
  setAdjustAmount,
  adjustAction,
  setAdjustAction,
  adjustReason,
  setAdjustReason,
  adjustLoading,
  onConfirm,
}) {
  if (!user) return null

  const quickAmounts = [100, 500, 1000, 2000, 5000]

  return (
    <div className="admin-sub-modal-backdrop" onClick={onClose}>
      <div className="admin-sub-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4>Adjust Balance: {user.username}</h4>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <p className="sub-modal-user-pill">
          Current Balance: <strong>₹{Number(user.balance || 0).toFixed(2)}</strong>
        </p>

        {/* Credit vs Debit Action Toggle */}
        <div className="adjust-type-toggle">
          <button
            type="button"
            className={`adjust-type-btn ${adjustAction === 'credit' ? 'active credit' : ''}`}
            onClick={() => setAdjustAction('credit')}
          >
            <ArrowUpRight size={16} />
            <span>Credit (+)</span>
          </button>
          <button
            type="button"
            className={`adjust-type-btn ${adjustAction === 'debit' ? 'active debit' : ''}`}
            onClick={() => setAdjustAction('debit')}
          >
            <ArrowDownRight size={16} />
            <span>Debit (-)</span>
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
            Amount (₹)
          </label>
          <input
            type="number"
            className="verify-text-input"
            style={{ padding: '0 12px' }}
            placeholder="Enter amount..."
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
          />
        </div>

        {/* Quick Amount Chips */}
        <div className="quick-chip-row">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              className="amount-chip"
              onClick={() => setAdjustAmount(String(amt))}
            >
              +₹{amt}
            </button>
          ))}
        </div>

        {/* Reason / Audit Note */}
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
            Audit Reason
          </label>
          <input
            type="text"
            className="verify-text-input"
            style={{ padding: '0 12px' }}
            placeholder="e.g. Deposit reconciliation, reward..."
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />
        </div>

        {/* Modal Actions */}
        <div className="sub-modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-modal-confirm"
            onClick={onConfirm}
            disabled={adjustLoading || !adjustAmount || Number(adjustAmount) <= 0}
          >
            {adjustLoading ? 'Updating...' : `Confirm ${adjustAction.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminBalanceModal
