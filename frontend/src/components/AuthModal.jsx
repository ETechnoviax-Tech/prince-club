import { useState, useEffect } from 'react'
import { LoginPage } from './auth/LoginPage.jsx'
import { RegisterPage } from './auth/RegisterPage.jsx'
import { ForgotPasswordPage } from './auth/ForgotPasswordPage.jsx'
import { VerifyOtpPage } from './auth/VerifyOtpPage.jsx'
import { ResetPasswordPage } from './auth/ResetPasswordPage.jsx'

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  canClose = true,
}) {
  const [mode, setMode] = useState(initialMode) // 'login' | 'register' | 'signup' | 'forgot' | 'verify-otp' | 'reset'
  const [resetData, setResetData] = useState({
    identity: '',
    channel: 'WHATSAPP',
    destination: '',
    resetCode: '',
  })

  // Synchronize mode whenever initialMode or isOpen changes
  useEffect(() => {
    if (isOpen) {
      const targetMode = initialMode === 'signup' ? 'register' : initialMode || 'login'
      setMode(targetMode)
    }
  }, [isOpen, initialMode])

  if (!isOpen) return null

  const handleNavigate = (newMode) => {
    const targetMode = newMode === 'signup' ? 'register' : newMode
    setMode(targetMode)
  }

  const handleOtpSent = ({ identity, channel, destination }) => {
    setResetData((prev) => ({
      ...prev,
      identity,
      channel: channel || prev.channel,
      destination: destination || identity,
      resetCode: '',
    }))
  }

  const handleOtpVerified = ({ identity, resetCode }) => {
    setResetData((prev) => ({
      ...prev,
      identity: identity || prev.identity,
      resetCode,
    }))
  }

  return (
    <div
      className={`auth-overlay-backdrop ${!canClose ? 'auth-gate-locked' : ''}`}
      onClick={canClose ? onClose : undefined}
    >
      <div className="auth-sheet-container" onClick={(e) => e.stopPropagation()}>
        {(mode === 'login') && (
          <LoginPage
            onAuthSuccess={onAuthSuccess}
            onNavigate={handleNavigate}
            canClose={canClose}
            onClose={onClose}
          />
        )}

        {(mode === 'register' || mode === 'signup') && (
          <RegisterPage
            onAuthSuccess={onAuthSuccess}
            onNavigate={handleNavigate}
            canClose={canClose}
            onClose={onClose}
          />
        )}

        {(mode === 'forgot') && (
          <ForgotPasswordPage
            onNavigate={handleNavigate}
            onOtpSent={handleOtpSent}
          />
        )}

        {(mode === 'verify-otp') && (
          <VerifyOtpPage
            identity={resetData.identity}
            channel={resetData.channel}
            destination={resetData.destination}
            onNavigate={handleNavigate}
            onVerified={handleOtpVerified}
          />
        )}

        {(mode === 'reset') && (
          <ResetPasswordPage
            initialIdentity={resetData.identity}
            initialCode={resetData.resetCode}
            onNavigate={handleNavigate}
          />
        )}
      </div>
    </div>
  )
}

export default AuthModal
