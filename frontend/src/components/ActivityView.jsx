import React, { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Gift,
  Trophy,
  Coins,
  Calendar,
  ChevronRight,
  X,
  Check,
  Flame,
  ArrowRight,
  Award,
  CircleDollarSign,
  Compass,
  RefreshCw,
} from 'lucide-react'
import { sound } from '../utils/audio'
import { fetchActivityStats, redeemGiftCode } from '../api/client'

export function ActivityView({
  currentUser,
  userId,
  onOpenFortuneWheel,
  onOpenRebate,
  onClaimVIP,
  vipLoading,
  onOpenDeposit,
  onGoToPromotion,
  onBalanceUpdate,
  onOpenFirstGift,
  onOpenAttendance,
}) {
  // Modal states
  const [bonusModalOpen, setBonusModalOpen] = useState(false)
  const [giftModalOpen, setGiftModalOpen] = useState(false)
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false)
  const [rebateModalOpen, setRebateModalOpen] = useState(false)
  const [jackpotModalOpen, setJackpotModalOpen] = useState(false)

  // Gift redemption form
  const [giftCode, setGiftCode] = useState('')
  const [giftResult, setGiftResult] = useState(null)
  const [giftError, setGiftError] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  // Live Activity Stats from server
  const [stats, setStats] = useState({
    todayBonus: '0.00',
    totalBonus: '0.00',
    streak: 0,
    canClaimStreak: true,
    streakDays: [
      { day: 'Day 1', reward: '₹15', status: 'today' },
      { day: 'Day 2', reward: '₹20', status: 'locked' },
      { day: 'Day 3', reward: '₹25', status: 'locked' },
      { day: 'Day 4', reward: '₹30', status: 'locked' },
      { day: 'Day 5', reward: '₹35', status: 'locked' },
      { day: 'Day 6', reward: '₹40', status: 'locked' },
      { day: 'Day 7', reward: '₹50', status: 'locked' },
    ],
    bonusHistory: [],
    totalTurnover: '0.00',
    estimatedRebate: '0.00',
    jackpotPool: '1852400.00',
  })
  const [loadingStats, setLoadingStats] = useState(false)

  const activeUserId = currentUser?.id || userId

  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true)
      const data = await fetchActivityStats(activeUserId)
      if (data?.success) {
        setStats({
          todayBonus: data.todayBonus || '0.00',
          totalBonus: data.totalBonus || '0.00',
          streak: data.streak || 0,
          canClaimStreak: data.canClaimStreak !== false,
          streakDays: data.streakDays && data.streakDays.length > 0 ? data.streakDays : stats.streakDays,
          bonusHistory: data.bonusHistory || [],
          totalTurnover: data.totalTurnover || '0.00',
          estimatedRebate: data.estimatedRebate || '0.00',
          jackpotPool: data.jackpotPool || '1852400.00',
        })
      }
    } catch (err) {
      console.warn('[ActivityView] Could not load live activity stats:', err.message)
    } finally {
      setLoadingStats(false)
    }
  }, [activeUserId])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleRedeemGift = async (e) => {
    e.preventDefault()
    if (!giftCode.trim()) {
      setGiftError('Please enter a valid gift redemption code.')
      return
    }
    setRedeeming(true)
    setGiftError('')
    setGiftResult(null)
    sound.playBet?.()

    try {
      const res = await redeemGiftCode(giftCode.trim(), activeUserId)
      sound.playWin?.()
      setGiftResult(res.message || `Code redeemed! ₹${res.amount}.00 added to your account.`)
      if (res.newBalance !== undefined && onBalanceUpdate) {
        onBalanceUpdate(res.newBalance)
      }
      setGiftCode('')
      // Refresh live stats after redemption
      loadStats()
    } catch (err) {
      sound.playLose?.()
      setGiftError(err.message || 'Invalid or expired redemption code. Check the official Telegram channel.')
    } finally {
      setRedeeming(false)
    }
  }

  const handleClaimAttendance = async () => {
    try {
      if (onClaimVIP) {
        await onClaimVIP()
        await loadStats()
      }
    } catch {}
  }

  return (
    <div className="activity-view-wrapper">
      {/* 1. TOP CORAL HEADER (69 CLUB BRAND & REAL BONUS STATS) */}
      <div className="activity-coral-header">
        {/* 69 Club Brand Logo */}
        <div className="activity-brand-centered">
          <div className="activity-55-circle">
            <span className="brand-crown-top">👑</span>
            <span className="brand-55-num">69</span>
          </div>
          <span className="brand-club-text">69 CLUB</span>
        </div>

        {/* Bonus Stats (Today's bonus vs Total bonus) */}
        <div className="activity-bonus-stats-row">
          <div className="bonus-stat-col">
            <span className="bonus-stat-label">Today's bonus</span>
            <strong className="bonus-stat-value">₹{stats.todayBonus}</strong>
          </div>

          <div className="bonus-stat-divider" />

          <div className="bonus-stat-col">
            <span className="bonus-stat-label">Total bonus</span>
            <strong className="bonus-stat-value">₹{stats.totalBonus}</strong>
          </div>
        </div>

        {/* Center Pill Button: Bonus Details */}
        <div className="activity-details-btn-wrap">
          <button
            type="button"
            className="btn-bonus-details"
            onClick={() => setBonusModalOpen(true)}
          >
            Bonus details
          </button>
        </div>
      </div>

      {/* 2. 4-ICON QUICK SHORTCUTS ROW */}
      <div className="activity-icons-grid">
        {/* 1. Betting Rebate */}
        <div
          className="activity-icon-tile"
          onClick={onOpenRebate ? onOpenRebate : () => setRebateModalOpen(true)}
        >
          <div className="icon-badge-box icon-bg-rebate">
            <span className="tile-notif-dot" />
            <div className="tile-inner-icon">💰</div>
          </div>
          <span className="icon-tile-label">Betting rebate</span>
        </div>

        {/* 2. Super Jackpot */}
        <div className="activity-icon-tile" onClick={() => setJackpotModalOpen(true)}>
          <div className="icon-badge-box icon-bg-jackpot">
            <div className="tile-inner-icon">🏆</div>
          </div>
          <span className="icon-tile-label">Super Jackpot</span>
        </div>

        {/* 3. First Gift */}
        <div
          className="activity-icon-tile"
          onClick={() => {
            sound.playTick?.()
            if (onOpenFirstGift) onOpenFirstGift()
            else if (onOpenDeposit) onOpenDeposit()
          }}
        >
          <div className="icon-badge-box icon-bg-firstgift">
            <div className="tile-inner-icon">🎁</div>
          </div>
          <span className="icon-tile-label">First gift</span>
        </div>

        {/* 4. Invite Wheel */}
        <div className="activity-icon-tile" onClick={onOpenFortuneWheel}>
          <div className="icon-badge-box icon-bg-invitewheel">
            <span className="tile-notif-dot" />
            <div className="tile-inner-icon">🎡</div>
          </div>
          <span className="icon-tile-label">Invite Wheel</span>
        </div>
      </div>

      {/* 3. 2-COLUMN FEATURE CARDS (Gifts & Attendance bonus) */}
      <div className="activity-feature-2col-grid">
        {/* Card 1: Gifts */}
        <div className="feature-action-card" onClick={() => setGiftModalOpen(true)}>
          <div className="feature-card-artwork bg-art-gifts">
            <div className="hongbao-burst">
              <div className="hongbao-packet p1">
                <span className="packet-coin">🪙</span>
              </div>
              <div className="hongbao-packet p2">
                <span className="packet-coin">🪙</span>
              </div>
            </div>
          </div>
          <div className="feature-card-content">
            <h3 className="feature-card-title">Gifts</h3>
            <p className="feature-card-sub">
              Enter the redemption code to receive instant wallet rewards
            </p>
          </div>
        </div>

        {/* Card 2: Attendance bonus */}
        <div
          className="feature-action-card"
          onClick={() => {
            sound.playTick?.()
            if (onOpenAttendance) onOpenAttendance()
            else setAttendanceModalOpen(true)
          }}
        >
          <div className="feature-card-artwork bg-art-attendance">
            <div className="calendar-box-graphic">
              <div className="cal-sheet">
                <div className="cal-dots">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
                <div className="cal-pencil">✏️</div>
              </div>
              <div className="gold-voucher-coin">₹</div>
            </div>
          </div>
          <div className="feature-card-content">
            <h3 className="feature-card-title">Attendance bonus</h3>
            <p className="feature-card-sub">
              {stats.streak > 0
                ? `Streak: Day ${stats.streak} active! Check in daily for higher rewards.`
                : 'Sign in consecutively to claim up to ₹50 daily cash.'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. EVENT BANNERS SECTION */}
      <div className="activity-banners-stack">
        {/* Banner 1: ARBET INVITE FRIENDS */}
        <div className="activity-event-card" onClick={onGoToPromotion}>
          <div className="banner-visual-box banner-arbet-sports">
            <div className="banner-header-row">
              <span className="arbet-badge">AGENT PROMOTION</span>
            </div>
            <div className="banner-body-text">
              <h2 className="banner-golden-title">Invite Friends, Earn More</h2>
              <span className="banner-date-pill">Unlimited Lifetime Commission</span>
            </div>
            <div className="banner-athletes-group">
              <span className="athlete-icon">🏏</span>
              <span className="athlete-icon hero">⚽</span>
              <span className="athlete-icon">🎾</span>
            </div>
          </div>
          <div className="banner-footer-caption">
            <strong>INVITE FRIENDS & EARN LIFETIME REBATES</strong>
          </div>
        </div>

        {/* Banner 2: 69CLUB.COM MEGA SPIN WHEEL */}
        <div className="activity-event-card" onClick={onOpenFortuneWheel}>
          <div className="banner-visual-box banner-mega-spin">
            <div className="banner-header-row">
              <span className="club-domain-tag">69CLUB</span>
            </div>
            <div className="banner-body-text">
              <h2 className="banner-spin-title">Mega Spin Wheel</h2>
              <span className="banner-sub-pill">Win Up to ₹500 Instant Cash</span>
            </div>
            <div className="banner-wheel-graphic">
              <div className="mini-spin-circle">🎡</div>
            </div>
          </div>
          <div className="banner-footer-caption">
            <strong>69 CLUB MEGA SPIN WHEEL</strong>
          </div>
        </div>
      </div>

      {/* MODAL 1: BONUS DETAILS (REAL TRANSACTION HISTORY) */}
      {bonusModalOpen && (
        <div className="modal-overlay" onClick={() => setBonusModalOpen(false)}>
          <div className="activity-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Bonus Details</h3>
              <button className="dialog-close-btn" onClick={() => setBonusModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dialog-body">
              <div className="bonus-detail-stat-box">
                <div className="detail-stat-item">
                  <span>Today's Accumulated</span>
                  <strong className="text-emerald">₹{stats.todayBonus}</strong>
                </div>
                <div className="detail-stat-item">
                  <span>Total Bonus Claimed</span>
                  <strong className="text-orange">₹{stats.totalBonus}</strong>
                </div>
              </div>

              <div className="bonus-history-list" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {stats.bonusHistory.length > 0 ? (
                  stats.bonusHistory.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                          {item.description}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <strong style={{ color: '#10b981', fontSize: 14 }}>
                        +₹{Number(item.amount).toFixed(2)}
                      </strong>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 13 }}>
                    No bonus claims yet. Check in daily or redeem gift codes to earn rewards!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GIFTS REDEMPTION (REAL SERVER API) */}
      {giftModalOpen && (
        <div className="modal-overlay" onClick={() => setGiftModalOpen(false)}>
          <div className="activity-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Redeem Gift Code</h3>
              <button className="dialog-close-btn" onClick={() => setGiftModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dialog-body">
              <p className="dialog-note">
                Please enter the redemption code provided in the official 69 Club Telegram channel.
              </p>
              <form onSubmit={handleRedeemGift}>
                <div className="dialog-input-wrap">
                  <input
                    type="text"
                    className="dialog-text-input"
                    placeholder="Enter gift code (e.g. WELCOME69, 69CLUB)"
                    value={giftCode}
                    onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                    autoCapitalize="characters"
                  />
                </div>

                {giftError && <div className="dialog-alert-msg error">{giftError}</div>}
                {giftResult && <div className="dialog-alert-msg success">{giftResult}</div>}

                <button
                  type="submit"
                  className="dialog-submit-btn"
                  disabled={redeeming || !giftCode.trim()}
                >
                  {redeeming ? 'Redeeming...' : 'Receive Gift Rewards'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ATTENDANCE BONUS (REAL SERVER PROGRESSION) */}
      {attendanceModalOpen && (
        <div className="modal-overlay" onClick={() => setAttendanceModalOpen(false)}>
          <div className="activity-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>7-Day Attendance Bonus</h3>
              <button className="dialog-close-btn" onClick={() => setAttendanceModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dialog-body">
              <p className="dialog-note">
                Sign in every 24 hours consecutively to claim increasing daily cash bonuses.
              </p>
              <div className="streak-7days-grid">
                {stats.streakDays.map((item, idx) => (
                  <div key={idx} className={`streak-day-card ${item.status}`}>
                    <span className="streak-day-title">{item.day}</span>
                    <div className="streak-coin-art">
                      {item.status === 'completed' ? '✅' : '🪙'}
                    </div>
                    <strong className="streak-reward-val">{item.reward}</strong>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="dialog-submit-btn"
                disabled={vipLoading || !stats.canClaimStreak}
                onClick={handleClaimAttendance}
              >
                {vipLoading
                  ? 'Claiming...'
                  : stats.canClaimStreak
                  ? 'Sign In & Claim Today’s Bonus'
                  : 'Already Claimed Today (Come back tomorrow)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BETTING REBATE (REAL TURNOVER) */}
      {rebateModalOpen && (
        <div className="modal-overlay" onClick={() => setRebateModalOpen(false)}>
          <div className="activity-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Real-Time Betting Rebate</h3>
              <button className="dialog-close-btn" onClick={() => setRebateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dialog-body">
              <div className="bonus-detail-stat-box" style={{ marginBottom: 12 }}>
                <div className="detail-stat-item">
                  <span>Your Valid Turnover</span>
                  <strong className="text-orange">₹{stats.totalTurnover}</strong>
                </div>
                <div className="detail-stat-item">
                  <span>Estimated Rebate</span>
                  <strong className="text-emerald">₹{stats.estimatedRebate}</strong>
                </div>
              </div>

              <p className="dialog-note">
                Automatic cashback returned based on total valid betting turnover across all games.
              </p>
              <div className="rebate-tier-table">
                <div className="rebate-row header">
                  <span>VIP Level</span>
                  <span>Lottery / Slots</span>
                  <span>Sports / Live</span>
                </div>
                <div className="rebate-row">
                  <span>VIP 0</span>
                  <strong>0.60%</strong>
                  <strong>0.40%</strong>
                </div>
                <div className="rebate-row">
                  <span>VIP 1</span>
                  <strong>0.75%</strong>
                  <strong>0.50%</strong>
                </div>
                <div className="rebate-row">
                  <span>VIP 2</span>
                  <strong>0.90%</strong>
                  <strong>0.65%</strong>
                </div>
                <div className="rebate-row">
                  <span>VIP 3+</span>
                  <strong>1.20%</strong>
                  <strong>0.80%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SUPER JACKPOT (PROGRESSIVE REAL POOL) */}
      {jackpotModalOpen && (
        <div className="modal-overlay" onClick={() => setJackpotModalOpen(false)}>
          <div className="activity-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Super Jackpot Pool</h3>
              <button className="dialog-close-btn" onClick={() => setJackpotModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dialog-body">
              <div className="jackpot-pool-hero">
                <span>Grand Community Jackpot Pool</span>
                <strong className="jackpot-counter">
                  ₹{Number(stats.jackpotPool).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <p className="dialog-note" style={{ marginTop: '10px' }}>
                Every real-money bet automatically contributes to the community Grand Jackpot. Any player can trigger the jackpot randomly on any game!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActivityView
