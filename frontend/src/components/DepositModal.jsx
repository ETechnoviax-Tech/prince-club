import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react'
import { requestDeposit, submitDepositUTR } from '../api/client.js'

const PRESET_AMOUNTS = [100, 300, 500, 1000, 2000, 5000]

export function DepositModal({ isOpen, onClose, userId, onBalanceUpdated }) {
  const [step, setStep] = useState(1) // 1: Amount, 2: Payment & QR, 3: Success/Pending
  const [amount, setAmount] = useState(500)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  // Deposit Response details
  const [depositData, setDepositData] = useState(null)
  const [utr, setUtr] = useState('')
  const [utrResult, setUtrResult] = useState(null)

  if (!isOpen) return null

  async function handleCreateDeposit() {
    setError(null)
    setLoading(true)
    try {
      const res = await requestDeposit(userId, amount)
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

  function copyVPA() {
    if (depositData?.merchantVPA) {
      navigator.clipboard?.writeText(depositData.merchantVPA)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleReset() {
    setStep(1)
    setDepositData(null)
    setUtr('')
    setUtrResult(null)
    setError(null)
    onClose()
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <QrCode size={20} />
            </div>
            <div>
              <h3>UPI Quick Deposit</h3>
              <p>Instant recharge via Google Pay, PhonePe, Paytm, BHIM</p>
            </div>
          </div>
          <button className="icon-close-button" type="button" onClick={handleReset} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="alert-box alert-box--error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Select Amount */}
        {step === 1 && (
          <div className="modal-step-body">
            <label className="input-label">Select Deposit Amount (₹)</label>
            <div className="preset-amounts-grid">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`preset-btn ${amount === amt ? 'preset-btn--active' : ''}`}
                  onClick={() => setAmount(amt)}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <div className="custom-input-group">
              <span className="currency-prefix">₹</span>
              <input
                type="number"
                min="100"
                max="100000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Enter custom amount"
                className="custom-amount-input"
              />
            </div>
            <span className="input-hint">Min: ₹100 | Max: ₹1,00,000</span>

            <div className="payment-security-badge">
              <ShieldCheck size={16} />
              <span>Safe & Secure UPI Gateway with 12-digit UTR Verification</span>
            </div>

            <button
              type="button"
              className="primary-action-btn"
              disabled={loading || !amount || amount < 100}
              onClick={handleCreateDeposit}
            >
              {loading ? 'Generating UPI QR...' : `Proceed to Pay ₹${amount}`}
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2: Scan & Pay + Enter UTR */}
        {step === 2 && depositData && (
          <div className="modal-step-body">
            <div className="qr-container">
              <img
                src={depositData.qrCodeDataUrl || depositData.qrCode}
                alt="UPI Payment QR Code"
                className="upi-qr-image"
              />
              <span className="qr-caption">Scan with PhonePe, GPay, Paytm, or BHIM</span>
            </div>

            <div className="payment-details-card">
              <div className="detail-row">
                <span className="detail-label">Paying To:</span>
                <span className="detail-val">{depositData.merchantName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">UPI ID:</span>
                <div className="vpa-copy-box">
                  <code>{depositData.merchantVPA}</code>
                  <button type="button" className="copy-action-btn" onClick={copyVPA}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">Amount:</span>
                <strong className="detail-val-highlight">₹{depositData.deposit.amount}</strong>
              </div>
              <div className="detail-row">
                <span className="detail-label">Order Ref:</span>
                <span className="detail-val-mono">{depositData.deposit.order_ref}</span>
              </div>
            </div>

            <div className="upi-app-direct">
              <a
                href={depositData.upiUri}
                className="upi-intent-link"
                target="_blank"
                rel="noreferrer"
              >
                <Smartphone size={16} /> Open UPI App directly <ExternalLink size={14} />
              </a>
            </div>

            <div className="utr-input-section">
              <label className="input-label">
                Enter 12-digit UTR / Ref Number <span className="required-star">*</span>
              </label>
              <p className="input-subhint">
                After completing payment in your UPI app, find the 12-digit UTR/UPI Ref No. in payment details.
              </p>
              <div className="utr-input-wrapper">
                <input
                  type="text"
                  maxLength={12}
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 423512345678"
                  className="utr-input"
                />
                <span className={`utr-counter ${utr.length === 12 ? 'utr-counter--valid' : ''}`}>
                  {utr.length}/12
                </span>
              </div>

              <button
                type="button"
                className="primary-action-btn"
                disabled={loading || utr.length !== 12}
                onClick={handleSubmitUTR}
              >
                {loading ? 'Verifying...' : 'Submit UTR for Verification'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success or Pending Verification */}
        {step === 3 && utrResult && (
          <div className="modal-step-body modal-step-body--center">
            {utrResult.deposit?.status === 'APPROVED' ? (
              <div className="status-hero status-hero--success">
                <CheckCircle2 size={54} className="status-icon-success" />
                <h4>Deposit Successful!</h4>
                <p>₹{depositData.deposit.amount} has been credited to your wallet balance.</p>
                <div className="status-chip">Approved</div>
              </div>
            ) : (
              <div className="status-hero status-hero--pending">
                <Clock size={54} className="status-icon-pending" />
                <h4>UTR Submitted Successfully</h4>
                <p>
                  Your 12-digit UTR (<code>{utr}</code>) is recorded for order{' '}
                  <strong>{depositData.deposit.order_ref}</strong>.
                </p>
                <p className="pending-note">
                  Verification usually takes 1–5 minutes. Your wallet balance will automatically update once verified.
                </p>
                <div className="status-chip status-chip--pending">Under Verification</div>
              </div>
            )}

            <button type="button" className="primary-action-btn" onClick={handleReset}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
