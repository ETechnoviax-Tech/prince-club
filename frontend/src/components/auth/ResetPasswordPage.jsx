import { useState } from 'react'
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  ShieldCheck,
  Headphones,
} from 'lucide-react'
import { resetPassword } from '../../api/client.js'
import { sound } from '../../utils/audio.js'

export function ResetPasswordPage({ initialIdentity = '', initialCode = '', onNavigate }) {
  const [identity, setIdentity] = useState(initialIdentity)
  const [resetCode, setResetCode] = useState(initialCode)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  async function handleSubmit(e) {
    e?.preventDefault?.()
    const targetUser = identity.trim()
    if (!targetUser) {
      setError('User identifier missing. Please go back and enter phone or email.')
      return
    }
    if (!resetCode.trim() || resetCode.trim().length < 6) {
      setError('Please enter the valid 6-digit verification code.')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError(null)
    setLoading(true)
    sound.playBet?.()

    try {
      await resetPassword(targetUser, resetCode.trim(), newPassword)
      setSuccessMsg('Password updated successfully! Redirecting to login...')
      sound.playWin?.()
      setTimeout(() => {
        onNavigate('login')
      }, 1200)
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check your code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-root auth-page-reset">
      {/* CORAL BRAND HEADER */}
      <div className="auth-coral-header">
        <div className="auth-top-navbar">
          <button
            className="auth-nav-back-btn"
            onClick={() => {
              sound.playTick?.()
              onNavigate('forgot')
            }}
            aria-label="Back"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Crown Brand Logo */}
          <div className="auth-55club-brand">
            <div className="brand-55-circle">
              <span className="brand-crown-top">👑</span>
              <span className="brand-55-num">PC</span>
            </div>
            <span className="brand-club-text">PRINCE CLUB</span>
          </div>

          {/* Language Selector */}
          <div className="auth-lang-selector">
            <span className="flag-icon">🇮🇳</span>
            <span className="lang-text">EN</span>
          </div>
        </div>

        <div className="auth-header-title-block">
          <h1 className="auth-page-heading">Set New Password</h1>
          <p className="auth-page-subtext">Enter your verification code and choose a new password</p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="auth-body-card">
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
          {/* Target Identity Display */}
          <div className="auth-reset-identity-banner">
            <span className="reset-identity-label">Account:</span>
            <span className="reset-identity-val">{identity || 'Registered User'}</span>
          </div>

          {/* Verification Code */}
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
                maxLength={6}
                className="auth-text-input code-input"
                placeholder="Enter 6-digit OTP code"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          </div>

          {/* New Password */}
          <div className="auth-input-group">
            <label className="auth-field-label">
              <span className="label-icon-box coral">
                <Lock size={15} />
              </span>
              <span>New Password</span>
            </label>
            <div className="password-input-row">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-text-input password-input"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle new password visibility"
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="auth-input-group">
            <label className="auth-field-label">
              <span className="label-icon-box coral">
                <ShieldCheck size={15} />
              </span>
              <span>Confirm New Password</span>
            </label>
            <div className="password-input-row">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-text-input password-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-eye-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle confirm new password visibility"
              >
                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="auth-action-buttons-group">
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Set Password & Log in'}
            </button>

            <button
              type="button"
              className="auth-btn-secondary"
              onClick={() => {
                sound.playTick?.()
                onNavigate('login')
              }}
            >
              Cancel & Back to Log in
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

export default ResetPasswordPage
