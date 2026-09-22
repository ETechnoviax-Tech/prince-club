import React, { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeft,
  Lock,
  Check,
  Wallet,
  Heart,
  Coins,
  X,
  User,
  Clock,
} from 'lucide-react'
import { fetchVIPStatus } from '../../api/client'
import './vip.css'

export default function VIPPage({
  currentUser,
  balance,
  onBack,
  onClaimVIPBonus,
  vipLoading,
}) {
  const [activeTab, setActiveTab] = useState('history') // 'history' | 'rules'
  const [selectedTier, setSelectedTier] = useState(1) // 1 to 10
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const [vipData, setVipData] = useState(null)
  const [loading, setLoading] = useState(false)

  // Calculate days remaining until 1st of next month
  const calculatedDays = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const firstOfNextMonth = new Date(currentYear, currentMonth + 1, 1, 2, 0, 0)
    const diffTime = firstOfNextMonth.getTime() - now.getTime()
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }, [])

  // Real-time synchronization with server
  useEffect(() => {
    let isMounted = true
    async function loadStatus() {
      if (!currentUser?.id) return
      try {
        setLoading(true)
        const res = await fetchVIPStatus(currentUser.id)
        if (isMounted && res && res.success) {
          setVipData(res)
          if (res.vipLevel > 0) {
            setSelectedTier(Math.min(10, res.vipLevel))
          }
        }
      } catch (err) {
        console.warn('[VIPPage] Failed to fetch real-time VIP status:', err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadStatus()
    return () => {
      isMounted = false
    }
  }, [currentUser?.id])

  // Real-time user experience points and level from server or active session
  const currentExp = Number(vipData?.experience ?? currentUser?.experience ?? currentUser?.turnover ?? 0)
  const currentVipLevel = Number(vipData?.vipLevel ?? currentUser?.vip_level ?? 0)
  const daysUntilPayout = Number(vipData?.daysUntilPayout ?? calculatedDays)
  const vipHistory = vipData?.history || []

  // Dynamic user display name
  const displayUsername = useMemo(() => {
    if (currentUser?.username) return currentUser.username
    if (currentUser?.phone) {
      const p = String(currentUser.phone)
      return p.length >= 10 ? `${p.slice(0, 3)}****${p.slice(-3)}` : p
    }
    if (currentUser?.id) {
      const rawDigits = String(currentUser.id).replace(/\D/g, '')
      const suffix = rawDigits.length >= 6 ? rawDigits.slice(-6) : String(currentUser.id).slice(0, 8)
      return `Member${suffix}`
    }
    return 'Member'
  }, [currentUser])

  // 10 Detailed VIP Tiers
  const vipTiers = useMemo(() => [
    {
      level: 1,
      name: 'VIP1',
      requiredExp: 3000,
      levelBonus: 60,
      monthlyBonus: 3,
      rebateRate: '0.05%',
      gradientClass: 'tier-1',
      medalColor: '#cbd5e1',
    },
    {
      level: 2,
      name: 'VIP2',
      requiredExp: 30000,
      levelBonus: 180,
      monthlyBonus: 10,
      rebateRate: '0.10%',
      gradientClass: 'tier-2',
      medalColor: '#f59e0b',
    },
    {
      level: 3,
      name: 'VIP3',
      requiredExp: 100000,
      levelBonus: 600,
      monthlyBonus: 30,
      rebateRate: '0.15%',
      gradientClass: 'tier-3',
      medalColor: '#38bdf8',
    },
    {
      level: 4,
      name: 'VIP4',
      requiredExp: 300000,
      levelBonus: 1800,
      monthlyBonus: 90,
      rebateRate: '0.20%',
      gradientClass: 'tier-4',
      medalColor: '#a855f7',
    },
    {
      level: 5,
      name: 'VIP5',
      requiredExp: 1000000,
      levelBonus: 6000,
      monthlyBonus: 300,
      rebateRate: '0.25%',
      gradientClass: 'tier-5',
      medalColor: '#fb7185',
    },
    {
      level: 6,
      name: 'VIP6',
      requiredExp: 3000000,
      levelBonus: 18000,
      monthlyBonus: 900,
      rebateRate: '0.30%',
      gradientClass: 'tier-6',
      medalColor: '#34d399',
    },
    {
      level: 7,
      name: 'VIP7',
      requiredExp: 10000000,
      levelBonus: 60000,
      monthlyBonus: 3000,
      rebateRate: '0.35%',
      gradientClass: 'tier-7',
      medalColor: '#94a3b8',
    },
    {
      level: 8,
      name: 'VIP8',
      requiredExp: 30000000,
      levelBonus: 180000,
      monthlyBonus: 9000,
      rebateRate: '0.40%',
      gradientClass: 'tier-8',
      medalColor: '#fbbf24',
    },
    {
      level: 9,
      name: 'VIP9',
      requiredExp: 100000000,
      levelBonus: 600000,
      monthlyBonus: 30000,
      rebateRate: '0.45%',
      gradientClass: 'tier-9',
      medalColor: '#22d3ee',
    },
    {
      level: 10,
      name: 'VIP10',
      requiredExp: 300000000,
      levelBonus: 1800000,
      monthlyBonus: 90000,
      rebateRate: '0.50%',
      gradientClass: 'tier-10',
      medalColor: '#818cf8',
    },
  ], [])

  const activeTierData = vipTiers.find((t) => t.level === selectedTier) || vipTiers[0]

  return (
    <div className="vip-page-wrapper">
      {/* 1. TOP HEADER */}
      <header className="vip-top-header">
        <button className="vip-back-btn" onClick={onBack} title="Back">
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="vip-header-title">VIP</h1>
        <div className="vip-header-right-placeholder" />
      </header>

      {/* 2. PROFILE HERO SECTION */}
      <div className="vip-profile-section">
        <div className="vip-avatar-wrap">
          {!avatarError ? (
            <img
              src={currentUser?.avatar_url || '/avatar.jpg'}
              alt="Avatar"
              className="vip-avatar-img"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="vip-avatar-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', color: '#64748b' }}>
              <User size={30} />
            </div>
          )}
        </div>
        <div className="vip-profile-info">
          <div className="vip-level-pill-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>VIP{currentVipLevel}</span>
          </div>
          <div className="vip-profile-username">
            {displayUsername}
          </div>
        </div>
      </div>

      {/* 3. DUAL STATS CARDS */}
      <div className="vip-stats-row">
        <div className="vip-stat-box">
          <div className="vip-stat-val-red">
            {currentExp.toLocaleString('en-IN')} EXP
          </div>
          <div className="vip-stat-label">My experience</div>
        </div>
        <div className="vip-stat-box">
          <div className="vip-stat-val-dark">
            {daysUntilPayout} Days
          </div>
          <div className="vip-stat-label">Payout time</div>
        </div>
      </div>


      {/* 4. SETTLEMENT NOTICE BANNER */}
      <div className="vip-notice-banner">
        VIP level rewards are settled at 2:00 am on the 1st of every month
      </div>

      {/* 5. TIER CARDS CAROUSEL */}
      <div className="vip-carousel-wrap">
        {vipTiers.map((tier) => {
          const isSelected = selectedTier === tier.level
          const isUnlocked = currentVipLevel >= tier.level
          const expRemaining = Math.max(0, tier.requiredExp - currentExp)
          const progressPercent = Math.min(100, Math.round((currentExp / tier.requiredExp) * 100))

          return (
            <div
              key={tier.level}
              className={`vip-tier-card ${tier.gradientClass} ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedTier(tier.level)}
            >
              <div className="vip-card-top-row">
                <div className="vip-card-title-group">
                  <div className="vip-card-name-pill">
                    <span className="vip-card-name">{tier.name}</span>
                    <span className={`vip-card-status-badge ${isUnlocked ? 'unlocked' : ''}`}>
                      {isUnlocked ? (
                        <>
                          <Check size={11} strokeWidth={3} /> Open
                        </>
                      ) : (
                        <>
                          <Lock size={11} strokeWidth={3} /> Not open yet
                        </>
                      )}
                    </span>
                  </div>
                  <span className="vip-card-upgrade-req">
                    {isUnlocked ? 'Level unlocked' : `Upgrading ${tier.name} requires ${expRemaining}EXP`}
                  </span>
                  <div className="vip-card-bet-rate-chip">Bet ₹1=1EXP</div>
                </div>

                {/* 3D Wreath Star Medal Icon */}
                <div className="vip-card-medal-wrap">
                  <svg width="68" height="68" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="50" r="44" stroke={tier.medalColor} strokeWidth="3" opacity="0.4" />
                    <circle cx="50" cy="50" r="38" fill={tier.medalColor} fillOpacity="0.2" stroke={tier.medalColor} strokeWidth="2" />
                    {/* Laurel Wreath */}
                    <path
                      d="M26 50 C26 36 34 26 50 24 M74 50 C74 36 66 26 50 24"
                      stroke={tier.medalColor}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M28 52 C28 66 36 76 50 76 M72 52 C72 66 64 76 50 76"
                      stroke={tier.medalColor}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Star Emblem */}
                    <polygon
                      points="50,32 54,44 67,44 57,52 61,64 50,56 39,64 43,52 33,44 46,44"
                      fill={tier.medalColor}
                      filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.3))"
                    />
                  </svg>
                </div>
              </div>

              {/* Bottom Progress */}
              <div className="vip-card-bottom-progress">
                <div className="vip-card-prog-track">
                  <div
                    className="vip-card-prog-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="vip-card-prog-labels">
                  <span>{currentExp}/{tier.requiredExp}</span>
                  <span>{tier.requiredExp} EXP can be leveled up</span>
                  <span className="vip-card-watermark">{tier.name}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 6. VIP BENEFITS LEVEL CARD */}
      <div className="vip-benefits-card">
        <div className="vip-benefits-header">
          <span className="diamond-icon">💎</span>
          <span>{activeTierData.name} Benefits level</span>
        </div>

        <div className="vip-benefits-list">
          {/* Benefit 1: Level up rewards */}
          <div className="vip-benefit-row">
            <div className="vip-benefit-left">
              <div className="vip-benefit-icon-box" style={{ background: '#fee2e2' }}>
                🎁
              </div>
              <div className="vip-benefit-info">
                <div className="vip-benefit-title">Level up rewards</div>
                <div className="vip-benefit-subtext">Each account can only receive 1 time</div>
              </div>
            </div>
            <div className="vip-benefit-right-badges">
              <span className="vip-badge-wallet">
                <Wallet size={12} /> {activeTierData.levelBonus}
              </span>
              <span className="vip-badge-zero">
                <Heart size={12} fill="#ef4444" /> 0
              </span>
            </div>
          </div>

          {/* Benefit 2: Monthly reward */}
          <div className="vip-benefit-row">
            <div className="vip-benefit-left">
              <div className="vip-benefit-icon-box" style={{ background: '#fef3c7' }}>
                ⭐
              </div>
              <div className="vip-benefit-info">
                <div className="vip-benefit-title">Monthly reward</div>
                <div className="vip-benefit-subtext">Each account can only receive 1 time per month</div>
              </div>
            </div>
            <div className="vip-benefit-right-badges">
              <span className="vip-badge-wallet">
                <Wallet size={12} /> {activeTierData.monthlyBonus}
              </span>
              <span className="vip-badge-zero">
                <Heart size={12} fill="#ef4444" /> 0
              </span>
            </div>
          </div>

          {/* Benefit 3: Rebate rate */}
          <div className="vip-benefit-row">
            <div className="vip-benefit-left">
              <div className="vip-benefit-icon-box" style={{ background: '#ffedd5' }}>
                🪙
              </div>
              <div className="vip-benefit-info">
                <div className="vip-benefit-title">Rebate rate</div>
                <div className="vip-benefit-subtext">Increase income of rebate</div>
              </div>
            </div>
            <div className="vip-benefit-right-badges">
              <span className="vip-badge-rebate">
                <Coins size={12} /> {activeTierData.rebateRate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. SEGMENTED TABS: HISTORY | RULES */}
      <div className="vip-tabs-bar">
        <button
          className={`vip-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className={`vip-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Rules
        </button>
      </div>

      {/* 8. TAB CONTENT: HISTORY */}
      {activeTab === 'history' && (
        <div className="vip-history-content">
          {vipHistory.length === 0 ? (
            <>
              {/* Scroll / Mountains Illustration */}
              <svg className="vip-empty-scroll-svg" viewBox="0 0 160 120" fill="none">
                <path
                  d="M30 85 C50 60 70 75 90 60 C110 45 130 65 150 75 L150 110 L30 110 Z"
                  fill="#e2e8f0"
                />
                <path
                  d="M10 95 C30 80 50 90 70 85 C90 78 110 88 130 92 L130 110 L10 110 Z"
                  fill="#cbd5e1"
                />
                {/* Scroll Parchment Sheet */}
                <rect x="55" y="15" width="50" height="75" rx="5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2.5" />
                <line x1="65" y1="30" x2="95" y2="30" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="65" y1="42" x2="95" y2="42" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="65" y1="54" x2="88" y2="54" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
                {/* Trees */}
                <circle cx="45" cy="80" r="8" fill="#94a3b8" />
                <line x1="45" y1="80" x2="45" y2="92" stroke="#64748b" strokeWidth="2" />
                <circle cx="120" cy="74" r="6" fill="#94a3b8" />
                <line x1="120" y1="74" x2="120" y2="84" stroke="#64748b" strokeWidth="2" />
              </svg>
              <div className="vip-history-nodata-text">No data</div>
            </>
          ) : (
            <div style={{ width: '100%', marginBottom: 16 }}>
              {vipHistory.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    borderRadius: 12,
                    marginBottom: 8,
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                      {tx.description || 'VIP Bonus'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-IN') : '--'}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>
                    +₹{Number(tx.amount || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            className="vip-view-all-btn"
            onClick={() => setHistoryModalOpen(true)}
          >
            View All
          </button>
        </div>
      )}

      {/* 9. TAB CONTENT: RULES (Matching screenshots 3, 4, 5) */}
      {activeTab === 'rules' && (
        <div className="vip-rules-content">
          <div className="vip-rules-header">
            <h2 className="vip-rules-main-title">VIP privileges</h2>
            <p className="vip-rules-sub-title">VIP rule description</p>
          </div>

          {/* Rule 1 */}
          <div className="vip-rule-card">
            <div className="vip-rule-pill-badge">Upgrade standard</div>
            <p className="vip-rule-body-text">
              The VIP member's experience points (valid bet amount) that meet the requirements of the corresponding rank will be promoted to the corresponding VIP level, the member's VIP data statistics period starts from 00:00:00 days VIP system launched. VIP level calculation is refreshed every 10 minutes! The corresponding experience level is calculated according to valid odds 1:1 !
            </p>
          </div>

          {/* Rule 2 */}
          <div className="vip-rule-card">
            <div className="vip-rule-pill-badge">Upgrade order</div>
            <p className="vip-rule-body-text">
              The VIP level that meets the corresponding requirements can be promoted by one level every day, but the VIP level cannot be promoted by leapfrogging.
            </p>
          </div>

          {/* Rule 3 */}
          <div className="vip-rule-card">
            <div className="vip-rule-pill-badge">Level maintenance</div>
            <p className="vip-rule-body-text">
              VIP members need to complete the maintenance requirements of the corresponding level within 30 days after the "VIP level change"; if the promotion is completed during this period, the maintenance requirements will be calculated according to the current level.
            </p>
          </div>

          {/* Rule 4 */}
          <div className="vip-rule-card">
            <div className="vip-rule-pill-badge">Downgrade standard</div>
            <p className="vip-rule-body-text">
              If a VIP member fails to complete the corresponding level maintenance requirements within 30 days, the system will automatically deduct the experience points corresponding to the level. If the experience points are insufficient, the level will be downgraded, and the corresponding benefits will be adjusted to the downgraded level accordingly.
            </p>
          </div>

          {/* Rule 5 */}
          <div className="vip-rule-card">
            <div className="vip-rule-pill-badge">Upgrade Bonus</div>
            <p className="vip-rule-body-text">
              The upgrade benefits can be claimed on the VIP page after the member reaches the VIP membership level, and each VIP member can only get the upgrade reward of each level once.
            </p>
          </div>

          {/* Rule 6 */}
          <div className="vip-rule-card">
            <div className="vip-rule-pill-badge">Monthly reward</div>
            <p className="vip-rule-body-text">
              VIP members can earn the highest level of VIP rewards once a month. Can only be received once a month. Prizes cannot be accumulated. And any unclaimed rewards will be refreshed on the next settlement day. When receiving the highest level of monthly rewards this month Monthly Rewards earned in this month will be deducted e.g. when VIP1 earns 500 and upgrades to VIP2 to receive monthly rewards 500 will be deducted.
            </p>
          </div>

          {/* Rule 7 */}
          <div className="vip-rule-card">
            <div className="vip-rule-pill-badge">Real-time rebate</div>
            <p className="vip-rule-body-text">
              The higher the VIP level, the higher the return rate, all the games are calculated in real time and can be self-rewarded!
            </p>
          </div>

          {/* Rule 8 */}
          <div className="vip-rule-card">
            <div className="vip-rule-pill-badge">Safe</div>
            <p className="vip-rule-body-text">
              VIP members who have reached the corresponding level will get additional benefits on safe deposit based on the member's VIP level.
            </p>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setHistoryModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 380,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 20,
              position: 'relative',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>VIP Reward History</h3>
              <button
                onClick={() => setHistoryModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, maxHeight: 320 }}>
              {vipHistory.length === 0 ? (
                <div style={{ padding: '40px 10px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No VIP reward history records available yet.
                </div>
              ) : (
                vipHistory.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 6px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                        {tx.description || 'VIP Bonus'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-IN') : '--'}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>
                      +₹{Number(tx.amount || 0).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setHistoryModalOpen(false)}
              style={{
                width: '100%',
                height: 42,
                marginTop: 14,
                background: '#ff5e52',
                color: '#ffffff',
                border: 'none',
                borderRadius: 21,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
