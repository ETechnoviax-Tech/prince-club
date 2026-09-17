import React, { useState } from 'react'
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
} from 'lucide-react'

export function PromotionView({ userId, onCopyNotification }) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const referralCode = `PC${String(userId || '78291').replace(/\D/g, '').slice(-5) || '78291'}`
  const appOrigin =
    (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost'))
      ? window.location.origin
      : (import.meta.env?.VITE_APP_DOMAIN ? `https://${import.meta.env.VITE_APP_DOMAIN}` : (typeof window !== 'undefined' ? window.location.origin : 'https://69club1.site'))
  const referralLink = `${appOrigin}?ref=${referralCode}`

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(referralCode)
    setCopiedCode(true)
    if (onCopyNotification) onCopyNotification('Referral code copied to clipboard!')
    setTimeout(() => setCopiedCode(false), 2500)
  }

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(referralLink)
    setCopiedLink(true)
    if (onCopyNotification) onCopyNotification('Invitation link copied! Share with friends.')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🔥 Join me on 69 Club! Real-time Color Trading & Aviator games with instant UPI payouts. Use my invite code: ${referralCode} to get free ₹100 welcome bonus!\n${referralLink}`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const handleShareTelegram = () => {
    const text = encodeURIComponent(
      `🔥 Join 69 Club! Color Prediction & Aviator. Code: ${referralCode}`
    )
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, '_blank')
  }

  return (
    <div className="promotion-page-container">
      {/* Header */}
      <header className="page-header-simple">
        <div className="header-brand-wrap">
          <div className="brand-badge-circle">
            <Trophy size={16} className="text-orange" />
          </div>
          <div>
            <h3 className="page-header-title">Agent Promotion</h3>
            <p className="page-header-subtitle">Earn unlimited lifetime commission on team bets</p>
          </div>
        </div>
      </header>

      {/* Summary Commission Card */}
      <div className="promo-stats-hero">
        <div className="promo-stat-main">
          <span className="stat-label">Yesterday’s Total Commission</span>
          <div className="stat-value-row">
            <span className="stat-currency">₹</span>
            <strong className="stat-large">0.00</strong>
          </div>
          <span className="stat-note">Upgrades settle automatically every night at 00:00 AM</span>
        </div>

        <div className="promo-stats-grid">
          <div className="promo-stat-cell">
            <span className="cell-num">0</span>
            <span className="cell-desc">Direct Subordinates</span>
          </div>
          <div className="promo-stat-cell">
            <span className="cell-num">0</span>
            <span className="cell-desc">Total Team Members</span>
          </div>
          <div className="promo-stat-cell">
            <span className="cell-num">₹0.00</span>
            <span className="cell-desc">Team Turnover</span>
          </div>
          <div className="promo-stat-cell">
            <span className="cell-num">₹0.00</span>
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
            <strong className="share-field-val">{referralCode}</strong>
          </div>
          <button className="btn-copy-action" onClick={handleCopyCode}>
            {copiedCode ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="share-box-row">
          <div className="share-field">
            <span className="share-field-label">Invite Link</span>
            <span className="share-field-link">{referralLink}</span>
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
          <li>1. Commission is calculated automatically based on the turnover of your team's bets in all games.</li>
          <li>2. Commission is credited to your wallet balance daily at 00:00 AM.</li>
          <li>3. You can withdraw your commission immediately via UPI or IMPS Bank account.</li>
          <li>4. No upper limit on invitations or total earnings.</li>
        </ul>
      </div>
    </div>
  )
}
export default PromotionView
