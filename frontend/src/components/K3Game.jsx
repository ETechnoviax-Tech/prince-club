import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Clock,
  Volume2,
  VolumeX,
  HelpCircle,
  History,
  TrendingUp,
  RefreshCw,
  Wallet,
  X,
  Minus,
  Plus,
} from 'lucide-react'
import { sound } from '../utils/audio'
import { placeBet as apiPlaceBet } from '../api/client'

const K3_MODES = [
  { id: '1m', name: 'K3 Lotre', time: '1Min', duration: 60, lock: 5 },
  { id: '3m', name: 'K3 Lotre', time: '3Min', duration: 180, lock: 10 },
  { id: '5m', name: 'K3 Lotre', time: '5Min', duration: 300, lock: 15 },
  { id: '10m', name: 'K3 Lotre', time: '10Min', duration: 600, lock: 30 },
]

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

const SUM_ODDS = {
  3: 207.36, 4: 69.12, 5: 34.56, 6: 20.74, 7: 13.82, 8: 9.87,
  9: 7.68, 10: 6.91, 11: 6.91, 12: 7.68, 13: 9.87, 14: 13.82,
  15: 20.74, 16: 34.56, 17: 69.12, 18: 207.36,
}

export function K3Game({
  balance,
  onBalanceUpdate,
  onBackToLobby,
  onOpenDeposit,
  onOpenWithdraw,
  userId,
  setToast,
}) {
  const [selectedK3Tab, setSelectedK3Tab] = useState('1m')
  const [activeBetCategory, setActiveBetCategory] = useState('total') // 'total', 'two_same', 'three_same', 'different'
  const [seconds, setSeconds] = useState(48)
  const [periodNumber, setPeriodNumber] = useState('20260913100030412')
  const [diceRoll, setDiceRoll] = useState([2, 5, 4])
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState([
    { period: '20260913100030411', dice: [3, 3, 5], sum: 11, size: 'Big', parity: 'Odd' },
    { period: '20260913100030410', dice: [1, 2, 4], sum: 7, size: 'Small', parity: 'Odd' },
    { period: '20260913100030409', dice: [4, 6, 6], sum: 16, size: 'Big', parity: 'Even' },
    { period: '20260913100030408', dice: [2, 2, 2], sum: 6, size: 'Small', parity: 'Even' },
    { period: '20260913100030407', dice: [5, 1, 3], sum: 9, size: 'Small', parity: 'Odd' },
    { period: '20260913100030406', dice: [6, 4, 3], sum: 13, size: 'Big', parity: 'Odd' },
    { period: '20260913100030405', dice: [2, 3, 5], sum: 10, size: 'Small', parity: 'Even' },
  ])

  // Betting sheet
  const [betSheetOpen, setBetSheetOpen] = useState(false)
  const [selectedBet, setSelectedBet] = useState(null)
  const [baseAmount, setBaseAmount] = useState(10)
  const [betMultiplier, setBetMultiplier] = useState(1)
  const [isMuted, setIsMuted] = useState(sound.isMuted)

  const activeModeObj = K3_MODES.find((m) => m.id === selectedK3Tab) || K3_MODES[0]
  const isLocked = seconds <= activeModeObj.lock

  // Period clock loop
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          // Trigger roll outcome
          setRolling(true)
          const d1 = Math.floor(Math.random() * 6) + 1
          const d2 = Math.floor(Math.random() * 6) + 1
          const d3 = Math.floor(Math.random() * 6) + 1
          const sum = d1 + d2 + d3
          setTimeout(() => {
            setDiceRoll([d1, d2, d3])
            setRolling(false)
            sound.playWin?.()
            setHistory((old) => [
              {
                period: periodNumber,
                dice: [d1, d2, d3],
                sum,
                size: sum >= 11 ? 'Big' : 'Small',
                parity: sum % 2 === 0 ? 'Even' : 'Odd',
              },
              ...old.slice(0, 19),
            ])
            setPeriodNumber((p) => String(BigInt(p) + 1n))
          }, 1500)
          return activeModeObj.duration
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [activeModeObj.duration, periodNumber])

  const handleOpenBet = (betObj) => {
    if (isLocked) {
      setToast?.({
        type: 'warning',
        title: 'Round Locked',
        detail: 'Bets are closed during the final 5 seconds of settlement.',
      })
      return
    }
    setSelectedBet(betObj)
    setBetSheetOpen(true)
    sound.playTick?.()
  }

  const handleConfirmBet = async () => {
    const total = baseAmount * betMultiplier
    if (total > balance) {
      setToast?.({
        type: 'loss',
        title: 'Insufficient Balance',
        detail: 'Please recharge your wallet to place this bet.',
      })
      return
    }

    try {
      await apiPlaceBet(userId, selectedBet.label, total, {
        mode: 'K3_' + selectedK3Tab.toUpperCase(),
        issueNumber: periodNumber,
        typeId: selectedK3Tab === '1m' ? 1 : selectedK3Tab === '3m' ? 2 : 3,
      })
      onBalanceUpdate?.(balance - total)
      sound.playBet?.()
      setBetSheetOpen(false)
      setToast?.({
        type: 'success',
        title: 'Bet Placed Successfully',
        detail: `K3 ${selectedBet.label} - ₹${total} (Period: ${periodNumber.slice(-4)})`,
      })
    } catch {
      onBalanceUpdate?.(balance - total)
      sound.playBet?.()
      setBetSheetOpen(false)
      setToast?.({
        type: 'success',
        title: 'Bet Placed (Local)',
        detail: `K3 ${selectedBet.label} - ₹${total}`,
      })
    }
  }

  const totalSum = diceRoll[0] + diceRoll[1] + diceRoll[2]

  return (
    <div className="k3-arena-container">
      {/* 1. Header */}
      <header className="k3-header-nav">
        <button className="k3-back-btn" onClick={onBackToLobby} title="Back to Lobby">
          <ArrowLeft size={20} />
        </button>
        <div className="k3-brand-title">
          <span className="brand-crown">👑</span>
          <span>K3 LOTTERY</span>
        </div>
        <div className="k3-nav-actions">
          <button
            className="k3-action-btn"
            onClick={() => setIsMuted(sound.toggleMute())}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {/* 2. Wallet Bar */}
      <div className="k3-wallet-bar">
        <div className="k3-balance-col">
          <span className="wallet-label">Available Balance</span>
          <strong className="wallet-amount">₹{Number(balance).toFixed(2)}</strong>
        </div>
        <div className="k3-wallet-buttons">
          <button className="k3-btn-withdraw" onClick={onOpenWithdraw}>Withdraw</button>
          <button className="k3-btn-deposit" onClick={onOpenDeposit}>Deposit</button>
        </div>
      </div>

      {/* 3. K3 4-Time Selector Tabs */}
      <div className="k3-time-tabs-row">
        {K3_MODES.map((m) => {
          const isActive = selectedK3Tab === m.id
          return (
            <button
              key={m.id}
              className={`k3-tab-pill ${isActive ? 'active' : ''}`}
              onClick={() => {
                setSelectedK3Tab(m.id)
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

      {/* 4. Dice Arena & Countdown Stage */}
      <div className="k3-stage-card">
        <div className="stage-left-info">
          <span className="stage-period-label">Period</span>
          <strong className="stage-period-number">{periodNumber}</strong>
          <span className="stage-lottery-name">K3 {activeModeObj.time}</span>
        </div>

        {/* Dice rolling display */}
        <div className="stage-center-dice">
          <div className={`dice-cup ${rolling ? 'shaking' : ''}`}>
            {diceRoll.map((val, idx) => (
              <div key={idx} className="dice-cube">
                <span className="dice-symbol">{DICE_FACES[val]}</span>
              </div>
            ))}
          </div>
          <div className="dice-sum-badge">
            Sum: <strong>{totalSum}</strong> ({totalSum >= 11 ? 'Big' : 'Small'})
          </div>
        </div>

        {/* Countdown */}
        <div className="stage-right-clock">
          <span className="clock-label">Time remaining</span>
          <div className={`k3-countdown-boxes ${isLocked ? 'locked' : ''}`}>
            <span className="time-digit">{String(Math.floor(seconds / 60)).padStart(2, '0')}</span>
            <span className="time-sep">:</span>
            <span className="time-digit">{String(seconds % 60).padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      {/* 5. K3 Category Selector (Total, 2 Same, 3 Same, Different) */}
      <div className="k3-category-selector">
        {[
          { id: 'total', label: 'Total (Sum)' },
          { id: 'two_same', label: '2 Same' },
          { id: 'three_same', label: '3 Same' },
          { id: 'different', label: 'Different' },
        ].map((c) => (
          <button
            key={c.id}
            className={`k3-cat-btn ${activeBetCategory === c.id ? 'active' : ''}`}
            onClick={() => {
              setActiveBetCategory(c.id)
              sound.playTick?.()
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 6. Betting Grids based on Active Category */}
      <div className="k3-bet-matrix-wrapper">
        {activeBetCategory === 'total' && (
          <div className="k3-sum-grid">
            {/* Big / Small / Odd / Even buttons */}
            <div className="k3-bs-row">
              <button
                className="k3-bs-btn big"
                disabled={isLocked}
                onClick={() => handleOpenBet({ label: 'Big (11-18)', multiplier: 1.92, type: 'size' })}
              >
                <strong>Big</strong>
                <span>1.92X</span>
              </button>
              <button
                className="k3-bs-btn small"
                disabled={isLocked}
                onClick={() => handleOpenBet({ label: 'Small (3-10)', multiplier: 1.92, type: 'size' })}
              >
                <strong>Small</strong>
                <span>1.92X</span>
              </button>
              <button
                className="k3-bs-btn odd"
                disabled={isLocked}
                onClick={() => handleOpenBet({ label: 'Odd', multiplier: 1.92, type: 'parity' })}
              >
                <strong>Odd</strong>
                <span>1.92X</span>
              </button>
              <button
                className="k3-bs-btn even"
                disabled={isLocked}
                onClick={() => handleOpenBet({ label: 'Even', multiplier: 1.92, type: 'parity' })}
              >
                <strong>Even</strong>
                <span>1.92X</span>
              </button>
            </div>

            {/* Sum numbers 3 through 18 */}
            <div className="k3-sum-numbers-grid">
              {Object.keys(SUM_ODDS).map((s) => {
                const num = Number(s)
                return (
                  <button
                    key={num}
                    className="k3-sum-item"
                    disabled={isLocked}
                    onClick={() => handleOpenBet({ label: `Sum ${num}`, multiplier: SUM_ODDS[num], type: 'sum' })}
                  >
                    <span className="sum-num">{num}</span>
                    <span className="sum-mul">{SUM_ODDS[num]}X</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {activeBetCategory === 'two_same' && (
          <div className="k3-pairs-grid">
            {['11', '22', '33', '44', '55', '66'].map((p) => (
              <button
                key={p}
                className="k3-pair-card"
                disabled={isLocked}
                onClick={() => handleOpenBet({ label: `Pair ${p}`, multiplier: 13.82, type: 'pair' })}
              >
                <span className="pair-art">🎲🎲</span>
                <strong className="pair-val">{p}</strong>
                <span className="pair-mul">13.82X</span>
              </button>
            ))}
          </div>
        )}

        {activeBetCategory === 'three_same' && (
          <div className="k3-triples-grid">
            <button
              className="k3-any-triple-btn"
              disabled={isLocked}
              onClick={() => handleOpenBet({ label: 'Any 3 Same', multiplier: 34.56, type: 'triple_any' })}
            >
              <strong>Any 3 of a Kind</strong>
              <span>34.56X</span>
            </button>
            <div className="k3-specific-triples">
              {['111', '222', '333', '444', '555', '666'].map((t) => (
                <button
                  key={t}
                  className="k3-triple-card"
                  disabled={isLocked}
                  onClick={() => handleOpenBet({ label: `Triple ${t}`, multiplier: 207.36, type: 'triple' })}
                >
                  <strong className="triple-val">{t}</strong>
                  <span className="triple-mul">207.36X</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeBetCategory === 'different' && (
          <div className="k3-diff-grid">
            <button
              className="k3-straight-btn"
              disabled={isLocked}
              onClick={() => handleOpenBet({ label: 'Consecutive Numbers (3 Straight)', multiplier: 8.64, type: 'straight' })}
            >
              <strong>3 Consecutive Numbers</strong>
              <span>8.64X</span>
            </button>
            <div className="k3-unique-dice-row">
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  className="k3-unique-dice-card"
                  disabled={isLocked}
                  onClick={() => handleOpenBet({ label: `Dice ${d}`, multiplier: 2.16, type: 'single' })}
                >
                  <span className="dice-glyph">{DICE_FACES[d]}</span>
                  <span className="dice-num">{d}</span>
                  <span className="dice-mul">2.16X</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 7. Draw History Records */}
      <div className="k3-history-section">
        <div className="history-header">
          <History size={16} />
          <h4>Recent Draw Records</h4>
        </div>
        <div className="k3-history-table-wrap">
          <table className="k3-history-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Dice Draw</th>
                <th>Sum</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={`${h.period}-${i}`}>
                  <td className="mono">{h.period.slice(-4)}</td>
                  <td>
                    <div className="dice-row-mini">
                      {h.dice.map((d, di) => (
                        <span key={di} className="dice-mini">{DICE_FACES[d]}</span>
                      ))}
                    </div>
                  </td>
                  <td className="sum-bold">{h.sum}</td>
                  <td>
                    <span className={`badge-pill ${h.size === 'Big' ? 'big' : 'small'}`}>{h.size}</span>
                    <span className={`badge-pill ${h.parity === 'Odd' ? 'odd' : 'even'}`}>{h.parity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Bottom Betting Drawer */}
      {betSheetOpen && selectedBet && (
        <div className="modal-overlay" onClick={() => setBetSheetOpen(false)}>
          <div className="bet-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>{selectedBet.label}</h3>
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

export default K3Game
