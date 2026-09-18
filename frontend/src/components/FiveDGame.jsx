import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Clock,
  Volume2,
  VolumeX,
  History,
  TrendingUp,
  X,
  Minus,
  Plus,
} from 'lucide-react'
import { sound } from '../utils/audio'
import { placeBet as apiPlaceBet } from '../api/client'

const FIVED_MODES = [
  { id: '1m', name: '5D Lotre', time: '1Min', duration: 60, lock: 5 },
  { id: '3m', name: '5D Lotre', time: '3Min', duration: 180, lock: 10 },
  { id: '5m', name: '5D Lotre', time: '5Min', duration: 300, lock: 15 },
  { id: '10m', name: '5D Lotre', time: '10Min', duration: 600, lock: 30 },
]

export function FiveDGame({
  balance,
  onBalanceUpdate,
  onBackToLobby,
  onOpenDeposit,
  onOpenWithdraw,
  userId,
  setToast,
}) {
  const [selectedTab, setSelectedTab] = useState('1m')
  const [activePosition, setActivePosition] = useState('Total') // 'Total', 'A', 'B', 'C', 'D', 'E'
  const [seconds] = useState(0)
  const [periodNumber] = useState('—')
  const [reels] = useState([0, 0, 0, 0, 0])
  const [spinning, setSpinning] = useState(false)
  const [history] = useState([])
  /*
    { period: '20260913100050820', reels: [5, 9, 2, 4, 8], sum: 28 },
    { period: '20260913100050819', reels: [1, 0, 7, 3, 6], sum: 17 },
    { period: '20260913100050818', reels: [8, 8, 4, 2, 9], sum: 31 },
    { period: '20260913100050817', reels: [2, 3, 5, 1, 0], sum: 11 },
    { period: '20260913100050816', reels: [9, 6, 7, 8, 5], sum: 35 },
  */

  // Bet Drawer State
  const [betSheetOpen, setBetSheetOpen] = useState(false)
  const [selectedBet, setSelectedBet] = useState(null)
  const [baseAmount, setBaseAmount] = useState(10)
  const [betMultiplier, setBetMultiplier] = useState(1)
  const [isMuted, setIsMuted] = useState(sound.isMuted)

  const activeMode = FIVED_MODES.find((m) => m.id === selectedTab) || FIVED_MODES[0]
  const isLocked = seconds <= activeMode.lock

  // Period Countdown & Result Loop
  useEffect(() => {
    return undefined
    /* Live provider integration goes here; locally generated outcomes are intentionally disabled.
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setSpinning(true)
          const r1 = Math.floor(Math.random() * 10)
          const r2 = Math.floor(Math.random() * 10)
          const r3 = Math.floor(Math.random() * 10)
          const r4 = Math.floor(Math.random() * 10)
          const r5 = Math.floor(Math.random() * 10)
          const newReels = [r1, r2, r3, r4, r5]
          const sum = r1 + r2 + r3 + r4 + r5

          setTimeout(() => {
            setReels(newReels)
            setSpinning(false)
            sound.playWin?.()
            setHistory((old) => [
              { period: periodNumber, reels: newReels, sum },
              ...old.slice(0, 19),
            ])
            setPeriodNumber((p) => String(BigInt(p) + 1n))
          }, 1500)
          return activeMode.duration
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    */
  }, [activeMode.duration, periodNumber])

  const handleOpenBet = (bet) => {
    if (seconds === 0) {
      setToast?.({ type: 'warning', title: 'Live Data Unavailable', detail: '5D betting is paused until a verified live provider is connected.' })
      return
    }
    if (isLocked) {
      setToast?.({
        type: 'warning',
        title: 'Round Locked',
        detail: 'Bets are locked during the final 5 seconds of the draw.',
      })
      return
    }
    setSelectedBet(bet)
    setBetSheetOpen(true)
    sound.playTick?.()
  }

  const handleConfirmBet = async () => {
    const total = baseAmount * betMultiplier
    if (total > balance) {
      setToast?.({
        type: 'loss',
        title: 'Insufficient Balance',
        detail: 'Please recharge your wallet to place this 5D bet.',
      })
      return
    }

    try {
      await apiPlaceBet(userId, `${activePosition}_${selectedBet.label}`, total, {
        mode: '5D_' + selectedTab.toUpperCase(),
        issueNumber: periodNumber,
        typeId: selectedTab === '1m' ? 1 : selectedTab === '3m' ? 2 : 3,
      })
      onBalanceUpdate?.(balance - total)
      sound.playBet?.()
      setBetSheetOpen(false)
      setToast?.({
        type: 'success',
        title: 'Bet Placed Successfully',
        detail: `5D [${activePosition}] ${selectedBet.label} - ₹${total}`,
      })
    } catch (error) {
      setToast?.({
        type: 'loss',
        title: 'Bet Not Placed',
        detail: error.message || 'Live 5D service is unavailable. No amount was deducted.',
      })
    }
  }

  const totalSum = reels.reduce((acc, v) => acc + v, 0)

  return (
    <div className="fived-arena-container">
      {/* 1. Top Navigation */}
      <header className="fived-header-nav">
        <button className="fived-back-btn" onClick={onBackToLobby} title="Back to Lobby">
          <ArrowLeft size={20} />
        </button>
        <div className="fived-brand-title">
          <span className="brand-crown">👑</span>
          <span>5D LOTTERY</span>
        </div>
        <div className="fived-nav-actions">
          <button
            className="fived-action-btn"
            onClick={() => setIsMuted(sound.toggleMute())}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {/* 2. Wallet Bar */}
      <div className="fived-wallet-bar">
        <div className="fived-balance-col">
          <span className="wallet-label">Available Balance</span>
          <strong className="wallet-amount">₹{Number(balance).toFixed(2)}</strong>
        </div>
        <div className="fived-wallet-buttons">
          <button className="fived-btn-withdraw" onClick={onOpenWithdraw}>Withdraw</button>
          <button className="fived-btn-deposit" onClick={onOpenDeposit}>Deposit</button>
        </div>
      </div>

      {/* 3. 4-Time Selector */}
      <div className="fived-time-tabs-row">
        {FIVED_MODES.map((m) => {
          const isActive = selectedTab === m.id
          return (
            <button
              key={m.id}
              className={`fived-tab-pill ${isActive ? 'active' : ''}`}
              onClick={() => {
                setSelectedTab(m.id)
                sound.playTick?.()
              }}
            >
              <Clock size={16} />
              <span className="tab-name">{m.name}</span>
              <span className="tab-time">{m.time}</span>
            </button>
          )
        })}
      </div>

      {/* 4. 5D Stage & 5 Reels Card */}
      <div className="fived-stage-card">
        <div className="stage-header-row">
          <div className="stage-left">
            <span className="stage-period-label">Period</span>
            <strong className="stage-period-number">{periodNumber}</strong>
          </div>
          <div className="stage-right">
            <span className="clock-label">Time remaining</span>
            <div className={`fived-countdown-boxes ${isLocked ? 'locked' : ''}`}>
              <span className="time-digit">{String(Math.floor(seconds / 60)).padStart(2, '0')}</span>
              <span className="time-sep">:</span>
              <span className="time-digit">{String(seconds % 60).padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* 5 Spinning Reels: A, B, C, D, E */}
        <div className="fived-reels-row">
          {['A', 'B', 'C', 'D', 'E'].map((letter, idx) => (
            <div key={letter} className="fived-reel-box">
              <span className="reel-letter">{letter}</span>
              <div className={`reel-digit-ball ${spinning ? 'spin-anim' : ''}`}>
                <span>{reels[idx]}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="fived-sum-row">
          <span>Total Sum: <strong>{totalSum}</strong></span>
          <span className={`sum-badge ${totalSum >= 23 ? 'big' : 'small'}`}>
            {totalSum >= 23 ? 'Big' : 'Small'}
          </span>
          <span className={`sum-badge ${totalSum % 2 === 0 ? 'even' : 'odd'}`}>
            {totalSum % 2 === 0 ? 'Even' : 'Odd'}
          </span>
        </div>
      </div>

      {/* 5. Position Selector (Total, A, B, C, D, E) */}
      <div className="fived-pos-tabs">
        {['Total', 'A', 'B', 'C', 'D', 'E'].map((pos) => (
          <button
            key={pos}
            className={`pos-tab-btn ${activePosition === pos ? 'active' : ''}`}
            onClick={() => {
              setActivePosition(pos)
              sound.playTick?.()
            }}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* 6. Betting Grids */}
      <div className="fived-bet-grid-wrapper">
        {/* Big / Small / Odd / Even */}
        <div className="fived-bs-row">
          <button
            className="fived-action-btn big"
            disabled={isLocked}
            onClick={() => handleOpenBet({ label: 'Big', multiplier: 1.98, type: 'size' })}
          >
            <strong>Big</strong>
            <span>1.98X</span>
          </button>
          <button
            className="fived-action-btn small"
            disabled={isLocked}
            onClick={() => handleOpenBet({ label: 'Small', multiplier: 1.98, type: 'size' })}
          >
            <strong>Small</strong>
            <span>1.98X</span>
          </button>
          <button
            className="fived-action-btn odd"
            disabled={isLocked}
            onClick={() => handleOpenBet({ label: 'Odd', multiplier: 1.98, type: 'parity' })}
          >
            <strong>Odd</strong>
            <span>1.98X</span>
          </button>
          <button
            className="fived-action-btn even"
            disabled={isLocked}
            onClick={() => handleOpenBet({ label: 'Even', multiplier: 1.98, type: 'parity' })}
          >
            <strong>Even</strong>
            <span>1.98X</span>
          </button>
        </div>

        {/* Position Digits 0-9 (Only for specific A, B, C, D, E positions) */}
        {activePosition !== 'Total' && (
          <div className="fived-digits-grid">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                className="fived-digit-btn"
                disabled={isLocked}
                onClick={() => handleOpenBet({ label: `Digit ${digit}`, multiplier: 9.0, type: 'digit' })}
              >
                <span className="digit-circle">{digit}</span>
                <span className="digit-mult">9.0X</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 7. Draw History */}
      <div className="fived-history-section">
        <div className="history-header">
          <History size={16} />
          <h4>Game Draw History</h4>
        </div>
        <div className="fived-history-table-wrap">
          <table className="fived-history-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Reels Result</th>
                <th>Sum</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={`${h.period}-${i}`}>
                  <td className="mono">{h.period.slice(-4)}</td>
                  <td>
                    <div className="fived-history-balls">
                      {h.reels.map((v, idx) => (
                        <span key={idx} className="hist-ball">{v}</span>
                      ))}
                    </div>
                  </td>
                  <td className="sum-val">
                    <strong>{h.sum}</strong> ({h.sum >= 23 ? 'Big' : 'Small'})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Bottom Sheet Drawer */}
      {betSheetOpen && selectedBet && (
        <div className="modal-overlay" onClick={() => setBetSheetOpen(false)}>
          <div className="bet-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>5D [{activePosition}] - {selectedBet.label}</h3>
              <button className="drawer-close" onClick={() => setBetSheetOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-bet-chips">
                {[10, 50, 100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    className={`chip-btn ${baseAmount === amt ? 'active' : ''}`}
                    onClick={() => setBaseAmount(amt)}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <div className="drawer-multiplier-stepper">
                <span className="stepper-label">Quantity:</span>
                <div className="stepper-controls">
                  <button
                    className="step-btn"
                    onClick={() => setBetMultiplier((m) => Math.max(1, m - 1))}
                  >
                    <Minus size={14} />
                  </button>
                  <strong className="step-val">{betMultiplier}</strong>
                  <button
                    className="step-btn"
                    onClick={() => setBetMultiplier((m) => m + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div className="drawer-summary-row">
                <span>Total Amount:</span>
                <strong className="text-orange">₹{baseAmount * betMultiplier}</strong>
              </div>

              <div className="drawer-action-btns">
                <button className="btn-cancel" onClick={() => setBetSheetOpen(false)}>
                  Cancel
                </button>
                <button
                  className="btn-confirm"
                  onClick={handleConfirmBet}
                  disabled={baseAmount * betMultiplier > balance}
                >
                  {baseAmount * betMultiplier > balance
                    ? 'Insufficient Funds'
                    : `Confirm Bet ₹${baseAmount * betMultiplier}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FiveDGame
