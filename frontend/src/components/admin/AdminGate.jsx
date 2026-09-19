import React from 'react'
import { AlertTriangle, Lock, ShieldCheck } from 'lucide-react'

export function AdminGate({ onVerify, verifying, verifyError, currentUser }) {
  const isDbAdmin = Boolean(currentUser?.role === 'admin' || currentUser?.is_admin === true)

  return (
    <div className="admin-verify-card">
      <div className="verify-shield-icon">
        <Lock size={32} />
      </div>

      <h3 className="verify-title">Admin Session Verification</h3>
      <p className="verify-desc">
        This private console is available only to an authenticated account with an active
        administrator role in the database.
      </p>

      <div className="verify-steps-box">
        <div className="verify-step-item">
          <span className={`verify-step-badge ${isDbAdmin ? 'passed' : 'pending'}`}>
            {isDbAdmin ? 'Passed' : 'Checking'}
          </span>
          <div className="verify-step-info">
            <strong>Live database role check</strong>
            <p>Client-side role flags are not trusted. The server verifies the current profile.</p>
          </div>
        </div>
      </div>

      {verifyError && (
        <div className="verify-error-msg">
          <AlertTriangle size={16} />
          <span>{verifyError}</span>
        </div>
      )}

      <button
        type="button"
        className="verify-submit-btn"
        onClick={onVerify}
        disabled={verifying}
      >
        <ShieldCheck size={18} />
        <span>{verifying ? 'Checking secure session...' : 'Check secure session'}</span>
      </button>
    </div>
  )
}

export default AdminGate
