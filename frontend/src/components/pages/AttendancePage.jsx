import React, { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { sound } from '../../utils/audio'
import { fetchAttendanceStats, claimAttendanceBonus } from '../../api/client'
import './attendance.css'

export default function AttendancePage({
  onBack,
  onBalanceUpdate,
  currentUser,
  userId,
}) {
  const [stats, setStats] = useState({
    consecutiveDays: 0,
    accumulatedBonus: '0.00',
    canClaim: true,
    nextDay: 1,
    nextReward: 5,
    tiers: [
      { day: 1, depositRequired: 200, bonus: 5 },
      { day: 2, depositRequired: 1000, bonus: 18 },
      { day: 3, depositRequired: 3000, bonus: 100 },
      { day: 4, depositRequired: 10000, bonus: 200 },
      { day: 5, depositRequired: 20000, bonus: 400 },
      { day: 6, depositRequired: 100000, bonus: 3000 },
      { day: 7, depositRequired: 200000, bonus: 7000 },
    ],
    history: [],
  })

  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [currentView, setCurrentView] = useState('main') // 'main' | 'rules'
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const activeUserId = currentUser?.id || userId

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchAttendanceStats(activeUserId)
      if (data?.success) {
        setStats({
          consecutiveDays: Number(data.consecutiveDays || 0),
          accumulatedBonus: data.accumulatedBonus || '0.00',
          canClaim: Boolean(data.canClaim),
          nextDay: Number(data.nextDay || 1),
          nextReward: Number(data.nextReward || 5),
          tiers: data.tiers || stats.tiers,
          history: data.history || [],
        })
      }
    } catch (err) {
      console.warn('[AttendancePage] Failed to fetch stats:', err.message)
    } finally {
      setLoading(false)
    }
  }, [activeUserId])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleClaim = async () => {
    if (claiming || !stats.canClaim) return
    sound.playBet?.()
    setClaiming(true)
    setFeedback(null)

    try {
      const res = await claimAttendanceBonus(activeUserId)
      sound.playWin?.()
      setFeedback({
        type: 'success',
        message: res.message || `🎉 Successfully claimed Day ${res.streak} attendance bonus of ₹${res.bonusAmount}!`,
      })
      if (res.newBalance !== undefined && onBalanceUpdate) {
        onBalanceUpdate(res.newBalance)
      }
      await loadStats()
    } catch (err) {
      sound.playLose?.()
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to claim attendance bonus. Please try again.',
      })
    } finally {
      setClaiming(false)
    }
  }

  // SUBVIEW: GAME RULES (Matches user screenshot 2)
  if (currentView === 'rules') {
    return (
      <div className="attendance-page-container">
        {/* Header */}
        <header className="attendance-header">
          <button
            className="attendance-back-btn"
            onClick={() => {
              sound.playTick?.()
              setCurrentView('main')
            }}
            title="Back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="attendance-header-title">Game Rules</h1>
          <div className="attendance-header-spacer" />
        </header>

        <div className="attendance-content">
          <div className="rules-subview-wrap">
            {/* Table Card */}
            <div className="rules-table-card">
              <div className="rules-table-header">
                <div className="rules-header-col">Continuous<br />attendance</div>
                <div className="rules-header-col">Accumulated<br />amount</div>
                <div className="rules-header-col">Attendance<br />bonus</div>
              </div>

              {stats.tiers.map((t) => (
                <div key={t.day} className="rules-table-row">
                  <div className="col-day">{t.day}</div>
                  <div className="col-deposit">
                    ₹{t.depositRequired.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="col-bonus">
                    ₹{t.bonus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>

            {/* Explanation Rules Card */}
            <div className="rules-explanation-card">
              <div className="rules-banner-ribbon-wrap">
                <div className="rules-banner-ribbon">Rules</div>
              </div>

              <div className="rules-points-list">
                <div className="rule-point-item">
                  <span className="rule-point-diamond">◆</span>
                  <span>The higher the number of consecutive login days, the more rewards you get, up to 7 consecutive days</span>
                </div>
                <div className="rule-point-item">
                  <span className="rule-point-diamond">◆</span>
                  <span>During the activity, please check once a day</span>
                </div>
                <div className="rule-point-item">
                  <span className="rule-point-diamond">◆</span>
                  <span>Players with no deposit history cannot claim the bonus</span>
                </div>
                <div className="rule-point-item">
                  <span className="rule-point-diamond">◆</span>
                  <span>Deposit requirements must be met from day one</span>
                </div>
                <div className="rule-point-item">
                  <span className="rule-point-diamond">◆</span>
                  <span>The platform reserves the right to final interpretation of this activity</span>
                </div>
                <div className="rule-point-item">
                  <span className="rule-point-diamond">◆</span>
                  <span>When you encounter problems, please contact customer service</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // MAIN VIEW: ATTENDANCE (Matches user screenshot 1)
  return (
    <div className="attendance-page-container">
      {/* Header */}
      <header className="attendance-header">
        <button
          className="attendance-back-btn"
          onClick={() => {
            sound.playTick?.()
            onBack?.()
          }}
          title="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="attendance-header-title">Attendance</h1>
        <div className="attendance-header-spacer" />
      </header>

      <div className="attendance-content">
        {/* 1. Hero Card */}
        <div className="attendance-hero-card">
          <div className="attendance-hero-top">
            <div className="attendance-hero-text">
              <h2 className="attendance-hero-title">Attendance bonus</h2>
              <p className="attendance-hero-sub">
                Get rewards based on consecutive login days
              </p>

              {/* Consecutive Days Ribbon */}
              <div className="consecutive-ribbon-badge">
                Attended consecutively <span className="consecutive-ribbon-num">{stats.consecutiveDays}</span> Day
              </div>

              {/* Accumulated Bonus */}
              <div className="attendance-accumulated-block">
                <span className="accumulated-label">Accumulated</span>
                <div className="accumulated-value">₹{stats.accumulatedBonus}</div>
              </div>
            </div>

            {/* Calendar & Pencil Art */}
            <div className="attendance-hero-art">
              <div className="calendar-illustration-box">
                <span className="cal-sprout-leaf">🌱</span>
                <div className="cal-graphic-tray" />
                <div className="cal-graphic-pad">
                  <div className="cal-pad-rings">
                    <span className="cal-ring" />
                    <span className="cal-ring" />
                    <span className="cal-ring" />
                  </div>
                  <div className="cal-pad-lines">
                    <span className="cal-pad-line" />
                    <span className="cal-pad-line highlight" />
                    <span className="cal-pad-line" />
                  </div>
                </div>
                <div className="cal-pencil-art">✏️</div>
              </div>
            </div>
          </div>

          {/* Two Hero Buttons: Game Rules & Attendance history */}
          <div className="attendance-hero-actions">
            <button
              type="button"
              className="btn-hero-pill"
              onClick={() => {
                sound.playTick?.()
                setCurrentView('rules')
              }}
            >
              Game Rules
            </button>
            <button
              type="button"
              className="btn-hero-pill"
              onClick={() => {
                sound.playTick?.()
                setHistoryModalOpen(true)
              }}
            >
              Attendance history
            </button>
          </div>
        </div>

        {/* 2. Daily Rewards Grid (Days 1 to 6) */}
        <div className="attendance-days-grid">
          {stats.tiers.slice(0, 6).map((tier) => {
            const isCompleted = tier.day <= stats.consecutiveDays
            const isToday = stats.canClaim && tier.day === stats.nextDay
            return (
              <div
                key={tier.day}
                className={`day-reward-card ${isCompleted ? 'completed' : ''} ${isToday ? 'active-today' : ''}`}
              >
                {isCompleted && <span className="day-card-check-badge">✓</span>}
                <div className="day-card-amount">₹{tier.bonus.toFixed(2)}</div>
                <div className="gold-star-coin-wrap">
                  <div className="star-coin-inner-ring">
                    <span className="star-coin-glyph">★</span>
                  </div>
                </div>
                <div className="day-card-label">{tier.day} Day</div>
              </div>
            )
          })}
        </div>

        {/* 3. Day 7 Full Feature Card */}
        {stats.tiers[6] && (
          <div
            className={`day-7-full-card ${
              stats.consecutiveDays >= 7 ? 'completed' : ''
            } ${stats.canClaim && stats.nextDay === 7 ? 'active-today' : ''}`}
          >
            <div className="day-7-art-giftbox">
              <span className="day-7-gift-icon">🎁</span>
              <span className="day-7-coins-pile">🪙</span>
            </div>

            <div className="day-7-info">
              <div className="day-7-amount-line">
                — ₹{stats.tiers[6].bonus.toLocaleString('en-IN', { minimumFractionDigits: 2 })} —
              </div>
              <div className="day-7-label">7 Day</div>
            </div>
          </div>
        )}

        {/* Feedback alert */}
        {feedback && (
          <div className={`attendance-alert-box ${feedback.type}`}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* 4. Bottom Attendance Action Button */}
        <div className="attendance-action-wrap">
          <button
            type="button"
            className={`attendance-main-btn ${!stats.canClaim ? 'disabled-btn' : ''}`}
            onClick={handleClaim}
            disabled={claiming || !stats.canClaim}
          >
            {claiming
              ? 'Signing In...'
              : !stats.canClaim
              ? 'Attended today'
              : 'Attendance'}
          </button>
        </div>
      </div>

      {/* Attendance History Modal */}
      {historyModalOpen && (
        <div className="attendance-history-modal-overlay" onClick={() => setHistoryModalOpen(false)}>
          <div className="attendance-history-card" onClick={(e) => e.stopPropagation()}>
            <div className="history-card-header">
              <h3>Attendance History</h3>
              <button
                className="history-close-btn"
                onClick={() => setHistoryModalOpen(false)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="history-card-body">
              {stats.history.length > 0 ? (
                stats.history.map((item) => (
                  <div key={item.id} className="history-item-row">
                    <div>
                      <div className="history-item-title">{item.description}</div>
                      <div className="history-item-date">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="history-item-amount">+₹{item.amount.toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b', fontSize: 13 }}>
                  No attendance history yet. Tap Attendance daily to build your streak and earn rewards!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
