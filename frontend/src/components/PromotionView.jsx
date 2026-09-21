import React, { useState, useEffect, useCallback } from 'react'
import {
  Trophy,
  Users,
  Copy,
  Check,
  Share2,
  TrendingUp,
  Percent,
  HelpCircle,
  Award,
  ExternalLink,
  RefreshCw,
  UserPlus,
} from 'lucide-react'
import { fetchPromotionStats } from '../api/client'

export function PromotionView({ currentUser, userId, onCopyNotification }) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [loading, setLoading] = useState(false)

  const activeUserId = currentUser?.id || userId

  // Real Agent Promotion stats from server
  const [promoData, setPromoData] = useState({
    referralCode: currentUser?.referral_code || `PC${String(activeUserId || '69CLUB').replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}`,
    referralLink: '',
    yesterdayCommission: '0.00',
    directSubordinates: 0,
    totalTeamMembers: 0,
    teamTurnover: '0.00',
    cumulativeTotal: '0.00',
    subordinates: [],
  })

  const loadPromotionData = useCallback(async () => {
    if (!activeUserId) return
    try {
      setLoading(true)
      const data = await fetchPromotionStats(activeUserId)
      if (data?.success) {
        setPromoData({
          referralCode: data.referralCode || promoData.referralCode,
          referralLink: data.referralLink || '',
          yesterdayCommission: data.yesterdayCommission || '0.00',
          directSubordinates: Number(data.directSubordinates || 0),
          totalTeamMembers: Number(data.totalTeamMembers || 0),
          teamTurnover: data.teamTurnover || '0.00',
          cumulativeTotal: data.cumulativeTotal || '0.00',
          subordinates: data.subordinates || [],
        })
      }
    } catch (err) {
      console.warn('[PromotionView] Could not load promotion data:', err.message)
    } finally {
      setLoading(false)
    }
  }, [activeUserId])

  useEffect(() => {
    loadPromotionData()
  }, [loadPromotionData])

  const appOrigin =
    typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost')
      ? window.location.origin
      : import.meta.env?.VITE_APP_DOMAIN
      ? `https://${import.meta.env.VITE_APP_DOMAIN}`
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://69club1.site'

  const effectiveReferralCode = promoData.referralCode
  const effectiveReferralLink = promoData.referralLink || `${appOrigin}?ref=${effectiveReferralCode}`

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(effectiveReferralCode)
    setCopiedCode(true)
    if (onCopyNotification) onCopyNotification('Referral code copied to clipboard!')
    setTimeout(() => setCopiedCode(false), 2500)
  }

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(effectiveReferralLink)
    setCopiedLink(true)
    if (onCopyNotification) onCopyNotification('Invitation link copied! Share with friends.')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🔥 Join me on 69 Club! Real-time Color Trading & Aviator games with instant UPI payouts. Use my invite code: ${effectiveReferralCode} to get free ₹200 welcome bonus!\n${effectiveReferralLink}`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const handleShareTelegram = () => {
    const text = encodeURIComponent(
      `🔥 Join 69 Club! Color Prediction & Aviator. Code: ${effectiveReferralCode}`
    )
    window.open(`https://t.me/share/url?url=${encodeURIComponent(effectiveReferralLink)}&text=${text}`, '_blank')
  }

  return (
    <div className="promotion-page-container">
      {/* Header */}
      <header className="page-header-simple">
        <div className="header-brand-wrap" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-badge-circle">
              <Trophy size={16} className="text-orange" />
            </div>
            <div>
              <h3 className="page-header-title">Agent Promotion</h3>
              <p className="page-header-subtitle">Earn unlimited lifetime commission on team bets</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-refresh-stats"
            onClick={loadPromotionData}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#ff5200',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Refresh promotion stats"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Summary Commission Card (Real Live Backend Data) */}
      <div className="promo-stats-hero">
        <div className="promo-stat-main">
          <span className="stat-label">Yesterday’s Total Commission</span>
          <div className="stat-value-row">
            <span className="stat-currency">₹</span>
            <strong className="stat-large">{promoData.yesterdayCommission}</strong>
          </div>
          <span className="stat-note">Commission settles automatically every night at 00:00 AM</span>
        </div>

        <div className="promo-stats-grid">
          <div className="promo-stat-cell">
            <span className="cell-num">{promoData.directSubordinates}</span>
            <span className="cell-desc">Direct Subordinates</span>
          </div>
          <div className="promo-stat-cell">
            <span className="cell-num">{promoData.totalTeamMembers}</span>
            <span className="cell-desc">Total Team Members</span>
          </div>
          <div className="promo-stat-cell">
            <span className="cell-num">₹{promoData.teamTurnover}</span>
            <span className="cell-desc">Team Turnover</span>
          </div>
          <div className="promo-stat-cell">
            <span className="cell-num">₹{promoData.cumulativeTotal}</span>
            <span className="cell-desc">Cumulative Total</span>
          </div>
        </div>
      </div>

      {/* Referral Code & Invitation Link Box */}
      <div className="promo-link-card">
        <h4 className="promo-card-heading">Invite Link & Code</h4>

        <div className="share-box-row">
          <div className="share-field">
            <span className="share-field-label">Invitation Code</span>
            <strong className="share-field-val">{effectiveReferralCode}</strong>
          </div>
          <button className="btn-copy-action" onClick={handleCopyCode}>
            {copiedCode ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="share-box-row">
          <div className="share-field">
            <span className="share-field-label">Invite Link</span>
            <span className="share-field-link">{effectiveReferralLink}</span>
          </div>
          <button className="btn-copy-action btn-copy-primary" onClick={handleCopyLink}>
            {copiedLink ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
            <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Quick Social Share */}
        <div className="social-share-actions">
          <button className="btn-social btn-whatsapp" onClick={handleShareWhatsApp}>
            <span>💬 Share via WhatsApp</span>
          </button>
          <button className="btn-social btn-telegram" onClick={handleShareTelegram}>
            <span>✈️ Share on Telegram</span>
          </button>
        </div>
      </div>

      {/* Team Subordinates List */}
      <div className="promo-rules-card" style={{ marginTop: '16px' }}>
        <h4 className="promo-card-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={16} className="text-orange" />
          <span>My Team Subordinates ({promoData.totalTeamMembers})</span>
        </h4>

        {promoData.subordinates && promoData.subordinates.length > 0 ? (
          <div className="team-subordinates-list" style={{ marginTop: '10px' }}>
            {promoData.subordinates.map((sub, i) => (
              <div
                key={sub.id || i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{sub.username}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    Joined: {new Date(sub.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: sub.tier?.includes('Direct') ? '#e0f2fe' : '#f1f5f9',
                    color: sub.tier?.includes('Direct') ? '#0284c7' : '#64748b',
                  }}
                >
                  {sub.tier}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748b', fontSize: 13 }}>
            No team members joined yet. Copy your invitation link above and share it with friends to build your team!
          </div>
        )}
      </div>

      {/* Commission Rates Table */}
      <div className="promo-rates-card">
        <h4 className="promo-card-heading">Commission Rebate Ratio</h4>
        <div className="rates-table">
          <div className="rates-row rates-head">
            <span>Level</span>
            <span>Turnover Rebate</span>
            <span>Requirements</span>
          </div>
          <div className="rates-row">
            <strong>Tier 1 (Direct)</strong>
            <span className="rate-highlight">0.60%</span>
            <span>Direct referrals</span>
          </div>
          <div className="rates-row">
            <strong>Tier 2 (Indirect)</strong>
            <span className="rate-highlight">0.18%</span>
            <span>Tier 1 referrals</span>
          </div>
          <div className="rates-row">
            <strong>Tier 3 (Team)</strong>
            <span className="rate-highlight">0.05%</span>
            <span>Tier 2 referrals</span>
          </div>
        </div>
      </div>

      {/* Promotion Rules */}
      <div className="promo-rules-card">
        <h4 className="promo-card-heading">Rules & Details</h4>
        <ul className="promo-rules-list">
          <li>1. Commission is calculated automatically based on the turnover of your team's bets across all games.</li>
          <li>2. Commission is credited to your wallet balance daily at 00:00 AM.</li>
          <li>3. You can withdraw your commission immediately via UPI or IMPS Bank account.</li>
          <li>4. No upper limit on invitations or total team earnings.</li>
        </ul>
      </div>
    </div>
  )
}

export default PromotionView
