import React, { useState } from 'react'
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
} from 'lucide-react'
import { sound } from '../utils/audio'

export function ActivityView({
  onOpenFortuneWheel,
  onClaimVIP,
  vipLoading,
  onOpenDeposit,
  onGoToPromotion,
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

  // Attendance streak
  const streakDays = [
    { day: 'Day 1', reward: '₹15', status: 'claimed' },
    { day: 'Day 2', reward: '₹20', status: 'today' },
    { day: 'Day 3', reward: '₹25', status: 'locked' },
    { day: 'Day 4', reward: '₹30', status: 'locked' },
    { day: 'Day 5', reward: '₹35', status: 'locked' },
    { day: 'Day 6', reward: '₹40', status: 'locked' },
    { day: 'Day 7', reward: '₹50', status: 'locked' },
  ]

  const handleRedeemGift = (e) => {
    e.preventDefault()
    if (!giftCode.trim()) {
      setGiftError('Please enter a valid gift redemption code.')
      return
    }
    setRedeeming(true)
    setGiftError('')
    setGiftResult(null)
    sound.playBet?.()

    setTimeout(() => {
      setRedeeming(false)
      const bonusWon = Math.floor(Math.random() * 200) + 50
      setGiftResult(`Congratulations! Gift code redeemed. ₹${bonusWon} added to your account!`)
      sound.playWin?.()
    }, 800)
  }

  return (
    <div className="activity-view-wrapper">
      {/* 1. TOP CORAL HEADER (55CLUB BRAND & BONUS STATS) */}
      <div className="activity-coral-header">
        {/* Prince Club Brand Logo */}
        <div className="activity-brand-centered">
          <div className="activity-55-circle">
            <span className="brand-crown-top">👑</span>
            <span className="brand-55-num">PC</span>
          </div>
          <span className="brand-club-text">PRINCE CLUB</span>
        </div>

        {/* Bonus Stats (Today's bonus vs Total bonus) */}
        <div className="activity-bonus-stats-row">
          <div className="bonus-stat-col">
            <span className="bonus-stat-label">Today's bonus</span>
            <strong className="bonus-stat-value">₹0.00</strong>
          </div>

          <div className="bonus-stat-divider" />

          <div className="bonus-stat-col">
            <span className="bonus-stat-label">Total bonus</span>
            <strong className="bonus-stat-value">₹177.68</strong>
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
        <div className="activity-icon-tile" onClick={() => setRebateModalOpen(true)}>
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
        <div className="activity-icon-tile" onClick={onOpenDeposit}>
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
              Enter the redemption code to receive gift rewards
            </p>
          </div>
        </div>

        {/* Card 2: Attendance bonus */}
        <div className="feature-action-card" onClick={() => setAttendanceModalOpen(true)}>
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
              The more consecutive days you sign in, the higher the reward will be.
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
              <span className="arbet-badge">ARBET</span>
            </div>
            <div className="banner-body-text">
              <h2 className="banner-golden-title">Invite Friends, Earn More</h2>
              <span className="banner-date-pill">Sep 1 - Sep 30</span>
            </div>
            <div className="banner-athletes-group">
              <span className="athlete-icon">🏏</span>
              <span className="athlete-icon hero">⚽</span>
              <span className="athlete-icon">🎾</span>
            </div>
          </div>
          <div className="banner-footer-caption">
            <strong>ARBET INVITE FRIENDS</strong>
          </div>
        </div>

        {/* Banner 2: PRINCECLUB.COM MEGA SPIN WHEEL */}
        <div className="activity-event-card" onClick={onOpenFortuneWheel}>
          <div className="banner-visual-box banner-mega-spin">
            <div className="banner-header-row">
              <span className="club-domain-tag">PRINCECLUB.COM</span>
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
            <strong>PRINCE CLUB MEGA SPIN WHEEL</strong>
          </div>
        </div>
      </div>

      {/* MODAL 1: BONUS DETAILS */}
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
                  <strong>₹0.00</strong>
                </div>
                <div className="detail-stat-item">
                  <span>Total Withdrawn</span>
                  <strong>₹177.68</strong>
                </div>
              </div>
              <div className="bonus-history-list">
                <div className="history-row">
                  <span>Daily VIP Attendance</span>
                  <strong className="text-emerald">+₹25.00</strong>
                </div>
                <div className="history-row">
                  <span>Invite Wheel Bonus</span>
                  <strong className="text-emerald">+₹50.00</strong>
                </div>
                <div className="history-row">
                  <span>First Recharge Cash</span>
                  <strong className="text-emerald">+₹100.00</strong>
                </div>
                <div className="history-row">
                  <span>Turnover Rebate</span>
                  <strong className="text-emerald">+₹2.68</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GIFTS REDEMPTION */}
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
                Please enter the redemption code provided by customer service or channel events.
              </p>
              <form onSubmit={handleRedeemGift}>
                <div className="dialog-input-wrap">
                  <input
                    type="text"
                    className="dialog-text-input"
                    placeholder="Enter gift code (e.g. PRINCE500)"
                    value={giftCode}
                    onChange={(e) => setGiftCode(e.target.value)}
                  />
                </div>

                {giftError && <div className="dialog-alert-msg error">{giftError}</div>}
                {giftResult && <div className="dialog-alert-msg success">{giftResult}</div>}

                <button
                  type="submit"
                  className="dialog-submit-btn"
                  disabled={redeeming}
                >
                  {redeeming ? 'Redeeming...' : 'Receive Gift Rewards'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ATTENDANCE BONUS */}
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
                {streakDays.map((item, idx) => (
                  <div key={idx} className={`streak-day-card ${item.status}`}>
                    <span className="streak-day-title">{item.day}</span>
                    <div className="streak-coin-art">🪙</div>
                    <strong className="streak-reward-val">{item.reward}</strong>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="dialog-submit-btn"
                disabled={vipLoading}
                onClick={() => {
                  onClaimVIP?.()
                  setAttendanceModalOpen(false)
                }}
              >
                {vipLoading ? 'Claiming...' : 'Sign In & Claim Today’s Bonus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BETTING REBATE */}
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

      {/* MODAL 5: SUPER JACKPOT */}
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
                <span>Grand Jackpot Pool</span>
                <strong className="jackpot-counter">₹1,842,950.00</strong>
              </div>
              <p className="dialog-note" style={{ marginTop: '10px' }}>
                Every real-money bet automatically contributes to the community Grand Jackpot. Any player can trigger the jackpot randomly!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActivityView
