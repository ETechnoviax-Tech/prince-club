import React, { useState, useEffect } from 'react'
import {
  X,
  CreditCard,
  Building2,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowDownCircle,
  History,
} from 'lucide-react'
import { requestWithdrawal, fetchUserWithdrawals } from '../api/client'

export default function WithdrawModal({ isOpen, onClose, user, walletBalance, onWithdrawSuccess }) {
  const [method, setMethod] = useState('UPI') // 'UPI' | 'BANK'
  const [amount, setAmount] = useState('500')
  const [upiId, setUpiId] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [confirmAccNumber, setConfirmAccNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [holderName, setHolderName] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [historyList, setHistoryList] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  const quickAmounts = [100, 300, 500, 1000, 2000, 5000]

  useEffect(() => {
    if (isOpen && user?.id) {
      loadHistory()
      setError('')
      setSuccessMsg('')
    }
  }, [isOpen, user?.id])

  async function loadHistory() {
    try {
      if (!user?.id) return
      const res = await fetchUserWithdrawals(user.id)
      if (res.withdrawals) {
        setHistoryList(res.withdrawals)
      }
    } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    const numAmount = Number(amount)
    if (!numAmount || numAmount < 100) {
      setError('Minimum withdrawal amount is ₹100')
      return
    }

    if (numAmount > walletBalance) {
      setError(`Insufficient balance. Available: ₹${walletBalance}`)
      return
    }

    let payload = { amount: numAmount, payoutMethod: method }

    if (method === 'UPI') {
      if (!upiId.trim() || !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
        setError('Please enter a valid UPI ID (e.g. yourname@okhdfcbank)')
        return
      }
      payload.upiId = upiId.trim()
    } else {
      if (!accountNumber.trim() || !/^\d{9,18}$/.test(accountNumber.trim())) {
        setError('Bank Account Number must be 9-18 digits')
        return
      }
      if (accountNumber.trim() !== confirmAccNumber.trim()) {
        setError('Account numbers do not match')
        return
      }
      if (!ifsc.trim() || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())) {
        setError('Valid 11-character Indian Bank IFSC is required (e.g. SBIN0001234)')
        return
      }
      if (!holderName.trim() || holderName.trim().length < 2) {
        setError('Please enter Account Holder Name')
        return
      }
      payload.bankDetails = {
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        holderName: holderName.trim(),
      }
    }

    setLoading(true)
    try {
      const res = await requestWithdrawal(user.id, payload)
      setSuccessMsg(res.message || 'Withdrawal request placed successfully!')
      if (onWithdrawSuccess) {
        onWithdrawSuccess(res.newBalance)
      }
      loadHistory()
    } catch (err) {
      setError(err.message || 'Failed to submit withdrawal request')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container withdraw-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <ArrowDownCircle className="text-amber" size={22} />
            <h2>Withdraw Funds</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Balance Card */}
        <div className="withdraw-balance-banner">
          <div>
            <span className="balance-label">Withdrawable Cash Balance</span>
            <div className="balance-amount-lg">₹{Number(walletBalance || 0).toLocaleString('en-IN')}</div>
          </div>
          <button
            type="button"
            className="history-toggle-btn"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History size={16} />
            {showHistory ? 'Request' : 'History'}
          </button>
        </div>

        {/* History View */}
        {showHistory ? (
          <div className="withdraw-history-pane">
            <h4 className="section-title">Recent Payout Requests</h4>
            {historyList.length === 0 ? (
              <div className="empty-history-msg">No withdrawal requests found.</div>
            ) : (
              <div className="withdraw-history-list">
                {historyList.map((item) => (
                  <div key={item.id} className="history-item-card">
                    <div className="history-item-top">
                      <span className="history-amount">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                      <span className={`status-badge status-${item.status?.toLowerCase()}`}>
                        {item.status === 'APPROVED' && <CheckCircle2 size={12} />}
                        {item.status === 'PENDING' && <Clock size={12} />}
                        {item.status === 'REJECTED' && <XCircle size={12} />}
                        {item.status}
                      </span>
                    </div>
                    <div className="history-item-sub">
                      <span>Method: {item.payout_method}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="withdraw-form">
            {error && (
              <div className="alert-banner alert-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert-banner alert-success">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Payout Method Selector */}
            <div className="method-selector">
              <button
                type="button"
                className={`method-btn ${method === 'UPI' ? 'active' : ''}`}
                onClick={() => setMethod('UPI')}
              >
                <Zap size={16} />
                <span>Instant UPI</span>
              </button>
              <button
                type="button"
                className={`method-btn ${method === 'BANK' ? 'active' : ''}`}
                onClick={() => setMethod('BANK')}
              >
                <Building2 size={16} />
                <span>Bank Account</span>
              </button>
            </div>

            {/* Method Fields */}
            {method === 'UPI' ? (
              <div className="form-group">
                <label>UPI ID (VPA)</label>
                <div className="input-with-icon">
                  <Zap size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="e.g. mobile@upi or name@okaxis"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                  />
                </div>
                <small className="field-hint">Funds will be credited directly to your UPI ID.</small>
              </div>
            ) : (
              <div className="bank-fields-grid">
                <div className="form-group">
                  <label>Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="Name as per bank records"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Bank Account Number</label>
                  <input
                    type="text"
                    placeholder="9-18 digit account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Account Number</label>
                  <input
                    type="password"
                    placeholder="Re-enter account number"
                    value={confirmAccNumber}
                    onChange={(e) => setConfirmAccNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0001234"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    maxLength={11}
                    required
                  />
                </div>
              </div>
            )}

            {/* Amount Selection */}
            <div className="form-group">
              <label>Withdrawal Amount (₹)</label>
              <div className="amount-chips-grid">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className={`amount-chip ${amount === String(q) ? 'active' : ''}`}
                    onClick={() => setAmount(String(q))}
                  >
                    ₹{q}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="100"
                max="100000"
                step="1"
                className="amount-input-custom"
                placeholder="Enter custom amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <small className="field-hint">Min: ₹100 | Max: ₹100,000 per request. 0% Fee.</small>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="submit-withdraw-btn"
              disabled={loading || Number(amount) > walletBalance}
            >
              {loading ? (
                <span>Submitting Request...</span>
              ) : (
                <span>Request Payout of ₹{Number(amount || 0).toLocaleString('en-IN')}</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
