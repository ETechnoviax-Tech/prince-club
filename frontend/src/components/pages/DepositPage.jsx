import React, { useState, useEffect } from 'react'
import {
  ChevronLeft,
  RefreshCw,
  XCircle,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Zap,
  QrCode,
  CreditCard,
  Coins,
  BookOpen,
  FileText,
} from 'lucide-react'
import { requestDeposit, submitDepositUTR, fetchUserDeposits } from '../../api/client'
import QRCode from 'qrcode'
import { sound } from '../../utils/audio'
import './deposit.css'

const PRESET_AMOUNTS = [
  { label: '100', value: 100 },
  { label: '200', value: 200 },
  { label: '300', value: 300 },
  { label: '400', value: 400 },
  { label: '500', value: 500 },
  { label: '1K', value: 1000 },
  { label: '2K', value: 2000 },
  { label: '3K', value: 3000 },
  { label: '5K', value: 5000 },
]

const PAYMENT_METHODS = [
  {
    id: 'UPI-QR',
    name: 'UPI-QR',
    type: 'upi',
    iconType: 'upi_qr',
  },
  {
    id: 'Innate UPI-QR',
    name: 'Innate UPI-QR',
    type: 'upi',
    iconType: 'innate_qr',
  },
  {
    id: 'UPI-QR PAY',
    name: 'UPI-QR PAY',
    type: 'upi',
    iconType: 'upi_pay',
  },
  {
    id: 'PAYTM-QR',
    name: 'PAYTM-QR',
    type: 'paytm',
    iconType: 'paytm_qr',
  },
  {
    id: 'USDT',
    name: 'USDT',
    type: 'crypto',
    badge: '+2%',
    iconType: 'usdt',
  },
  {
    id: 'ARPay',
    name: 'ARPay',
    type: 'wallet',
    badge: '+2%',
    iconType: 'arpay',
  },
]

