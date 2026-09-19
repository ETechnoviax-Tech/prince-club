import React, { useEffect, useState } from 'react'
import { ArrowLeft, History, RefreshCw } from 'lucide-react'

function money(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export default function GameHistoryPage({ currentUser, bets = [], onRefresh, onBack, onLogin }) {
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (currentUser && onRefresh) {
      setRefreshing(true)
      Promise.resolve(onRefresh()).finally(() => setRefreshing(false))
    }
  }, [currentUser, onRefresh])

  const refresh = async () => {
    if (!onRefresh) return
    setRefreshing(true)
    try { await onRefresh() } finally { setRefreshing(false) }
  }

  return (
    <section className="game-history-page">
      <header className="game-history-page-header">
        <button className="game-history-back-btn" onClick={onBack} aria-label="Back to account">
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1><History size={20} /> Game History</h1>
          <p>All your real game records and settlements</p>
        </div>
        {currentUser && (
          <button className={`game-history-refresh-btn ${refreshing ? 'spinning' : ''}`} onClick={refresh} disabled={refreshing} aria-label="Refresh game history">
            <RefreshCw size={17} />
          </button>
        )}
      </header>

      {!currentUser ? (
        <div className="game-history-empty">
          <History size={38} />
          <h3>Login required</h3>
          <p>Please log in to view your real game history.</p>
          <button onClick={onLogin}>Log in now</button>
        </div>
      ) : bets.length === 0 ? (
        <div className="game-history-empty">
          <History size={38} />
          <h3>No game records yet</h3>
          <p>Your bets and settlements will appear here after you play.</p>
        </div>
      ) : (
        <div className="game-history-list">
          {bets.map((bet) => (
            <article className="game-history-record" key={bet.id}>
              <div className="game-history-record-top">
                <div>
                  <strong>{bet.gameMode || 'WINGO'}</strong>
                  <span>{bet.selection || 'Game round'}</span>
                </div>
                <span className={`game-history-status ${bet.status}`}>
                  {bet.status === 'won' ? `WON ${money(bet.payout)}` : bet.status === 'lost' ? 'LOST' : 'PENDING'}
                </span>
              </div>
              <div className="game-history-record-meta">
                <span>Stake {money(bet.amount)}</span>
                <span>{bet.round && bet.round !== 'undefined' ? `Round ${bet.round}` : 'Round record'}</span>
                <span>{bet.createdAt || '—'}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
