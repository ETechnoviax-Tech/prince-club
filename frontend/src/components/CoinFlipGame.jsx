import React, { useState, useEffect } from 'react'
import {
  Coins,
  Crown,
  Sparkles,
  Trophy,
  Flame,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Percent,
} from 'lucide-react'
import { playCoinFlip, fetchCoinFlipHistory } from '../api/client'
import { sound } from '../utils/audio'

export function CoinFlipGame({ user, userBalance, onBalanceUpdate }) {
  const [chosenSide, setChosenSide] = useState('HEADS')
  const [betAmount, setBetAmount] = useState(50)
  const [isFlipping, setIsFlipping] = useState(false)
  const [coinResult, setCoinResult] = useState('HEADS')
  const [rotation, setRotation] = useState(0)
  const [lastWin, setLastWin] = useState(null)
  const [streak, setStreak] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [history, setHistory] = useState([
    { id: '1', side: 'HEADS' },
    { id: '2', side: 'TAILS' },
    { id: '3', side: 'TAILS' },
    { id: '4', side: 'HEADS' },
    { id: '5', side: 'HEADS' },
  ])
  const [stats, setStats] = useState({ headsPercent: 50, tailsPercent: 50, totalFlips: 20 })

  // Fetch initial history
  useEffect(() => {
    fetchCoinFlipHistory()
      .then((data) => {
        if (data.history) setHistory(data.history)
        if (data.stats) setStats(data.stats)
      })
      .catch(() => {})
  }, [])

  const handleFlip = async () => {
    if (!user) {
      setErrorMsg('Please login to play Coin Flip')
      return
    }
    if (betAmount > userBalance) {
      setErrorMsg('Insufficient balance')
      return
    }

    setErrorMsg('')
    setIsFlipping(true)
    setLastWin(null)
    sound.playCoinFlip()

    // Spin animation rotations: 5 full rotations (1800 deg)
    const baseRot = rotation + 1800

    try {
      const res = await playCoinFlip(user.id, chosenSide, betAmount)

      // Calculate final target rotation:
      // If result is HEADS -> even multiple of 360 (e.g. 0 mod 360)
      // If result is TAILS -> odd multiple of 180 (e.g. 180 mod 360)
      const isHeads = res.resultSide === 'HEADS'
      const finalAngle = isHeads ? baseRot - (baseRot % 360) : baseRot - (baseRot % 360) + 180
      setRotation(finalAngle)

      setTimeout(() => {
        setIsFlipping(false)
        setCoinResult(res.resultSide)
        setStreak(res.streak || 0)

        if (res.won) {
          sound.playWin()
          setLastWin({
            payout: res.payout,
            profit: res.profit,
            side: res.resultSide,
          })
        }

        if (res.history) setHistory(res.history)
        if (typeof res.newBalance === 'number') {
          onBalanceUpdate(res.newBalance)
        }
      }, 1000)
    } catch (err) {
      setIsFlipping(false)
      setErrorMsg(err.message || 'Failed to flip coin')
    }
  }

  return (
    <div className="coinflip-container">
      {/* Top Header & Streak Stats */}
      <div className="coinflip-stats-header">
        <div className="stats-box">
          <span className="stats-label">HEADS</span>
          <span className="stats-val text-amber-400">{stats.headsPercent}%</span>
        </div>

        <div className="streak-badge">
          <Flame size={15} className="text-orange-400 animate-pulse" />
          <span>STREAK: {streak} WINS</span>
        </div>

        <div className="stats-box">
          <span className="stats-label">TAILS</span>
          <span className="stats-val text-cyan-400">{stats.tailsPercent}%</span>
        </div>
      </div>

      {/* History Pill Row */}
      <div className="coinflip-history-row">
        <span className="history-tag">RECENT:</span>
        <div className="history-pills">
          {history.map((h, i) => (
            <span
              key={h.id || i}
              className={`cf-history-pill ${h.side === 'HEADS' ? 'pill-heads' : 'pill-tails'}`}
            >
              {h.side === 'HEADS' ? 'H' : 'T'}
            </span>
          ))}
        </div>
      </div>

      {/* 3D Coin Flip Arena */}
      <div className="coin-arena">
        <div className="coin-stage">
          <div
            className={`coin-3d ${isFlipping ? 'flipping' : ''}`}
            style={{ transform: `rotateY(${rotation}deg)` }}
          >
            {/* Heads Face (Gold) */}
            <div className="coin-face coin-heads">
              <div className="coin-inner-ring">
                <Crown size={48} className="text-amber-200" />
                <span className="coin-text">HEADS</span>
                <span className="coin-sub">1.96X</span>
              </div>
            </div>

            {/* Tails Face (Silver) */}
            <div className="coin-face coin-tails">
              <div className="coin-inner-ring">
                <Sparkles size={48} className="text-cyan-200" />
                <span className="coin-text">TAILS</span>
                <span className="coin-sub">1.96X</span>
              </div>
            </div>
          </div>
        </div>

        {/* Win/Loss Result Banner */}
        {lastWin && !isFlipping && (
          <div className="coin-win-celebration">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <div>
              <span className="win-heading">YOU WON ₹{lastWin.payout}!</span>
              <span className="win-sub">+{lastWin.profit} Profit ({lastWin.side})</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="coin-error-banner">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Side Selectors (Heads vs Tails) */}
      <div className="side-select-grid">
        <button
          className={`side-choice-card heads-card ${chosenSide === 'HEADS' ? 'selected' : ''}`}
          onClick={() => setChosenSide('HEADS')}
          disabled={isFlipping}
        >
          <Crown size={28} className="text-amber-400" />
          <div className="side-info">
            <span className="side-title">HEADS</span>
            <span className="side-mult">1.96X Payout</span>
          </div>
          {chosenSide === 'HEADS' && <div className="side-check">✓</div>}
        </button>

        <button
          className={`side-choice-card tails-card ${chosenSide === 'TAILS' ? 'selected' : ''}`}
          onClick={() => setChosenSide('TAILS')}
          disabled={isFlipping}
        >
          <Sparkles size={28} className="text-cyan-400" />
          <div className="side-info">
            <span className="side-title">TAILS</span>
            <span className="side-mult">1.96X Payout</span>
          </div>
          {chosenSide === 'TAILS' && <div className="side-check">✓</div>}
        </button>
      </div>

      {/* Amount Selector & Quick Chips */}
      <div className="coin-amount-deck">
        <div className="coin-amt-row">
          <button
            className="amt-btn"
            onClick={() => setBetAmount(Math.max(10, betAmount - 10))}
            disabled={isFlipping}
          >
            -
          </button>
          <div className="amt-val-box">
            <span className="currency">₹</span>
            <span className="amt">{betAmount}</span>
          </div>
          <button
            className="amt-btn"
            onClick={() => setBetAmount(betAmount + 50)}
            disabled={isFlipping}
          >
            +
          </button>
        </div>

        <div className="coin-chip-row">
          {[10, 50, 100, 500, 1000].map((v) => (
            <button
              key={v}
              className={`coin-chip ${betAmount === v ? 'selected' : ''}`}
              onClick={() => setBetAmount(v)}
              disabled={isFlipping}
            >
              ₹{v}
            </button>
          ))}
          <button
            className="coin-chip chip-double"
            onClick={() => setBetAmount(betAmount * 2)}
            disabled={isFlipping}
          >
            2X
          </button>
        </div>
      </div>

      {/* Flip Action Button */}
      <button
        className="coin-flip-btn"
        onClick={handleFlip}
        disabled={isFlipping || userBalance < betAmount}
      >
        <Coins size={20} className="mr-2 animate-bounce" />
        <span>{isFlipping ? 'FLIPPING COIN...' : `FLIP COIN (₹${betAmount})`}</span>
      </button>
    </div>
  )
}
