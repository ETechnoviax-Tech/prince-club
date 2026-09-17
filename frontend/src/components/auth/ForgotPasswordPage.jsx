import { useState } from 'react'
import {
  ChevronLeft,
  Smartphone,
  Mail,
  Headphones,
} from 'lucide-react'
import { forgotPassword } from '../../api/client.js'
import { sound } from '../../utils/audio.js'

export function ForgotPasswordPage({ onNavigate, onOtpSent }) {
  const [channel, setChannel] = useState('WHATSAPP') // 'WHATSAPP' | 'EMAIL'
  const [identity, setIdentity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  async function handleSubmit(e) {
    e?.preventDefault?.()
    const target = identity.trim()
    if (!target) {
      setError(channel === 'WHATSAPP' ? 'Please enter your phone number.' : 'Please enter your email.')
      return
    }
    if (channel === 'WHATSAPP' && target.length < 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }
    if (channel === 'EMAIL' && !target.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    setError(null)
    setLoading(true)
    sound.playTick?.()

    try {
      const res = await forgotPassword(target, channel)
      setSuccessMsg(res.message || `Verification code sent to your ${channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'}.`)
      sound.playWin?.()
      setTimeout(() => {
        onOtpSent?.({
          identity: target,
          resetCode: res.resetCode || '',
          channel,
        })
        onNavigate('reset')
      }, 1000)
    } catch (err) {
      setError(err.message || 'Could not send verification code. Please check identity.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-root auth-page-forgot">
      {/* CORAL BRAND HEADER */}
      <div className="auth-coral-header">
        <div className="auth-top-navbar">
          <button
            className="auth-nav-back-btn"
            onClick={() => {
              sound.playTick?.()
              onNavigate('login')
            }}
            aria-label="Back to Log in"
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
          <h1 className="auth-page-heading">Forgot Password</h1>
          <p className="auth-page-subtext">Verify your account to safely reset your password</p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="auth-body-card">
        {/* OTP Channel Selector */}
        <div className="otp-channel-toggle-row">
          <button
            type="button"
            className={`otp-channel-pill ${channel === 'WHATSAPP' ? 'active' : ''}`}
            onClick={() => {
              setChannel('WHATSAPP')
              setError(null)
            }}
          >
            <Smartphone size={15} />
            <span>WhatsApp OTP</span>
          </button>

          <button
            type="button"
            className={`otp-channel-pill ${channel === 'EMAIL' ? 'active' : ''}`}
            onClick={() => {
              setChannel('EMAIL')
              setError(null)
            }}
          >
            <Mail size={15} />
            <span>Email OTP</span>
          </button>
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

        <form className="auth-form-fields" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <label className="auth-field-label">
              <span className="label-icon-box coral">
                {channel === 'WHATSAPP' ? <Smartphone size={15} /> : <Mail size={15} />}
              </span>
              <span>{channel === 'WHATSAPP' ? 'WhatsApp Phone Number' : 'Registered Email Address'}</span>
            </label>
            <div className="single-input-row">
              <input
                type={channel === 'WHATSAPP' ? 'tel' : 'email'}
                className="auth-text-input"
                placeholder={channel === 'WHATSAPP' ? 'Enter 10-digit registered phone' : 'Enter registered email'}
                value={identity}
                onChange={(e) => setIdentity(channel === 'WHATSAPP' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-action-buttons-group">
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Sending Code...' : 'Send Verification Code'}
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

export default ForgotPasswordPage
