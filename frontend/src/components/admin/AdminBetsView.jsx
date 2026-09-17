import React, { useState, useMemo } from 'react'
import { TrendingUp, Search, FileText } from 'lucide-react'

export function AdminBetsView({ betsList, loading }) {
  const [filter, setFilter] = useState('ALL') // 'ALL' | 'WON' | 'LOST' | 'PENDING'
  const [search, setSearch] = useState('')

  const filteredBets = useMemo(() => {
    return (betsList || []).filter((bet) => {
      if (filter !== 'ALL' && String(bet.status).toUpperCase() !== filter) {
        return false
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const user = String(bet.user || bet.username || '').toLowerCase()
        const period = String(bet.period || bet.round_number || '').toLowerCase()
        const sel = String(bet.selection || '').toLowerCase()
        return user.includes(q) || period.includes(q) || sel.includes(q)
      }
      return true
    })
  }, [betsList, filter, search])

  return (
    <div className="admin-subpage-container">
      {/* Search & Filter Toolbar */}
      <div className="admin-toolbar-row">
        <div className="admin-filter-tabs">
          {['ALL', 'WON', 'LOST', 'PENDING'].map((status) => (
            <button
              key={status}
              type="button"
              className={`admin-filter-pill ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: '160px', maxWidth: '240px' }}>
          <div className="admin-search-box" style={{ margin: 0 }}>
            <Search size={14} />
            <input
              type="text"
              className="admin-search-input"
              style={{ height: '32px', fontSize: '12px' }}
              placeholder="Search user / round..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Bets Cards List (Mobile-Optimized) */}
      {filteredBets.length === 0 ? (
        <div className="admin-empty-box">
          <FileText size={32} />
          <p>No bet records found for current criteria.</p>
        </div>
      ) : (
        <div className="admin-bets-cards-list">
          {filteredBets.map((b, idx) => {
            const status = String(b.status || 'PENDING').toUpperCase()
            const statusClass = status === 'WON' ? 'won' : status === 'LOST' ? 'lost' : 'pending'
            const payout = Number(b.payout || 0)
            const amt = Number(b.amount || 0)

            return (
              <div key={b.id || idx} className="admin-bet-item-card">
                <div className="bet-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="bet-mode-tag">{b.game_mode || 'PARITY'}</span>
                    <span className="bet-period-num">#{String(b.period || b.round_number || b.round_id || '').slice(-6)}</span>
                  </div>
                  <span className={`bet-status-pill ${statusClass}`}>{status}</span>
                </div>

                <div className="bet-card-mid">
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Player: </span>
                    <strong style={{ fontSize: '12px', color: '#0f172a' }}>
                      {b.user || b.username || 'Player'}
                    </strong>
                  </div>

                  <span className="bet-target-badge">
                    Selection: <strong>{String(b.selection).toUpperCase()}</strong>
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '6px',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <div className="bet-amount-info">
                    <span>Wager: <strong>₹{amt.toFixed(2)}</strong></span>
                    {b.multiplier && (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        ({b.multiplier}x)
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Payout: </span>
                    <strong className={`bet-payout-val ${status === 'WON' ? 'win' : 'loss'}`}>
                      ₹{payout.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminBetsView
