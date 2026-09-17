import React, { useState } from 'react'
import { Lock, Key, AlertTriangle, Eye, EyeOff, ShieldCheck } from 'lucide-react'

export function AdminGate({
  adminKey,
  setAdminKey,
  onVerify,
  verifying,
  verifyError,
  currentUser,
}) {
  const [showKey, setShowKey] = useState(false)
  const isDbAdmin = Boolean(currentUser?.role === 'admin' || currentUser?.is_admin === true)

  const handleSubmit = (e) => {
    e.preventDefault()
    onVerify()
  }

  return (
    <div className="admin-verify-card">
      <div className="verify-shield-icon">
        <Lock size={32} />
      </div>

      <h3 className="verify-title">Dual-Verification Security Gate</h3>
      <p className="verify-desc">
        To access the Authoritative Admin Dashboard, this system enforces mandatory two-step security validation.
      </p>

      {/* Step Validation Status Box */}
      <div className="verify-steps-box">
        <div className="verify-step-item">
          <span className={`verify-step-badge ${isDbAdmin ? 'passed' : 'pending'}`}>
            {isDbAdmin ? '✓ Passed' : '1. DB Check'}
          </span>
          <div className="verify-step-info">
            <strong>Database Role Verification</strong>
            <p>
              Account must have <code>role: 'admin'</code> or <code>is_admin: true</code> in database.
              Current status: <span style={{ fontWeight: 'bold', color: isDbAdmin ? '#16a34a' : '#dc2626' }}>{currentUser?.role || 'user'}</span>
            </p>
          </div>
        </div>

        <div className="verify-step-item">
          <span className="verify-step-badge pending">2. Backend</span>
          <div className="verify-step-info">
            <strong>Backend Master Key Verification</strong>
            <p>Cryptographic master secret key configured in environment variables.</p>
          </div>
        </div>
      </div>

      {verifyError && (
        <div className="verify-error-msg">
          <AlertTriangle size={16} />
          <span>{verifyError}</span>
        </div>
      )}

      {!isDbAdmin && (
        <div className="verify-error-msg">
          <AlertTriangle size={16} />
          <span>Notice: Logged-in account does not possess admin privileges in the database yet.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="verify-input-wrapper">
          <label className="verify-input-label">Backend Master Secret Key</label>
          <div className="verify-input-box">
            <Key size={16} className="input-lead-icon" />
            <input
              type={showKey ? 'text' : 'password'}
              className="verify-text-input"
              placeholder="Enter ADMIN_SECRET_KEY..."
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="verify-eye-toggle"
              onClick={() => setShowKey(!showKey)}
              tabIndex={-1}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="verify-submit-btn"
          disabled={verifying || !adminKey.trim()}
        >
          <ShieldCheck size={18} />
          <span>{verifying ? 'Verifying Credentials...' : 'Verify & Unlock Admin Console'}</span>
        </button>
      </form>
    </div>
  )
}

export default AdminGate
