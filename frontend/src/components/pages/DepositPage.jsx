import React, { useState } from 'react'
import {
  ArrowLeft,
  QrCode,
  Smartphone,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  History,
  Zap,
} from 'lucide-react'
import { requestDeposit, submitDepositUTR } from '../../api/client'
import QRCode from 'qrcode'

const PRESET_AMOUNTS = [100, 300, 500, 1000, 2000, 5000, 10000, 50000]

export default function DepositPage({
  currentUser,
  balance,
  onBack,
  onBalanceUpdated,
  onOpenHistory,
}) {
  const [step, setStep] = useState(1) // 1: Select Channel & Amount, 2: Scan QR & Submit UTR, 3: Completed
  const [amount, setAmount] = useState(500)
  const [customAmount, setCustomAmount] = useState('500')
  const [channel, setChannel] = useState('UPI-QR')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  // Deposit API Response
  const [depositData, setDepositData] = useState(null)
  const [clientQr, setClientQr] = useState('')
  const [utr, setUtr] = useState('')
  const [utrResult, setUtrResult] = useState(null)

  React.useEffect(() => {
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
  }

  const handleCustomChange = (e) => {
    const val = e.target.value.replace(/\D/g, '')
    setCustomAmount(val)
    setAmount(Number(val) || 0)
  }

  async function handleCreateDeposit() {
    if (!currentUser?.id) {
      setError('Please log in to make a deposit')
      return
    }
    if (amount < 100) {
      setError('Minimum deposit is ₹100')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await requestDeposit(currentUser.id, amount)
      setDepositData(res)
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitUTR() {
    if (utr.trim().length !== 12) {
      setError('UTR must be exactly 12 numeric digits.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await submitDepositUTR(depositData.deposit.id, utr.trim())
      setUtrResult(res)
      if (res.newBalance !== undefined && onBalanceUpdated) {
        onBalanceUpdated(res.newBalance)
      }
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleCopy(text) {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="subpage-container">
      {/* 1. TOP BAR */}
      <header className="subpage-header">
        <button className="subpage-back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="subpage-title">Deposit Center</h2>
        <button className="subpage-right-action" onClick={onOpenHistory} title="Deposit Records">
          <History size={18} />
        </button>
      </header>

      <div className="subpage-content">
        {/* Balance Card */}
        <div className="deposit-balance-pill-card">
          <span className="pill-label">Account Balance</span>
          <strong className="pill-val">₹{Number(balance || 0).toFixed(2)}</strong>
        </div>

        {/* STEP 1: CHANNEL & AMOUNT SELECTION */}
        {step === 1 && (
          <>
            {/* Payment Channels */}
            <div className="deposit-channel-section">
              <label className="section-label">Select Deposit Channel</label>
              <div className="channels-grid">
                {[
                  { id: 'UPI-QR', name: 'UPI Dynamic QR', bonus: '+2% Extra', icon: '⚡' },
                  { id: 'UPI-Fast', name: 'Instant UPI', bonus: 'Fastest', icon: '🚀' },
                  { id: 'Paytm', name: 'Paytm Wallet/UPI', bonus: 'Zero Fee', icon: '💳' },
                  { id: 'IMPS', name: 'Bank Transfer', bonus: '100k Max', icon: '🏦' },
                ].map((ch) => (
                  <div
                    key={ch.id}
                    className={`channel-card ${channel === ch.id ? 'active' : ''}`}
                    onClick={() => setChannel(ch.id)}
                  >
                    <div className="channel-icon">{ch.icon}</div>
                    <div className="channel-texts">
                      <strong>{ch.name}</strong>
                      <span className="channel-badge">{ch.bonus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="deposit-amounts-section">
              <label className="section-label">Select Deposit Amount (₹)</label>
              <div className="preset-chips-grid">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`preset-chip ${amount === amt ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(amt)}
                  >
                    <span className="chip-symbol">₹</span>
                    <span className="chip-val">{amt.toLocaleString('en-IN')}</span>
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="custom-input-box">
                <span className="input-prefix">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="custom-amount-field"
                  placeholder="Enter amount (min ₹100)"
                  value={customAmount}
                  onChange={handleCustomChange}
                />
              </div>
            </div>

            {error && <div className="deposit-alert error">{error}</div>}

            {/* CTA */}
            <button
              className="btn-primary-gradient"
              onClick={handleCreateDeposit}
              disabled={loading || amount < 100}
            >
              {loading ? 'Generating Dynamic QR...' : `Proceed to Pay ₹${amount.toLocaleString('en-IN')}`}
            </button>

            {/* Instructions */}
            <div className="deposit-instructions-card">
              <h5>Deposit Rules & Security</h5>
              <ul>
                <li>Minimum deposit amount is <strong>₹100</strong>.</li>
                <li>Each QR code is dynamically created for a single transaction. Do not reuse old QR codes.</li>
                <li>After payment on PhonePe/GPay/Paytm, copy the <strong>12-digit UTR number</strong> and submit it to confirm.</li>
                <li>Funds arrive automatically in your 69 Club balance in 10-60 seconds.</li>
              </ul>
            </div>
          </>
        )}

        {/* STEP 2: DYNAMIC QR & UTR SUBMISSION */}
        {step === 2 && depositData && (
          <div className="deposit-qr-screen">
            <div className="qr-preview-box">
              <div className="qr-img-wrapper" style={{ minHeight: 220, display: 'grid', placeItems: 'center' }}>
                {(depositData.qrCodeDataUrl || depositData.qrCode || clientQr) ? (
                  <img
                    src={depositData.qrCodeDataUrl || depositData.qrCode || clientQr}
                    alt="UPI Payment QR Code"
                    className="qr-rendered-img"
                    style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block', margin: '0 auto' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                    <QrCode size={48} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Generating UPI QR...</div>
                  </div>
                )}
              </div>

              <div className="qr-pay-amount">
                <span>Total Payable:</span>
                <strong>₹{Number(depositData.deposit.amount).toFixed(2)}</strong>
              </div>
            </div>

            {/* VPA Copy Box */}
            <div className="vpa-copy-card">
              <div className="vpa-info-col">
                <span className="vpa-label">UPI VPA Address:</span>
                <code className="vpa-text">{depositData.merchantVPA}</code>
              </div>
              <button className="btn-copy-vpa" onClick={() => handleCopy(depositData.merchantVPA)}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy VPA'}</span>
              </button>
            </div>

            {/* Open in UPI App */}
            {depositData.upiUri && (
              <a href={depositData.upiUri} className="btn-pay-intent">
                <Zap size={18} /> Pay Directly via UPI App
              </a>
            )}

            {/* UTR Submission Box */}
            <div className="utr-submit-card">
              <label className="utr-label">
                Step 2: Enter 12-Digit UTR / Transaction Ref ID
              </label>
              <input
                type="text"
                maxLength={12}
                inputMode="numeric"
                className="utr-input-field"
                placeholder="e.g. 425619385712"
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
              />

              {error && <div className="deposit-alert error mt-2">{error}</div>}

              <button
                className="btn-submit-utr"
                onClick={handleSubmitUTR}
                disabled={loading || utr.length !== 12}
              >
                {loading ? 'Verifying UTR...' : 'Confirm Deposit (Submit UTR)'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 3 && (
          <div className="deposit-success-screen">
            <div className="success-icon-circle">
              <CheckCircle2 size={48} className="text-emerald-500" />
            </div>
            <h3>Deposit Submitted Successfully!</h3>
            <p>
              Your UTR <code>{utr}</code> has been verified. ₹{amount} has been added to your wallet balance.
            </p>

            <button className="btn-primary-gradient mt-4" onClick={onBack}>
              Return to Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
