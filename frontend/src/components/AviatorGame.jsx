import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Flame,
  Zap,
  TrendingUp,
  AlertCircle,
  Coins,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Play,
  ArrowUpRight,
} from 'lucide-react'
import { fetchAviatorState, placeAviatorBet, cashoutAviatorBet } from '../api/client'
import { sound } from '../utils/audio'

export function AviatorGame({ user, userBalance, onBalanceUpdate }) {
  const [gameState, setGameState] = useState({
    roundId: 1001,
    phase: 'WAITING', // 'WAITING' | 'FLYING' | 'CRASHED'
    multiplier: 1.0,
    countdownMs: 5000,
    history: [1.82, 3.45, 1.21, 14.8, 2.1, 1.05, 5.6, 1.95, 8.22, 2.74, 1.15, 4.3],
  })

  // Betting state
  const [betAmount, setBetAmount] = useState(50)
  const [autoCashOutActive, setAutoCashOutActive] = useState(false)
  const [autoCashOutTarget, setAutoCashOutTarget] = useState(2.0)
  const [activeBet, setActiveBet] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cashoutSuccess, setCashoutSuccess] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const lastPhaseRef = useRef(gameState.phase)
  const canvasRef = useRef(null)

  // Polling Aviator server state
  const pollState = useCallback(async () => {
    try {
      const data = await fetchAviatorState(user?.id)
      if (data) {
        setGameState((prev) => {
          // Detect phase changes for sound effects
          if (prev.phase !== data.phase) {
            if (data.phase === 'FLYING') {
              sound.playPlaneTakeoff()
            } else if (data.phase === 'CRASHED') {
              sound.playPlaneCrash()
              setActiveBet((curr) => (curr ? { ...curr, status: 'LOST' } : null))
            } else if (data.phase === 'WAITING') {
              setCashoutSuccess(null)
              setActiveBet(null)
            }
          }
          return data
        })

        if (data.userBet) {
          setActiveBet(data.userBet)
        }
      }
    } catch {}
  }, [user?.id])

  useEffect(() => {
    pollState()
    const interval = setInterval(pollState, 150)
    return () => clearInterval(interval)
  }, [pollState])

  // Canvas Flight Animation Renderer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    const render = () => {
      const width = canvas.width
      const height = canvas.height

      // Clear background
      ctx.clearRect(0, 0, width, height)

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      if (gameState.phase === 'FLYING') {
        const mult = gameState.multiplier
        // Progress factor based on current multiplier
        const progress = Math.min(1.0, (mult - 1.0) / 10.0)

        // Exponential curve points
        const startX = 20
        const startY = height - 20
        const endX = startX + (width - 60) * Math.min(1.0, progress * 1.2 + 0.15)
        const endY = startY - (height - 60) * Math.min(0.9, Math.pow(progress, 0.85) * 0.9 + 0.1)

        // Trajectory area fill
        const gradient = ctx.createLinearGradient(0, endY, 0, height)
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.35)')
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)')

        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.4, startY, endX, endY)
        ctx.lineTo(endX, startY)
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()

        // Red Flight Line
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.4, startY, endX, endY)
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 4
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 12
        ctx.stroke()
        ctx.shadowBlur = 0

        // Draw Supersonic Jet
        ctx.save()
        ctx.translate(endX, endY)
        // Jet angle follows curve
        const angle = -Math.PI / 8
        ctx.rotate(angle)

        // Jet Body
        ctx.fillStyle = '#ff2b2b'
        ctx.beginPath()
        ctx.moveTo(18, 0)
        ctx.lineTo(-14, -8)
        ctx.lineTo(-8, 0)
        ctx.lineTo(-14, 8)
        ctx.closePath()
        ctx.fill()

        // Jet Wings
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-6, -14)
        ctx.lineTo(-10, -14)
        ctx.lineTo(-4, 0)
        ctx.closePath()
        ctx.fill()

        // Jet Thruster Fire
        ctx.fillStyle = '#f59e0b'
        ctx.beginPath()
        ctx.moveTo(-10, -2)
        ctx.lineTo(-22 - Math.random() * 8, 0)
        ctx.lineTo(-10, 2)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationFrameId)
  }, [gameState.phase, gameState.multiplier])

  // Place Bet
  const handlePlaceBet = async () => {
    if (!user) {
      setErrorMsg('Please login to place bets')
      return
    }
    if (betAmount > userBalance) {
      setErrorMsg('Insufficient balance')
      return
    }

    setErrorMsg('')
    setIsSubmitting(true)
    try {
      const autoCash = autoCashOutActive ? Number(autoCashOutTarget) : null
      const res = await placeAviatorBet(user.id, betAmount, autoCash)
      if (res.bet) {
        setActiveBet(res.bet)
        sound.playBetPlaced()
        if (typeof res.newBalance === 'number') {
          onBalanceUpdate(res.newBalance)
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to place Aviator bet')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cash Out
  const handleCashOut = async () => {
    if (!activeBet || activeBet.status !== 'ACTIVE') return
    setIsSubmitting(true)
    setErrorMsg('')
    try {
      const res = await cashoutAviatorBet(user.id, activeBet.id)
      if (res.payout) {
        sound.playCashOut()
        setCashoutSuccess({
          multiplier: res.cashedAt,
          payout: res.payout,
        })
        setActiveBet((prev) => ({ ...prev, status: 'WON', payout: res.payout, cashedAt: res.cashedAt }))
        if (typeof res.newBalance === 'number') {
          onBalanceUpdate(res.newBalance)
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to cash out')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPillColor = (mult) => {
    if (mult < 2.0) return 'pill-blue'
    if (mult < 10.0) return 'pill-purple'
    return 'pill-gold'
  }

  const potentialCashout = activeBet && activeBet.status === 'ACTIVE'
    ? (activeBet.amount * gameState.multiplier).toFixed(2)
    : (betAmount * gameState.multiplier).toFixed(2)

  return (
    <div className="aviator-container">
      {/* Top Crash History Pills */}
      <div className="aviator-history-bar">
        <div className="history-label">
          <Clock size={13} className="text-zinc-400" />
          <span>HISTORY</span>
        </div>
        <div className="history-pills-scroll">
          {gameState.history.map((mult, idx) => (
            <span key={idx} className={`aviator-pill ${getPillColor(mult)}`}>
              {mult.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>

      {/* Flight Radar Screen */}
      <div className="aviator-radar-screen">
        <canvas ref={canvasRef} width={380} height={230} className="aviator-canvas" />

        {/* Center Dynamic Multiplier / Phase State */}
        <div className="radar-center-content">
          {gameState.phase === 'WAITING' && (
            <div className="radar-waiting-box">
              <div className="waiting-spinner" />
              <span className="waiting-title">NEXT FLIGHT STARTS IN</span>
              <span className="waiting-countdown">
                {Math.max(0, (gameState.countdownMs / 1000)).toFixed(1)}s
              </span>
              <div className="waiting-progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${((5000 - gameState.countdownMs) / 5000) * 100}%` }}
                />
              </div>
            </div>
          )}

          {gameState.phase === 'FLYING' && (
            <div className="radar-flying-box">
              <div className="flying-multiplier-text">
                {gameState.multiplier.toFixed(2)}
                <span className="text-2xl text-red-400 ml-1">x</span>
              </div>
            </div>
          )}

          {gameState.phase === 'CRASHED' && (
            <div className="radar-crashed-box">
              <span className="crashed-title">FLEW AWAY!</span>
              <span className="crashed-multiplier">{gameState.multiplier.toFixed(2)}x</span>
            </div>
          )}

          {/* Cashout Celebration Toast */}
          {cashoutSuccess && (
            <div className="aviator-cashout-toast">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <div>
                <span className="toast-sub">CASHED OUT AT {cashoutSuccess.multiplier}x</span>
                <span className="toast-amt">+₹{cashoutSuccess.payout}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="aviator-error-banner">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Betting Control Deck */}
      <div className="aviator-control-deck">
        <div className="deck-header">
          <div className="deck-mode-pills">
            <button className="deck-tab active">BET</button>
            <button
              className={`deck-tab ${autoCashOutActive ? 'active-auto' : ''}`}
              onClick={() => setAutoCashOutActive(!autoCashOutActive)}
            >
              AUTO CASHOUT
            </button>
          </div>
          {autoCashOutActive && (
            <div className="auto-target-input">
              <span className="auto-label">Auto X:</span>
              <input
                type="number"
                step="0.1"
                min="1.1"
                max="100"
                value={autoCashOutTarget}
                onChange={(e) => setAutoCashOutTarget(e.target.value)}
                className="target-field"
              />
            </div>
          )}
        </div>

        {/* Amount Selector & Quick Chips */}
        <div className="deck-amount-section">
          <div className="amount-counter">
            <button
              className="amt-btn"
              onClick={() => setBetAmount(Math.max(10, betAmount - 10))}
              disabled={activeBet && activeBet.status === 'ACTIVE'}
            >
              -
            </button>
            <div className="amt-display">
              <span className="currency">₹</span>
              <span className="val">{betAmount}</span>
            </div>
            <button
              className="amt-btn"
              onClick={() => setBetAmount(betAmount + 50)}
              disabled={activeBet && activeBet.status === 'ACTIVE'}
            >
              +
            </button>
          </div>

          <div className="quick-chip-row">
            {[10, 50, 100, 500, 1000].map((val) => (
              <button
                key={val}
                className={`quick-chip ${betAmount === val ? 'selected' : ''}`}
                onClick={() => setBetAmount(val)}
                disabled={activeBet && activeBet.status === 'ACTIVE'}
              >
                ₹{val}
              </button>
            ))}
            <button
              className="quick-chip chip-double"
              onClick={() => setBetAmount(betAmount * 2)}
              disabled={activeBet && activeBet.status === 'ACTIVE'}
            >
              2X
            </button>
          </div>
        </div>

        {/* Action Button: BET or CASHOUT */}
        <div className="deck-action-section">
          {activeBet && activeBet.status === 'ACTIVE' && gameState.phase === 'FLYING' ? (
            <button
              className="aviator-cashout-btn"
              onClick={handleCashOut}
              disabled={isSubmitting}
            >
              <div className="btn-label-box">
                <span className="cashout-heading">CASH OUT</span>
                <span className="cashout-live-val">₹{potentialCashout}</span>
              </div>
            </button>
          ) : activeBet && activeBet.status === 'ACTIVE' ? (
            <button className="aviator-waiting-btn" disabled>
              <span>BET PLACED (₹{activeBet.amount}) • WAITING TAKEOFF</span>
            </button>
          ) : (
            <button
              className="aviator-bet-btn"
              onClick={handlePlaceBet}
              disabled={isSubmitting || userBalance < betAmount}
            >
              <div className="btn-label-box">
                <span className="bet-heading">
                  {gameState.phase === 'WAITING' ? 'BET NOW' : 'BET FOR NEXT FLIGHT'}
                </span>
                <span className="bet-sub">₹{betAmount}.00</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
