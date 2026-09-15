import { useState } from 'react'
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Check,
  Smartphone,
  Mail,
  Lock,
  User,
  KeyRound,
  Gift,
  ArrowRight,
  Globe,
} from 'lucide-react'
import {
  forgotPassword,
  loginUser,
  resetPassword,
  signupUser,
} from '../api/client.js'
import { sound } from '../utils/audio.js'

export function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode) // 'login' | 'signup' | 'forgot' | 'reset'
  const [loginTab, setLoginTab] = useState('phone') // 'phone' | 'email'
  const [channel, setChannel] = useState('WHATSAPP') // 'WHATSAPP' | 'EMAIL'
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberPassword, setRememberPassword] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Form Fields
  const [phone, setPhone] = useState('9675042566')
  const [countryCode, setCountryCode] = useState('+91')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [identity, setIdentity] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')

  if (!isOpen) return null

  function resetErrors() {
    setError(null)
    setSuccessMsg(null)
  }

  function switchMode(newMode) {
    resetErrors()
    setMode(newMode)
  }

  // 1. Handle Login
  async function handleLogin(e) {
    e?.preventDefault?.()
    const identifier = loginTab === 'phone' ? phone.trim() : email.trim()
    if (!identifier) {
      setError(`Please enter your ${loginTab === 'phone' ? 'phone number' : 'email address'}.`)
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setError(null)
    setLoading(true)
    sound.playBet?.()

    try {
      const res = await loginUser(identifier, password.trim())
      setSuccessMsg('Welcome back! Logging in...')
      sound.playWin?.()
      setTimeout(() => {
        onAuthSuccess?.(res.user, res.wallet)
        onClose()
      }, 500)
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  // 2. Handle Signup / Register
  async function handleSignup(e) {
    e?.preventDefault?.()
    const identifier = loginTab === 'phone' ? phone.trim() : email.trim()
    if (!identifier) {
      setError(`Please enter a valid ${loginTab === 'phone' ? 'phone number' : 'email'}.`)
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

    setError(null)
    setLoading(true)
    sound.playBet?.()

    try {
      const res = await signupUser(
        identifier,
        loginTab === 'email' ? email.trim() : undefined,
        password,
        referralCode.trim() || undefined
      )
      setSuccessMsg('Account registered successfully!')
      sound.playWin?.()
      setTimeout(() => {
        onAuthSuccess?.(res.user, res.wallet)
        onClose()
      }, 600)
    } catch (err) {
      setError(err.message || 'Signup failed. Please try another number or email.')
    } finally {
      setLoading(false)
    }
  }

  // 3. Handle Forgot Password
  async function handleForgot(e) {
    e?.preventDefault?.()
    const target = identity.trim() || (channel === 'WHATSAPP' ? phone.trim() : email.trim())
    if (!target) {
      setError(channel === 'WHATSAPP' ? 'Please enter your phone number.' : 'Please enter your email.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const res = await forgotPassword(target, channel)
      setSuccessMsg(res.message || `Code sent! (Dev code: ${res.resetCode})`)
      if (res.resetCode) setResetCode(res.resetCode)
      setTimeout(() => setMode('reset'), 1200)
    } catch (err) {
      setError(err.message || 'Could not send OTP.')
    } finally {
      setLoading(false)
    }
  }

  // 4. Handle Reset Password
  async function handleResetSubmit(e) {
    e?.preventDefault?.()
    if (!resetCode.trim()) {
      setError('Please enter the 6-digit code.')
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
    try {
      await resetPassword(identity.trim() || phone.trim() || email.trim(), resetCode.trim(), newPassword)
      setSuccessMsg('Password updated! Redirecting to login...')
      setTimeout(() => {
        setPassword(newPassword)
        switchMode('login')
      }, 1200)
    } catch (err) {
      setError(err.message || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay-backdrop">
      <div className="auth-sheet-container">
        {/* TOP CORAL GRADIENT HEADER (EXACTLY MATCHING SCREENSHOT) */}
        <div className="auth-coral-header">
          <div className="auth-top-navbar">
            <button className="auth-nav-back-btn" onClick={onClose} aria-label="Go Back">
              <ChevronLeft size={24} />
            </button>

            {/* Prince Club Brand Logo */}
            <div className="auth-55club-brand">
              <div className="brand-55-circle">
                <span className="brand-crown-top">👑</span>
                <span className="brand-55-num">PC</span>
              </div>
              <span className="brand-club-text">PRINCE CLUB</span>
            </div>

            {/* Language Selector */}
            <div className="auth-lang-selector">
              <span className="flag-icon">🇺🇸</span>
              <span className="lang-text">EN</span>
            </div>
          </div>

          <div className="auth-header-title-block">
            <h1 className="auth-page-heading">
              {mode === 'login' && 'Log in'}
              {mode === 'signup' && 'Register'}
              {mode === 'forgot' && 'Reset Password'}
              {mode === 'reset' && 'Set New Password'}
            </h1>
            <p className="auth-page-subtext">
              Please log in with your phone number or email<br />
              If you forget your password, please contact customer service
            </p>
          </div>
        </div>

        {/* MAIN BODY CONTAINER */}
        <div className="auth-body-card">
          {/* TAB SWITCHER (Phone Number vs Email) */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="auth-method-tabs">
              <button
                type="button"
                className={`method-tab-btn ${loginTab === 'phone' ? 'active' : ''}`}
                onClick={() => {
                  setLoginTab('phone')
                  resetErrors()
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
                  resetErrors()
                }}
              >
                <div className="tab-icon-box">
                  <Mail size={18} />
                </div>
                <span>Email</span>
                {loginTab === 'email' && <div className="tab-active-indicator" />}
              </button>
            </div>
          )}

          {/* Alert Messages */}
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

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <form className="auth-form-fields" onSubmit={handleLogin}>
              {/* Phone or Email Field */}
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
                      <span>{countryCode}</span>
                      <span className="caret-down">⌄</span>
                    </div>
                    <input
                      type="tel"
                      className="auth-text-input phone-input"
                      placeholder="9675042566"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password view"
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              {/* Options Row (Remember Password & Forgot Password) */}
              <div className="auth-options-row">
                <label className="remember-checkbox-label" onClick={() => setRememberPassword(!rememberPassword)}>
                  <div className={`checkbox-circle ${rememberPassword ? 'checked' : ''}`}>
                    {rememberPassword && <Check size={12} className="check-icon" />}
                  </div>
                  <span>Remember password</span>
                </label>

                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
              </div>

              {/* Action Buttons */}
              <div className="auth-action-buttons-group">
                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Log in'}
                </button>

                <button
                  type="button"
                  className="auth-btn-secondary"
                  onClick={() => switchMode('signup')}
                >
                  Register
                </button>
              </div>
            </form>
          )}

          {/* 2. REGISTER / SIGNUP FORM */}
          {mode === 'signup' && (
            <form className="auth-form-fields" onSubmit={handleSignup}>
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
                      <span>{countryCode}</span>
                      <span className="caret-down">⌄</span>
                    </div>
                    <input
                      type="tel"
                      className="auth-text-input phone-input"
                      placeholder="Please enter phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
                    required
                  />
                  <button
                    type="button"
                    className="password-eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="auth-input-group">
                <label className="auth-field-label">
                  <span className="label-icon-box coral">
                    <Lock size={15} />
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
                    required
                  />
                  <button
                    type="button"
                    className="password-eye-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              {/* Referral Code */}
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
                    placeholder="Please enter invitation code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="auth-action-buttons-group">
                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>

                <button
                  type="button"
                  className="auth-btn-secondary"
                  onClick={() => switchMode('login')}
                >
                  I have an account, Log in
                </button>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD VIEW (OTP) */}
          {mode === 'forgot' && (
            <form className="auth-form-fields" onSubmit={handleForgot}>
              {/* Channel Selector */}
              <div className="otp-channel-toggle-row">
                <button
                  type="button"
                  className={`otp-channel-pill ${channel === 'WHATSAPP' ? 'active' : ''}`}
                  onClick={() => setChannel('WHATSAPP')}
                >
                  WhatsApp OTP
                </button>
                <button
                  type="button"
                  className={`otp-channel-pill ${channel === 'EMAIL' ? 'active' : ''}`}
                  onClick={() => setChannel('EMAIL')}
                >
                  Email OTP
                </button>
              </div>

              <div className="auth-input-group">
                <label className="auth-field-label">
                  <span className="label-icon-box coral">
                    {channel === 'WHATSAPP' ? <Smartphone size={15} /> : <Mail size={15} />}
                  </span>
                  <span>{channel === 'WHATSAPP' ? 'WhatsApp Phone Number' : 'Registered Email'}</span>
                </label>
                <div className="single-input-row">
                  <input
                    type={channel === 'WHATSAPP' ? 'tel' : 'email'}
                    className="auth-text-input"
                    placeholder={channel === 'WHATSAPP' ? 'Enter phone number' : 'Enter email'}
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-action-buttons-group">
                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </button>

                <button
                  type="button"
                  className="auth-btn-secondary"
                  onClick={() => switchMode('login')}
                >
                  Back to Log in
                </button>
              </div>
            </form>
          )}

          {/* 4. RESET PASSWORD VIEW */}
          {mode === 'reset' && (
            <form className="auth-form-fields" onSubmit={handleResetSubmit}>
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
                    placeholder="e.g. 482910"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                  />
                </div>
              </div>

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
                    required
                  />
                  <button
                    type="button"
                    className="password-eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-field-label">
                  <span className="label-icon-box coral">
                    <Lock size={15} />
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
                    required
                  />
                  <button
                    type="button"
                    className="password-eye-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-action-buttons-group">
                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Set Password & Log in'}
                </button>

                <button
                  type="button"
                  className="auth-btn-secondary"
                  onClick={() => switchMode('login')}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