export default function DepositPage({
  currentUser,
  balance,
  onBack,
  onBalanceUpdated,
  onOpenHistory,
}) {
  const [step, setStep] = useState(1) // 1: Form, 2: QR & UTR, 3: Success
  const [selectedMethod, setSelectedMethod] = useState('UPI-QR')
  const [selectedChannel, setSelectedChannel] = useState('Phonepe_QR')
  const [amount, setAmount] = useState(100)
  const [customAmount, setCustomAmount] = useState('100')
  const [loading, setLoading] = useState(false)
  const [refreshingBal, setRefreshingBal] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  // Deposit QR & UTR Data
  const [depositData, setDepositData] = useState(null)
  const [clientQr, setClientQr] = useState('')
  const [utr, setUtr] = useState('')
  const [utrResult, setUtrResult] = useState(null)

  // Recent deposit history preview
  const [recentDeposits, setRecentDeposits] = useState([])

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserDeposits(currentUser.id)
        .then((data) => {
          if (Array.isArray(data)) setRecentDeposits(data.slice(0, 5))
          else if (data?.deposits) setRecentDeposits(data.deposits.slice(0, 5))
        })
        .catch(() => {})
    }
  }, [currentUser?.id])

  useEffect(() => {
    const qr = depositData?.qrCodeDataUrl || depositData?.qrCode
    if (qr) {
      setClientQr(qr)
    } else if (depositData?.upiUri) {
      QRCode.toDataURL(depositData.upiUri, {
        width: 320,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then(setClientQr)
        .catch(() => {})
    }
  }, [depositData])

  const handleSelectPreset = (val) => {
    setAmount(val)
    setCustomAmount(String(val))
    sound.playTick?.()
  }

  const handleCustomChange = (e) => {
    const val = e.target.value.replace(/\D/g, '')
    setCustomAmount(val)
    const num = Number(val) || 0
    setAmount(num)
  }

  const handleClearCustom = () => {
    setCustomAmount('')
    setAmount(0)
  }

  const handleRefreshBalance = async () => {
    setRefreshingBal(true)
    sound.playTick?.()
    try {
      if (onBalanceUpdated) {
        await onBalanceUpdated()
      }
    } finally {
      setTimeout(() => setRefreshingBal(false), 600)
    }
  }

  const handleCreateDeposit = async () => {
    if (!currentUser?.id) {
      setError('Please log in to make a deposit')
      return
    }
    if (amount < 100) {
      setError('Minimum deposit amount is ₹100')
      return
    }
    if (amount > 50000) {
      setError('Maximum deposit limit per transaction is ₹50,000')
      return
    }
    setError(null)
    setLoading(true)
    sound.playBet?.()

    try {
      const res = await requestDeposit(currentUser.id, amount)
      setDepositData(res)
      setStep(2)
    } catch (err) {
      setError(err.message || 'Failed to generate deposit QR')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitUTR = async () => {
    if (utr.trim().length !== 12) {
      setError('UTR number must be exactly 12 numeric digits.')
      return
    }
    setError(null)
    setLoading(true)

    try {
      const res = await submitDepositUTR(depositData.deposit.id, utr.trim())
      setUtrResult(res)
      sound.playWin?.()
      if (res.newBalance !== undefined && onBalanceUpdated) {
        onBalanceUpdated(res.newBalance)
      }
      setStep(3)
    } catch (err) {
      setError(err.message || 'Failed to verify UTR')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Method Icon SVGs
  const renderMethodIcon = (type) => {
    switch (type) {
      case 'upi_qr':
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
            <rect width="36" height="36" rx="6" fill="#fff" />
            <path d="M7 11h9v9H7zM20 11h9v9h-9zM7 24h9v9H7z" fill="#0f172a" />
            <path d="M22 24h3v3h-3zM26 24h3v3h-3zM22 28h3v3h-3zM26 28h3v3h-3z" fill="#0f172a" />
            <path d="M11 6l14 4-6 3 6 3-14 4 3-7-3-7z" fill="#ea580c" opacity="0.9" />
          </svg>
        )
      case 'innate_qr':
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
            <rect width="36" height="36" rx="6" fill="#f8fafc" />
            <rect x="6" y="6" width="10" height="10" rx="2" stroke="#0f172a" strokeWidth="2.5" />
            <rect x="20" y="6" width="10" height="10" rx="2" stroke="#0f172a" strokeWidth="2.5" />
            <rect x="6" y="20" width="10" height="10" rx="2" stroke="#0f172a" strokeWidth="2.5" />
            <path d="M22 22h3v3h-3zM27 22h3v3h-3zM22 27h3v3h-3zM27 27h3v3h-3z" fill="#10b981" />
          </svg>
        )
      case 'upi_pay':
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
            <rect width="36" height="36" rx="6" fill="#fff" />
            <path d="M6 13h10v10H6zM20 13h10v10H20z" fill="#1e293b" />
            <path d="M12 7l12 4-5 3 5 3-12 4 3-7-3-7z" fill="#16a34a" />
          </svg>
        )
      case 'paytm_qr':
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
            <circle cx="18" cy="18" r="15" fill="#00b9f1" />
            <path d="M10 17h16v3H10z" fill="#fff" />
            <circle cx="18" cy="18" r="14" stroke="#002e6e" strokeWidth="1.5" fill="none" />
            <text x="18" y="22" textAnchor="middle" fill="#002e6e" fontSize="8" fontWeight="bold">Paytm</text>
          </svg>
        )
      case 'usdt':
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
            <circle cx="18" cy="18" r="16" fill="#26a17b" />
            <path d="M23 13H13v3h4v11h2V16h4v-3z" fill="#fff" />
            <ellipse cx="18" cy="17" rx="8" ry="2.5" stroke="#fff" strokeWidth="1.5" fill="none" />
          </svg>
        )
      case 'arpay':
        return (
          <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
            <polygon points="18,6 30,28 6,28" fill="#f59e0b" />
            <polygon points="18,14 24,25 12,25" fill="#fff" />
          </svg>
        )
      default:
        return <QrCode size={26} />
    }
  }

  return (
    <div className="deposit-page-wrapper">
      {/* 1. TOP HEADER */}
      <header className="deposit-top-header">
        <button className="deposit-header-back" onClick={onBack} title="Back">
          <ChevronLeft size={22} />
        </button>
        <h2 className="deposit-header-title">Deposit</h2>
        <button className="deposit-header-history-link" onClick={onOpenHistory}>
          Deposit history
        </button>
      </header>

      {/* STEP 1: DEPOSIT FORM */}
      {step === 1 && (
        <div className="deposit-body-content">
          {/* 2. HERO BALANCE CARD */}
          <div className="deposit-hero-balance-card">
            <div className="balance-card-top-row">
              <span className="balance-wallet-icon">👝</span>
              <span>Balance</span>
            </div>

            <div className="balance-card-amount-row">
              <span className="balance-card-currency-val">
                ₹{Number(balance || 0).toFixed(2)}
              </span>
              <button
                type="button"
                className="balance-refresh-btn"
                onClick={handleRefreshBalance}
                title="Refresh Balance"
              >
                <RefreshCw size={14} className={refreshingBal ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="balance-card-bottom-stars">
              <span>****  ****</span>
            </div>
          </div>

          {/* 3. PAYMENT METHODS GRID */}
          <div className="deposit-methods-grid">
            {PAYMENT_METHODS.map((method) => {
              const isActive = selectedMethod === method.id
              return (
                <div
                  key={method.id}
                  className={`deposit-method-tile ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedMethod(method.id)
                    sound.playTick?.()
                  }}
                >
                  {method.badge && (
                    <span className="method-promo-badge">
                      🎁 {method.badge}
                    </span>
                  )}
                  <div className="method-icon-box">
                    {renderMethodIcon(method.iconType)}
                  </div>
                  <span className="method-label">{method.name}</span>
                </div>
              )
            })}
          </div>

          {/* 4. SELECT CHANNEL SECTION */}
          <div className="deposit-section-card">
            <div className="section-header-row">
              <span className="section-icon-badge">
                <CreditCard size={18} />
              </span>
              <h3 className="section-main-title">Select channel</h3>
            </div>

            <div className="channel-options-row">
              <div
                className={`channel-select-pill ${selectedChannel === 'Phonepe_QR' ? '' : 'unselected'}`}
                onClick={() => setSelectedChannel('Phonepe_QR')}
              >
                <span className="channel-pill-title">Phonepe_QR</span>
                <span className="channel-pill-sub">Balance:100 - 50K</span>
              </div>
            </div>
          </div>

          {/* 5. DEPOSIT AMOUNT SECTION */}
          <div className="deposit-section-card">
            <div className="section-header-row">
              <span className="section-icon-badge">
                <Coins size={18} />
              </span>
              <h3 className="section-main-title">Deposit amount</h3>
            </div>

            {/* 3x3 Presets */}
            <div className="deposit-chips-grid">
              {PRESET_AMOUNTS.map((item) => {
                const isSelected = amount === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={`deposit-chip-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(item.value)}
                  >
                    <span className="chip-currency">₹</span>
                    <span className="chip-number">{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Custom Input */}
            <div className="custom-amount-input-box">
              <span className="custom-input-currency">₹</span>
              <div className="custom-input-divider" />
              <input
                type="text"
                inputMode="numeric"
                className="custom-input-field"
                placeholder="₹100.00 - ₹50,000.00"
                value={customAmount}
                onChange={handleCustomChange}
              />
              {customAmount && (
                <button
                  type="button"
                  className="custom-input-clear"
                  onClick={handleClearCustom}
                  title="Clear"
                >
                  <XCircle size={18} />
                </button>
              )}
            </div>

            {error && (
              <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, padding: '4px 0' }}>
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* 6. RECHARGE INSTRUCTIONS */}
          <div className="deposit-section-card">
            <div className="section-header-row">
              <span className="section-icon-badge">
                <BookOpen size={18} />
              </span>
              <h3 className="section-main-title">Recharge instructions</h3>
            </div>

            <div className="instructions-list">
              <div className="instruction-item">
                <span className="instruction-diamond">◆</span>
                <span>If the transfer time is up, please fill out the deposit form again.</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-diamond">◆</span>
                <span>The transfer amount must match the order you created, otherwise the money cannot be credited successfully.</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-diamond">◆</span>
                <span>If you transfer the wrong amount, our company will not be responsible for the lost amount!</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-diamond">◆</span>
                <span>Note: do not cancel the deposit order after the money has been transferred.</span>
              </div>
            </div>
          </div>

          {/* 7. DEPOSIT HISTORY SECTION */}
          <div className="deposit-section-card">
            <div className="section-header-row">
              <span className="section-icon-badge">
                <FileText size={18} />
              </span>
              <h3 className="section-main-title">Deposit history</h3>
            </div>

            {recentDeposits.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentDeposits.map((item) => (
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
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                        ₹{Number(item.amount).toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : 'Recent'}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background:
                          item.status === 'APPROVED' ? '#dcfce7' : item.status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                        color:
                          item.status === 'APPROVED' ? '#16a34a' : item.status === 'REJECTED' ? '#dc2626' : '#d97706',
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="history-empty-container">
                {/* SVG Illustration matching screenshot */}
                <svg className="history-empty-art" viewBox="0 0 160 120" fill="none">
                  <path d="M20 90 Q60 50 140 85" stroke="#e2e8f0" strokeWidth="3" fill="none" />
                  <ellipse cx="50" cy="85" rx="20" ry="8" fill="#e2e8f0" opacity="0.5" />
                  <ellipse cx="120" cy="95" rx="25" ry="10" fill="#e2e8f0" opacity="0.5" />
                  {/* Paper scroll */}
                  <rect x="60" y="25" width="40" height="55" rx="4" fill="#cbd5e1" opacity="0.8" />
                  <rect x="65" y="32" width="22" height="3" rx="1.5" fill="#ffffff" />
                  <rect x="65" y="40" width="30" height="3" rx="1.5" fill="#ffffff" />
                  <rect x="65" y="48" width="18" height="3" rx="1.5" fill="#ffffff" />
                  <rect x="65" y="56" width="26" height="3" rx="1.5" fill="#ffffff" />
                  <path d="M60 25 C60 18, 75 18, 75 25" stroke="#94a3b8" strokeWidth="3" fill="none" />
                  {/* Small card next to it */}
                  <rect x="105" y="65" width="20" height="15" rx="2" fill="#cbd5e1" opacity="0.9" />
                </svg>
                <span className="history-empty-text">No data</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: DYNAMIC QR & 12-DIGIT UTR SUBMISSION */}
      {step === 2 && depositData && (
        <div className="deposit-body-content">
          <div className="deposit-qr-overlay">
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total Payable Amount</span>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ff5252', marginTop: 2 }}>
                ₹{Number(depositData.deposit.amount).toFixed(2)}
              </div>
            </div>

            {/* QR Code */}
            <div style={{ display: 'grid', placeItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              {(depositData.qrCodeDataUrl || depositData.qrCode || clientQr) ? (
                <img
                  src={depositData.qrCodeDataUrl || depositData.qrCode || clientQr}
                  alt="UPI QR Code"
                  style={{ width: '100%', maxWidth: 220, height: 'auto', borderRadius: 8 }}
                />
              ) : (
                <div style={{ padding: '30px 10px', color: '#64748b', textAlign: 'center' }}>
                  <QrCode size={40} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                  <div>Generating UPI QR Code...</div>
                </div>
              )}
            </div>

            {/* Expiry Timer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>
              <Clock size={15} />
              <span>QR Code Valid for 5:00 minutes</span>
            </div>

            {/* VPA Address */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>UPI VPA:</div>
                <code style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{depositData.merchantVPA}</code>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(depositData.merchantVPA)}
                style={{
                  background: copied ? '#10b981' : '#ff5252',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Open directly in UPI App */}
            {depositData.upiUri && (
              <a
                href={depositData.upiUri}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#22c55e',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  padding: '12px',
                  borderRadius: 10,
                  fontSize: 14,
                }}
              >
                <Zap size={18} /> Pay Directly via UPI App
              </a>
            )}

            {/* UTR Input Form */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #cbd5e1', padding: '14px', marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Enter 12-Digit UTR Number</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: utr.length === 12 ? '#16a34a' : '#64748b' }}>
                  {utr.length}/12
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  maxLength={12}
                  inputMode="numeric"
                  placeholder="e.g. 425619385712"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    padding: '0 12px',
                    fontSize: 14,
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard?.readText()
                      if (text) {
                        const digits = text.replace(/\D/g, '').slice(0, 12)
                        if (digits) setUtr(digits)
                      }
                    } catch {}
                  }}
                  style={{
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Paste
                </button>
              </div>

              {error && (
                <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitUTR}
                disabled={loading || utr.length !== 12}
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: '12px',
                  borderRadius: 8,
                  border: 'none',
                  background: utr.length === 12 ? 'linear-gradient(90deg, #ff7a18, #ff5200)' : '#cbd5e1',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: utr.length === 12 ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? 'Verifying UTR...' : 'Confirm Deposit'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Change Amount or Method
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS */}
      {step === 3 && (
        <div className="deposit-body-content">
          <div className="deposit-qr-overlay" style={{ textAlign: 'center', padding: '36px 16px' }}>
            <CheckCircle2 size={54} color="#10b981" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Deposit Submitted Successfully!
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
              UTR <strong>{utr}</strong> submitted. Your wallet balance has been credited with ₹{amount}.
            </p>
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'linear-gradient(90deg, #ff7a18, #ff5200)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 28px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}

      {/* 8. FIXED STICKY FOOTER ACTION BAR */}
      {step === 1 && (
        <div className="deposit-fixed-footer">
          <div className="footer-method-info">
            <span className="footer-method-label">Recharge Method:</span>
            <span className="footer-method-name">{selectedChannel}</span>
          </div>

          <button
            type="button"
            className={`btn-deposit-submit ${amount >= 100 && !loading ? 'enabled' : ''}`}
            onClick={handleCreateDeposit}
            disabled={amount < 100 || loading}
          >
            {loading ? 'Processing...' : 'Deposit'}
          </button>
        </div>
      )}
    </div>
  )
}
