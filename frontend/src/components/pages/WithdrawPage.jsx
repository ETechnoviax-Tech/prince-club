import React, { useState, useEffect } from 'react'
import {
  ChevronLeft,
  RefreshCw,
  CreditCard,
  Building2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react'
import { sound } from '../../utils/audio'
import { requestWithdrawal, fetchUserWithdrawals } from '../../api/client'
import './withdraw.css'

export default function WithdrawPage({
  currentUser,
  balance = 0,
  onBack,
  onWithdrawSuccess,
  onOpenHistory,
  onRefreshBalance,
}) {
  const [method, setMethod] = useState('BANK') // 'BANK' | 'USDT' | 'UPI'
  const [amount, setAmount] = useState('')
  const [accountDetails, setAccountDetails] = useState(() => {
    try {
      const saved = localStorage.getItem(`withdraw_account_${currentUser?.id || 'guest'}`)
      return saved ? JSON.parse(saved) : {
        bankName: 'AIRTEL PAYMENTS BANK',
        accountNumber: '84331398289',
        ifsc: 'AIRP0000001',
        holderName: currentUser?.username || 'Account Holder',
        upiId: '84331398289@upi',
      }
    } catch {
      return {
        bankName: 'AIRTEL PAYMENTS BANK',
        accountNumber: '84331398289',
        ifsc: 'AIRP0000001',
        holderName: currentUser?.username || 'Account Holder',
        upiId: '84331398289@upi',
      }
    }
  })

  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [alertMsg, setAlertMsg] = useState(null)
  const [historyList, setHistoryList] = useState([])
  const [setupModalOpen, setSetupModalOpen] = useState(false)

  // Fetch recent user withdrawals from live server
  useEffect(() => {
    if (currentUser?.id) {
      fetchUserWithdrawals(currentUser.id)
        .then((res) => {
          if (res.withdrawals) setHistoryList(res.withdrawals.slice(0, 3))
        })
        .catch(() => {})
    }
  }, [currentUser?.id])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    sound.playTick?.()
    if (onRefreshBalance) {
      await onRefreshBalance()
    }
    setTimeout(() => setRefreshing(false), 800)
  }

  const handleSelectAll = () => {
    sound.playTick?.()
    setAmount(String(Math.floor(balance)))
  }

  const handleSaveAccount = (e) => {
    e.preventDefault()
    try {
      localStorage.setItem(`withdraw_account_${currentUser?.id || 'guest'}`, JSON.stringify(accountDetails))
    } catch {}
    setSetupModalOpen(false)
    sound.playTick?.()
  }

  const handleSubmitWithdraw = async (e) => {
    e.preventDefault()
    setAlertMsg(null)

    const numAmount = Number(amount)
    if (!numAmount || numAmount < 110) {
      setAlertMsg({ type: 'error', text: 'Minimum withdrawal amount is ₹110.00' })
      return
    }

    if (numAmount > balance) {
      setAlertMsg({ type: 'error', text: `Insufficient balance. Available: ₹${balance.toFixed(2)}` })
      return
    }

    setSubmitting(true)
    sound.playBet?.()

    try {
      const payload = {
        userId: currentUser?.id,
        amount: numAmount,
        payoutMethod: method === 'BANK' ? 'BANK' : method === 'UPI' ? 'UPI' : 'USDT',
        accountDetails: {
          ...accountDetails,
          upiId: accountDetails.upiId || `${accountDetails.accountNumber}@upi`,
        },
      }

      const res = await requestWithdrawal(currentUser?.id, payload)
      sound.playWin?.()
      setAlertMsg({
        type: 'success',
        text: res.message || 'Withdrawal request submitted successfully. Processing in 10-30 minutes.',
      })
      setAmount('')
      if (onWithdrawSuccess) {
        onWithdrawSuccess(numAmount)
      }
      if (currentUser?.id) {
        const h = await fetchUserWithdrawals(currentUser.id)
        if (h.withdrawals) setHistoryList(h.withdrawals.slice(0, 3))
      }
    } catch (err) {
      sound.playLose?.()
      setAlertMsg({
        type: 'error',
        text: err.message || 'Failed to submit withdrawal request. Please check details.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const maskedAccount = accountDetails.accountNumber
    ? `${accountDetails.accountNumber.slice(0, 6)}****${accountDetails.accountNumber.slice(-3)}`
    : 'Add Bank Account'

  const isValidAmount = Number(amount) >= 110 && Number(amount) <= balance

  return (
    <div className="withdraw-page-container">
      {/* 1. Header */}
      <header className="withdraw-header">
        <button
          className="withdraw-back-btn"
          onClick={() => {
            sound.playTick?.()
            onBack?.()
          }}
          title="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="withdraw-header-title">Withdraw</h1>
        <button
          type="button"
          className="withdraw-history-link"
          onClick={() => {
            sound.playTick?.()
            onOpenHistory?.()
          }}
        >
          Withdrawal history
        </button>
      </header>

      <div className="withdraw-content">
        {/* 2. Coral Balance Card */}
        <div className="withdraw-balance-card">
          <div className="withdraw-card-top-row">
            <span>👛</span>
            <span>Available balance</span>
          </div>

          <div className="withdraw-card-amount-row">
            <span>₹{Number(balance).toFixed(2)}</span>
            <button
              type="button"
              className={`withdraw-refresh-icon-btn ${refreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              title="Refresh Balance"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="withdraw-card-dots">**** ****</div>
        </div>

        {/* 3. ARPay Notification Banner */}
        <div className="arpay-notice-banner">
          <div className="arpay-logo-badge">A</div>
          <div className="arpay-banner-text">
            <span className="arpay-banner-title">ARPay</span>
            <span className="arpay-banner-sub">Supports UPI for fast payment</span>
          </div>
        </div>

        {/* 4. Payment Method 3-Tile Selector */}
        <div className="withdraw-methods-grid">
          {/* Tile 1: BANK CARD */}
          <div
            className={`withdraw-method-card ${method === 'BANK' ? 'active' : ''}`}
            onClick={() => {
              sound.playTick?.()
              setMethod('BANK')
            }}
          >
            <div className="method-icon-wrap">
              <CreditCard size={26} />
            </div>
            <span className="withdraw-method-label">BANK CARD</span>
          </div>

          {/* Tile 2: USDT */}
          <div
            className={`withdraw-method-card ${method === 'USDT' ? 'active' : ''}`}
            onClick={() => {
              sound.playTick?.()
              setMethod('USDT')
            }}
          >
            <div className="method-icon-wrap">
              <div className="usdt-circle-badge">₮</div>
            </div>
            <span className="withdraw-method-label">USDT</span>
          </div>

          {/* Tile 3: UPI */}
          <div
            className={`withdraw-method-card ${method === 'UPI' ? 'active' : ''}`}
            onClick={() => {
              sound.playTick?.()
              setMethod('UPI')
            }}
          >
            <div className="method-icon-wrap">
              <span className="upi-text-badge">UPI</span>
            </div>
            <span className="withdraw-method-label">UPI</span>
          </div>
        </div>

        {/* 5. Account Selection Row */}
        <div
          className="withdraw-account-row"
          onClick={() => {
            sound.playTick?.()
            setSetupModalOpen(true)
          }}
        >
          <div className="withdraw-account-left">
            <div className="bank-logo-badge">🏛️</div>
            <div className="account-divider" />
            <span className="account-number-text">{maskedAccount}</span>
          </div>
          <ChevronRight size={18} color="#94a3b8" />
        </div>

        {/* 6. Amount Input Card */}
        <div className="withdraw-amount-card">
          <div className="amount-input-box">
            <span className="currency-symbol-big">₹</span>
            <input
              type="number"
              className="withdraw-native-input"
              placeholder="Please enter the amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="withdrawable-balance-row">
            <span>
              Withdrawable balance <span className="balance-highlight-orange">₹{Number(balance).toFixed(2)}</span>
            </span>
            <button type="button" className="btn-all-pill" onClick={handleSelectAll}>
              All
            </button>
          </div>

          <div className="received-amount-row">
            <span>Withdrawal amount received</span>
            <span className="received-amount-val">
              ₹{amount ? Number(amount).toFixed(2) : '0.00'}
            </span>
          </div>

          {alertMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: alertMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: alertMsg.type === 'success' ? '#16a34a' : '#dc2626',
                border: `1px solid ${alertMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {alertMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{alertMsg.text}</span>
            </div>
          )}

          <button
            type="button"
            className={`btn-withdraw-submit ${isValidAmount && !submitting ? 'active' : ''}`}
            disabled={!isValidAmount || submitting}
            onClick={handleSubmitWithdraw}
          >
            {submitting ? 'Processing Request...' : 'Withdraw'}
          </button>
        </div>

        {/* 7. Instructions / Rules Card */}
        <div className="withdraw-rules-card">
          <div className="rule-diamond-row">
            <span className="rule-diamond-marker">◆</span>
            <span>
              Need to bet <span className="highlight-red-rule">₹0.00</span> to be able to withdraw
            </span>
          </div>

          <div className="rule-diamond-row">
            <span className="rule-diamond-marker">◆</span>
            <span>
              Withdraw time <span className="highlight-red-rule">00:00-23:59</span>
            </span>
          </div>

          <div className="rule-diamond-row">
            <span className="rule-diamond-marker">◆</span>
            <span>
              Inday Remaining Withdrawal Times <span className="highlight-red-rule">3</span>
            </span>
          </div>

          <div className="rule-diamond-row">
            <span className="rule-diamond-marker">◆</span>
            <span>
              Withdrawal amount range <span className="highlight-red-rule">₹110.00-₹50,000.00</span>
            </span>
          </div>

          <div className="rule-diamond-row">
            <span className="rule-diamond-marker">◆</span>
            <span>
              Please check your registered bank information again before making a withdrawal. If your registered bank information is incorrect, our company will not be responsible for any losses you may incur.
            </span>
          </div>

          <div className="rule-diamond-row">
            <span className="rule-diamond-marker">◆</span>
            <span>
              If your registered bank information is incorrect, please contact customer service.
            </span>
          </div>
        </div>

        {/* 8. Recent History Section at Bottom */}
        <div className="withdraw-recent-history-card">
          <div className="recent-history-header">
            <FileText size={16} color="#f84545" />
            <span>Withdrawal history</span>
          </div>

          {historyList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {historyList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>
                      {item.payout_method || 'Bank Transfer'}
                    </strong>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#f84545' }}>
                      ₹{Number(item.amount).toFixed(2)}
                    </div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color:
                          item.status === 'APPROVED'
                            ? '#16a34a'
                            : item.status === 'REJECTED'
                            ? '#dc2626'
                            : '#ea580c',
                      }}
                    >
                      {item.status || 'PENDING'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-history-box">
              <div className="empty-history-art">📜</div>
              <span className="empty-history-text">No data</span>
            </div>
          )}

          <button
            type="button"
            className="btn-all-history-pill"
            onClick={() => {
              sound.playTick?.()
              onOpenHistory?.()
            }}
          >
            All history
          </button>
        </div>
      </div>

      {/* Account Setup / Edit Modal */}
      {setupModalOpen && (
        <div className="account-config-modal-overlay" onClick={() => setSetupModalOpen(false)}>
          <div className="account-config-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Bank / UPI Payout Details
              </h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                onClick={() => setSetupModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccount}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Bank Name
                </label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  value={accountDetails.bankName}
                  onChange={(e) => setAccountDetails({ ...accountDetails, bankName: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Account Number / Mobile
                </label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  value={accountDetails.accountNumber}
                  onChange={(e) => setAccountDetails({ ...accountDetails, accountNumber: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  IFSC Code
                </label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', textTransform: 'uppercase' }}
                  value={accountDetails.ifsc}
                  onChange={(e) => setAccountDetails({ ...accountDetails, ifsc: e.target.value.toUpperCase() })}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Destination UPI ID
                </label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                  value={accountDetails.upiId}
                  onChange={(e) => setAccountDetails({ ...accountDetails, upiId: e.target.value })}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  height: 42,
                  borderRadius: 999,
                  border: 'none',
                  background: 'linear-gradient(90deg, #ff6054 0%, #f84545 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Save Payout Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
