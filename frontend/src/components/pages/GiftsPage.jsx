import React, { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { sound } from '../../utils/audio'
import { fetchFirstGiftStatus, claimFirstGift } from '../../api/client'
import './gifts.css'

export default function GiftsPage({
  onBack,
  onOpenDeposit,
  onBalanceUpdate,
  currentUser,
  userId,
}) {
  const [giftState, setGiftState] = useState({
    loading: true,
    hasDeposited: false,
    firstDepositAmount: 0,
    eligibleBonus: 0,
    isClaimed: false,
    canClaim: false,
    claimedAt: null,
  })

  const [claiming, setClaiming] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [rulesOpen, setRulesOpen] = useState(false)

  const activeUserId = currentUser?.id || userId

  // Load authoritative first gift status from server
  const loadStatus = useCallback(async () => {
    try {
      setGiftState((s) => ({ ...s, loading: true }))
      const data = await fetchFirstGiftStatus(activeUserId)
      if (data?.success) {
        setGiftState({
          loading: false,
          hasDeposited: Boolean(data.hasDeposited),
          firstDepositAmount: Number(data.firstDepositAmount || 0),
          eligibleBonus: Number(data.eligibleBonus || 0),
          isClaimed: Boolean(data.isClaimed),
          canClaim: Boolean(data.canClaim),
          claimedAt: data.claimedAt || null,
        })
      } else {
        setGiftState((s) => ({ ...s, loading: false }))
      }
    } catch (err) {
      console.warn('[FirstGift] Failed to load status:', err.message)
      setGiftState((s) => ({ ...s, loading: false }))
    }
  }, [activeUserId])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Handle claiming the 30% first deposit bonus
  const handleClaim = async () => {
    if (claiming) return
    sound.playBet?.()
    setClaiming(true)
    setFeedback(null)

    try {
      const res = await claimFirstGift(activeUserId)
      sound.playWin?.()
      setFeedback({
        type: 'success',
        message: res.message || `🎉 Successfully claimed 30% first deposit gift of ₹${res.bonusAmount}!`,
      })
      if (res.newBalance !== undefined && onBalanceUpdate) {
        onBalanceUpdate(res.newBalance)
      }
      await loadStatus()
    } catch (err) {
      sound.playLose?.()
      setFeedback({
        type: 'error',
        message: err.message || 'Unable to claim first gift. Please ensure your first deposit is approved.',
      })
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="first-gift-container">
      {/* 1. Header with Activity Details title */}
      <header className="first-gift-header">
        <button
          className="first-gift-back-btn"
          onClick={() => {
            sound.playTick?.()
            onBack?.()
          }}
          title="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="first-gift-header-title">Activity details</h1>
        <div className="first-gift-header-spacer" />
      </header>

      <div className="first-gift-content">
        {/* 2. Hero Banner matching screenshot */}
        <div className="first-gift-hero-banner">
          <div className="hero-confetti-bg" />
          <div className="first-gift-hero-inner">
            <div className="first-gift-hero-text">
              <h2 className="first-gift-hero-title">First gift</h2>
              <p className="first-gift-hero-subtitle">
                There are two types of new member gift package rewards::
              </p>

              <div className="first-gift-rules-list">
                <div className="first-gift-rule-item">
                  <span className="first-gift-rule-badge">1</span>
                  <span>Bonus for first deposit negative profit</span>
                </div>
                <div className="first-gift-rule-item">
                  <span className="first-gift-rule-badge">2</span>
                  <span>Play games and get bonuses only for new members</span>
                </div>
              </div>

              <button
                type="button"
                className="first-gift-details-pill-btn"
                onClick={() => {
                  sound.playTick?.()
                  setRulesOpen(true)
                }}
              >
                Activity details
              </button>
            </div>

            {/* 3D Celebration Gift Box Graphic */}
            <div className="first-gift-hero-art">
              <div className="hero-art-giftbox">
                <span className="art-confetti-particle p1">✨</span>
                <span className="art-confetti-particle p2">🎊</span>
                <span className="art-confetti-particle p3">🪙</span>
                <span className="art-confetti-particle p4">💎</span>
                <div className="giftbox-emojis">🎁</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Event Start Time Card */}
        <div className="first-gift-event-time-card">
          <div className="event-ribbon-badge-wrap">
            <div className="event-ribbon-badge">Event start time</div>
          </div>
          <div className="event-timestamp-text">2024-06-11 00:00:00</div>
        </div>

        {/* 4. Conditions Table Card */}
        <div className="first-gift-table-card">
          <div className="first-gift-table-header">
            <div className="table-header-col">Conditions of<br />participation</div>
            <div className="table-header-col">Get<br />Compensation<br />Bonus</div>
            <div className="table-header-col">Bonus limit</div>
          </div>

          <div className="first-gift-table-body">
            <div className="table-body-col">
              First deposit<br />for new users
            </div>
            <div className="table-body-col">
              Total <span className="highlight-red-text">30%</span><br />
              compensation from<br />
              First Deposit Amount
            </div>
            <div className="table-body-col">
              <span className="bonus-limit-val">₹200.00</span>
            </div>
          </div>
        </div>

        {/* Feedback Alert if available */}
        {feedback && (
          <div className={`first-gift-alert ${feedback.type}`}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* 5. Bottom Action Button */}
        <div className="first-gift-action-wrap">
          {giftState.loading ? (
            <button type="button" className="first-gift-btn disabled-success" disabled>
              Loading status...
            </button>
          ) : giftState.isClaimed ? (
            /* Matches screenshot: "Application successful" disabled button */
            <button
              type="button"
              className="first-gift-btn disabled-success"
              disabled
              title="First deposit gift reward already claimed"
            >
              Application successful
            </button>
          ) : giftState.canClaim ? (
            /* Eligible to claim now */
            <button
              type="button"
              className="first-gift-btn active-claim"
              onClick={handleClaim}
              disabled={claiming}
            >
              {claiming ? 'Claiming Reward...' : `Claim ₹${giftState.eligibleBonus.toFixed(2)} First Deposit Gift`}
            </button>
          ) : !giftState.hasDeposited ? (
            /* Not deposited yet: direct user to deposit */
            <button
              type="button"
              className="first-gift-btn deposit-cta"
              onClick={() => {
                sound.playTick?.()
                onOpenDeposit?.()
              }}
            >
              Deposit Now to Get 30% Gift
            </button>
          ) : (
            /* Default applied state */
            <button type="button" className="first-gift-btn disabled-success" disabled>
              Application successful
            </button>
          )}
        </div>
      </div>

      {/* Activity Details Rules Modal */}
      {rulesOpen && (
        <div className="rules-popup-overlay" onClick={() => setRulesOpen(false)}>
          <div className="rules-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="rules-popup-header">
              <h3>First Gift Promotion Rules</h3>
              <button
                className="rules-close-btn"
                onClick={() => setRulesOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="rules-popup-content">
              <ol>
                <li>
                  <strong>Eligibility:</strong> This promotion is exclusive to newly registered players on 69 Club making their very first deposit.
                </li>
                <li>
                  <strong>Bonus Calculation:</strong> 30% compensation bonus is calculated directly from your first approved deposit amount, up to a maximum limit of ₹200.00.
                </li>
                <li>
                  <strong>Instant Credit:</strong> Once claimed, funds are immediately credited to your main balance and available for all games.
                </li>
                <li>
                  <strong>Fair Play:</strong> Each account, mobile number, IP address, and payment account is entitled to claim this bonus only once. Multiple accounts violate terms.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
