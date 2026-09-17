import React from 'react'
import { Activity, TrendingUp, Users, RefreshCw } from 'lucide-react'

export function AdminMatrixView({ matrixData, loading, onRefresh }) {
  const pool = matrixData?.poolMatrix || {}
  const totalPending = pool.totalPendingVolume || 0
  const colors = pool.colors || { green: 0, red: 0, violet: 0 }
  const sizes = pool.sizes || { big: 0, small: 0 }
  const digits = pool.digits || { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }

  const calcPct = (val) => {
    if (!totalPending || totalPending <= 0) return 0
    return Math.min(100, Math.round((Number(val || 0) / totalPending) * 100))
  }

  return (
    <div className="admin-subpage-container">
      {/* 1. Top Summary Metric Cards */}
      <div className="admin-metrics-grid">
        <div className="admin-stat-card">
          <span className="stat-label">Total Players</span>
          <strong className="stat-number">{matrixData?.totalUsers ?? '...'}</strong>
          <span className="stat-subtext">Active DB Accounts</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Total Bets Placed</span>
          <strong className="stat-number">
            ₹{Number(matrixData?.totalBetsAmount || 0).toLocaleString('en-IN')}
          </strong>
          <span className="stat-subtext">{matrixData?.totalBetsCount || 0} Total Bets</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Total Payouts Won</span>
          <strong className="stat-number green">
            ₹{Number(matrixData?.totalPayoutsAmount || 0).toLocaleString('en-IN')}
          </strong>
          <span className="stat-subtext">Paid to Winners</span>
        </div>

        <div className="admin-stat-card highlight">
          <span className="stat-label">House Net Profit</span>
          <strong
            className={`stat-number ${Number(matrixData?.platformNetProfit || 0) >= 0 ? 'blue' : 'red'}`}
          >
            ₹{Number(matrixData?.platformNetProfit || 0).toLocaleString('en-IN')}
          </strong>
          <span className="stat-subtext">Margin: {matrixData?.profitMarginPct ?? 0}%</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Approved Deposits</span>
          <strong className="stat-number green">
            ₹{Number(matrixData?.totalDepositsAmount || 0).toLocaleString('en-IN')}
          </strong>
          <span className="stat-subtext">Total Verified Inflow</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Approved Payouts</span>
          <strong className="stat-number" style={{ color: '#ea580c' }}>
            ₹{Number(matrixData?.totalWithdrawalsAmount || 0).toLocaleString('en-IN')}
          </strong>
          <span className="stat-subtext">Total Processed Withdrawals</span>
        </div>
      </div>

      {/* 2. Live Round Bet Distribution Matrix ("Kispar Kitna Paisa Laga") */}
      <div className="admin-card-section">
        <div className="card-section-header">
          <h4>Live Round Risk Distribution ("Kispar Kitna Paisa Laga")</h4>
          <span className="live-badge-vol">
            Pending Round Vol: ₹{totalPending.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="pool-cards-layout">
          {/* Color Markets */}
          <div className="pool-sub-card">
            <h5>🎨 Color Markets</h5>
            <div className="pool-row">
              <span className="pool-row-name">Green</span>
              <div className="pool-bar-track">
                <div
                  className="pool-bar-fill color-green"
                  style={{ width: `${calcPct(colors.green)}%` }}
                />
              </div>
              <strong className="pool-row-val">₹{Number(colors.green || 0).toLocaleString('en-IN')}</strong>
            </div>

            <div className="pool-row">
              <span className="pool-row-name">Red</span>
              <div className="pool-bar-track">
                <div
                  className="pool-bar-fill color-red"
                  style={{ width: `${calcPct(colors.red)}%` }}
                />
              </div>
              <strong className="pool-row-val">₹{Number(colors.red || 0).toLocaleString('en-IN')}</strong>
            </div>

            <div className="pool-row">
              <span className="pool-row-name">Violet</span>
              <div className="pool-bar-track">
                <div
                  className="pool-bar-fill color-violet"
                  style={{ width: `${calcPct(colors.violet)}%` }}
                />
              </div>
              <strong className="pool-row-val">₹{Number(colors.violet || 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* Size Markets */}
          <div className="pool-sub-card">
            <h5>⚖️ Size Markets</h5>
            <div className="pool-row">
              <span className="pool-row-name">Big (5-9)</span>
              <div className="pool-bar-track">
                <div
                  className="pool-bar-fill size-big"
                  style={{ width: `${calcPct(sizes.big)}%` }}
                />
              </div>
              <strong className="pool-row-val">₹{Number(sizes.big || 0).toLocaleString('en-IN')}</strong>
            </div>

            <div className="pool-row">
              <span className="pool-row-name">Small (0-4)</span>
              <div className="pool-bar-track">
                <div
                  className="pool-bar-fill size-small"
                  style={{ width: `${calcPct(sizes.small)}%` }}
                />
              </div>
              <strong className="pool-row-val">₹{Number(sizes.small || 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Number Markets (0 - 9) */}
        <div style={{ marginTop: '16px' }}>
          <h5 style={{ fontSize: '12px', fontWeight: '700', color: '#334155', margin: '0 0 6px 0' }}>
            🔢 Digits Volume Matrix (0 to 9)
          </h5>
          <div className="digits-matrix-grid">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
              const bg =
                digit === 0
                  ? 'linear-gradient(135deg, #ef4444 50%, #a855f7 50%)'
                  : digit === 5
                  ? 'linear-gradient(135deg, #22c55e 50%, #a855f7 50%)'
                  : digit % 2 === 0
                  ? '#ef4444'
                  : '#22c55e'
              return (
                <div key={digit} className="digit-chip-card">
                  <div className="digit-badge-pill" style={{ background: bg }}>
                    {digit}
                  </div>
                  <span className="digit-amt-text">
                    ₹{Number(digits[digit] || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminMatrixView
