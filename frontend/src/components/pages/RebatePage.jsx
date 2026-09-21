import React, { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  LayoutGrid,
  CheckCircle2,
  Tv,
  Coins,
  RefreshCw,
} from 'lucide-react'
import { fetchRebateStats, claimOneClickRebate } from '../../api/client'
import { sound } from '../../utils/audio'
import './rebate.css'

const CATEGORIES = [
  { id: 'All', label: 'All', icon: 'grid' },
  { id: 'Lottery', label: 'Lottery', icon: 'ball' },
  { id: 'Casino', label: 'Casino', icon: 'tv' },
  { id: 'Rummy', label: 'Rummy', icon: 'card' },
]

export default function RebatePage({
  currentUser,
  userId,
  onBack,
  onBalanceUpdated,
  setToast,
}) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)

  const [stats, setStats] = useState({
    totalTurnover: '0.00',
    unwashedTurnover: '0.00',
    rebateRate: '0.05%',
    pendingRebate: '0.00',
    todayRebate: '0.00',
    totalRebate: '0.00',
    history: [],
  })

  const activeUserId = currentUser?.id || userId

  const loadRebateData = useCallback(async (cat = activeCategory) => {
    if (!activeUserId) return
    try {
      setLoading(true)
      const data = await fetchRebateStats(activeUserId, cat)
      if (data?.success) {
        setStats({
          totalTurnover: data.totalTurnover || '0.00',
          unwashedTurnover: data.unwashedTurnover || '0.00',
          rebateRate: data.rebateRate || '0.05%',
          pendingRebate: data.pendingRebate || '0.00',
          todayRebate: data.todayRebate || '0.00',
          totalRebate: data.totalRebate || '0.00',
          history: data.history || [],
        })
      }
    } catch (err) {
      console.warn('[RebatePage] Failed to fetch rebate stats:', err.message)
    } finally {
      setLoading(false)
    }
  }, [activeUserId, activeCategory])

  useEffect(() => {
    loadRebateData(activeCategory)
  }, [loadRebateData, activeCategory])

  const handleSelectCategory = (catId) => {
    setActiveCategory(catId)
    sound.playTick?.()
  }

  const handleOneClickClaim = async () => {
    if (Number(stats.pendingRebate) <= 0) {
      if (setToast) {
        setToast({
          type: 'warning',
          title: 'Betting Rebate',
          detail: 'No rebate available yet. Place real-money bets to accumulate turnover cashback!',
        })
      }
      return
    }

    setClaiming(true)
    sound.playBet?.()

    try {
      const res = await claimOneClickRebate(activeUserId)
      sound.playWin?.()
      if (setToast) {
        setToast({
          type: 'success',
          title: 'Rebate Claimed',
          detail: res.message || `₹${res.claimedAmount} added to your balance!`,
        })
      }
      if (res.newBalance !== undefined && onBalanceUpdated) {
        onBalanceUpdated(res.newBalance)
      }
      loadRebateData(activeCategory)
    } catch (err) {
      sound.playLose?.()
      if (setToast) {
        setToast({
          type: 'error',
          title: 'Claim Failed',
          detail: err.message || 'Failed to claim rebate. Please try again.',
        })
      }
    } finally {
      setClaiming(false)
    }
  }

  const renderCategoryIcon = (icon) => {
    switch (icon) {
      case 'grid':
        return <LayoutGrid size={20} />
      case 'ball':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="9" r="2.5" />
            <circle cx="12" cy="15" r="3.5" />
          </svg>
        )
      case 'tv':
        return <Tv size={20} />
      case 'card':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="2" width="16" height="20" rx="3" />
            <path d="M12 7l1.5 2.5L12 12l-1.5-2.5z" fill="currentColor" />
          </svg>
        )
      default:
        return <LayoutGrid size={20} />
    }
  }

  const displayedHistory = showAllHistory ? stats.history : stats.history.slice(0, 3)

  return (
    <div className="rebate-page-wrapper">
      {/* 1. TOP HEADER */}
      <header className="rebate-top-header">
        <button className="rebate-header-back" onClick={onBack} title="Back">
          <ChevronLeft size={22} />
        </button>
        <h2 className="rebate-header-title">Rebate</h2>
        <div className="rebate-header-placeholder" />
      </header>

      <div className="rebate-body-content">
        {/* 2. CATEGORY TABS */}
        <div className="rebate-categories-grid">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id
            return (
              <div
                key={cat.id}
                className={`rebate-category-card ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectCategory(cat.id)}
              >
                <div className="category-icon-wrap">
                  {renderCategoryIcon(cat.icon)}
                </div>
                <span className="category-card-label">{cat.label}</span>
              </div>
            )
          })}
        </div>

        {/* 3. MAIN SUMMARY CARD */}
        <div className="rebate-summary-card">
          <div className="summary-card-top">
            <span className="summary-main-heading">{activeCategory}-Total betting rebate</span>
            <span className="badge-realtime-count">
              <CheckCircle2 size={12} />
              <span>Real-time count</span>
            </span>
          </div>

          <div className="summary-big-amount-row">
            <span className="summary-coin-art">🪙</span>
            <span className="summary-big-amount">{stats.pendingRebate}</span>
          </div>

          <div className="summary-vip-pill">
            Upgrade VIP level to increase rebate rate
          </div>

          {/* 2-Col Metrics */}
          <div className="summary-2col-metrics">
            <div className="metric-box-sub">
              <span className="metric-sub-label">Today rebate</span>
              <strong className="metric-sub-val">{stats.todayRebate}</strong>
            </div>
            <div className="metric-box-sub">
              <span className="metric-sub-label">Total rebate</span>
              <strong className="metric-sub-val">{stats.totalRebate}</strong>
            </div>
          </div>

          <div className="summary-settle-note">
            Automatic code washing at 01:00:00 every morning
          </div>

          <button
            type="button"
            className={`btn-one-click-rebate ${Number(stats.pendingRebate) > 0 && !claiming ? 'active' : ''}`}
            onClick={handleOneClickClaim}
            disabled={claiming}
          >
            {claiming ? 'Claiming Rebate...' : 'One-Click Rebate'}
          </button>
        </div>

        {/* 4. REBATE HISTORY SECTION */}
        <div className="rebate-history-section-header">
          <div className="red-vertical-bar" />
          <h3 className="history-section-title">Rebate history</h3>
        </div>

        {displayedHistory.length > 0 ? (
          displayedHistory.map((item, idx) => (
            <div key={item.id || idx} className="rebate-history-card">
              <div className="history-card-top-row">
                <span className="history-category-title">{item.category}</span>
                <span className="history-status-badge">{item.status}</span>
              </div>
              <div className="history-card-date">
                {new Date(item.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
              </div>

              {/* Stepper with 3 dots */}
              <div className="history-stepper-wrap">
                <div className="stepper-row-item">
                  <div className="stepper-target-dot" />
                  <span className="stepper-label">Betting rebate</span>
                  <span className="stepper-val">{Number(item.turnover).toFixed(0)}</span>
                </div>
                <div className="stepper-row-item">
                  <div className="stepper-target-dot" />
                  <span className="stepper-label">Rebate rate</span>
                  <span className="stepper-val rate">{item.rate ? item.rate.toFixed(2) + '%' : '0.05%'}</span>
                </div>
                <div className="stepper-row-item">
                  <div className="stepper-target-dot" />
                  <span className="stepper-label">Rebate amount</span>
                  <span className="stepper-val amount">{Number(item.amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rebate-history-card" style={{ textAlign: 'center', padding: '24px 16px', color: '#94a3b8', fontSize: 13 }}>
            No rebate history yet. Valid betting turnover across Lottery & Casino games automatically accumulates daily cashback!
          </div>
        )}

        {stats.history.length > 3 && (
          <button
            type="button"
            className="btn-all-history"
            onClick={() => setShowAllHistory(!showAllHistory)}
          >
            {showAllHistory ? 'Show Less' : 'All history'}
          </button>
        )}
      </div>
    </div>
  )
}
