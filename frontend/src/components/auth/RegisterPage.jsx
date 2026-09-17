import { useState } from 'react'
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Check,
  Smartphone,
  Mail,
  Lock,
  ShieldCheck,
  Gift,
  Headphones,
} from 'lucide-react'
import { signupUser } from '../../api/client.js'
import { sound } from '../../utils/audio.js'

export function RegisterPage({ onAuthSuccess, onNavigate, canClose, onClose }) {
  const [loginTab, setLoginTab] = useState('phone') // 'phone' | 'email'
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  async function handleSubmit(e) {
    e?.preventDefault?.()
    const identifier = loginTab === 'phone' ? phone.trim() : email.trim()

    if (!identifier) {
      setError(`Please enter a valid ${loginTab === 'phone' ? 'phone number' : 'email'}.`)
      return
    }
    if (loginTab === 'phone' && identifier.length < 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }
    if (loginTab === 'email' && !identifier.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!agreeTerms) {
      setError('Please accept the Privacy Policy and terms to proceed.')
      return
    }

    setError(null)
    setLoading(true)
    sound.playBet?.()

    try {
      const usernameParam = loginTab === 'email'
        ? identifier.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 18)
        : identifier

      const res = await signupUser(
        usernameParam,
        loginTab === 'email' ? identifier : undefined,
        password,
        referralCode.trim() || undefined
      )

      setSuccessMsg('Account registered successfully! Logging you in...')
      sound.playWin?.()
      setTimeout(() => {
        onAuthSuccess?.(res.user, res.wallet)
        if (canClose) onClose?.()
      }, 600)
    } catch (err) {
      setError(err.message || 'Registration failed. Please check credentials or try another number.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-root auth-page-register">
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
          <h1 className="auth-page-heading">Register</h1>
          <p className="auth-page-subtext">Create your account to start playing and winning</p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="auth-body-card">
        {/* TAB SWITCHER */}
        <div className="auth-method-tabs">
          <button
            type="button"
            className={`method-tab-btn ${loginTab === 'phone' ? 'active' : ''}`}
            onClick={() => {
              setLoginTab('phone')
              setError(null)
            }}
          >
            <div className="tab-icon-box">
              <Smartphone size={18} />
            </div>
            <span>Phone Register</span>
            {loginTab === 'phone' && <div className="tab-active-indicator" />}
          </button>

          <button
            type="button"
            className={`method-tab-btn ${loginTab === 'email' ? 'active' : ''}`}
            onClick={() => {
              setLoginTab('email')
              setError(null)
            }}
          >
            <div className="tab-icon-box">
              <Mail size={18} />
            </div>
            <span>Email Register</span>
            {loginTab === 'email' && <div className="tab-active-indicator" />}
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
          {loginTab === 'phone' ? (
            <div className="auth-input-group">
              <label className="auth-field-label">
                <span className="label-icon-box coral">
                  <Smartphone size={15} />
                </span>
                <span>Phone number</span>
              </label>
              <div className="phone-dual-input-row">
                <div className="country-code-select-box">
                  <span className="flag-small">🇮🇳</span>
                  <span>{countryCode}</span>
                  <span className="caret-down">⌄</span>
                </div>
                <input
                  type="tel"
                  className="auth-text-input phone-input"
                  placeholder="Please enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  autoComplete="tel"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="auth-input-group">
              <label className="auth-field-label">
                <span className="label-icon-box coral">
                  <Mail size={15} />
                </span>
                <span>Email address</span>
              </label>
              <div className="single-input-row">
                <input
                  type="email"
                  className="auth-text-input"
                  placeholder="Please enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>
          )}

          {/* Password Field */}
          <div className="auth-input-group">
            <label className="auth-field-label">
              <span className="label-icon-box coral">
                <Lock size={15} />
              </span>
              <span>Set Password</span>
            </label>
            <div className="password-input-row">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-text-input password-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="auth-input-group">
            <label className="auth-field-label">
              <span className="label-icon-box coral">
                <ShieldCheck size={15} />
              </span>
              <span>Confirm Password</span>
            </label>
            <div className="password-input-row">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-text-input password-input"
                placeholder="Please re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-eye-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          {/* Referral / Invitation Code */}
          <div className="auth-input-group">
            <label className="auth-field-label">
              <span className="label-icon-box coral">
                <Gift size={15} />
              </span>
              <span>Invitation code (Optional)</span>
            </label>
            <div className="single-input-row">
              <input
                type="text"
                className="auth-text-input"
                placeholder="Enter invitation code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="auth-options-row" style={{ marginTop: 6, marginBottom: 8 }}>
            <label
              className="remember-checkbox-label"
              onClick={() => setAgreeTerms(!agreeTerms)}
            >
              <div className={`checkbox-circle ${agreeTerms ? 'checked' : ''}`}>
                {agreeTerms && <Check size={12} className="check-icon" />}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                I have read and agree to the <span style={{ color: '#ff6054', fontWeight: 600 }}>Privacy Agreement</span>
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="auth-action-buttons-group">
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Creating Account...' : 'Register'}
            </button>

            <button
              type="button"
              className="auth-btn-secondary"
              onClick={() => {
                sound.playTick?.()
                onNavigate('login')
              }}
            >
              I have an account, Log in
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

export default RegisterPage
