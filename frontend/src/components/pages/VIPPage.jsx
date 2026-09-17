import React, { useState } from 'react'
import {
  ArrowLeft,
  Crown,
  Sparkles,
  Gift,
  CheckCircle,
  HelpCircle,
  Award,
  ChevronRight,
  Zap,
} from 'lucide-react'

export default function VIPPage({
  currentUser,
  balance,
  onBack,
  onClaimVIPBonus,
  vipLoading,
}) {
  const [activeTier, setActiveTier] = useState(0)

  const vipTiers = [
    { level: 0, requiredExp: 0, levelBonus: 0, dailyBonus: 50, rebate: '0.1%' },
    { level: 1, requiredExp: 1000, levelBonus: 60, dailyBonus: 80, rebate: '0.2%' },
    { level: 2, requiredExp: 5000, levelBonus: 180, dailyBonus: 150, rebate: '0.3%' },
    { level: 3, requiredExp: 20000, levelBonus: 500, dailyBonus: 300, rebate: '0.4%' },
    { level: 4, requiredExp: 100000, levelBonus: 2000, dailyBonus: 800, rebate: '0.5%' },
    { level: 5, requiredExp: 500000, levelBonus: 8000, dailyBonus: 2000, rebate: '0.6%' },
  ]

  return (
    <div className="subpage-container">
      {/* 1. TOP HEADER */}
      <header className="subpage-header">
        <button className="subpage-back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="subpage-title">VIP Club Privileges</h2>
        <button className="subpage-right-action" onClick={() => alert('VIP levels unlock permanently based on cumulative betting volume.')}>
          <HelpCircle size={18} />
        </button>
      </header>

      <div className="subpage-content">
        {/* VIP HERO CARD */}
        <div className="vip-hero-card">
          <div className="vip-badge-row">
            <div className="vip-crown-icon">
              <Crown size={28} />
            </div>
            <div className="vip-title-col">
              <h3 className="vip-level-title">VIP 0 Member</h3>
              <span className="vip-username">{currentUser?.username || 'Member'}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="vip-progress-box">
            <div className="progress-labels">
              <span>Current EXP: <strong>0</strong></span>
              <span>Next Level: <strong>1,000 EXP</strong></span>
            </div>
            <div className="vip-progress-track">
              <div className="vip-progress-fill" style={{ width: '15%' }} />
            </div>
            <span className="exp-hint">Bet ₹1 = 1 EXP. Need 1,000 EXP to upgrade to VIP 1.</span>
          </div>
        </div>

        {/* DAILY CLAIM CARD */}
        <div className="vip-claim-action-card">
          <div className="claim-card-left">
            <div className="claim-gift-icon">
              <Gift size={24} />
            </div>
            <div>
              <h4>Daily VIP Check-In Bonus</h4>
              <p>Claim up to ₹50 daily free credits directly into your wallet</p>
            </div>
          </div>

          <button
            className="btn-claim-vip"
            onClick={onClaimVIPBonus}
            disabled={vipLoading}
          >
            {vipLoading ? 'Claiming...' : 'Claim ₹50'}
          </button>
        </div>

        {/* VIP LEVEL CARDS */}
        <div className="wallet-section-box">
          <div className="section-title-row">
            <h4>VIP Level Benefits</h4>
          </div>

          <div className="vip-tiers-list">
            {vipTiers.map((tier) => (
              <div
                key={tier.level}
                className={`vip-tier-item ${activeTier === tier.level ? 'current' : ''}`}
                onClick={() => setActiveTier(tier.level)}
              >
                <div className="tier-header-row">
                  <div className="tier-left">
                    <span className="tier-tag">VIP {tier.level}</span>
                    <strong className="tier-exp-req">
                      {tier.requiredExp === 0 ? 'Free Entry' : `${tier.requiredExp.toLocaleString()} EXP`}
                    </strong>
                  </div>
                  <span className="tier-rebate-tag">Rebate: {tier.rebate}</span>
                </div>

                <div className="tier-perks-grid">
                  <div className="perk-box">
                    <span className="perk-label">Level-Up Bonus</span>
                    <strong className="perk-val">₹{tier.levelBonus}</strong>
                  </div>
                  <div className="perk-box">
                    <span className="perk-label">Daily Check-In</span>
                    <strong className="perk-val">₹{tier.dailyBonus}</strong>
                  </div>
                  <div className="perk-box">
                    <span className="perk-label">Monthly Gift</span>
                    <strong className="perk-val">Exclusive</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VIP INSTRUCTIONS */}
        <div className="deposit-instructions-card">
          <h5>VIP System Rules</h5>
          <ul>
            <li>Every <strong>₹1</strong> wagered across any game automatically earns <strong>1 EXP</strong>.</li>
            <li>VIP levels are permanent once unlocked and never downgrade.</li>
            <li>Daily VIP bonus resets every day at 00:00 AM IST.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
