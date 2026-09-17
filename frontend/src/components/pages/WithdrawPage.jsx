import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  ShieldCheck,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { requestWithdrawal, fetchUserWithdrawals } from '../../api/client'

const PRESET_WITHDRAWALS = [100, 300, 500, 1000, 2000, 5000]

export default function WithdrawPage({
  currentUser,
  balance,
  onBack,
  onWithdrawSuccess,
  onOpenHistory,
}) {
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

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserWithdrawals(currentUser.id)
        .then((res) => {
          if (res.withdrawals) setHistoryList(res.withdrawals)
        })
        .catch(() => {})
    }
  }, [currentUser?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    const numAmount = Number(amount)
    if (!numAmount || numAmount < 100) {
      setError('Minimum withdrawal amount is ₹100')
      return
    }

    if (numAmount > balance) {
      setError('Insufficient wallet balance')
      return
    }

    if (method === 'UPI') {
      if (!upiId || !upiId.includes('@')) {
        setError('Please enter a valid UPI VPA (e.g. mobile@paytm or user@oksbi)')
        return
      }
    } else {
      if (!accountNumber || accountNumber.length < 8) {
        setError('Please enter a valid bank account number')
        return
      }
      if (accountNumber !== confirmAccNumber) {
        setError('Account numbers do not match')
        return
      }
      if (!ifsc || ifsc.length < 4) {
        setError('Please enter a valid bank IFSC code')
        return
      }
      if (!holderName || holderName.trim().length < 2) {
        setError('Please enter account holder name')
        return
      }
    }

    setLoading(true)
    try {
      const payload = {
        userId: currentUser.id,
        amount: numAmount,
        payoutMethod: method,
        accountDetails:
          method === 'UPI'
            ? { upiId: upiId.trim() }
            : {
                accountNumber: accountNumber.trim(),
                ifsc: ifsc.trim().toUpperCase(),
                holderName: holderName.trim(),
              },
      }

      const res = await requestWithdrawal(payload)
      setSuccessMsg(res.message || 'Withdrawal request submitted successfully!')

      if (onWithdrawSuccess) {
        onWithdrawSuccess(res.newBalance, numAmount)
      }

      // Reload history
      const updated = await fetchUserWithdrawals(currentUser.id)
      if (updated.withdrawals) setHistoryList(updated.withdrawals)
    } catch (err) {
      setError(err.message || 'Withdrawal submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="subpage-container">
      {/* 1. TOP HEADER */}
      <header className="subpage-header">
        <button className="subpage-back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="subpage-title">Withdrawal Center</h2>
        <button className="subpage-right-action" onClick={() => setShowHistory(!showHistory)} title="History">
          <History size={18} />
        </button>
      </header>

      <div className="subpage-content">
        {/* Balance Hero Card */}
        <div className="withdraw-balance-card">
          <div className="wb-col">
            <span className="wb-label">Total Balance</span>
            <strong className="wb-amount">₹{Number(balance || 0).toFixed(2)}</strong>
          </div>
          <div className="wb-divider" />
          <div className="wb-col">
            <span className="wb-label">Withdrawable</span>
            <strong className="wb-amount text-emerald-500">₹{Number(balance || 0).toFixed(2)}</strong>
          </div>
        </div>

        {/* METHOD TABS */}
        <div className="withdraw-method-tabs">
          <button
            type="button"
            className={`w-tab-btn ${method === 'UPI' ? 'active' : ''}`}
            onClick={() => setMethod('UPI')}
          >
            <Zap size={16} /> Instant UPI
          </button>
          <button
            type="button"
            className={`w-tab-btn ${method === 'BANK' ? 'active' : ''}`}
            onClick={() => setMethod('BANK')}
          >
            <Building2 size={16} /> Bank Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="withdraw-form">
          {/* Method Fields */}
          {method === 'UPI' ? (
            <div className="form-group-box">
              <label className="field-label">UPI ID / VPA Address</label>
              <input
                type="text"
                className="sub-text-field"
                placeholder="e.g. 9876543210@paytm or name@oksbi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
              />
              <span className="field-note">Funds arrive directly in your linked UPI bank account.</span>
            </div>
          ) : (
            <div className="form-group-box">
              <label className="field-label">Account Holder Name</label>
              <input
                type="text"
                className="sub-text-field mb-2"
                placeholder="Name as per bank records"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                required
              />

              <label className="field-label">Bank Account Number</label>
              <input
                type="text"
                className="sub-text-field mb-2"
                placeholder="Enter account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
              />

              <label className="field-label">Confirm Account Number</label>
              <input
                type="text"
                className="sub-text-field mb-2"
                placeholder="Re-enter account number"
                value={confirmAccNumber}
                onChange={(e) => setConfirmAccNumber(e.target.value)}
                required
              />

              <label className="field-label">IFSC Code</label>
              <input
                type="text"
                className="sub-text-field uppercase"
                placeholder="e.g. SBIN0001234"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                required
              />
            </div>
          )}

          {/* Amount Stepper & Chips */}
          <div className="form-group-box">
            <label className="field-label">Withdrawal Amount (₹)</label>
            <div className="preset-chips-grid mb-3">
              {PRESET_WITHDRAWALS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`preset-chip ${Number(amount) === amt ? 'active' : ''}`}
                  onClick={() => setAmount(String(amt))}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <div className="custom-input-box">
              <span className="input-prefix">₹</span>
              <input
                type="number"
                className="custom-amount-field"
                placeholder="Enter amount (min ₹100)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="100"
                max={balance}
                required
              />
            </div>
          </div>

          {error && <div className="deposit-alert error">{error}</div>}
          {successMsg && <div className="deposit-alert success">{successMsg}</div>}

          <button type="submit" className="btn-primary-gradient" disabled={loading}>
            {loading ? 'Processing Withdrawal...' : `Submit Withdrawal Request (₹${amount || 0})`}
          </button>
        </form>

        {/* Withdrawal History Drawer / Table */}
        {showHistory && (
          <div className="wallet-section-box mt-4">
            <div className="section-title-row">
              <h4>Withdrawal History</h4>
            </div>

            {historyList.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">No withdrawal records found.</p>
            ) : (
              <div className="wallet-tx-list">
                {historyList.map((item) => (
                  <div key={item.id} className="wallet-tx-row">
                    <div className="tx-left">
                      <span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span>
                      <span className="tx-date">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="tx-right">
                      <strong className="text-gray-900 font-bold">₹{item.amount}</strong>
                      <span className="tx-after">{item.payout_method || 'UPI'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="deposit-instructions-card">
          <h5>Withdrawal Rules & Guidelines</h5>
          <ul>
            <li>Minimum withdrawal is <strong>₹100</strong>. Maximum per request: <strong>₹50,000</strong>.</li>
            <li>24/7 Automated processing with zero commission or fees.</li>
            <li>Ensure bank account or UPI VPA matches your registered details.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
