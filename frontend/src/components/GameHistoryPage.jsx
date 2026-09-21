import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  ArrowLeft,
  History,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Gamepad2,
  Plane,
  Layers,
  Sparkles,
  Award,
  ChevronDown,
} from 'lucide-react'
import { fetchUserBets } from '../api/client'

const PAGE_SIZE = 20

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatBet(b) {
  const rawStatus = String(b.status || '').toLowerCase()
  const isWon = rawStatus === 'won' || rawStatus === 'cashed_out' || Number(b.payout) > 0
  const isLost = rawStatus === 'lost'
  const normalizedStatus = isWon ? 'won' : isLost ? 'lost' : 'pending'
  const roundNumber = String(b.round_number || b.round || b.issueNumber || '')
  return {
    id: b.id,
    gameMode: String(b.game_mode || 'WINGO').toUpperCase(),
    round: roundNumber,
    selection: String(b.selection || 'Manual'),
    amount: Number(b.amount || 0),
    multiplier: Number(b.multiplier || b.mult || b.cashout_multiplier || 1),
    payout: Number(b.payout || 0),
    status: normalizedStatus,
    createdAt: b.created_at || b.placed_at
      ? new Date(b.created_at || b.placed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
      : 'Recently',
  }
}

function SkeletonCard() {
  return (
    <div className="gh-skeleton-card">
      <div className="gh-sk-row">
        <div className="gh-sk-block gh-sk-w60" />
        <div className="gh-sk-block gh-sk-w30" />
      </div>
      <div className="gh-sk-row" style={{ marginTop: 10 }}>
        <div className="gh-sk-block gh-sk-w40" />
        <div className="gh-sk-block gh-sk-w20" />
        <div className="gh-sk-block gh-sk-w25" />
      </div>
      <div className="gh-sk-row" style={{ marginTop: 8 }}>
        <div className="gh-sk-block gh-sk-w50" />
        <div className="gh-sk-block gh-sk-w15" />
      </div>
    </div>
  )
}

export default function GameHistoryPage({ currentUser, onBack, onLogin }) {
  const userId = currentUser?.id
  const [allBets, setAllBets] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [gameFilter, setGameFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [copiedId, setCopiedId] = useState(null)

  const loadPage = useCallback(async (pageNum, replace = false) => {
    if (!userId) return
    const isFirst = pageNum === 1
    if (isFirst) setLoading(true)
    else setLoadingMore(true)
    try {
      const data = await fetchUserBets(userId, { page: pageNum, limit: PAGE_SIZE })
      if (data && Array.isArray(data.bets)) {
        const formatted = data.bets.map(formatBet)
        setAllBets((prev) => replace ? formatted : [...prev, ...formatted])
        setHasMore(data.hasMore !== false && data.bets.length >= PAGE_SIZE)
        setPage(pageNum)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) loadPage(1, true)
  }, [userId, loadPage])

  const handleRefresh = () => loadPage(1, true)
  const handleLoadMore = () => loadPage(page + 1, false)

  const handleCopy = (text, id) => {
    if (!text || text === 'dash') return
    navigator.clipboard?.writeText(String(text))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredBets = useMemo(() => {
    return allBets.filter((b) => {
      const mode = b.gameMode
      if (gameFilter === 'WINGO') {
        if (!['WINGO', 'PARITY', 'SAPRE', 'BCONE', 'EMERD', 'TRX'].includes(mode)) return false
      } else if (gameFilter === 'AVIATOR') {
        if (mode !== 'AVIATOR') return false
      } else if (gameFilter === 'SLOTS') {
        if (!mode.includes('SLOT') && !['CRAZY_777', 'FORTUNE_GEMS', 'SUPER_ACE'].includes(mode)) return false
      } else if (gameFilter === 'OTHER') {
        if (['WINGO', 'PARITY', 'SAPRE', 'BCONE', 'EMERD', 'TRX', 'AVIATOR'].includes(mode) || mode.includes('SLOT')) return false
      }
      if (statusFilter === 'WON' && b.status !== 'won') return false
      if (statusFilter === 'LOST' && b.status !== 'lost') return false
      if (statusFilter === 'PENDING' && b.status !== 'pending') return false
      return true
    })
  }, [allBets, gameFilter, statusFilter])

  const stats = useMemo(() => {
    let totalStake = 0, totalPayout = 0, wonCount = 0, lostCount = 0
    filteredBets.forEach((b) => {
      totalStake += b.amount
      totalPayout += b.payout
      if (b.status === 'won') wonCount++
      if (b.status === 'lost') lostCount++
    })
    const netProfit = totalPayout - totalStake
    const totalSettled = wonCount + lostCount
    const winRate = totalSettled > 0 ? Math.round((wonCount / totalSettled) * 100) : 0
    return { totalStake, totalPayout, netProfit, wonCount, lostCount, winRate }
  }, [filteredBets])

  const getGameIcon = (mode) => {
    if (mode === 'AVIATOR') return React.createElement(Plane, { size: 16, className: 'gh-icon-aviator' })
    if (mode.includes('SLOT') || ['CRAZY_777', 'FORTUNE_GEMS', 'SUPER_ACE'].includes(mode))
      return React.createElement(Sparkles, { size: 16, className: 'gh-icon-slots' })
    if (['WINGO', 'PARITY', 'SAPRE', 'BCONE', 'EMERD', 'TRX'].includes(mode))
      return React.createElement(Layers, { size: 16, className: 'gh-icon-wingo' })
    return React.createElement(Gamepad2, { size: 16, className: 'gh-icon-default' })
  }

  return (
    React.createElement('div', { className: 'subpage-container' },
      React.createElement('header', { className: 'subpage-header' },
        React.createElement('button', { className: 'subpage-back-btn', onClick: onBack },
          React.createElement(ArrowLeft, { size: 20 })
        ),
        React.createElement('h2', { className: 'subpage-title' }, 'Game History'),
        currentUser && React.createElement('button', {
          className: 'subpage-right-action',
          onClick: handleRefresh,
          disabled: loading,
        }, React.createElement(RefreshCw, { size: 18, className: loading ? 'spinning' : '' }))
      ),
      React.createElement('div', { className: 'subpage-content' },
        !currentUser
          ? React.createElement('div', { className: 'game-history-empty-box' },
              React.createElement(History, { size: 48, className: 'gh-empty-icon' }),
              React.createElement('h3', null, 'Login Required'),
              React.createElement('p', null, 'Please log in to view your gameplay records.'),
              React.createElement('button', { className: 'gh-primary-btn', onClick: onLogin }, 'Log in now')
            )
          : React.createElement(React.Fragment, null,
              React.createElement('div', { className: 'gh-summary-card' },
                React.createElement('div', { className: 'gh-summary-header' },
                  React.createElement('div', { className: 'gh-summary-title' },
                    React.createElement(Award, { size: 16 }),
                    React.createElement('span', null, 'Settlement Summary')
                  ),
                  React.createElement('div', { className: 'gh-summary-badge' },
                    React.createElement('span', null, 'Win Rate: ', React.createElement('strong', null, stats.winRate + '%'))
                  )
                ),
                React.createElement('div', { className: 'gh-summary-grid' },
                  React.createElement('div', { className: 'gh-stat-cell' },
                    React.createElement('span', { className: 'gh-stat-label' }, 'Total Staked'),
                    React.createElement('span', { className: 'gh-stat-val stake' }, money(stats.totalStake))
                  ),
                  React.createElement('div', { className: 'gh-stat-cell' },
                    React.createElement('span', { className: 'gh-stat-label' }, 'Total Payout'),
                    React.createElement('span', { className: 'gh-stat-val win' }, money(stats.totalPayout))
                  ),
                  React.createElement('div', { className: 'gh-stat-cell' },
                    React.createElement('span', { className: 'gh-stat-label' }, 'Net Profit'),
                    React.createElement('span', { className: 'gh-stat-val ' + (stats.netProfit >= 0 ? 'profit-pos' : 'profit-neg') },
                      stats.netProfit >= 0 ? '+' + money(stats.netProfit) : '-' + money(Math.abs(stats.netProfit))
                    )
                  )
                )
              ),
              React.createElement('div', { className: 'gh-category-tabs' },
                ['ALL', 'WINGO', 'AVIATOR', 'SLOTS', 'OTHER'].map((id) =>
                  React.createElement('button', {
                    key: id,
                    className: 'gh-category-tab' + (gameFilter === id ? ' active' : ''),
                    onClick: () => setGameFilter(id),
                  }, id === 'ALL' ? 'All Games' : id === 'WINGO' ? 'Win Go' : id.charAt(0) + id.slice(1).toLowerCase())
                )
              ),
              React.createElement('div', { className: 'deposit-channel-pills', style: { marginBottom: 14 } },
                [['ALL', 'All Status'], ['WON', 'Won'], ['LOST', 'Lost'], ['PENDING', 'Pending']].map(([id, label]) =>
                  React.createElement('button', {
                    key: id,
                    className: 'channel-pill' + (statusFilter === id ? ' active' : ''),
                    onClick: () => setStatusFilter(id),
                  }, label)
                )
              ),
              loading && React.createElement('div', { className: 'gh-records-container' },
                [1, 2, 3, 4, 5].map((i) => React.createElement(SkeletonCard, { key: i }))
              ),
              !loading && filteredBets.length === 0 && React.createElement('div', { className: 'game-history-empty-box' },
                React.createElement(History, { size: 42, className: 'gh-empty-icon' }),
                React.createElement('h3', null, 'No Game Records'),
                React.createElement('p', null, 'No settled rounds match your selected filters.')
              ),
              !loading && filteredBets.length > 0 && React.createElement('div', { className: 'gh-records-container' },
                filteredBets.map((bet) => {
                  const isWon = bet.status === 'won'
                  const isLost = bet.status === 'lost'
                  const isPending = !isWon && !isLost
                  return React.createElement('article', {
                    key: bet.id,
                    className: 'gh-card ' + (isWon ? 'card-won' : isLost ? 'card-lost' : 'card-pending'),
                  },
                    React.createElement('div', { className: 'gh-card-header' },
                      React.createElement('div', { className: 'gh-card-game' },
                        getGameIcon(bet.gameMode),
                        React.createElement('span', { className: 'gh-game-name' }, bet.gameMode),
                        React.createElement('span', { className: 'gh-selection-tag' }, bet.selection)
                      ),
                      React.createElement('div', { className: 'gh-status-badge ' + (isWon ? 'won' : isLost ? 'lost' : 'pending') },
                        isWon ? React.createElement(React.Fragment, null,
                          React.createElement(CheckCircle2, { size: 13 }),
                          React.createElement('span', null, 'WON +' + money(bet.payout))
                        ) : isLost ? React.createElement(React.Fragment, null,
                          React.createElement(XCircle, { size: 13 }),
                          React.createElement('span', null, 'LOST -' + money(bet.amount))
                        ) : React.createElement(React.Fragment, null,
                          React.createElement(Clock, { size: 13 }),
                          React.createElement('span', null, 'PENDING')
                        )
                      )
                    ),
                    React.createElement('div', { className: 'gh-card-metrics' },
                      React.createElement('div', { className: 'gh-metric-col' },
                        React.createElement('span', { className: 'gh-metric-label' }, 'Stake Amount'),
                        React.createElement('span', { className: 'gh-metric-value stake' }, money(bet.amount))
                      ),
                      bet.multiplier > 1 && React.createElement('div', { className: 'gh-metric-col' },
                        React.createElement('span', { className: 'gh-metric-label' }, 'Multiplier'),
                        React.createElement('span', { className: 'gh-metric-value mult' }, bet.multiplier + 'x')
                      ),
                      React.createElement('div', { className: 'gh-metric-col' },
                        React.createElement('span', { className: 'gh-metric-label' }, 'Payout'),
                        React.createElement('span', { className: 'gh-metric-value ' + (isWon ? 'payout-won' : 'payout-neutral') },
                          isWon ? money(bet.payout) : isPending ? 'In Play' : '₹0.00'
                        )
                      )
                    ),
                    React.createElement('div', { className: 'gh-card-footer' },
                      bet.round
                        ? React.createElement('div', {
                            className: 'gh-round-pill',
                            onClick: () => handleCopy(bet.round, bet.id),
                            title: 'Click to copy Round Number',
                          },
                          React.createElement('span', null, 'Round #' + bet.round),
                          copiedId === bet.id
                            ? React.createElement(Check, { size: 12, className: 'gh-copy-done' })
                            : React.createElement(Copy, { size: 12, className: 'gh-copy-icon' })
                        )
                        : React.createElement('span', { className: 'gh-round-muted' }, 'Standard Round'),
                      React.createElement('span', { className: 'gh-time-stamp' }, bet.createdAt)
                    )
                  )
                }),
                hasMore && React.createElement('button', {
                  className: 'gh-load-more-btn',
                  onClick: handleLoadMore,
                  disabled: loadingMore,
                },
                  loadingMore
                    ? React.createElement(React.Fragment, null,
                        React.createElement(RefreshCw, { size: 15, className: 'spinning' }),
                        ' Loading...'
                      )
                    : React.createElement(React.Fragment, null,
                        React.createElement(ChevronDown, { size: 15 }),
                        ' Load More'
                      )
                ),
                !hasMore && allBets.length > 0 && React.createElement('p', { className: 'gh-end-label' },
                  'All records loaded (' + allBets.length + ' total)'
                )
              )
            )
      )
    )
  )
}
