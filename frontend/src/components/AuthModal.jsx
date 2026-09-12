import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  UserPlus,
  X,
} from 'lucide-react'
import {
  forgotPassword,
  loginUser,
  resetPassword,
  signupUser,
} from '../api/client.js'

export function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode) // 'login' | 'signup' | 'forgot' | 'reset'
  const [channel, setChannel] = useState('WHATSAPP') // 'WHATSAPP' | 'EMAIL'
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Form Fields
  const [username, setUsername] = useState('')
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
    if (!username.trim()) {
      setError('Please enter your username or phone number.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await loginUser(username.trim(), password.trim())
      setSuccessMsg('Welcome back! Logging in...')
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

  // 2. Quick Demo Login
  async function handleDemoLogin() {
    setError(null)
    setLoading(true)
    try {
      const demoId = 'trader_' + Math.random().toString(36).substring(2, 6)
      const res = await loginUser(demoId, 'demo1234')
      setSuccessMsg('Logged in as Guest Trader!')
      setTimeout(() => {
        onAuthSuccess?.(res.user, res.wallet)
        onClose()
      }, 500)
    } catch (err) {
      setError(err.message || 'Demo login failed')
    } finally {
      setLoading(false)
    }
  }

  // 3. Handle Signup
  async function handleSignup(e) {
    e?.preventDefault?.()
    if (!username.trim()) {
      setError('Please enter a username or phone number.')
      return
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.')
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
    try {
      const res = await signupUser(
        username.trim(),
        email.trim() || undefined,
        password,
        referralCode.trim() || undefined
      )
      setSuccessMsg('Account created successfully!')
      setTimeout(() => {
        onAuthSuccess?.(res.user, res.wallet)
        onClose()
      }, 600)
    } catch (err) {
      setError(err.message || 'Signup failed. Please try another username.')
    } finally {
      setLoading(false)
    }
  }

  // 4. Handle Forgot Password (WhatsApp / Email OTP)
  async function handleForgot(e) {
    e?.preventDefault?.()
    if (!identity.trim()) {
      setError(
        channel === 'WHATSAPP'
          ? 'Please enter your WhatsApp mobile number.'
          : 'Please enter your registered email address.'
      )
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await forgotPassword(identity.trim(), channel)
      setSuccessMsg(
        res.message ||
          `Verification code sent via ${channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'}! Code: ${res.resetCode}`
      )
      if (res.resetCode) {
        setResetCode(res.resetCode)
      }
      setTimeout(() => {
        setMode('reset')
      }, 1200)
    } catch (err) {
      setError(err.message || 'Could not send verification OTP. Please verify details.')
    } finally {
      setLoading(false)
    }
  }

  // 5. Handle Reset Password
  async function handleResetSubmit(e) {
    e?.preventDefault?.()
    if (!resetCode.trim()) {
      setError('Please enter the 6-digit verification code.')
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
      await resetPassword(identity.trim() || username.trim(), resetCode.trim(), newPassword)
      setSuccessMsg('Password updated! Redirecting to login...')
      setTimeout(() => {
        setPassword(newPassword)
        switchMode('login')
      }, 1200)
    } catch (err) {
      setError(err.message || 'Failed to reset password. Check code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card auth-modal-card">
        {/* Modal Header */}
        <div className="auth-header">
          <div className="auth-title-group">
            <div className="auth-icon-badge">
              {mode === 'login' ? (
                <LogIn size={20} />
              ) : mode === 'signup' ? (
                <UserPlus size={20} />
              ) : (
                <KeyRound size={20} />
              )}
            </div>
            <div>
              <h3>
                {mode === 'login' && 'Sign In to Prince Club'}
                {mode === 'signup' && 'Create Player Account'}
                {mode === 'forgot' && 'Reset Password'}
                {mode === 'reset' && 'Set New Password'}
              </h3>
              <p>
                {mode === 'login' && 'Enter your credentials to access live rounds'}
                {mode === 'signup' && 'Join & receive ₹1,000 instant virtual credits'}
                {mode === 'forgot' && 'Receive a 6-digit verification OTP'}
                {mode === 'reset' && 'Create a secure new password for your account'}
              </p>
            </div>
          </div>
          <button
            className="icon-close-button"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Tab Switcher: Direct access to Login, Register, Forgot, Reset */}
        <div className="auth-tab-bar">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Register
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'forgot' ? 'active' : ''}`}
            onClick={() => switchMode('forgot')}
          >
            Forgot
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'reset' ? 'active' : ''}`}
            onClick={() => switchMode('reset')}
          >
            Reset
          </button>
        </div>

        {/* Error / Success Feedback */}
        {error && (
          <div className="alert-box alert-box--error">
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert-box alert-box--success">
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. LOGIN VIEW */}
        {mode === 'login' && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="input-label">Username / Phone</label>
              <div className="auth-input-wrap">
                <User size={16} className="field-icon" />
                <input
                  type="text"
                  placeholder="e.g. trader99 or 9876543210"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="field-label-row">
                <label className="input-label">Password</label>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setIdentity(username)
                    switchMode('forgot')
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="auth-input-wrap">
                <Lock size={16} className="field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="field-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="primary-action-btn auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight size={18} />
            </button>

            <div className="auth-divider">
              <span>or quick start</span>
            </div>

            <button
              type="button"
              className="auth-demo-btn"
              disabled={loading}
              onClick={handleDemoLogin}
            >
              <Sparkles size={16} /> 1-Click Guest Trader Login
            </button>

            <div className="auth-footer-prompt">
              <span>Don't have an account?</span>
              <button
                type="button"
                className="auth-link-bold"
                onClick={() => switchMode('signup')}
              >
                Sign Up Now
              </button>
            </div>
          </form>
        )}

        {/* 2. SIGNUP VIEW */}
        {mode === 'signup' && (
          <form className="auth-form" onSubmit={handleSignup}>
            <div className="auth-field">
              <label className="input-label">
                Username / Phone <span className="required-star">*</span>
              </label>
              <div className="auth-input-wrap">
                <User size={16} className="field-icon" />
                <input
                  type="text"
                  placeholder="Choose username (min 3 chars)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="input-label">Email Address (Optional)</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="input-label">
                Password <span className="required-star">*</span>
              </label>
              <div className="auth-input-wrap">
                <Lock size={16} className="field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="field-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="input-label">
                Confirm Password <span className="required-star">*</span>
              </label>
              <div className="auth-input-wrap">
                <Lock size={16} className="field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="input-label">
                Referral / Invitation Code (Optional)
              </label>
              <div className="auth-input-wrap">
                <Gift size={16} className="field-icon gold" />
                <input
                  type="text"
                  placeholder="Bonus code (e.g. VIP2026)"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="primary-action-btn auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register & Claim ₹1,000 Bonus'}
              <ArrowRight size={18} />
            </button>

            <div className="auth-footer-prompt">
              <span>Already have an account?</span>
              <button
                type="button"
                className="auth-link-bold"
                onClick={() => switchMode('login')}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* 3. FORGOT PASSWORD VIEW (WhatsApp & Email OTP) */}
        {mode === 'forgot' && (
          <form className="auth-form" onSubmit={handleForgot}>
            {/* Multi-Channel OTP Selector */}
            <div className="otp-channel-selector">
              <button
                type="button"
                className={`otp-channel-btn ${channel === 'WHATSAPP' ? 'active whatsapp' : ''}`}
                onClick={() => setChannel('WHATSAPP')}
              >
                <Smartphone size={16} /> WhatsApp OTP
              </button>
              <button
                type="button"
                className={`otp-channel-btn ${channel === 'EMAIL' ? 'active email' : ''}`}
                onClick={() => setChannel('EMAIL')}
              >
                <Mail size={16} /> Email OTP
              </button>
            </div>

            <div className="auth-field">
              <label className="input-label">
                {channel === 'WHATSAPP' ? 'WhatsApp Phone Number' : 'Registered Email Address'}{' '}
                <span className="required-star">*</span>
              </label>
              <div className="auth-input-wrap">
                {channel === 'WHATSAPP' ? (
                  <Phone size={16} className="field-icon" />
                ) : (
                  <Mail size={16} className="field-icon" />
                )}
                <input
                  type={channel === 'WHATSAPP' ? 'tel' : 'email'}
                  placeholder={
                    channel === 'WHATSAPP'
                      ? 'Enter mobile number (e.g. 9876543210)'
                      : 'Enter email address (e.g. user@gmail.com)'
                  }
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  required
                />
              </div>
              <span className="input-hint">
                {channel === 'WHATSAPP'
                  ? 'We will send a 6-digit verification code directly to your WhatsApp.'
                  : 'We will send a 6-digit verification code to your email inbox.'}
              </span>
            </div>

            <button
              type="submit"
              className="primary-action-btn auth-submit-btn"
              disabled={loading || !identity.trim()}
            >
              {loading
                ? 'Sending OTP...'
                : channel === 'WHATSAPP'
                ? 'Send WhatsApp OTP'
                : 'Send Email OTP'}
              <ArrowRight size={18} />
            </button>

            <div className="auth-footer-prompt">
              <button
                type="button"
                className="auth-link-back"
                onClick={() => switchMode('login')}
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* 4. RESET PASSWORD VIEW */}
        {mode === 'reset' && (
          <form className="auth-form" onSubmit={handleResetSubmit}>
            <div className="auth-field">
              <label className="input-label">
                6-Digit Verification Code <span className="required-star">*</span>
              </label>
              <div className="auth-input-wrap">
                <KeyRound size={16} className="field-icon" />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 482910"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  required
                  className="code-input"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="input-label">
                New Password <span className="required-star">*</span>
              </label>
              <div className="auth-input-wrap">
                <Lock size={16} className="field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="field-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="input-label">
                Confirm New Password <span className="required-star">*</span>
              </label>
              <div className="auth-input-wrap">
                <Lock size={16} className="field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="primary-action-btn auth-submit-btn"
              disabled={loading || !resetCode.trim() || newPassword.length < 6}
            >
              {loading ? 'Updating Password...' : 'Save New Password & Log In'}
              <ArrowRight size={18} />
            </button>

            <div className="auth-footer-prompt">
              <button
                type="button"
                className="auth-link-back"
                onClick={() => switchMode('login')}
              >
                <ArrowLeft size={16} /> Cancel & Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
