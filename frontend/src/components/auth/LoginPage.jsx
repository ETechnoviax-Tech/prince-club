import { useState } from 'react'
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Check,
  Smartphone,
  Mail,
  Lock,
  Headphones,
  ShieldCheck,
} from 'lucide-react'
import { loginUser } from '../../api/client.js'
import { SliderCaptchaModal } from './SliderCaptchaModal.jsx'
import { sound } from '../../utils/audio.js'

export function LoginPage({ onAuthSuccess, onNavigate, canClose, onClose }) {
  const [loginTab, setLoginTab] = useState('phone') // 'phone' | 'email'
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberPassword, setRememberPassword] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [captchaOpen, setCaptchaOpen] = useState(false)

  function handleSubmit(e) {
    e?.preventDefault?.()
    const identifier = loginTab === 'phone' ? phone.trim() : email.trim()

    if (!identifier) {
      setError(`Please enter your ${loginTab === 'phone' ? 'phone number' : 'email address'}.`)
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
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setError(null)
    sound.playTick?.()
    // Open Slider Puzzle Captcha before executing login
    setCaptchaOpen(true)
  }

  async function executeLogin(captcha = {}) {
    setCaptchaOpen(false)
    const identifier = loginTab === 'phone' ? phone.trim() : email.trim()
    setLoading(true)
    sound.playBet?.()

    try {
      const res = await loginUser(identifier, password.trim(), captcha.captchaToken, captcha.captchaProof)
      setSuccessMsg('Welcome back! Logging in...')
      sound.playWin?.()
      setTimeout(() => {
        onAuthSuccess?.(res.user, res.wallet)
        if (canClose) onClose?.()
      }, 500)
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-root auth-page-login">
      {/* CORAL BRAND HEADER */}
      <div className="auth-coral-header">
        <div className="auth-top-navbar">
          {canClose ? (
            <button className="auth-nav-back-btn" onClick={onClose} aria-label="Close">
              <ChevronLeft size={24} />
            </button>
          ) : (
            <div className="auth-nav-shield-badge" title="Authentication Required">
              <ShieldCheck size={18} />
            </div>
          )}

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
          <h1 className="auth-page-heading">Log in</h1>
          <p className="auth-page-subtext">Please log in with your phone number or email</p>
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
            <span>Phone Number</span>
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
            <span>Email</span>
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
                  placeholder="Enter phone number"
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
              <span>Password</span>
            </label>
            <div className="password-input-row">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-text-input password-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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

          {/* Options Row */}
          <div className="auth-options-row">
            <label
              className="remember-checkbox-label"
              onClick={() => setRememberPassword(!rememberPassword)}
            >
              <div className={`checkbox-circle ${rememberPassword ? 'checked' : ''}`}>
                {rememberPassword && <Check size={12} className="check-icon" />}
              </div>
              <span>Remember password</span>
            </label>

            <button
              type="button"
              className="forgot-password-link"
              onClick={() => {
                sound.playTick?.()
                onNavigate('forgot')
              }}
            >
              Forgot password?
            </button>
          </div>

          {/* Action Buttons */}
          <div className="auth-action-buttons-group">
            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>

            <button
              type="button"
              className="auth-btn-secondary"
              onClick={() => {
                sound.playTick?.()
                onNavigate('register')
              }}
            >
              Register
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

      {/* Slide-to-Verify Jigsaw Puzzle Captcha Modal */}
      <SliderCaptchaModal
        isOpen={captchaOpen}
        onSuccess={executeLogin}
        onClose={() => setCaptchaOpen(false)}
      />
    </div>
  )
}

export default LoginPage
