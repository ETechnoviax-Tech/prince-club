import React from 'react'
import {
  Sparkles,
  Gift,
  Flame,
  Crown,
  ChevronRight,
  Calendar,
  Coins,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

export function ActivityView({
  onOpenFortuneWheel,
  onClaimVIP,
  vipLoading,
  onOpenDeposit,
  onGoToPromotion,
}) {
  const streakDays = [
    { day: 'Day 1', reward: '₹15', status: 'done' },
    { day: 'Day 2', reward: '₹20', status: 'active' },
    { day: 'Day 3', reward: '₹25', status: 'locked' },
    { day: 'Day 4', reward: '₹30', status: 'locked' },
    { day: 'Day 5', reward: '₹35', status: 'locked' },
    { day: 'Day 6', reward: '₹40', status: 'locked' },
    { day: 'Day 7', reward: '₹50', status: 'locked' },
  ]

  return (
    <div className="activity-page-container">
      {/* Header */}
      <header className="page-header-simple">
        <div className="header-brand-wrap">
          <div className="brand-badge-circle">
            <Sparkles size={16} className="text-amber" />
          </div>
          <div>
            <h3 className="page-header-title">Activity Center</h3>
            <p className="page-header-subtitle">Daily streaks, rewards & exclusive bonus</p>
          </div>
        </div>
      </header>

      {/* Hero Wheel Card */}
      <div className="activity-hero-card" onClick={onOpenFortuneWheel}>
        <div className="hero-wheel-badge">DAILY EVENT</div>
        <div className="hero-wheel-layout">
          <div className="wheel-badge-graphic">🎡</div>
          <div className="hero-wheel-info">
            <h4>Wheel of Fortune</h4>
            <p>Spin daily to claim cash up to <strong>₹500</strong> directly to your wallet!</p>
            <button className="btn-activity-spin">
              <Sparkles size={14} /> Spin Now
            </button>
          </div>
        </div>
      </div>

      {/* 7-Day Check-in Streak */}
      <div className="activity-section-card">
        <div className="card-header-row">
          <div className="header-icon-label">
            <Calendar size={18} className="text-red" />
            <strong className="card-title">7-Day Attendance Streak</strong>
          </div>
          <span className="badge-pill-green">Active</span>
        </div>
        <p className="section-note">Check in continuously for 7 days to maximize daily cash rewards.</p>

        <div className="streak-days-grid">
          {streakDays.map((item, idx) => (
            <div key={idx} className={`streak-item ${item.status}`}>
              <span className="streak-day">{item.day}</span>
              <div className="streak-coin-box">
                <Coins size={16} />
              </div>
              <strong className="streak-amt">{item.reward}</strong>
            </div>
          ))}
        </div>

        <button
          className="btn-claim-attendance"
          onClick={onClaimVIP}
          disabled={vipLoading}
        >
          <Gift size={16} />
          <span>{vipLoading ? 'Claiming Reward...' : 'Claim Today’s Check-in (₹15 - ₹50)'}</span>
        </button>
      </div>

      {/* First Recharge Incentive */}
      <div className="activity-section-card">
        <div className="card-header-row">
          <div className="header-icon-label">
            <Flame size={18} className="text-orange" />
            <strong className="card-title">First Deposit Super Bonus</strong>
          </div>
        </div>
        <div className="promo-banner-split">
          <div className="split-left">
            <h4>Recharge ₹500 & Get ₹100 Free</h4>
            <p>Instant deposit rebate credited to game balance automatically on confirmation.</p>
          </div>
          <button className="btn-action-pill" onClick={onOpenDeposit}>
            Deposit Now <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Invitation Rebate Event */}
      <div className="activity-section-card">
        <div className="card-header-row">
          <div className="header-icon-label">
            <Crown size={18} className="text-purple" />
            <strong className="card-title">Agent Referral Rebate</strong>
          </div>
        </div>
        <div className="promo-banner-split">
          <div className="split-left">
            <h4>Earn 0.6% Lifetime Commission</h4>
            <p>Invite active players and withdraw high commission rewards every single day.</p>
          </div>
          <button className="btn-action-pill btn-purple-pill" onClick={onGoToPromotion}>
            Invite Friends <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
export default ActivityView
