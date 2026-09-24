import React, { useState, useEffect, useMemo } from 'react'
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
  Zap,
  Info,
  ExternalLink,
  Lock,
  ShieldCheck,
  Headphones,
} from 'lucide-react'
import { sound } from '../../utils/audio'
import {
  requestWithdrawal,
  fetchUserWithdrawals,
  fetchUserPayoutMethods,
  bindUserPayoutMethod,
} from '../../api/client'
import './withdraw.css'

const USDT_EXCHANGE_RATE = 92.0

const MAJOR_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Punjab National Bank',
  'Axis Bank',
  'Bank of Baroda',
  'Kotak Mahindra Bank',
  'Canara Bank',
  'Union Bank of India',
  'IndusInd Bank',
]

const UPI_HANDLES = ['@okaxis', '@okhdfcbank', '@paytm', '@ybl', '@upi', '@ibl']

export default function WithdrawPage({
  currentUser,
  balance = 0,
  onBack,
  onWithdrawSuccess,
  onOpenHistory,
  onRefreshBalance,
  onOpenCustomerService,
}) {
  const userId = currentUser?.id || 'guest'

  // Method selector: 'BANK' | 'USDT' | 'UPI'
  const [method, setMethod] = useState('BANK')
  const [amount, setAmount] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [alertMsg, setAlertMsg] = useState(null)
  const [historyList, setHistoryList] = useState([])
  const [setupModalOpen, setSetupModalOpen] = useState(false)
  const [lockedModalOpen, setLockedModalOpen] = useState(false)
  const [savingModal, setSavingModal] = useState(false)
  const [modalError, setModalError] = useState(null)

  // 1. Independent account states per method
  const [bankAccount, setBankAccount] = useState(() => {
    try {
      const saved = localStorage.getItem(`withdraw_bank_${userId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.accountNumber && parsed.accountNumber !== '84331398289') return parsed
      }
      // Migrate legacy single key if it had bank data
      const legacy = localStorage.getItem(`withdraw_account_${userId}`)
      if (legacy) {
        const p = JSON.parse(legacy)
        if (p?.accountNumber && p.accountNumber !== '84331398289') {
          return {
            bankName: p.bankName || '',
            accountNumber: p.accountNumber || '',
            ifsc: p.ifsc || '',
            holderName: p.holderName || '',
          }
        }
      }
    } catch {}
    return { bankName: '', accountNumber: '', ifsc: '', holderName: '' }
  })

  const [upiAccount, setUpiAccount] = useState(() => {
    try {
      const saved = localStorage.getItem(`withdraw_upi_${userId}`)
      if (saved) return JSON.parse(saved)
      // Migrate legacy single key if it had UPI
      const legacy = localStorage.getItem(`withdraw_account_${userId}`)
      if (legacy) {
        const p = JSON.parse(legacy)
        if (p?.upiId) return { upiId: p.upiId, holderName: p.holderName || '' }
      }
    } catch {}
    return { upiId: '', holderName: '' }
  })

  const [usdtAccount, setUsdtAccount] = useState(() => {
    try {
      const saved = localStorage.getItem(`withdraw_usdt_${userId}`)
      if (saved) return JSON.parse(saved)
    } catch {}
    return { usdtAddress: '', network: 'TRC20' }
  })

  // Modal editing temporary buffer
  const [tempBank, setTempBank] = useState({ bankName: '', accountNumber: '', confirmAccount: '', ifsc: '', holderName: '' })
  const [tempUpi, setTempUpi] = useState({ upiId: '', holderName: '' })
  const [tempUsdt, setTempUsdt] = useState({ usdtAddress: '', network: 'TRC20' })

  // Synchronize modal buffer when opening
  useEffect(() => {
    if (setupModalOpen) {
      setModalError(null)
      setTempBank({
        bankName: bankAccount.bankName || '',
        accountNumber: bankAccount.accountNumber || '',
        confirmAccount: bankAccount.accountNumber || '',
        ifsc: bankAccount.ifsc || '',
        holderName: bankAccount.holderName || '',
      })
      setTempUpi({
        upiId: upiAccount.upiId || '',
        holderName: upiAccount.holderName || '',
      })
      setTempUsdt({
        usdtAddress: usdtAccount.usdtAddress || '',
        network: usdtAccount.network || 'TRC20',
      })
    }
  }, [setupModalOpen, bankAccount, upiAccount, usdtAccount])

  // Fetch recent user withdrawals & bound payout methods from live backend
  useEffect(() => {
    if (currentUser?.id) {
      fetchUserWithdrawals(currentUser.id)
        .then((res) => {
          if (res?.withdrawals) setHistoryList(res.withdrawals.slice(0, 3))
        })
        .catch(() => {})

      fetchUserPayoutMethods(currentUser.id)
        .then((res) => {
          if (res?.methods) {
            if (res.methods.BANK?.accountNumber) {
              setBankAccount(res.methods.BANK)
              try { localStorage.setItem(`withdraw_bank_${userId}`, JSON.stringify(res.methods.BANK)) } catch {}
            }
            if (res.methods.UPI?.upiId) {
              setUpiAccount(res.methods.UPI)
              try { localStorage.setItem(`withdraw_upi_${userId}`, JSON.stringify(res.methods.UPI)) } catch {}
            }
            if (res.methods.USDT?.usdtAddress) {
              setUsdtAccount(res.methods.USDT)
              try { localStorage.setItem(`withdraw_usdt_${userId}`, JSON.stringify(res.methods.USDT)) } catch {}
            }
          }
        })
        .catch(() => {})
    }
  }, [currentUser?.id, userId])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    sound.playTick?.()
    if (onRefreshBalance) {
      await onRefreshBalance()
    }
    setTimeout(() => setRefreshing(false), 800)
  }

  // Limits per method
  const minAmount = method === 'USDT' ? 1000 : 110
  const maxAmount = method === 'USDT' ? 500000 : 50000

  const handleSelectAll = () => {
    sound.playTick?.()
    const availableInt = Math.floor(balance)
    if (availableInt > maxAmount) {
      setAmount(String(maxAmount))
    } else {
      setAmount(String(availableInt))
    }
  }

  // Active account bound state calculation
  const isBankBound = Boolean(bankAccount.accountNumber && bankAccount.ifsc && bankAccount.holderName)
  const isUpiBound = Boolean(upiAccount.upiId)
  const isUsdtBound = Boolean(usdtAccount.usdtAddress)

  const isCurrentMethodBound = useMemo(() => {
    if (method === 'BANK') return isBankBound
    if (method === 'UPI') return isUpiBound
    if (method === 'USDT') return isUsdtBound
    return false
  }, [method, isBankBound, isUpiBound, isUsdtBound])

  const currentBoundDisplay = useMemo(() => {
    if (method === 'BANK') {
      if (!isBankBound) return '+ Add Bank Card'
      const masked = `${bankAccount.accountNumber.slice(0, 4)}****${bankAccount.accountNumber.slice(-4)}`
      return `${bankAccount.bankName ? bankAccount.bankName + ' ' : ''}${masked} (${bankAccount.holderName})`
    }
    if (method === 'UPI') {
      if (!isUpiBound) return '+ Add UPI ID / VPA'
      return `${upiAccount.upiId}${upiAccount.holderName ? ' (' + upiAccount.holderName + ')' : ''}`
    }
    if (method === 'USDT') {
      if (!isUsdtBound) return '+ Add USDT Wallet Address'
      const addr = usdtAccount.usdtAddress
      const masked = `${addr.slice(0, 6)}...${addr.slice(-4)}`
      return `[${usdtAccount.network || 'TRC20'}] ${masked}`
    }
    return '+ Add Payout Account'
  }, [method, isBankBound, isUpiBound, isUsdtBound, bankAccount, upiAccount, usdtAccount])

  // Calculation for received amount
  const numAmount = Number(amount) || 0
  const usdtEquivalent = (numAmount / USDT_EXCHANGE_RATE).toFixed(2)
  const isValidAmount = numAmount >= minAmount && numAmount <= maxAmount && numAmount <= balance

  // Modal save handler with comprehensive validation and backend lock
  const handleSaveModal = async (e) => {
    e.preventDefault()
    setModalError(null)

    if (method === 'BANK') {
      const { bankName, accountNumber, confirmAccount, ifsc, holderName } = tempBank
      if (!bankName.trim()) {
        setModalError('Please enter or select your Bank Name.')
        return
      }
      if (!/^\d{9,18}$/.test(accountNumber.trim())) {
        setModalError('Bank Account Number must be between 9 and 18 numeric digits.')
        return
      }
      if (accountNumber.trim() !== confirmAccount.trim()) {
        setModalError('Account Number and Confirmation Account Number do not match.')
        return
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())) {
        setModalError('Please enter a valid 11-character Indian IFSC code (e.g. SBIN0001234).')
        return
      }
      if (holderName.trim().length < 2) {
        setModalError('Please enter the Account Holder Name as registered in bank records.')
        return
      }

      const cleanBank = {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        holderName: holderName.trim(),
      }

      setSavingModal(true)
      try {
        await bindUserPayoutMethod('BANK', cleanBank)
        setBankAccount(cleanBank)
        try {
          localStorage.setItem(`withdraw_bank_${userId}`, JSON.stringify(cleanBank))
        } catch {}
        sound.playWin?.()
        setSetupModalOpen(false)
        setAlertMsg({ type: 'success', text: 'Bank Card bound and locked successfully for your security.' })
      } catch (err) {
        sound.playLose?.()
        setModalError(err.message || 'Failed to bind Bank Card. Please try again.')
      } finally {
        setSavingModal(false)
      }
    } else if (method === 'UPI') {
      const { upiId, holderName } = tempUpi
      if (!upiId.trim() || !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
        setModalError('Please enter a valid UPI ID (e.g. 9876543210@upi or name@okhdfcbank).')
        return
      }
      const cleanUpi = {
        upiId: upiId.trim().toLowerCase(),
        holderName: holderName.trim(),
      }

      setSavingModal(true)
      try {
        await bindUserPayoutMethod('UPI', cleanUpi)
        setUpiAccount(cleanUpi)
        try {
          localStorage.setItem(`withdraw_upi_${userId}`, JSON.stringify(cleanUpi))
        } catch {}
        sound.playWin?.()
        setSetupModalOpen(false)
        setAlertMsg({ type: 'success', text: 'UPI ID bound and locked successfully for your security.' })
      } catch (err) {
        sound.playLose?.()
        setModalError(err.message || 'Failed to bind UPI ID. Please try again.')
      } finally {
        setSavingModal(false)
      }
    } else if (method === 'USDT') {
      const { usdtAddress, network } = tempUsdt
      const cleanAddr = usdtAddress.trim()
      const net = network === 'BEP20' ? 'BEP20' : 'TRC20'

      if (net === 'TRC20') {
        if (!/^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(cleanAddr)) {
          setModalError('Invalid TRC20 USDT address. TRC20 addresses must start with "T" and have 34 characters.')
          return
        }
      } else {
        if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddr)) {
          setModalError('Invalid BEP20 USDT address. BEP20 addresses must start with "0x" and have 42 characters.')
          return
        }
      }

      const cleanUsdt = { usdtAddress: cleanAddr, network: net }
      setSavingModal(true)
      try {
        await bindUserPayoutMethod('USDT', cleanUsdt)
        setUsdtAccount(cleanUsdt)
        try {
          localStorage.setItem(`withdraw_usdt_${userId}`, JSON.stringify(cleanUsdt))
        } catch {}
        sound.playWin?.()
        setSetupModalOpen(false)
        setAlertMsg({ type: 'success', text: 'USDT address bound and locked successfully for your security.' })
      } catch (err) {
        sound.playLose?.()
        setModalError(err.message || 'Failed to bind USDT address. Please try again.')
      } finally {
        setSavingModal(false)
      }
    }
  }

  // Submit withdrawal request to backend
  const handleSubmitWithdraw = async (e) => {
    e.preventDefault()
    setAlertMsg(null)

    if (!isCurrentMethodBound) {
      setAlertMsg({
        type: 'error',
        text: `Please bind your ${method === 'BANK' ? 'Bank Card' : method === 'USDT' ? 'USDT Wallet' : 'UPI ID'} first.`,
      })
      setSetupModalOpen(true)
      return
    }

    if (!numAmount || numAmount < minAmount) {
      setAlertMsg({ type: 'error', text: `Minimum withdrawal amount for ${method} is ₹${minAmount.toLocaleString('en-IN')}.00` })
      return
    }

    if (numAmount > maxAmount) {
      setAlertMsg({ type: 'error', text: `Maximum withdrawal amount for ${method} is ₹${maxAmount.toLocaleString('en-IN')}.00` })
      return
    }

    if (numAmount > balance) {
      setAlertMsg({ type: 'error', text: `Insufficient balance. Available: ₹${balance.toFixed(2)}` })
      return
    }

    setSubmitting(true)
    sound.playBet?.()

    try {
      let payloadDetails = {}
      if (method === 'BANK') {
        payloadDetails = {
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          ifsc: bankAccount.ifsc,
          holderName: bankAccount.holderName,
        }
      } else if (method === 'UPI') {
        payloadDetails = {
          upiId: upiAccount.upiId,
          holderName: upiAccount.holderName,
        }
      } else if (method === 'USDT') {
        payloadDetails = {
          usdtAddress: usdtAccount.usdtAddress,
          network: usdtAccount.network || 'TRC20',
          exchangeRate: USDT_EXCHANGE_RATE,
          usdtAmount: Number(usdtEquivalent),
        }
      }

      const payload = {
        userId: currentUser?.id,
        amount: numAmount,
        payoutMethod: method,
        payoutDetails: payloadDetails,
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
        if (h?.withdrawals) setHistoryList(h.withdrawals.slice(0, 3))
      }
    } catch (err) {
      sound.playLose?.()
      setAlertMsg({
        type: 'error',
        text: err.message || 'Failed to submit withdrawal request. Please check your payout details.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="withdraw-page-container">
      {/* 1. Top Bar */}
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
        {/* 2. Balance Card (Coral Gradient) */}
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

        {/* 3. ARPay / Fast Settlement Notification Banner */}
        <div className="arpay-notice-banner">
          <div className="arpay-logo-badge">A</div>
          <div className="arpay-banner-text">
            <span className="arpay-banner-title">
              {method === 'USDT' ? 'Crypto Settlement' : 'ARPay Instant Settlement'}
            </span>
            <span className="arpay-banner-sub">
              {method === 'USDT'
                ? 'Automated TRC20/BEP20 blockchain payouts'
                : 'Supports fast UPI & Direct IMPS transfers'}
            </span>
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
              setAlertMsg(null)
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
              setAlertMsg(null)
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
              setAlertMsg(null)
            }}
          >
            <div className="method-icon-wrap">
              <div className="upi-badge-box">
                <svg viewBox="0 0 44 24" width="36" height="18" fill="none">
                  <path d="M5 4l9 8-4.5 1.5 4.5 1.5-9 8 2.2-6.5-2.2-6.5z" fill="#097939" />
                  <path d="M8 7l6 5-3 1 3 1-6 5 1.5-4-1.5-4z" fill="#ed5f1e" />
                  <text
                    x="17"
                    y="16"
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    fontSize="11"
                    fontWeight="900"
                    fill="#0f172a"
                  >
                    UPI
                  </text>
                </svg>
              </div>
            </div>
            <span className="withdraw-method-label">UPI</span>
          </div>
        </div>

        {/* 5. Account Selection Row */}
        <div
          className="withdraw-account-row"
          onClick={() => {
            sound.playTick?.()
            if (isCurrentMethodBound) {
              setLockedModalOpen(true)
            } else {
              setSetupModalOpen(true)
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="withdraw-account-left">
            <div
              className="bank-logo-badge"
              style={{
                background: isCurrentMethodBound ? '#f0fdf4' : '#fff1f2',
                border: isCurrentMethodBound ? '1px solid #bbf7d0' : '1px solid #fecaca',
                color: isCurrentMethodBound ? '#16a34a' : '#ff5e4d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isCurrentMethodBound ? (
                <Lock size={16} color="#16a34a" />
              ) : method === 'BANK' ? (
                '🏛️'
              ) : method === 'USDT' ? (
                '₮'
              ) : (
                '⚡'
              )}
            </div>
            <div className="account-divider" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  className="account-number-text"
                  style={{
                    color: isCurrentMethodBound ? '#0f172a' : '#ff5e4d',
                    fontWeight: 700,
                    fontSize: 13.5,
                  }}
                >
                  {currentBoundDisplay}
                </span>
                {isCurrentMethodBound && (
                  <span
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Lock size={9} /> Locked
                  </span>
                )}
              </div>
              <small
                style={{
                  fontSize: 11,
                  color: isCurrentMethodBound ? '#15803d' : '#94a3b8',
                  marginTop: 1,
                  fontWeight: 500,
                }}
              >
                {isCurrentMethodBound
                  ? '🔒 Bound & locked. Tap to view or contact support to change'
                  : `Tap to bind your ${method === 'BANK' ? 'Bank Card' : method} account (Locked once saved)`}
              </small>
            </div>
          </div>
          <ChevronRight size={18} color={isCurrentMethodBound ? '#15803d' : '#ff5e4d'} />
        </div>

        {/* 6. Amount Input Card */}
        <div className="withdraw-amount-card">
          {method === 'USDT' && (
            <div className="usdt-rate-badge-banner">
              <span className="usdt-rate-title">Exchange Rate:</span>
              <strong className="usdt-rate-val">1 USDT ≈ ₹{USDT_EXCHANGE_RATE.toFixed(2)}</strong>
              <span className="usdt-network-pill">{usdtAccount.network || 'TRC20'}</span>
            </div>
          )}

          <div className="amount-input-box">
            <span className="currency-symbol-big">₹</span>
            <input
              type="number"
              className="withdraw-native-input"
              placeholder={`Enter amount (min ₹${minAmount.toLocaleString('en-IN')})`}
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
              {method === 'USDT' ? (
                <span>
                  ≈ <strong>{numAmount > 0 ? usdtEquivalent : '0.00'}</strong> USDT{' '}
                  <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 500 }}>
                    (₹{numAmount > 0 ? numAmount.toFixed(2) : '0.00'})
                  </span>
                </span>
              ) : (
                `₹${numAmount > 0 ? numAmount.toFixed(2) : '0.00'}`
              )}
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
            {submitting
              ? 'Submitting to Queue...'
              : !isCurrentMethodBound
              ? `Bind ${method} Account First`
              : numAmount < minAmount
              ? `Min Withdrawal ₹${minAmount.toLocaleString('en-IN')}`
              : numAmount > balance
              ? 'Insufficient Balance'
              : 'Withdraw'}
          </button>
        </div>

        {/* 7. Instructions / Rules Card */}
        <div className="withdraw-rules-card">
          <div className="rule-diamond-row">
            <span className="rule-diamond-marker">◆</span>
            <span>
              Withdrawal amount range{' '}
              <span className="highlight-red-rule">
                ₹{minAmount.toLocaleString('en-IN')}.00 - ₹{maxAmount.toLocaleString('en-IN')}.00
              </span>
            </span>
          </div>

          <div className="rule-diamond-row">
            <span className="rule-diamond-marker">◆</span>
            <span>
              Withdraw time <span className="highlight-red-rule">00:00 - 23:59</span> (24/7 Available)
            </span>
          </div>

          <div className="rule-diamond-row">
            <span className="rule-diamond-marker">◆</span>
            <span>
              Daily remaining withdrawal count <span className="highlight-red-rule">3</span>
            </span>
          </div>

          {method === 'USDT' ? (
            <>
              <div className="rule-diamond-row">
                <span className="rule-diamond-marker">◆</span>
                <span>
                  USDT settlements are converted at the fixed exchange rate of{' '}
                  <span className="highlight-red-rule">1 USDT = ₹{USDT_EXCHANGE_RATE.toFixed(2)}</span>.
                </span>
              </div>
              <div className="rule-diamond-row">
                <span className="rule-diamond-marker">◆</span>
                <span>
                  Please double-check your crypto receiving address and network (TRC20 / BEP20). Assets sent to incorrect addresses cannot be recovered.
                </span>
              </div>
            </>
          ) : (
            <div className="rule-diamond-row">
              <span className="rule-diamond-marker">◆</span>
              <span>
                Please ensure your registered {method === 'BANK' ? 'Bank Details (A/C & IFSC)' : 'UPI ID'} are 100% correct. If your destination details are incorrect, platform insurance will not cover the payout loss.
              </span>
            </div>
          )}
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
              <span className="empty-history-text">No withdrawal records</span>
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

      {/* Account Setup Modal (Dynamic for BANK, USDT, and UPI) */}
      {setupModalOpen && (
        <div className="account-config-modal-overlay" onClick={() => setSetupModalOpen(false)}>
          <div className="account-config-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  {method === 'BANK' ? 'Bind Bank Card' : method === 'USDT' ? 'Bind USDT Wallet' : 'Bind UPI ID'}
                </h3>
                <small style={{ color: '#64748b', fontSize: 11.5 }}>
                  {method === 'BANK'
                    ? 'Funds will be transferred via IMPS / NEFT'
                    : method === 'USDT'
                    ? 'Select your network and enter your receiving address'
                    : 'Instant payout to your UPI Virtual Payment Address'}
                </small>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                onClick={() => setSetupModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                color: '#b45309',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 11.5,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                lineHeight: 1.4,
              }}
            >
              <ShieldCheck size={16} color="#d97706" style={{ flexShrink: 0 }} />
              <span>
                <strong>Anti-Fraud Notice:</strong> Once bound, this account is <strong>permanently locked</strong> to your profile for security. You cannot modify it yourself. Contact Customer Support if you ever need to change it.
              </span>
            </div>

            {modalError && (
              <div
                style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal}>
              {/* === METHOD 1: BANK CARD === */}
              {method === 'BANK' && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Bank Name
                    </label>
                    <input
                      type="text"
                      list="major-banks-list"
                      placeholder="Select or enter your Bank Name"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                      value={tempBank.bankName}
                      onChange={(e) => setTempBank({ ...tempBank, bankName: e.target.value })}
                    />
                    <datalist id="major-banks-list">
                      {MAJOR_BANKS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 9 to 18 digit account number"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                      value={tempBank.accountNumber}
                      onChange={(e) => setTempBank({ ...tempBank, accountNumber: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Confirm Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="Re-enter your account number"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                      value={tempBank.confirmAccount}
                      onChange={(e) => setTempBank({ ...tempBank, confirmAccount: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="e.g. SBIN0001234 or HDFC0000128"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', textTransform: 'uppercase' }}
                      value={tempBank.ifsc}
                      onChange={(e) => setTempBank({ ...tempBank, ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      placeholder="Full name as printed on bank passbook"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                      value={tempBank.holderName}
                      onChange={(e) => setTempBank({ ...tempBank, holderName: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* === METHOD 2: USDT === */}
              {method === 'USDT' && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                      Blockchain Network
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          borderRadius: 10,
                          border: tempUsdt.network === 'TRC20' ? '2px solid #14b8a6' : '1px solid #cbd5e1',
                          background: tempUsdt.network === 'TRC20' ? '#f0fdfa' : '#ffffff',
                          color: tempUsdt.network === 'TRC20' ? '#0f766e' : '#64748b',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                        onClick={() => setTempUsdt({ ...tempUsdt, network: 'TRC20' })}
                      >
                        TRC20 (Tron)
                      </button>
                      <button
                        type="button"
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          borderRadius: 10,
                          border: tempUsdt.network === 'BEP20' ? '2px solid #14b8a6' : '1px solid #cbd5e1',
                          background: tempUsdt.network === 'BEP20' ? '#f0fdfa' : '#ffffff',
                          color: tempUsdt.network === 'BEP20' ? '#0f766e' : '#64748b',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                        onClick={() => setTempUsdt({ ...tempUsdt, network: 'BEP20' })}
                      >
                        BEP20 (BNB Chain)
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      USDT Receiving Wallet Address
                    </label>
                    <input
                      type="text"
                      placeholder={tempUsdt.network === 'TRC20' ? 'Starts with T... (34 characters)' : 'Starts with 0x... (42 characters)'}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                      value={tempUsdt.usdtAddress}
                      onChange={(e) => setTempUsdt({ ...tempUsdt, usdtAddress: e.target.value.trim() })}
                    />
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: 10,
                      padding: '10px 12px',
                      marginBottom: 16,
                      border: '1px solid #e2e8f0',
                      fontSize: 11.5,
                      color: '#64748b',
                      lineHeight: 1.5,
                    }}
                  >
                    ⚠️ <strong>Important:</strong> Only bind your personal wallet address (Binance, Bybit, Trust Wallet, OKX). Payouts are made strictly on the <strong>{tempUsdt.network}</strong> network.
                  </div>
                </>
              )}

              {/* === METHOD 3: UPI === */}
              {method === 'UPI' && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Destination UPI ID / VPA
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210@upi or yourname@okhdfcbank"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                      value={tempUpi.upiId}
                      onChange={(e) => setTempUpi({ ...tempUpi, upiId: e.target.value.trim().toLowerCase() })}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {UPI_HANDLES.map((h) => (
                        <button
                          key={h}
                          type="button"
                          style={{
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            background: '#f8fafc',
                            fontSize: 11,
                            color: '#475569',
                            padding: '3px 8px',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            const base = tempUpi.upiId.split('@')[0] || ''
                            if (base) setTempUpi({ ...tempUpi, upiId: `${base}${h}` })
                          }}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Payee / Account Holder Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                      value={tempUpi.holderName}
                      onChange={(e) => setTempUpi({ ...tempUpi, holderName: e.target.value })}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={savingModal}
                style={{
                  width: '100%',
                  height: 42,
                  borderRadius: 999,
                  border: 'none',
                  background: savingModal
                    ? '#94a3b8'
                    : 'linear-gradient(90deg, #ff6054 0%, #f84545 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: savingModal ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(248, 69, 69, 0.3)',
                }}
              >
                {savingModal
                  ? 'Binding & Locking Account...'
                  : `Bind & Lock ${method === 'BANK' ? 'Bank Card' : method === 'USDT' ? 'USDT Address' : 'UPI ID'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Account Bound & Locked Modal (Permanently locked; directs user to Customer Support) */}
      {lockedModalOpen && (
        <div className="account-config-modal-overlay" onClick={() => setLockedModalOpen(false)}>
          <div className="account-config-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 390 }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16a34a',
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#0f172a' }}>
                    Bound Payout Account
                  </h3>
                  <small style={{ color: '#16a34a', fontSize: 11, fontWeight: 600 }}>
                    🔒 Verified & Permanently Locked
                  </small>
                </div>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                onClick={() => setLockedModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Current Details Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {method === 'BANK' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#64748b' }}>Bank Name:</span>
                    <strong style={{ color: '#0f172a' }}>{bankAccount.bankName || 'Bank Card'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#64748b' }}>Account Number:</span>
                    <strong style={{ color: '#0f172a', letterSpacing: 0.5 }}>{bankAccount.accountNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#64748b' }}>IFSC Code:</span>
                    <strong style={{ color: '#0f172a' }}>{bankAccount.ifsc}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#64748b' }}>Holder Name:</span>
                    <strong style={{ color: '#0f172a' }}>{bankAccount.holderName}</strong>
                  </div>
                </>
              )}

              {method === 'UPI' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#64748b' }}>UPI ID / VPA:</span>
                    <strong style={{ color: '#0f172a', letterSpacing: 0.3 }}>{upiAccount.upiId}</strong>
                  </div>
                  {upiAccount.holderName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: '#64748b' }}>Beneficiary Name:</span>
                      <strong style={{ color: '#0f172a' }}>{upiAccount.holderName}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#64748b' }}>Payout Rail:</span>
                    <strong style={{ color: '#16a34a' }}>ARPay Instant Settlement</strong>
                  </div>
                </>
              )}

              {method === 'USDT' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#64748b' }}>Network:</span>
                    <strong style={{ color: '#0f172a' }}>{usdtAccount.network || 'TRC20'}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12.5 }}>
                    <span style={{ color: '#64748b' }}>Wallet Address:</span>
                    <strong style={{ color: '#0f172a', wordBreak: 'break-all', fontSize: 11.5 }}>
                      {usdtAccount.usdtAddress}
                    </strong>
                  </div>
                </>
              )}
            </div>

            {/* Security Explanation */}
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: 12,
                color: '#1e40af',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <Lock size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Security Protection:</strong> For your financial protection, bound withdrawal methods cannot be modified directly by users. If you need to update or reset your {method === 'BANK' ? 'Bank Card' : method === 'UPI' ? 'UPI ID' : 'USDT Wallet'}, please contact our 24/7 Customer Support team with verification proof.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                style={{
                  width: '100%',
                  height: 42,
                  borderRadius: 999,
                  border: 'none',
                  background: 'linear-gradient(90deg, #ff6054 0%, #f84545 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(248, 69, 69, 0.3)',
                }}
                onClick={() => {
                  sound.playTick?.()
                  setLockedModalOpen(false)
                  if (onOpenCustomerService) {
                    onOpenCustomerService()
                  }
                }}
              >
                <Headphones size={18} />
                Contact Customer Support to Change
              </button>

              <button
                type="button"
                style={{
                  width: '100%',
                  height: 38,
                  borderRadius: 999,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
                onClick={() => setLockedModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
