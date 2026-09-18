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
  ShieldCheck,
  Zap,
  Loader2,
} from 'lucide-react'
import { sound } from '../utils/audio'
import { placeBet as apiPlaceBet } from '../api/client'

const TRX_MODES = [
  { id: '1m', name: 'TRX Win Go', time: '1Min', duration: 60, lock: 5 },
  { id: '3m', name: 'TRX Win Go', time: '3Min', duration: 180, lock: 10 },
  { id: '5m', name: 'TRX Win Go', time: '5Min', duration: 300, lock: 15 },
]

export function TrxGame({
  balance,
  onBalanceUpdate,
  onBackToLobby,
  onOpenDeposit,
  onOpenWithdraw,
  userId,
  setToast,
}) {
  const [selectedTab, setSelectedTab] = useState('1m')
  const [seconds] = useState(0)
  const [periodNumber] = useState('—')
  const [blockHeight] = useState(null)
  const [blockHash] = useState('Live data unavailable')
  const [lastDigit] = useState(null)
  const [history] = useState([])
  /*
    { period: '20260913100070527', block: 62819404, hash: '...3a8f9', digit: 9, color: 'green', size: 'Big' },
    { period: '20260913100070526', block: 62819403, hash: '...9c1e2', digit: 2, color: 'red', size: 'Small' },
    { period: '20260913100070525', block: 62819402, hash: '...0d4a0', digit: 0, color: 'violet', size: 'Small' },
    { period: '20260913100070524', block: 62819401, hash: '...7e8f5', digit: 5, color: 'violet', size: 'Big' },
    { period: '20260913100070523', block: 62819400, hash: '...b23c4', digit: 4, color: 'red', size: 'Small' },
  */

  // Bet Drawer State
  const [betSheetOpen, setBetSheetOpen] = useState(false)
  const [selectedBet, setSelectedBet] = useState(null)
  const [baseAmount, setBaseAmount] = useState(10)
  const [betMultiplier, setBetMultiplier] = useState(1)
  const [isPlacingBet, setIsPlacingBet] = useState(false)
  const [isMuted, setIsMuted] = useState(sound.isMuted)

  const activeMode = TRX_MODES.find((m) => m.id === selectedTab) || TRX_MODES[0]
  const isLocked = seconds <= activeMode.lock

  // Period Loop
  useEffect(() => {
    return undefined
    /* Live provider integration goes here; locally generated outcomes are intentionally disabled.
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          const nextDigit = Math.floor(Math.random() * 10)
          const nextBlock = blockHeight + 1
          const hexSuffix = Math.random().toString(16).substring(2, 7) + nextDigit
          const color = nextDigit === 0 || nextDigit === 5 ? 'violet' : nextDigit % 2 === 0 ? 'red' : 'green'
          const size = nextDigit >= 5 ? 'Big' : 'Small'

          setLastDigit(nextDigit)
          setBlockHeight(nextBlock)
          setBlockHash(`0000000003b8d${hexSuffix}`)
          sound.playWin?.()

          setHistory((old) => [
            {
              period: periodNumber,
              block: nextBlock,
              hash: `...${hexSuffix.slice(-5)}`,
              digit: nextDigit,
              color,
              size,
            },
            ...old.slice(0, 19),
          ])
          setPeriodNumber((p) => String(BigInt(p) + 1n))
          return activeMode.duration
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    */
  }, [activeMode.duration, periodNumber, blockHeight])

  const handleOpenBet = (bet) => {
    if (seconds === 0) {
      setToast?.({ type: 'warning', title: 'Live Data Unavailable', detail: 'TRX Win Go betting is paused until a verified live provider is connected.' })
      return
    }
    if (isLocked) {
      setToast?.({
        type: 'warning',
        title: 'Round Locked',
        detail: 'Bets are locked during the final 5 seconds before Tron block hash settlement.',
      })
      return
    }
    setSelectedBet(bet)
    setBetSheetOpen(true)
    sound.playTick?.()
  }

  const handleConfirmBet = async () => {
    if (isPlacingBet || !selectedBet) return
    const total = baseAmount * betMultiplier
    if (total > balance) {
      setToast?.({
        type: 'loss',
        title: 'Insufficient Balance',
        detail: 'Please recharge your wallet to place this TRX Win Go bet.',
      })
      return
    }

    setIsPlacingBet(true)
    try {
      await apiPlaceBet(userId, selectedBet.label, total, {
        mode: 'TRX_' + selectedTab.toUpperCase(),
        issueNumber: periodNumber,
        typeId: selectedTab === '1m' ? 1 : selectedTab === '3m' ? 2 : 3,
      })
      onBalanceUpdate?.(balance - total)
      sound.playBet?.()
      setBetSheetOpen(false)
      setToast?.({
        type: 'success',
        title: 'Bet Placed Successfully',
        detail: `TRX Win Go ${selectedBet.label} - ₹${total}`,
      })
    } catch (error) {
      setToast?.({
        type: 'loss',
        title: 'Bet Not Placed',
        detail: error.message || 'Live TRX service is unavailable. No amount was deducted.',
      })
    } finally {
      setIsPlacingBet(false)
    }
  }

  const lastOutcomeColor = lastDigit === 0 || lastDigit === 5 ? 'violet' : lastDigit % 2 === 0 ? 'red' : 'green'

  return (
    <div className="trx-arena-container">
      {/* 1. Top Navigation */}
      <header className="trx-header-nav">
        <button className="trx-back-btn" onClick={onBackToLobby} title="Back to Lobby">
          <ArrowLeft size={20} />
        </button>
        <div className="trx-brand-title">
          <span className="brand-crown">👑</span>
          <span>TRX WIN GO</span>
        </div>
        <div className="trx-nav-actions">
          <button
            className="trx-action-btn"
            onClick={() => setIsMuted(sound.toggleMute())}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {/* 2. Wallet Bar */}
      <div className="trx-wallet-bar">
        <div className="trx-balance-col">
          <span className="wallet-label">Available Balance</span>
          <strong className="wallet-amount">₹{Number(balance).toFixed(2)}</strong>
        </div>
        <div className="trx-wallet-buttons">
          <button className="trx-btn-withdraw" onClick={onOpenWithdraw}>Withdraw</button>
          <button className="trx-btn-deposit" onClick={onOpenDeposit}>Deposit</button>
        </div>
      </div>

      {/* 3. 3-Time Tabs */}
      <div className="trx-time-tabs-row">
        {TRX_MODES.map((m) => {
          const isActive = selectedTab === m.id
          return (
            <button
              key={m.id}
              className={`trx-tab-pill ${isActive ? 'active' : ''}`}
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

      {/* 4. Tron Block Hash Card */}
      <div className="trx-stage-card">
        <div className="trx-stage-header">
          <div className="trx-stage-left">
            <span className="stage-period-label">Period</span>
            <strong className="stage-period-number">{periodNumber}</strong>
            <div className="trx-chain-badge">
              <Zap size={13} /> Tron Block: #{blockHeight}
            </div>
          </div>
          <div className="trx-stage-right">
            <span className="clock-label">Time remaining</span>
            <div className={`trx-countdown-boxes ${isLocked ? 'locked' : ''}`}>
              <span className="time-digit">{String(Math.floor(seconds / 60)).padStart(2, '0')}</span>
              <span className="time-sep">:</span>
              <span className="time-digit">{String(seconds % 60).padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* Live Block Hash Display */}
        <div className="trx-hash-display">
          <span className="hash-prefix">Hash:</span>
          <span className="hash-string">{blockHash}</span>
          <span className={`hash-last-digit digit-${lastOutcomeColor}`}>{lastDigit}</span>
        </div>
      </div>

      {/* 5. Color Buttons: Green, Purple, Red */}
      <div className="trx-color-buttons">
        <button
          className="trx-color-btn green"
          disabled={isLocked}
          onClick={() => handleOpenBet({ label: 'Green', multiplier: 2.0, type: 'color' })}
        >
          Green
        </button>
        <button
          className="trx-color-btn violet"
          disabled={isLocked}
          onClick={() => handleOpenBet({ label: 'Violet', multiplier: 4.5, type: 'color' })}
        >
          Violet
        </button>
        <button
          className="trx-color-btn red"
          disabled={isLocked}
          onClick={() => handleOpenBet({ label: 'Red', multiplier: 2.0, type: 'color' })}
        >
          Red
        </button>
      </div>

      {/* 6. Numbers 0-9 Grid */}
      <div className="trx-numbers-card">
        <div className="trx-numbers-grid">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const isDual = num === 0 ? 'violet-red' : num === 5 ? 'violet-green' : null
            const ballColor = num === 0 || num === 5 ? 'violet' : num % 2 === 0 ? 'red' : 'green'
            return (
              <button
                key={num}
                className={`trx-lottery-ball ball-${ballColor} ${isDual ? `dual-${isDual}` : ''}`}
                disabled={isLocked}
                onClick={() => handleOpenBet({ label: `Number ${num}`, multiplier: 9.0, type: 'number' })}
              >
                <span>{num}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 7. Big / Small Buttons */}
      <div className="trx-bigsmall-row">
        <button
          className="trx-bs-btn big"
          disabled={isLocked}
          onClick={() => handleOpenBet({ label: 'Big', multiplier: 2.0, type: 'size' })}
        >
          Big (5-9)
        </button>
        <button
          className="trx-bs-btn small"
          disabled={isLocked}
          onClick={() => handleOpenBet({ label: 'Small', multiplier: 2.0, type: 'size' })}
        >
          Small (0-4)
        </button>
      </div>

      {/* 8. Draw History */}
      <div className="trx-history-section">
        <div className="history-header">
          <History size={16} />
          <h4>TRX Blockchain Draw History</h4>
        </div>
        <div className="trx-history-table-wrap">
          <table className="trx-history-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Block</th>
                <th>Hash</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={`${h.period}-${i}`}>
                  <td className="mono">{h.period.slice(-4)}</td>
                  <td className="mono">#{h.block}</td>
                  <td className="mono hash-cell">{h.hash}</td>
                  <td>
                    <span className={`num-badge badge-${h.color}`}>{h.digit}</span>
                    <span className={`size-badge ${h.size === 'Big' ? 'big' : 'small'}`}>{h.size}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9. Bottom Sheet Drawer */}
      {betSheetOpen && selectedBet && (
        <div className="modal-overlay" onClick={() => setBetSheetOpen(false)}>
          <div className="bet-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>TRX Win Go - {selectedBet.label}</h3>
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
                  disabled={isPlacingBet || baseAmount * betMultiplier > balance}
                >
                  {isPlacingBet
                    ? <><Loader2 size={16} className="spin-anim" /> Placing bet...</>
                    : baseAmount * betMultiplier > balance
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

export default TrxGame
