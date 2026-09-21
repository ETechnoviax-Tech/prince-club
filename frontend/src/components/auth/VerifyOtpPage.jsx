import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  KeyRound,
  RefreshCw,
  Headphones,
  ShieldCheck,
} from 'lucide-react'
import { verifyOTP, forgotPassword } from '../../api/client.js'
import { sound } from '../../utils/audio.js'

export function VerifyOtpPage({
  identity = '',
  channel = 'WHATSAPP',
  destination = '',
  onNavigate,
  onVerified,
}) {
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // 60-second cooldown timer for Resend OTP
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // Mask destination for privacy (e.g. de***@gmail.com or 84****5736)
  const maskedDest = (() => {
    const raw = destination || identity || ''
    if (raw.includes('@')) {
      const [name, domain] = raw.split('@')
      const maskedName = name.length > 2 ? `${name.slice(0, 2)}***` : `${name}***`
      return `${maskedName}@${domain}`
    }
    if (raw.length >= 10) {
      return `${raw.slice(0, 2)}****${raw.slice(-4)}`
    }
    return raw
  })()

  async function handleVerify(e) {
    e?.preventDefault?.()
    const cleanCode = otpCode.trim()

    if (!cleanCode || cleanCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.')
      return
    }

    setError(null)
    setLoading(true)
    sound.playTick?.()

    try {
      const res = await verifyOTP(identity, cleanCode)
      setSuccessMsg(res.message || 'OTP verified successfully! Proceeding...')
      sound.playWin?.()

      setTimeout(() => {
        onVerified?.({
          identity,
          resetCode: cleanCode,
        })
        onNavigate('reset')
      }, 800)
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (countdown > 0 || resending) return

    setError(null)
    setResending(true)
    sound.playTick?.()

    try {
      const res = await forgotPassword(identity, channel)
      setSuccessMsg(res.message || 'A new verification code has been dispatched.')
      setCountdown(60)
      sound.playWin?.()
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again in a few moments.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="auth-page-root auth-page-verify-otp">
      {/* CORAL BRAND HEADER */}
      <div className="auth-coral-header">
        <div className="auth-top-navbar">
          <button
            className="auth-nav-back-btn"
            onClick={() => {
              sound.playTick?.()
              onNavigate('forgot')
            }}
            aria-label="Back to Identity Input"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Crown Brand Logo */}
          <div className="auth-55club-brand">
            <div className="brand-55-circle">
              <span className="brand-crown-top">👑</span>
              <span className="brand-55-num">69</span>
            </div>
            <span className="brand-club-text">69 CLUB</span>
          </div>

          {/* Language Selector */}
          <div className="auth-lang-selector">
            <span className="flag-icon">🇮🇳</span>
            <span className="lang-text">EN</span>
          </div>
        </div>

        <div className="auth-header-title-block">
          <h1 className="auth-page-heading">Verify Code</h1>
          <p className="auth-page-subtext">Enter the 6-digit code sent to your {channel === 'EMAIL' ? 'Email' : 'WhatsApp'}</p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="auth-body-card">
        {/* Destination Information Banner */}
        <div className="auth-reset-identity-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="reset-identity-label">Sent to: </span>
            <span className="reset-identity-val" style={{ fontWeight: 600 }}>{maskedDest}</span>
          </div>
          <span style={{ fontSize: '11px', color: '#ff6b35', fontWeight: 600 }}>
            {channel === 'EMAIL' ? 'Email' : 'WhatsApp'}
          </span>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="auth-alert-message error">
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert-message success">
            <span>{successMsg}</span>
          </div>
        )}

        <form className="auth-form-fields" onSubmit={handleVerify}>
          <div className="auth-input-group">
            <label className="auth-field-label">
              <span className="label-icon-box coral">
                <KeyRound size={15} />
              </span>
              <span>6-Digit Verification Code</span>
            </label>
            <div className="single-input-row">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="auth-text-input code-input"
                placeholder="Enter 6-digit OTP code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
                required
              />
            </div>
          </div>

          {/* Resend OTP Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-4px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || resending}
              style={{
                background: 'none',
                border: 'none',
                color: countdown > 0 ? '#94a3b8' : '#ff6b35',
                fontWeight: 600,
                fontSize: '12px',
                cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
              }}
            >
              <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </button>
          </div>

          <div className="auth-action-buttons-group">
            <button
              type="submit"
              className="auth-btn-primary"
              disabled={loading || otpCode.length !== 6}
            >
              <ShieldCheck size={16} style={{ marginRight: 6 }} />
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <button
              type="button"
              className="auth-btn-secondary"
              onClick={() => {
                sound.playTick?.()
                onNavigate('login')
              }}
            >
              Back to Log in
            </button>
          </div>
        </form>

        {/* 24/7 Customer Service */}
        <div className="auth-customer-support-footer">
          <div className="cs-link-pill">
            <Headphones size={15} />
            <span>Customer Service 24/7</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyOtpPage
