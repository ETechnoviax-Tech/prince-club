import React, { useState } from 'react'
import { ArrowLeft, Gift, Sparkles, CheckCircle2, Copy, Trophy, Calendar, AlertCircle } from 'lucide-react'

export default function GiftsPage({ onBack, onRedeemGift, balance = 0 }) {
  const [giftCode, setGiftCode] = useState('')
  const [redeemStatus, setRedeemStatus] = useState(null)
  const [isRedeeming, setIsRedeeming] = useState(false)

  const [history, setHistory] = useState([
    { code: 'WELCOME69', amount: 50, date: 'Today, 10:24 AM', status: 'Claimed' },
    { code: 'VIPDAILY2026', amount: 30, date: 'Yesterday, 04:15 PM', status: 'Claimed' },
  ])

  const handleClaim = () => {
    if (!giftCode.trim()) {
      setRedeemStatus({ type: 'error', message: 'Please enter a valid gift code.' })
      return
    }

    setIsRedeeming(true)
    setTimeout(() => {
      setIsRedeeming(false)
      const codeUpper = giftCode.trim().toUpperCase()
      if (codeUpper === '69CLUB' || codeUpper === 'SUPER69' || codeUpper === 'BONUS100') {
        const reward = 100
        setRedeemStatus({
          type: 'success',
          message: `🎉 Success! ₹${reward}.00 has been credited to your wallet.`,
        })
        setHistory((prev) => [
          { code: codeUpper, amount: reward, date: 'Just now', status: 'Claimed' },
          ...prev,
        ])
        setGiftCode('')
        if (typeof onRedeemGift === 'function') {
          onRedeemGift(reward)
        }
      } else {
        setRedeemStatus({
          type: 'error',
          message: 'Invalid or expired redemption code. Please check with your VIP manager.',
        })
      }
    }, 800)
  }

  return (
    <div className="standalone-page-container">
      {/* Header */}
      <header className="standalone-page-header">
        <button className="standalone-back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="standalone-page-title">Gifts & Rewards</h2>
        <div style={{ width: 34 }} />
      </header>

      <div className="standalone-page-content">
        {/* Banner Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ff6054 0%, #f2413b 50%, #e62c25 100%)',
            borderRadius: 18,
            padding: '20px 18px',
            color: '#ffffff',
            boxShadow: '0 6px 20px rgba(230, 44, 37, 0.3)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 12, fontWeight: 700 }}>
              HONGBAO REWARDS
            </span>
            <h3 style={{ margin: '8px 0 4px', fontSize: 20, fontWeight: 900 }}>Redeem Gift Codes</h3>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>
              Enter gift codes from Telegram / WhatsApp to claim free cash.
            </p>
          </div>
          <div style={{ fontSize: 44, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
            🎁
          </div>
        </div>

        {/* Gift Code Input Box */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 18,
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            marginBottom: 20,
          }}
        >
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            Enter Gift Code
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              className="utr-input"
              placeholder="e.g. 69CLUB, SUPER69"
              value={giftCode}
              onChange={(e) => {
                setGiftCode(e.target.value)
                setRedeemStatus(null)
              }}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1.5px solid #cbd5e1',
                fontSize: 14,
                fontWeight: 700,
                color: '#0f172a',
                textTransform: 'uppercase',
              }}
            />
            <button
              className="deposit-submit-btn"
              onClick={handleClaim}
              disabled={isRedeeming || !giftCode.trim()}
              style={{
                padding: '0 20px',
                width: 'auto',
                fontSize: 14,
                whiteSpace: 'nowrap',
              }}
            >
              {isRedeeming ? 'Checking...' : 'Claim'}
            </button>
          </div>

          {redeemStatus && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: redeemStatus.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: redeemStatus.type === 'success' ? '#16a34a' : '#dc2626',
                border: `1px solid ${redeemStatus.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {redeemStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{redeemStatus.message}</span>
            </div>
          )}
        </div>

        {/* Available Gift Packages */}
        <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 12px 2px' }}>
          Exclusive Perks
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: 14,
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>📅</div>
            <h5 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
              Attendance Streak
            </h5>
            <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>
              Claim daily rewards by logging in 7 consecutive days.
            </p>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: 14,
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>🎡</div>
            <h5 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
              Lucky Spin Wheel
            </h5>
            <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>
              Get ₹500 free cash spins every 24 hours.
            </p>
          </div>
        </div>

        {/* Redemption History */}
        <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 12px 2px' }}>
          Redemption History
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map((h, i) => (
            <div
              key={i}
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
                <strong style={{ fontSize: 13, color: '#0f172a' }}>{h.code}</strong>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{h.date}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>
                +₹{h.amount}.00
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
