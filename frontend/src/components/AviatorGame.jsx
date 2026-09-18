import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Volume2, VolumeX, History, RefreshCw, Zap, ShieldCheck, Users, TrendingUp, AlertCircle, Clock } from 'lucide-react'
import { fetchAviatorState, placeAviatorBet, cashoutAviator } from '../api/client'
import { sound } from '../utils/audio'

// Client-side multiplier formula matching server authoritative math for 60 FPS interpolation
function calculateClientMultiplier(elapsedMs) {
  if (elapsedMs <= 0) return 1.0
  const seconds = elapsedMs / 1000
  const mult = 1.0 + 0.06 * Math.pow(seconds, 1.45)
  return +mult.toFixed(2)
}

export function AviatorGame({ userId, balance, onBalanceUpdate, onBackToLobby }) {
  const [phase, setPhase] = useState('WAITING') // 'WAITING' | 'FLYING' | 'CRASHED'
  const [multiplier, setMultiplier] = useState(1.0)
  const [crashPoint, setCrashPoint] = useState(null)
  const [remainingMs, setRemainingMs] = useState(6000)
  const [waitingDurationMs, setWaitingDurationMs] = useState(6000)
  const [serverStartTime, setServerStartTime] = useState(Date.now())
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [totalPool, setTotalPool] = useState(0)
  const [recentCashouts, setRecentCashouts] = useState([])
  const [history, setHistory] = useState([])

  // Bet Deck 1 State
  const [betAmount, setBetAmount] = useState(50)
  const [autoCashout, setAutoCashout] = useState(2.0)
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false)
  const [activeBet, setActiveBet] = useState(null) // { betId, amount, status: 'PLACED' | 'ACTIVE' | 'CASHED_OUT' | 'LOST' }
  const [isPlacingBet, setIsPlacingBet] = useState(false)
  const [isCashingOut, setIsCashingOut] = useState(false)

  // Active view tab (Game vs Live Bets)
  const [activeBetsTab, setActiveBetsTab] = useState('all') // 'all' | 'my'
  const [myBetsHistory, setMyBetsHistory] = useState([])
  const [toast, setToast] = useState(null)
  const [connectionState, setConnectionState] = useState('connecting')

  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const serverOffsetRef = useRef(0)
  const localMultiplierRef = useRef(1.0)

  // Sync state from authoritative server
  const syncState = useCallback(async () => {
    try {
      const data = await fetchAviatorState()
      if (data) {
        setConnectionState('live')
        setPhase(data.phase)
        setRemainingMs(data.remainingMs)
        if (data.waitingDurationMs) setWaitingDurationMs(data.waitingDurationMs)
        if (data.totalPlayers !== undefined) setTotalPlayers(data.totalPlayers)
        if (data.totalPool !== undefined) setTotalPool(data.totalPool)
        if (Array.isArray(data.recentCashouts)) setRecentCashouts(data.recentCashouts)
        if (Array.isArray(data.history)) setHistory(data.history)

        // Sync time clocks
        if (data.serverTime) {
          serverOffsetRef.current = Date.now() - data.serverTime
        }
        if (data.phase === 'FLYING' && data.elapsedMs !== undefined) {
          setServerStartTime(Date.now() - data.elapsedMs)
        }

        if (data.phase === 'CRASHED') {
          const finalCrash = data.crashPoint || data.multiplier || 1.0
          setCrashPoint(finalCrash)
          setMultiplier(finalCrash)
          localMultiplierRef.current = finalCrash
        } else if (data.phase === 'WAITING') {
          setMultiplier(1.0)
          localMultiplierRef.current = 1.0
          setCrashPoint(null)
        }

        // Transition user bet status
        if (activeBet && activeBet.status === 'PLACED' && data.phase === 'FLYING') {
          setActiveBet((prev) => ({ ...prev, status: 'ACTIVE' }))
        }

        if (activeBet && activeBet.status === 'ACTIVE' && data.phase === 'CRASHED') {
          setActiveBet((prev) => ({ ...prev, status: 'LOST' }))
          setToast({
            type: 'loss',
            title: 'Flew Away!',
            detail: `Plane crashed at ${(data.crashPoint || data.multiplier || 1.0).toFixed(2)}x`,
          })
          setMyBetsHistory((prev) => [
            {
              id: activeBet.betId,
              amount: activeBet.amount,
              payout: 0,
              mult: data.crashPoint || data.multiplier,
              status: 'LOST',
              time: 'Just now',
            },
            ...prev.slice(0, 19),
          ])
        }
      }
    } catch (err) {
      setConnectionState('offline')
    }
  }, [activeBet])

  // Fast 250ms polling loop for state sync
  useEffect(() => {
    syncState()
    const interval = setInterval(syncState, 750)
    return () => clearInterval(interval)
  }, [syncState])

  // 60 FPS Canvas Render & Multiplier Interpolator
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = (canvas.width = canvas.parentElement.clientWidth || 360)
    const height = (canvas.height = 250)

    let lastTick = performance.now()

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // 1. Draw radar background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 36) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += 36) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // 2. Multiplier & Flight Curve
      if (phase === 'FLYING') {
        const now = Date.now()
        const elapsed = Math.max(0, now - serverStartTime)
        const currentM = calculateClientMultiplier(elapsed)
        localMultiplierRef.current = currentM
        setMultiplier(currentM)

        // Trajectory math
        const progress = Math.min(1, (currentM - 1.0) / 4.5)
        const planeX = 40 + progress * (width - 95)
        const planeY = height - 35 - Math.pow(progress, 0.75) * (height - 90)

        // Trail curve
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(25, height - 20)
        ctx.quadraticCurveTo(width * 0.38, height - 20, planeX, planeY)
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 4
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 14
        ctx.stroke()

        // Glowing gradient under curve
        ctx.lineTo(planeX, height - 20)
        ctx.lineTo(25, height - 20)
        ctx.closePath()
        const fillGrad = ctx.createLinearGradient(0, planeY, 0, height)
        fillGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)')
        fillGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)')
        ctx.fillStyle = fillGrad
        ctx.fill()
        ctx.restore()

        // Draw animated stylized Red Supersonic Jet
        ctx.save()
        ctx.translate(planeX, planeY)
        ctx.rotate(-0.22 + Math.sin(Date.now() / 150) * 0.04)

        // Engine afterburner flame
        ctx.fillStyle = '#fbbf24'
        ctx.beginPath()
        ctx.moveTo(-12, -2)
        ctx.lineTo(-24 - Math.random() * 8, 0)
        ctx.lineTo(-12, 2)
        ctx.closePath()
        ctx.shadowColor = '#f59e0b'
        ctx.shadowBlur = 8
        ctx.fill()

        // Fuselage
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.moveTo(22, 0)
        ctx.lineTo(-14, -10)
        ctx.lineTo(-8, 0)
        ctx.lineTo(-14, 10)
        ctx.closePath()
        ctx.shadowColor = 'rgba(239, 68, 68, 0.9)'
        ctx.shadowBlur = 12
        ctx.fill()

        // Wings specular trim
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.2
        ctx.stroke()

        // Cockpit dome
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(6, 0, 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      } else if (phase === 'CRASHED') {
        // Crashed explosion particles or static marker
        ctx.save()
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
        ctx.beginPath()
        ctx.arc(width / 2, height / 2, 60, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationFrameRef.current)
  }, [phase, serverStartTime])

  // Place Bet Handler (with concurrency guard and instant loading indicator)
  const handlePlaceBet = async () => {
    if (activeBet && activeBet.status !== 'LOST' && activeBet.status !== 'CASHED_OUT') return
    if (isPlacingBet || phase !== 'WAITING' || connectionState !== 'live') return

    const cleanAmount = Math.min(50000, Math.max(10, Math.floor(Number(betAmount) || 0)))

    setIsPlacingBet(true)
    try {
      sound.playTick()
      const cleanAuto = autoCashoutEnabled ? Number(autoCashout) : null
      const res = await placeAviatorBet(userId, cleanAmount, cleanAuto)

      setActiveBet({
        betId: res.betId,
        amount: cleanAmount,
        autoCashout: cleanAuto,
        status: phase === 'FLYING' ? 'ACTIVE' : 'PLACED',
      })

      if (res.newBalance !== undefined && onBalanceUpdate) {
        onBalanceUpdate(res.newBalance)
      }

      setToast({
        type: 'success',
        title: 'Bet Placed Successfully!',
        detail: `₹${cleanAmount} confirmed for Round #${res.roundId}`,
      })
    } catch (err) {
      setToast({
        type: 'loss',
        title: 'Bet Failed',
        detail: err.message || 'Error placing Aviator bet',
      })
    } finally {
      setIsPlacingBet(false)
    }
  }

  // Cash Out Handler (with atomic lock and celebratory sound)
  const handleCashout = async () => {
    if (!activeBet || activeBet.status !== 'ACTIVE' || isCashingOut) return

    setIsCashingOut(true)
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

      setMyBetsHistory((prev) => [
        {
          id: activeBet.betId,
          amount: activeBet.amount,
          payout: res.payout,
          mult: res.multiplier,
          status: 'WON',
          time: 'Just now',
        },
        ...prev.slice(0, 19),
      ])

      setToast({
        type: 'success',
        title: '🎉 Awesome Cash Out!',
        detail: `Won +₹${res.payout} at ${res.multiplier}x!`,
      })
    } catch (err) {
      setToast({
        type: 'loss',
        title: 'Cash Out Failed',
        detail: err.message || 'Could not cash out',
      })
    } finally {
      setIsCashingOut(false)
    }
  }

  // Calculate loading bar percentage during WAITING phase
  const waitProgressPct = Math.min(100, Math.max(0, 100 - (remainingMs / (waitingDurationMs || 6000)) * 100))

  return (
    <div className="aviator-container">
      {/* 1. Header Bar */}
      <div className="aviator-header">
        <button className="aviator-back-btn" onClick={onBackToLobby}>
          <ArrowLeft size={18} />
          <span>Lobby</span>
        </button>
        <div className="aviator-brand">
          <span className="aviator-logo-plane">✈️</span>
          <span className="aviator-brand-text">AVIATOR</span>
          <span className="aviator-live-tag">LIVE</span>
        </div>
        <div className="aviator-wallet-pill">
          <span>₹{Number(balance).toFixed(2)}</span>
        </div>
      </div>

      <div className={`aviator-connection-state ${connectionState}`}>
        <span />
        {connectionState === 'live' ? 'Live server data' : connectionState === 'offline' ? 'Connection lost — betting paused' : 'Connecting to live server…'}
      </div>

      {/* 2. Top Multiplier History Bar */}
      <div className="aviator-history-bar">
        <div className="aviator-history-title">
          <History size={12} />
          <span>ROUNDS</span>
        </div>
        <div className="aviator-history-pills">
          {history.length === 0 ? (
            <span className="aviator-history-empty">No completed live rounds yet</span>
          ) : history.map((h, i) => {
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

      {/* 3. Live Multiplayer Arena Screen */}
      <div className="aviator-arena">
        <canvas ref={canvasRef} className="aviator-canvas" />

        {/* Live Multiplayer Status Badge (Top Left) */}
        <div className="aviator-live-stats-bar">
          <div className="aviator-stat-chip">
            <Users size={12} />
            <span>{totalPlayers} Players</span>
          </div>
          <div className="aviator-stat-chip">
            <TrendingUp size={12} />
            <span>₹{totalPool.toLocaleString()} Pool</span>
          </div>
        </div>

        {/* Display Overlay (State Machines & Loading Bar) */}
        <div className="aviator-display-overlay">
          {/* Phase 1: WAITING (Prominent Animated Loading Bar) */}
          {phase === 'WAITING' && (
            <div className="aviator-waiting-box">
              <div className="aviator-spinner" />
              <div className="aviator-wait-title">PREPARING NEXT FLIGHT</div>
              <div className="aviator-wait-countdown">
                <span>TAKING OFF IN</span>
                <strong>{(Math.max(0, remainingMs) / 1000).toFixed(1)}s</strong>
              </div>

              {/* High-Visibility Animated Loading Bar */}
              <div className="aviator-loading-bar-container">
                <div
                  className="aviator-loading-bar-fill"
                  style={{ width: `${waitProgressPct}%` }}
                >
                  <div className="aviator-loading-bar-shimmer" />
                </div>
              </div>

              <div className="aviator-wait-subtext">
                <Users size={12} className="inline-icon" />
                <span>{totalPlayers} live player{totalPlayers === 1 ? '' : 's'} in this round</span>
              </div>
            </div>
          )}

          {/* Phase 2: FLYING (Multiplier Counter) */}
          {phase === 'FLYING' && (
            <div className="aviator-flying-box">
              <div className="aviator-mult-num">{multiplier.toFixed(2)}x</div>
              <div className="aviator-flight-speed">SUPERSONIC CRUISE</div>
            </div>
          )}

          {/* Phase 3: CRASHED (Flew Away Badge) */}
          {phase === 'CRASHED' && (
            <div className="aviator-crashed-box">
              <div className="aviator-crash-label">FLEW AWAY!</div>
              <div className="aviator-crash-mult">
                {crashPoint ? crashPoint.toFixed(2) : multiplier.toFixed(2)}x
              </div>
              <div className="aviator-crash-sub">Next round starting soon...</div>
            </div>
          )}
        </div>

        {/* Live Cashout Float Ticker during Flight */}
        {phase === 'FLYING' && recentCashouts.length > 0 && (
          <div className="aviator-live-cashout-ticker">
            <span className="ticker-user">{recentCashouts[0].username}</span>
            <span className="ticker-badge">Cashed Out</span>
            <span className="ticker-mult">{recentCashouts[0].multiplier}x</span>
            <span className="ticker-payout">+₹{recentCashouts[0].payout}</span>
          </div>
        )}
      </div>

      {/* 4. Betting Panel */}
      <div className="aviator-bet-panel">
        <div className="aviator-bet-header">
          <div className="aviator-bet-input-row">
            <button
              className="aviator-stepper-btn"
              onClick={() => setBetAmount((a) => Math.max(10, a - 10))}
              disabled={isPlacingBet}
            >
              -
            </button>
            <div className="aviator-amount-wrap">
              <span className="aviator-curr">₹</span>
              <input
                type="number"
                className="aviator-amount-input"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.min(50000, Math.max(10, Number(e.target.value) || 10)))}
                disabled={isPlacingBet}
              />
            </div>
            <button
              className="aviator-stepper-btn"
              onClick={() => setBetAmount((a) => Math.min(50000, a + 10))}
              disabled={isPlacingBet}
            >
              +
            </button>
          </div>

          <div className="aviator-chips-row">
            {[50, 100, 200, 500, 1000].map((c) => (
              <button
                key={c}
                className={`aviator-chip-btn ${betAmount === c ? 'active' : ''}`}
                onClick={() => setBetAmount(c)}
                disabled={isPlacingBet}
              >
                ₹{c}
              </button>
            ))}
            <button
              className="aviator-chip-btn chip-2x"
              onClick={() => setBetAmount((a) => Math.min(50000, a * 2))}
              disabled={isPlacingBet}
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
                min="1.05"
                max="100"
                className="aviator-auto-val"
                value={autoCashout}
                onChange={(e) => setAutoCashout(Math.max(1.05, Number(e.target.value)))}
              />
              <span>x</span>
            </div>
          )}
        </div>

        {/* Main Action Button with Concurrency & Loading States */}
        {activeBet?.status === 'ACTIVE' ? (
          <button
            className={`aviator-action-btn btn-cashout ${isCashingOut ? 'btn-loading' : ''}`}
            onClick={handleCashout}
            disabled={isCashingOut}
          >
            <span className="btn-cashout-label">
              {isCashingOut ? 'CASHING OUT...' : 'CASH OUT'}
            </span>
            <span className="btn-cashout-val">
              ₹{Math.round(activeBet.amount * multiplier)}
            </span>
          </button>
        ) : activeBet?.status === 'PLACED' ? (
          <button className="aviator-action-btn btn-waiting" disabled>
            <div className="btn-inner-row">
              <Clock size={16} className="btn-spin" />
              <span>BET QUEUED (₹{activeBet.amount})</span>
            </div>
            <small>Waiting for flight takeoff...</small>
          </button>
        ) : activeBet?.status === 'CASHED_OUT' ? (
          <button className="aviator-action-btn btn-won" disabled>
            <span>CASHED OUT ₹{activeBet.payout} ({activeBet.multiplier}x)</span>
            <small>Waiting for next round</small>
          </button>
        ) : (
          <button
            className={`aviator-action-btn btn-bet ${isPlacingBet ? 'btn-loading' : ''}`}
            onClick={handlePlaceBet}
            disabled={phase !== 'WAITING' || isPlacingBet || connectionState !== 'live'}
          >
            {isPlacingBet ? (
              <span className="btn-loading-text">PLACING BET...</span>
            ) : (
              <>
                <span>BET ₹{betAmount}</span>
                <small>{connectionState !== 'live' ? 'Waiting for live connection' : phase === 'WAITING' ? 'Takeoff soon' : 'Next round'}</small>
              </>
            )}
          </button>
        )}
      </div>

      {/* 5. Live Bets / My Bets Roster Tabs */}
      <div className="aviator-roster-section">
        <div className="aviator-roster-tabs">
          <button
            className={`roster-tab ${activeBetsTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveBetsTab('all')}
          >
            All Bets ({totalPlayers})
          </button>
          <button
            className={`roster-tab ${activeBetsTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveBetsTab('my')}
          >
            My Bets ({myBetsHistory.length})
          </button>
        </div>

        <div className="aviator-roster-content">
          {activeBetsTab === 'all' ? (
            <div className="aviator-recent-cashes-list">
              {recentCashouts.length === 0 ? (
                <div className="roster-empty">Waiting for takeoff and cashouts...</div>
              ) : (
                recentCashouts.map((rc, idx) => (
                  <div key={idx} className="roster-row">
                    <span className="roster-user">{rc.username}</span>
                    <span className="roster-bet">₹{rc.amount}</span>
                    <span className="roster-mult">{rc.multiplier}x</span>
                    <span className="roster-payout">+₹{rc.payout}</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="aviator-my-bets-list">
              {myBetsHistory.length === 0 ? (
                <div className="roster-empty">No bets placed in this session yet</div>
              ) : (
                myBetsHistory.map((mb, idx) => (
                  <div key={idx} className={`roster-row ${mb.status === 'WON' ? 'row-won' : 'row-lost'}`}>
                    <span className="roster-user">Round Bet</span>
                    <span className="roster-bet">₹{mb.amount}</span>
                    <span className="roster-mult">{mb.mult}x</span>
                    <span className="roster-payout">{mb.status === 'WON' ? `+₹${mb.payout}` : 'Lost'}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast */}
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
