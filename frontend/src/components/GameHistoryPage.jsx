import React, { useEffect, useState, useMemo } from 'react'
import {
  ArrowLeft,
  History,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Gamepad2,
  Plane,
  Layers,
  Sparkles,
  Award,
} from 'lucide-react'

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function GameHistoryPage({
  currentUser,
  bets = [],
  onRefresh,
  onBack,
  onLogin,
}) {
  const [refreshing, setRefreshing] = useState(false)
  const [gameFilter, setGameFilter] = useState('ALL') // 'ALL' | 'WINGO' | 'AVIATOR' | 'SLOTS' | 'OTHER'
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'WON' | 'LOST' | 'PENDING'
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    if (currentUser && onRefresh) {
      setRefreshing(true)
      Promise.resolve(onRefresh()).finally(() => setRefreshing(false))
    }
  }, [currentUser, onRefresh])

  const refresh = async () => {
    if (!onRefresh) return
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  const handleCopy = (text, id) => {
    if (!text || text === '—') return
    navigator.clipboard?.writeText(String(text))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Filter bets based on game category and status
  const filteredBets = useMemo(() => {
    return bets.filter((b) => {
      // 1. Game category match
      const mode = String(b.gameMode || 'WINGO').toUpperCase()
      if (gameFilter === 'WINGO') {
        if (!['WINGO', 'PARITY', 'SAPRE', 'BCONE', 'EMERD', 'TRX'].includes(mode)) return false
      } else if (gameFilter === 'AVIATOR') {
        if (mode !== 'AVIATOR') return false
      } else if (gameFilter === 'SLOTS') {
        if (!mode.includes('SLOT') && !['CRAZY_777', 'FORTUNE_GEMS', 'SUPER_ACE'].includes(mode)) return false
      } else if (gameFilter === 'OTHER') {
        if (['WINGO', 'PARITY', 'SAPRE', 'BCONE', 'EMERD', 'TRX', 'AVIATOR'].includes(mode) || mode.includes('SLOT')) return false
      }

      // 2. Status match
      const rawStatus = String(b.status || '').toLowerCase()
      const isWon = rawStatus === 'won' || rawStatus === 'cashed_out' || Number(b.payout) > 0
      const isLost = rawStatus === 'lost'
      const isPending = !isWon && !isLost

      if (statusFilter === 'WON' && !isWon) return false
      if (statusFilter === 'LOST' && !isLost) return false
      if (statusFilter === 'PENDING' && !isPending) return false

      return true
    })
  }, [bets, gameFilter, statusFilter])

  // Summary Metrics
  const stats = useMemo(() => {
    let totalStake = 0
    let totalPayout = 0
    let wonCount = 0
    let lostCount = 0

    filteredBets.forEach((b) => {
      const stake = Number(b.amount || 0)
      const payout = Number(b.payout || 0)
      const isWon = String(b.status).toLowerCase() === 'won' || payout > 0
      const isLost = String(b.status).toLowerCase() === 'lost'

      totalStake += stake
      totalPayout += payout
      if (isWon) wonCount++
      if (isLost) lostCount++
    })

    const netProfit = totalPayout - totalStake
    const totalSettled = wonCount + lostCount
    const winRate = totalSettled > 0 ? Math.round((wonCount / totalSettled) * 100) : 0

    return { totalStake, totalPayout, netProfit, wonCount, lostCount, winRate }
  }, [filteredBets])

  const getGameIcon = (mode) => {
    const m = String(mode || '').toUpperCase()
    if (m === 'AVIATOR') return <Plane size={16} className="gh-icon-aviator" />
    if (m.includes('SLOT') || ['CRAZY_777', 'FORTUNE_GEMS', 'SUPER_ACE'].includes(m)) {
      return <Sparkles size={16} className="gh-icon-slots" />
    }
    if (['WINGO', 'PARITY', 'SAPRE', 'BCONE', 'EMERD', 'TRX'].includes(m)) {
      return <Layers size={16} className="gh-icon-wingo" />
    }
    return <Gamepad2 size={16} className="gh-icon-default" />
  }

  return (
    <div className="subpage-container">
      {/* 1. Subpage Header */}
      <header className="subpage-header">
        <button className="subpage-back-btn" onClick={onBack} title="Back to account">
          <ArrowLeft size={20} />
        </button>
        <h2 className="subpage-title">Game History</h2>
        {currentUser && (
          <button
            className="subpage-right-action"
            onClick={refresh}
            title="Refresh game history"
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          </button>
        )}
      </header>

      <div className="subpage-content">
        {!currentUser ? (
          <div className="game-history-empty-box">
            <History size={48} className="gh-empty-icon" />
            <h3>Login Required</h3>
            <p>Please log in to view your authentic gameplay and settlement records.</p>
            <button className="gh-primary-btn" onClick={onLogin}>
              Log in now
            </button>
          </div>
        ) : (
          <>
            {/* 2. Top Summary Ledger Card */}
            <div className="gh-summary-card">
              <div className="gh-summary-header">
                <div className="gh-summary-title">
                  <Award size={16} />
                  <span>Settlement Summary</span>
                </div>
                <div className="gh-summary-badge">
                  <span>Win Rate: <strong>{stats.winRate}%</strong></span>
                </div>
              </div>

              <div className="gh-summary-grid">
                <div className="gh-stat-cell">
                  <span className="gh-stat-label">Total Staked</span>
                  <span className="gh-stat-val stake">{money(stats.totalStake)}</span>
                </div>
                <div className="gh-stat-cell">
                  <span className="gh-stat-label">Total Payout</span>
                  <span className="gh-stat-val win">{money(stats.totalPayout)}</span>
                </div>
                <div className="gh-stat-cell">
                  <span className="gh-stat-label">Net Profit</span>
                  <span className={`gh-stat-val ${stats.netProfit >= 0 ? 'profit-pos' : 'profit-neg'}`}>
                    {stats.netProfit >= 0 ? `+${money(stats.netProfit)}` : `-${money(Math.abs(stats.netProfit))}`}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Game Mode Category Tabs */}
            <div className="gh-category-tabs">
              {[
                { id: 'ALL', label: 'All Games' },
                { id: 'WINGO', label: 'Win Go' },
                { id: 'AVIATOR', label: 'Aviator' },
                { id: 'SLOTS', label: 'Slots' },
                { id: 'OTHER', label: 'Other' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`gh-category-tab ${gameFilter === tab.id ? 'active' : ''}`}
                  onClick={() => setGameFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 4. Status Filter Pills */}
            <div className="deposit-channel-pills" style={{ marginBottom: 14 }}>
              {[
                { id: 'ALL', label: 'All Status' },
                { id: 'WON', label: 'Won' },
                { id: 'LOST', label: 'Lost' },
                { id: 'PENDING', label: 'Pending' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`channel-pill ${statusFilter === tab.id ? 'active' : ''}`}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 5. Bet Records List */}
            {filteredBets.length === 0 ? (
              <div className="game-history-empty-box">
                <History size={42} className="gh-empty-icon" />
                <h3>No Game Records</h3>
                <p>No settled rounds match your selected filters.</p>
              </div>
            ) : (
              <div className="gh-records-container">
                {filteredBets.map((bet) => {
                  const rawStatus = String(bet.status || '').toLowerCase()
                  const isWon = rawStatus === 'won' || rawStatus === 'cashed_out' || Number(bet.payout) > 0
                  const isLost = rawStatus === 'lost'
                  const isPending = !isWon && !isLost

                  const roundDisplay =
                    bet.round && bet.round !== 'undefined' && bet.round !== ''
                      ? bet.round
                      : bet.round_number && bet.round_number !== 'undefined'
                      ? bet.round_number
                      : null

                  return (
                    <article className={`gh-card ${isWon ? 'card-won' : isLost ? 'card-lost' : 'card-pending'}`} key={bet.id}>
                      {/* Card Header */}
                      <div className="gh-card-header">
                        <div className="gh-card-game">
                          {getGameIcon(bet.gameMode)}
                          <span className="gh-game-name">{bet.gameMode || 'GAME'}</span>
                          <span className="gh-selection-tag">{bet.selection || 'Manual'}</span>
                        </div>

                        {/* Status Badge */}
                        <div className={`gh-status-badge ${isWon ? 'won' : isLost ? 'lost' : 'pending'}`}>
                          {isWon ? (
                            <>
                              <CheckCircle2 size={13} />
                              <span>WON +{money(bet.payout)}</span>
                            </>
                          ) : isLost ? (
                            <>
                              <XCircle size={13} />
                              <span>LOST -{money(bet.amount)}</span>
                            </>
                          ) : (
                            <>
                              <Clock size={13} />
                              <span>PENDING</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Card Middle: Key Values */}
                      <div className="gh-card-metrics">
                        <div className="gh-metric-col">
                          <span className="gh-metric-label">Stake Amount</span>
                          <span className="gh-metric-value stake">{money(bet.amount)}</span>
                        </div>

                        {bet.multiplier && Number(bet.multiplier) > 1 && (
                          <div className="gh-metric-col">
                            <span className="gh-metric-label">Multiplier</span>
                            <span className="gh-metric-value mult">{bet.multiplier}x</span>
                          </div>
                        )}

                        <div className="gh-metric-col">
                          <span className="gh-metric-label">Payout</span>
                          <span className={`gh-metric-value ${isWon ? 'payout-won' : 'payout-neutral'}`}>
                            {isWon ? money(bet.payout) : isPending ? 'In Play' : '₹0.00'}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Round & Timestamp */}
                      <div className="gh-card-footer">
                        {roundDisplay ? (
                          <div
                            className="gh-round-pill"
                            onClick={() => handleCopy(roundDisplay, bet.id)}
                            title="Click to copy Round Number"
                          >
                            <span>Round #{roundDisplay}</span>
                            {copiedId === bet.id ? (
                              <Check size={12} className="gh-copy-done" />
                            ) : (
                              <Copy size={12} className="gh-copy-icon" />
                            )}
                          </div>
                        ) : (
                          <span className="gh-round-muted">Standard Round</span>
                        )}

                        <span className="gh-time-stamp">{bet.createdAt || '—'}</span>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
