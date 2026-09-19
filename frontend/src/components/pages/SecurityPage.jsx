import React, { useState } from 'react'
import { ArrowLeft, Shield, Lock, Smartphone, Mail, Key, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react'

export default function SecurityPage({ onBack, currentUser, onOpenChangePassword }) {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const os = /android/i.test(userAgent)
    ? 'Android Mobile'
    : /iphone|ipad|ipod/i.test(userAgent)
    ? 'iOS Mobile'
    : /windows/i.test(userAgent)
    ? 'Windows PC'
    : /mac/i.test(userAgent)
    ? 'macOS'
    : 'Device'
  const browser = /chrome/i.test(userAgent) && !/edg/i.test(userAgent)
    ? 'Chrome'
    : /safari/i.test(userAgent) && !/chrome/i.test(userAgent)
    ? 'Safari'
    : /edg/i.test(userAgent)
    ? 'Edge'
    : /firefox/i.test(userAgent)
    ? 'Firefox'
    : 'Browser'

  const [deviceList] = useState([
    { id: 1, device: `${browser} / ${os}`, ip: 'Current Device', time: 'Active now', isCurrent: true },
  ])

  return (
    <div className="standalone-page-container">
      {/* Header */}
      <header className="standalone-page-header">
        <button className="standalone-back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="standalone-page-title">Security Center</h2>
        <div style={{ width: 34 }} />
      </header>

      <div className="standalone-page-content">
        {/* Security Health Score Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: 18,
            padding: '20px 18px',
            color: '#ffffff',
            boxShadow: '0 6px 20px rgba(15, 23, 42, 0.2)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid #10b981',
              display: 'grid',
              placeItems: 'center',
              color: '#10b981',
              flexShrink: 0,
            }}
          >
            <Shield size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 17, fontWeight: 900, color: '#ffffff' }}>High Security</span>
              <span style={{ background: '#10b981', color: '#ffffff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 8 }}>
                95%
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              Dual verification, password hashing, and anti-inspect shield enabled.
            </p>
          </div>
        </div>

        {/* Security Settings List */}
        <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 12px 2px' }}>
          Account Credentials
        </h4>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
          {/* Change Password */}
          <div
            className="menu-list-row"
            onClick={onOpenChangePassword}
            style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
          >
            <div className="menu-row-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="menu-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Lock size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>Login Password</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Change your account login credentials</div>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </div>

          {/* Withdrawal PIN */}
          <div
            className="menu-list-row"
            onClick={onOpenChangePassword}
            style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
          >
            <div className="menu-row-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="menu-icon-box" style={{ background: '#fef3c7', color: '#b45309' }}>
                <Key size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>Withdrawal PIN</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>6-digit PIN required for balance payouts</div>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
          </div>

          {/* Bound Phone */}
          <div
            className="menu-list-row"
            style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}
          >
            <div className="menu-row-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="menu-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <Smartphone size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>Bound Phone</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {currentUser?.phone ? `+91 ${currentUser.phone.slice(0, 3)}••••${currentUser.phone.slice(-3)}` : 'Bound verified'}
                </div>
              </div>
            </div>
            <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
          </div>

          {/* Anti-Inspect Shield Status */}
          <div
            className="menu-list-row"
            style={{ padding: '14px 16px' }}
          >
            <div className="menu-row-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="menu-icon-box" style={{ background: '#fdf2f8', color: '#db2777' }}>
                <Shield size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>Anti-Inspect Shield</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Prevents unauthorized console & devtools inspection</div>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 10 }}>
              ACTIVE
            </span>
          </div>
        </div>

        {/* Active Login Devices */}
        <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 12px 2px' }}>
          Authorized Sessions
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {deviceList.map((dev) => (
            <div
              key={dev.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{dev.device}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>IP: {dev.ip} · {dev.time}</div>
              </div>
              {dev.isCurrent ? (
                <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a' }}>Current</span>
              ) : (
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Saved</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
