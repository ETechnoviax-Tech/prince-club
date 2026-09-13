import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Volume2, VolumeX, History, RefreshCw, Zap, ShieldCheck } from 'lucide-react'
import { fetchAviatorState, placeAviatorBet, cashoutAviator } from '../api/client'
import { sound } from '../utils/audio'

export function AviatorGame({ userId, balance, onBalanceUpdate, onBackToLobby }) {
  const [phase, setPhase] = useState('WAITING') // 'WAITING' | 'FLYING' | 'CRASHED'
  const [multiplier, setMultiplier] = useState(1.0)
  const [crashPoint, setCrashPoint] = useState(null)
  const [remainingMs, setRemainingMs] = useState(5000)
  const [history, setHistory] = useState([
    { roundId: 101, crashPoint: 1.25 },
    { roundId: 102, crashPoint: 3.42 },
    { roundId: 103, crashPoint: 1.05 },
    { roundId: 104, crashPoint: 12.80 },
    { roundId: 105, crashPoint: 2.10 },
  ])

  // Bet deck state
  const [betAmount, setBetAmount] = useState(50)
  const [autoCashout, setAutoCashout] = useState(2.0)
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false)
  const [activeBet, setActiveBet] = useState(null) // { betId, amount, status: 'PLACED' | 'ACTIVE' | 'CASHED_OUT' | 'LOST' }
  const [toast, setToast] = useState(null)

  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)

  // Poll state from server every 500ms
  const syncState = useCallback(async () => {
    try {
      const data = await fetchAviatorState()
      if (data) {
        setPhase(data.phase)
        setMultiplier(data.multiplier)
        setRemainingMs(data.remainingMs)
        if (data.crashPoint) setCrashPoint(data.crashPoint)
        if (Array.isArray(data.history)) setHistory(data.history)

        // Handle active bet phase transitions
        if (activeBet && activeBet.status === 'PLACED' && data.phase === 'FLYING') {
          setActiveBet((prev) => ({ ...prev, status: 'ACTIVE' }))
        }

        if (activeBet && activeBet.status === 'ACTIVE' && data.phase === 'CRASHED') {
          setActiveBet(null)
          setToast({ type: 'loss', title: 'Flew Away!', detail: `Plane crashed at ${data.crashPoint || data.multiplier}x` })
        }
      }
    } catch {}
  }, [activeBet])

  useEffect(() => {
    syncState()
    const interval = setInterval(syncState, 400)
    return () => clearInterval(interval)
  }, [syncState])

  // Canvas flight animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width = canvas.parentElement.clientWidth || 360
    const height = canvas.height = 240

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw radar background grid
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

      if (phase === 'FLYING') {
        // Curve trajectory
        const progress = Math.min(1, (multiplier - 1.0) / 4.0)
        const planeX = 40 + progress * (width - 90)
        const planeY = height - 30 - Math.pow(progress, 0.75) * (height - 80)

        // Draw glowing red trail
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(30, height - 20)
        ctx.quadraticCurveTo(width * 0.35, height - 20, planeX, planeY)
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 3.5
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 12
        ctx.stroke()

        // Gradient under the curve
        ctx.lineTo(planeX, height - 20)
        ctx.lineTo(30, height - 20)
        ctx.closePath()
        const fillGrad = ctx.createLinearGradient(0, planeY, 0, height)
        fillGrad.addColorStop(0, 'rgba(239, 68, 68, 0.25)')
        fillGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)')
        ctx.fillStyle = fillGrad
        ctx.fill()
        ctx.restore()

        // Draw animated stylized Red Airplane
        ctx.save()
        ctx.translate(planeX, planeY)
        ctx.rotate(-0.25)
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.moveTo(18, 0)
        ctx.lineTo(-14, -8)
        ctx.lineTo(-8, 0)
        ctx.lineTo(-14, 8)
        ctx.closePath()
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)'
        ctx.shadowBlur = 10
        ctx.fill()

        // Cockpit
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(4, 0, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationFrameRef.current)
  }, [phase, multiplier])

  // Place Bet
  const handlePlaceBet = async () => {
    if (activeBet) return
    try {
      sound.playTick()
      const cleanAuto = autoCashoutEnabled ? Number(autoCashout) : null
      const res = await placeAviatorBet(userId, betAmount, cleanAuto)
      setActiveBet({
        betId: res.betId,
        amount: betAmount,
        autoCashout: cleanAuto,
        status: phase === 'FLYING' ? 'ACTIVE' : 'PLACED',
      })
      if (res.newBalance !== undefined && onBalanceUpdate) {
        onBalanceUpdate(res.newBalance)
      }
      setToast({ type: 'success', title: 'Bet Placed', detail: `₹${betAmount} queued for flight` })
    } catch (err) {
      setToast({ type: 'loss', title: 'Bet Failed', detail: err.message || 'Error placing bet' })
    }
  }

  // Cash Out
  const handleCashout = async () => {
    if (!activeBet || activeBet.status !== 'ACTIVE') return
    try {
      const res = await cashoutAviator(userId, activeBet.betId)
      sound.playWin()
      setActiveBet({
        ...activeBet,
        status: 'CASHED_OUT',
        payout: res.payout,
        multiplier: res.multiplier,
      })
      if (res.newBalance !== undefined && onBalanceUpdate) {
        onBalanceUpdate(res.newBalance)
      }
      setToast({
        type: 'success',
        title: '🎉 Cashed Out!',
        detail: `Won +₹${res.payout} at ${res.multiplier}x!`,
      })
    } catch (err) {
      setToast({ type: 'loss', title: 'Cash Out Failed', detail: err.message })
    }
  }

  return (
    <div className="aviator-container">
      {/* Top Bar */}
      <div className="aviator-header">
        <button className="aviator-back-btn" onClick={onBackToLobby}>
          <ArrowLeft size={18} />
          <span>Lobby</span>
        </button>
        <div className="aviator-brand">
          <span className="aviator-logo-plane">✈️</span>
          <span className="aviator-brand-text">AVIATOR</span>
        </div>
        <div className="aviator-wallet-pill">
          <span>₹{Number(balance).toFixed(2)}</span>
        </div>
      </div>

      {/* Multiplier History Pills */}
      <div className="aviator-history-bar">
        <History size={13} className="text-muted" />
        <div className="aviator-history-pills">
          {history.map((h, i) => {
            const isHigh = h.crashPoint >= 5.0
            const isMid = h.crashPoint >= 2.0 && h.crashPoint < 5.0
            return (
              <span
                key={i}
                className={`aviator-pill ${isHigh ? 'pill-high' : isMid ? 'pill-mid' : 'pill-low'}`}
              >
                {h.crashPoint.toFixed(2)}x
              </span>
            )
          })}
        </div>
      </div>

      {/* Arena Screen */}
      <div className="aviator-arena">
        <canvas ref={canvasRef} className="aviator-canvas" />

        <div className="aviator-display-overlay">
          {phase === 'WAITING' && (
            <div className="aviator-waiting-box">
              <div className="aviator-spinner" />
              <div className="aviator-wait-title">WAITING FOR NEXT ROUND</div>
              <div className="aviator-progress-track">
                <div
                  className="aviator-progress-fill"
                  style={{ width: `${Math.min(100, (remainingMs / 6000) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {phase === 'FLYING' && (
            <div className="aviator-flying-box">
              <div className="aviator-mult-num">{multiplier.toFixed(2)}x</div>
            </div>
          )}

          {phase === 'CRASHED' && (
            <div className="aviator-crashed-box">
              <div className="aviator-crash-label">FLEW AWAY!</div>
              <div className="aviator-crash-mult">{crashPoint ? crashPoint.toFixed(2) : multiplier.toFixed(2)}x</div>
            </div>
          )}
        </div>
      </div>

      {/* Betting Deck */}
      <div className="aviator-bet-panel">
        <div className="aviator-bet-header">
          <div className="aviator-bet-input-row">
            <button
              className="aviator-stepper-btn"
              onClick={() => setBetAmount((a) => Math.max(10, a - 10))}
            >
              -
            </button>
            <div className="aviator-amount-wrap">
              <span className="aviator-curr">₹</span>
              <input
                type="number"
                className="aviator-amount-input"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value)))}
              />
            </div>
            <button
              className="aviator-stepper-btn"
              onClick={() => setBetAmount((a) => a + 10)}
            >
              +
            </button>
          </div>

          <div className="aviator-chips-row">
            {[50, 100, 200, 500].map((c) => (
              <button
                key={c}
                className="aviator-chip-btn"
                onClick={() => setBetAmount(c)}
              >
                ₹{c}
              </button>
            ))}
            <button
              className="aviator-chip-btn"
              onClick={() => setBetAmount((a) => a * 2)}
            >
              2X
            </button>
          </div>
        </div>

        {/* Auto Cashout option */}
        <div className="aviator-auto-row">
          <label className="aviator-auto-toggle">
            <input
              type="checkbox"
              checked={autoCashoutEnabled}
              onChange={(e) => setAutoCashoutEnabled(e.target.checked)}
            />
            <span>Auto Cash Out</span>
          </label>
          {autoCashoutEnabled && (
            <div className="aviator-auto-input-wrap">
              <input
                type="number"
                step="0.1"
                className="aviator-auto-val"
                value={autoCashout}
                onChange={(e) => setAutoCashout(Number(e.target.value))}
              />
              <span>x</span>
            </div>
          )}
        </div>

        {/* Main Action Button */}
        {activeBet?.status === 'ACTIVE' ? (
          <button className="aviator-action-btn btn-cashout" onClick={handleCashout}>
            <span className="btn-cashout-label">CASH OUT</span>
            <span className="btn-cashout-val">₹{Math.round(activeBet.amount * multiplier)}</span>
          </button>
        ) : activeBet?.status === 'PLACED' ? (
          <button className="aviator-action-btn btn-waiting" disabled>
            <span>BET PLACED (₹{activeBet.amount})</span>
            <small>Waiting for Takeoff...</small>
          </button>
        ) : activeBet?.status === 'CASHED_OUT' ? (
          <button className="aviator-action-btn btn-won" disabled>
            <span>CASHED OUT ₹{activeBet.payout} ({activeBet.multiplier}x)</span>
          </button>
        ) : (
          <button
            className="aviator-action-btn btn-bet"
            onClick={handlePlaceBet}
            disabled={phase === 'FLYING'}
          >
            <span>BET ₹{betAmount}</span>
            <small>{phase === 'WAITING' ? 'Takeoff Soon' : 'Next Round'}</small>
          </button>
        )}
      </div>

      {toast && (
        <div className={`aviator-toast toast-${toast.type}`}>
          <strong>{toast.title}</strong>
          <span>{toast.detail}</span>
        </div>
      )}
    </div>
  )
}
export default AviatorGame
