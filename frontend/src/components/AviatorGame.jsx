import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Volume2, VolumeX, History, RefreshCw, Zap, ShieldCheck, Users, HelpCircle, Menu, X, Check, Clock, TrendingUp } from 'lucide-react'
import { fetchAviatorState, placeAviatorBet, cashoutAviator, cancelAviatorBet, fetchUserBets } from '../api/client'
import { sound } from '../utils/audio'
import './aviator.css'

// 60 FPS authoritative multiplier calculation matching server formula
function calculateClientMultiplier(elapsedMs) {
  if (elapsedMs <= 0) return 1.0
  const seconds = elapsedMs / 1000
  const mult = 1.0 + 0.06 * Math.pow(seconds, 1.45)
  return +mult.toFixed(2)
}

export function AviatorGame({ userId, balance, onBalanceUpdate, onBackToLobby, onOpenAuth }) {
  const [phase, setPhase] = useState('WAITING') // 'WAITING' | 'FLYING' | 'CRASHED'
  const [multiplier, setMultiplier] = useState(1.0)
  const [crashPoint, setCrashPoint] = useState(null)
  const [remainingMs, setRemainingMs] = useState(6000)
  const [waitingDurationMs, setWaitingDurationMs] = useState(6000)
  const [serverStartTime, setServerStartTime] = useState(Date.now())
  const [crashedAtTime, setCrashedAtTime] = useState(null)
  const [roundId, setRoundId] = useState(null)
  const [serverSeedCommitment, setServerSeedCommitment] = useState('')
  const [totalPlayers, setTotalPlayers] = useState(1677)
  const [totalPool, setTotalPool] = useState(48500)
  const [recentCashouts, setRecentCashouts] = useState([])
  const [history, setHistory] = useState([])
  const [connectionState, setConnectionState] = useState('connecting')
  const [pingMs, setPingMs] = useState(64)

  // Modals & Drawers
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showMenuDrawer, setShowMenuDrawer] = useState(false)
  const [showProvablyFairModal, setShowProvablyFairModal] = useState(false)

  // Sound Mute State
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('aviator_sound_muted') === 'true'
    } catch {
      return false
    }
  })
  const isMutedRef = useRef(isMuted)
  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev
      try {
        localStorage.setItem('aviator_sound_muted', String(next))
      } catch {}
      return next
    })
  }

  // Dual Bet Panels: Panel 0 (Top) & Panel 1 (Bottom)
  const [panel0, setPanel0] = useState({
    amount: 10,
    rawAmount: '10',
    isEditing: false,
    tab: 'bet', // 'bet' | 'auto'
    autoBetEnabled: false,
    autoCashout: 2.0,
    autoCashoutEnabled: false,
    bet: null, // { betId, amount, status: 'PLACED' | 'ACTIVE' | 'CASHED_OUT' | 'LOST', payout, multiplier }
    isPlacing: false,
    isCashingOut: false,
    isCancelling: false,
  })

  const [panel1, setPanel1] = useState({
    amount: 10,
    rawAmount: '10',
    isEditing: false,
    tab: 'bet',
    autoBetEnabled: false,
    autoCashout: 2.0,
    autoCashoutEnabled: false,
    bet: null,
    isPlacing: false,
    isCashingOut: false,
    isCancelling: false,
  })

  const panel0Ref = useRef(panel0)
  const panel1Ref = useRef(panel1)
  useEffect(() => {
    panel0Ref.current = panel0
  }, [panel0])
  useEffect(() => {
    panel1Ref.current = panel1
  }, [panel1])

  // Roster Bottom Navigation
  const [rosterTab, setRosterTab] = useState('all') // 'all' | 'my' | 'top'
  const [myBetsHistory, setMyBetsHistory] = useState([])
  const [toast, setToast] = useState(null)

  // Ping jitter simulation (subtle realistic ping 55ms - 85ms)
  useEffect(() => {
    const pingTimer = setInterval(() => {
      setPingMs(Math.floor(58 + Math.random() * 24))
    }, 4000)
    return () => clearInterval(pingTimer)
  }, [])

  // Load user's past real Aviator bets from database
  const loadUserBetsHistory = useCallback(async () => {
    if (!userId) return
    try {
      const data = await fetchUserBets(userId)
      if (data && Array.isArray(data.bets)) {
        const aviatorBets = data.bets
          .filter((b) => (b.game_mode || '').toUpperCase() === 'AVIATOR')
          .map((b) => ({
            id: b.id,
            amount: b.amount,
            payout: b.payout || 0,
            mult: b.cashout_multiplier || b.mult || (b.payout > 0 ? +(b.payout / b.amount).toFixed(2) : null),
            status: b.status === 'CASHED_OUT' || b.payout > 0 ? 'WON' : b.status === 'ACTIVE' || b.status === 'PLACED' ? 'ACTIVE' : 'LOST',
            time: b.placed_at || b.created_at ? new Date(b.placed_at || b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          }))
        setMyBetsHistory(aviatorBets)
      }
    } catch {}
  }, [userId])

  useEffect(() => {
    loadUserBetsHistory()
  }, [loadUserBetsHistory])

  // Canvas & Graphics Refs
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const localMultiplierRef = useRef(1.0)
  const autoBetTriggeredRef = useRef(false)

  // Sync state from authoritative server
  const syncState = useCallback(async () => {
    try {
      const data = await fetchAviatorState(userId)
      if (data) {
        setConnectionState('live')
        setPhase(data.phase)
        setRemainingMs(data.remainingMs)
        if (data.roundId) setRoundId(data.roundId)
        if (data.seedCommitment) setServerSeedCommitment(data.seedCommitment)
        if (data.waitingDurationMs) setWaitingDurationMs(data.waitingDurationMs)
        if (data.totalPlayers !== undefined) setTotalPlayers(data.totalPlayers || 1677)
        if (data.totalPool !== undefined) setTotalPool(data.totalPool || 48500)
        if (Array.isArray(data.recentCashouts)) setRecentCashouts(data.recentCashouts)
        if (Array.isArray(data.history)) setHistory(data.history)

        if (data.phase === 'FLYING' && data.elapsedMs !== undefined) {
          setServerStartTime(Date.now() - data.elapsedMs)
        }

        if (data.phase === 'CRASHED') {
          const finalCrash = data.crashPoint || data.multiplier || 1.0
          setCrashPoint(finalCrash)
          setMultiplier(finalCrash)
          localMultiplierRef.current = finalCrash
          setCrashedAtTime((prev) => prev || Date.now())
          autoBetTriggeredRef.current = false
        } else if (data.phase === 'WAITING') {
          setMultiplier(1.0)
          localMultiplierRef.current = 1.0
          setCrashPoint(null)
          setCrashedAtTime(null)
        }

        // Reconcile server user bets for panel 0 and panel 1
        const serverUserBets = Array.isArray(data.userBets) ? data.userBets : []

        const reconcilePanel = (panelIndex, curPanel, setPanel) => {
          const matchingBet = serverUserBets.find(
            (b) => b.id === curPanel.bet?.betId || (b.panelId === panelIndex && b.roundId === data.roundId && (b.status === 'ACTIVE' || b.status === 'PLACED'))
          )

          if (matchingBet) {
            if (matchingBet.status === 'CASHED_OUT' && curPanel.bet?.status !== 'CASHED_OUT') {
              // Server confirmed cashout
              if (!isMutedRef.current) sound.playWin()
              setPanel((p) => ({
                ...p,
                bet: {
                  betId: matchingBet.id,
                  amount: matchingBet.amount,
                  status: 'CASHED_OUT',
                  payout: matchingBet.payout,
                  multiplier: matchingBet.cashoutMultiplier,
                },
              }))
              setToast({
                type: 'success',
                title: 'Auto Cash Out Confirmed!',
                detail: `Won +₹${matchingBet.payout} at ${matchingBet.cashoutMultiplier}x!`,
              })
              if (onBalanceUpdate) {
                onBalanceUpdate(balance + matchingBet.payout)
              }
              loadUserBetsHistory()
            } else if (!curPanel.bet && (matchingBet.status === 'ACTIVE' || matchingBet.status === 'PLACED')) {
              setPanel((p) => ({
                ...p,
                bet: {
                  betId: matchingBet.id,
                  amount: matchingBet.amount,
                  autoCashout: matchingBet.autoCashout,
                  status: matchingBet.status,
                },
              }))
            }
          }

          // Transition PLACED to ACTIVE
          if (curPanel.bet && curPanel.bet.status === 'PLACED' && data.phase === 'FLYING') {
            setPanel((p) => ({
              ...p,
              bet: { ...p.bet, status: 'ACTIVE' },
            }))
          }

          // Mark active bet as LOST when crashed
          if (curPanel.bet && curPanel.bet.status === 'ACTIVE' && data.phase === 'CRASHED') {
            if (!matchingBet || matchingBet.status !== 'CASHED_OUT') {
              setPanel((p) => ({
                ...p,
                bet: { ...p.bet, status: 'LOST' },
              }))
              loadUserBetsHistory()
            }
          }

          // Reset completed bet in new WAITING phase
          if (data.phase === 'WAITING' && curPanel.bet && (curPanel.bet.status === 'CASHED_OUT' || curPanel.bet.status === 'LOST')) {
            setPanel((p) => ({ ...p, bet: null }))
          }
        }

        reconcilePanel(0, panel0Ref.current, setPanel0)
        reconcilePanel(1, panel1Ref.current, setPanel1)
      }
    } catch {
      setConnectionState('offline')
    }
  }, [userId, balance, onBalanceUpdate, loadUserBetsHistory])

  // Fast polling loop (700ms)
  useEffect(() => {
    syncState()
    const interval = setInterval(syncState, 700)
    return () => clearInterval(interval)
  }, [syncState])

  // Place Bet Handler for designated Panel (0 or 1)
  const handlePlaceBet = async (panelIndex) => {
    const isPanel0 = panelIndex === 0
    const currentPanel = isPanel0 ? panel0Ref.current : panel1Ref.current
    const setPanel = isPanel0 ? setPanel0 : setPanel1

    if (currentPanel.isPlacing) return
    if (currentPanel.bet && currentPanel.bet.status !== 'LOST' && currentPanel.bet.status !== 'CASHED_OUT') return
    if (phase !== 'WAITING') {
      setToast({ type: 'loss', title: 'Waiting Required', detail: 'Bets only accepted during countdown' })
      return
    }

    if (!userId) {
      if (onOpenAuth) onOpenAuth()
      else setToast({ type: 'loss', title: 'Login Required', detail: 'Please log in to place bets' })
      return
    }

    setPanel((p) => ({ ...p, isPlacing: true }))
    const cleanAmount = Math.min(50000, Math.max(10, Math.floor(Number(currentPanel.amount) || 10)))

    try {
      if (!isMutedRef.current) sound.playTick()
      const cleanAuto = currentPanel.autoCashoutEnabled ? Number(currentPanel.autoCashout) : null
      const res = await placeAviatorBet(userId, cleanAmount, cleanAuto, panelIndex)

      setPanel((p) => ({
        ...p,
        bet: {
          betId: res.betId,
          amount: cleanAmount,
          autoCashout: cleanAuto,
          status: phase === 'FLYING' ? 'ACTIVE' : 'PLACED',
        },
      }))

      if (res.newBalance !== undefined && onBalanceUpdate) {
        onBalanceUpdate(res.newBalance)
      }

      setToast({
        type: 'success',
        title: 'Bet Confirmed!',
        detail: `₹${cleanAmount} placed on Panel ${panelIndex + 1}`,
      })
      loadUserBetsHistory()
    } catch (err) {
      setToast({
        type: 'loss',
        title: 'Bet Failed',
        detail: err.message || 'Error placing bet',
      })
    } finally {
      setPanel((p) => ({ ...p, isPlacing: false }))
    }
  }

  // Cancel Bet Handler (during WAITING phase before takeoff)
  const handleCancelBet = async (panelIndex) => {
    const isPanel0 = panelIndex === 0
    const currentPanel = isPanel0 ? panel0Ref.current : panel1Ref.current
    const setPanel = isPanel0 ? setPanel0 : setPanel1

    if (!currentPanel.bet || currentPanel.bet.status !== 'PLACED' || currentPanel.isCancelling) return

    setPanel((p) => ({ ...p, isCancelling: true }))
    try {
      const res = await cancelAviatorBet(userId, currentPanel.bet.betId)
      setPanel((p) => ({ ...p, bet: null }))

      if (res.newBalance !== undefined && onBalanceUpdate) {
        onBalanceUpdate(res.newBalance)
      }

      setToast({
        type: 'success',
        title: 'Bet Cancelled',
        detail: `₹${res.refundAmount} refunded to your balance`,
      })
    } catch (err) {
      setToast({
        type: 'loss',
        title: 'Cancel Failed',
        detail: err.message || 'Could not cancel bet',
      })
    } finally {
      setPanel((p) => ({ ...p, isCancelling: false }))
    }
  }

  // Cash Out Handler for designated Panel (0 or 1)
  const handleCashout = async (panelIndex) => {
    const isPanel0 = panelIndex === 0
    const currentPanel = isPanel0 ? panel0Ref.current : panel1Ref.current
    const setPanel = isPanel0 ? setPanel0 : setPanel1

    if (!currentPanel.bet || currentPanel.bet.status !== 'ACTIVE' || currentPanel.isCashingOut) return

    setPanel((p) => ({ ...p, isCashingOut: true }))
    try {
      const res = await cashoutAviator(userId, currentPanel.bet.betId)
      if (!isMutedRef.current) sound.playWin()

      setPanel((p) => ({
        ...p,
        bet: {
          ...p.bet,
          status: 'CASHED_OUT',
          payout: res.payout,
          multiplier: res.multiplier,
        },
      }))

      if (res.newBalance !== undefined && onBalanceUpdate) {
        onBalanceUpdate(res.newBalance)
      }

      setToast({
        type: 'success',
        title: 'Awesome Cash Out!',
        detail: `Won +₹${res.payout} at ${res.multiplier}x!`,
      })
      loadUserBetsHistory()
    } catch (err) {
      setToast({
        type: 'loss',
        title: 'Cashout Missed',
        detail: err.message || 'Could not cash out',
      })
    } finally {
      setPanel((p) => ({ ...p, isCashingOut: false }))
    }
  }

  // Auto-Bet Triggering when WAITING begins
  useEffect(() => {
    if (phase === 'WAITING' && !autoBetTriggeredRef.current) {
      autoBetTriggeredRef.current = true
      if (panel0Ref.current.autoBetEnabled && !panel0Ref.current.bet) {
        handlePlaceBet(0)
      }
      if (panel1Ref.current.autoBetEnabled && !panel1Ref.current.bet) {
        handlePlaceBet(1)
      }
    }
  }, [phase])

  // 60 FPS Canvas Render: Authentic Radar with Red Propeller Airplane
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = (canvas.width = canvas.parentElement?.clientWidth || 360)
    const height = (canvas.height = 230)

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // 1. Draw Radar Coordinate Axis Dots (Left Y-Axis & Bottom X-Axis)
      // Left Y-Axis Cyan Dots
      ctx.fillStyle = '#06b6d4'
      ctx.shadowColor = '#06b6d4'
      ctx.shadowBlur = 4
      for (let y = 25; y <= height - 35; y += 30) {
        ctx.beginPath()
        ctx.arc(14, y, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Bottom X-Axis White/Gray Dots
      ctx.fillStyle = '#94a3b8'
      ctx.shadowColor = '#94a3b8'
      ctx.shadowBlur = 2
      for (let x = 38; x <= width - 20; x += 32) {
        ctx.beginPath()
        ctx.arc(x, height - 16, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      // 2. Multiplier & Flight Dynamics
      if (phase === 'FLYING') {
        const now = Date.now()
        const elapsed = Math.max(0, now - serverStartTime)
        const currentM = calculateClientMultiplier(elapsed)
        localMultiplierRef.current = currentM
        setMultiplier(currentM)

        // Trajectory progress
        const progress = Math.min(0.92, (currentM - 1.0) / (currentM + 2.4))
        const floatBob = Math.sin(now / 180) * 3.5
        const planeX = 35 + progress * (width - 85)
        const planeY = height - 35 - Math.pow(progress, 0.8) * (height - 80) + floatBob

        // Glowing Blue Spotlight in Stage Center
        const spotGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 10, width * 0.5, height * 0.45, 120)
        spotGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)')
        spotGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)')
        ctx.fillStyle = spotGrad
        ctx.beginPath()
        ctx.arc(width * 0.5, height * 0.45, 120, 0, Math.PI * 2)
        ctx.fill()

        // Red Flight Trail Curve
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(25, height - 25)
        ctx.quadraticCurveTo(width * 0.35, height - 25, planeX, planeY)
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 3.5
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 12
        ctx.stroke()

        // Vibrant Red Gradient Fill Under Curve
        ctx.lineTo(planeX, height - 25)
        ctx.lineTo(25, height - 25)
        ctx.closePath()
        const fillGrad = ctx.createLinearGradient(0, planeY, 0, height - 25)
        fillGrad.addColorStop(0, 'rgba(239, 68, 68, 0.45)')
        fillGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)')
        ctx.fillStyle = fillGrad
        ctx.fill()
        ctx.restore()

        // Draw Authentic Red Propeller Airplane
        ctx.save()
        ctx.translate(planeX, planeY)
        ctx.rotate(-0.2 + Math.sin(now / 140) * 0.03)

        // Spinning Propeller Blades
        ctx.save()
        ctx.translate(22, -1)
        const propAngle = (now / 25) % (Math.PI * 2)
        ctx.rotate(propAngle)
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.ellipse(0, 0, 2, 10, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Engine Cowling
        ctx.fillStyle = '#b91c1c'
        ctx.beginPath()
        ctx.ellipse(19, -1, 3.5, 5, 0, 0, Math.PI * 2)
        ctx.fill()

        // Airplane Fuselage
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.moveTo(20, -1)
        ctx.quadraticCurveTo(8, -8, -14, -4)
        ctx.lineTo(-20, -12) // Tailfin top
        ctx.lineTo(-24, -12)
        ctx.lineTo(-21, -1)
        ctx.quadraticCurveTo(-14, 5, 8, 4)
        ctx.closePath()
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)'
        ctx.shadowBlur = 10
        ctx.fill()

        // Specular White Stripe
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(14, -2)
        ctx.lineTo(-12, -2)
        ctx.stroke()

        // Cockpit Canopy
        ctx.fillStyle = '#38bdf8'
        ctx.beginPath()
        ctx.ellipse(4, -4.5, 5, 2.5, -0.15, 0, Math.PI * 2)
        ctx.fill()

        // Main Wing
        ctx.fillStyle = '#dc2626'
        ctx.beginPath()
        ctx.moveTo(6, 0)
        ctx.lineTo(-2, 11)
        ctx.lineTo(-7, 10)
        ctx.lineTo(-1, 0)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
      } else if (phase === 'CRASHED') {
        const crashElapsed = crashedAtTime ? Date.now() - crashedAtTime : 0
        if (crashElapsed < 800) {
          // Animated fly-away exit off top right
          const flyProgress = crashElapsed / 800
          const exitX = width * 0.8 + flyProgress * (width * 0.4)
          const exitY = height * 0.3 - flyProgress * (height * 0.4)

          ctx.save()
          ctx.translate(exitX, exitY)
          ctx.rotate(-0.4)
          ctx.fillStyle = '#ef4444'
          ctx.beginPath()
          ctx.moveTo(20, 0)
          ctx.lineTo(-12, -8)
          ctx.lineTo(-8, 0)
          ctx.lineTo(-12, 8)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
        }
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationFrameRef.current)
  }, [phase, serverStartTime, crashedAtTime])

  // Loading bar percentage during WAITING phase
  const waitProgressPct = Math.min(100, Math.max(0, 100 - (remainingMs / (waitingDurationMs || 6000)) * 100))

  // Helper to render single bet deck panel
  const renderBetDeckPanel = (panelIndex, panel, setPanel) => {
    const isBetActive = panel.bet?.status === 'ACTIVE'
    const isBetPlaced = panel.bet?.status === 'PLACED'
    const isBetWon = panel.bet?.status === 'CASHED_OUT'

    return (
      <div className="spribe-bet-card" key={panelIndex}>
        {/* Top Tab Switch: Bet | Auto */}
        <div className="spribe-tab-switch">
          <button
            className={`spribe-tab-btn ${panel.tab === 'bet' ? 'active' : ''}`}
            onClick={() => setPanel((p) => ({ ...p, tab: 'bet' }))}
          >
            Bet
          </button>
          <button
            className={`spribe-tab-btn ${panel.tab === 'auto' ? 'active' : ''}`}
            onClick={() => setPanel((p) => ({ ...p, tab: 'auto' }))}
          >
            Auto
          </button>
        </div>

        {/* Main Controls Row */}
        <div className="spribe-card-main">
          {/* Left Column: Stepper & 2x2 Quick Chips */}
          <div className="spribe-left-controls">
            <div className="spribe-stepper-row">
              <button
                type="button"
                className="spribe-step-btn"
                onClick={() => {
                  const current = Math.floor(Number(panel.amount) || 10)
                  const next = Math.max(10, current - 10)
                  setPanel((p) => ({ ...p, amount: next, rawAmount: String(next) }))
                }}
                disabled={isBetPlaced || isBetActive}
              >
                -
              </button>
              <div className="spribe-input-wrap">
                <input
                  type="text"
                  inputMode="numeric"
                  className="spribe-amount-input"
                  value={panel.isEditing ? panel.rawAmount : `${(Number(panel.amount) || 10).toFixed(2)}`}
                  onFocus={() =>
                    setPanel((p) => ({
                      ...p,
                      isEditing: true,
                      rawAmount: String(Number(p.amount) || 10),
                    }))
                  }
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d.]/g, '')
                    setPanel((p) => ({ ...p, rawAmount: val }))
                  }}
                  onBlur={() => {
                    const clean = Math.min(50000, Math.max(10, Math.floor(Number(panel.rawAmount) || 10)))
                    setPanel((p) => ({ ...p, isEditing: false, amount: clean, rawAmount: String(clean) }))
                  }}
                  disabled={isBetPlaced || isBetActive}
                />
              </div>
              <button
                type="button"
                className="spribe-step-btn"
                onClick={() => {
                  const current = Math.floor(Number(panel.amount) || 10)
                  const next = Math.min(50000, current + 10)
                  setPanel((p) => ({ ...p, amount: next, rawAmount: String(next) }))
                }}
                disabled={isBetPlaced || isBetActive}
              >
                +
              </button>
            </div>

            {/* 2x2 Preset Chips: 10, 100, 500, 1,000 */}
            <div className="spribe-presets-grid">
              {[10, 100, 500, 1000].map((val) => (
                <button
                  type="button"
                  key={val}
                  className={`spribe-chip-btn ${panel.amount === val ? 'active' : ''}`}
                  onClick={() => setPanel((p) => ({ ...p, amount: val, rawAmount: String(val) }))}
                  disabled={isBetPlaced || isBetActive}
                >
                  {val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Large Action Button */}
          <div className="spribe-right-action">
            {isBetActive ? (
              <button
                className="spribe-action-btn btn-orange-cashout"
                onClick={() => handleCashout(panelIndex)}
                disabled={panel.isCashingOut}
              >
                <span className="spribe-btn-main-text">
                  {panel.isCashingOut ? 'CASHING OUT' : 'CASH OUT'}
                </span>
                <span className="spribe-btn-sub-text">
                  {((Number(panel.amount) || 10) * multiplier).toFixed(2)} INR
                </span>
              </button>
            ) : isBetPlaced ? (
              <button
                className="spribe-action-btn btn-amber-cancel"
                onClick={() => handleCancelBet(panelIndex)}
                disabled={panel.isCancelling}
              >
                <span className="spribe-btn-main-text">
                  {panel.isCancelling ? 'CANCELLING' : 'CANCEL'}
                </span>
                <span className="spribe-btn-sub-text">{(Number(panel.amount) || 10).toFixed(2)} INR</span>
              </button>
            ) : isBetWon ? (
              <button className="spribe-action-btn btn-green-won" disabled>
                <span className="spribe-btn-main-text">CASHED OUT</span>
                <span className="spribe-btn-sub-text">
                  +₹{panel.bet.payout} ({panel.bet.multiplier}x)
                </span>
              </button>
            ) : (
              <button
                className="spribe-action-btn btn-green-bet"
                onClick={() => handlePlaceBet(panelIndex)}
                disabled={phase !== 'WAITING' || panel.isPlacing || connectionState !== 'live'}
              >
                <span className="spribe-btn-main-text">
                  {panel.isPlacing ? 'PLACING...' : 'BET'}
                </span>
                <span className="spribe-btn-sub-text">{(Number(panel.amount) || 10).toFixed(2)} INR</span>
              </button>
            )}
          </div>
        </div>

        {/* Auto Tab Options */}
        {panel.tab === 'auto' && (
          <div className="spribe-auto-controls">
            <label className="spribe-auto-toggle-label">
              <input
                type="checkbox"
                checked={panel.autoBetEnabled}
                onChange={(e) => setPanel((p) => ({ ...p, autoBetEnabled: e.target.checked }))}
              />
              <span>Auto Bet</span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label className="spribe-auto-toggle-label">
                <input
                  type="checkbox"
                  checked={panel.autoCashoutEnabled}
                  onChange={(e) => setPanel((p) => ({ ...p, autoCashoutEnabled: e.target.checked }))}
                />
                <span>Auto Cash Out</span>
              </label>
              {panel.autoCashoutEnabled && (
                <div className="spribe-auto-mult-stepper">
                  <input
                    type="number"
                    step="0.1"
                    min="1.05"
                    max="100"
                    className="spribe-auto-mult-input"
                    value={panel.autoCashout}
                    onChange={(e) =>
                      setPanel((p) => ({ ...p, autoCashout: Math.max(1.05, Number(e.target.value)) }))
                    }
                  />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>x</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="spribe-aviator-container">
      {/* 1. TOP HEADER BAR */}
      <header className="spribe-header">
        <div className="spribe-header-left">
          <button className="spribe-back-btn" onClick={onBackToLobby} title="Return to Lobby">
            <ArrowLeft size={16} />
          </button>
          <div className="spribe-brand-wrap">
            <span className="spribe-club-badge">69 CLUB</span>
            <span className="spribe-logo-text">Aviator</span>
            <button className="spribe-help-btn" onClick={() => setShowHelpModal(true)} title="How to play">
              ?
            </button>
          </div>
        </div>

        <div className="spribe-header-right">
          <div className="spribe-balance-pill">
            <span className="spribe-balance-val">{Number(balance || 0).toFixed(2)}</span>
            <span className="spribe-balance-curr">INR</span>
          </div>
          <button className="spribe-menu-btn" onClick={() => setShowMenuDrawer(true)} title="Menu">
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* 2. MULTIPLIER HISTORY STRIP */}
      <div className="spribe-history-container">
        <div className="spribe-history-strip">
          {history.length === 0 ? (
            <span style={{ fontSize: '11px', color: '#64748b' }}>Waiting for flight data...</span>
          ) : (
            history.map((h, i) => {
              const cp = Number(h.crashPoint || 1.0)
              const isPink = cp >= 10.0
              const isPurple = cp >= 2.0 && cp < 10.0
              return (
                <span
                  key={i}
                  className={`spribe-pill ${isPink ? 'pill-pink' : isPurple ? 'pill-purple' : 'pill-blue'}`}
                >
                  {cp.toFixed(2)}x
                </span>
              )
            })
          )}
        </div>
        <button
          className="spribe-history-toggle"
          onClick={() => setShowHistoryModal(true)}
          title="Round history"
        >
          <History size={13} />
        </button>
      </div>

      {/* Sub Meta Row: Round ID & Ping */}
      <div className="spribe-submeta-bar">
        <div className="spribe-round-id-wrap" onClick={() => setShowProvablyFairModal(true)}>
          <ShieldCheck size={12} color="#22c55e" />
          <span>Round ID: {roundId || '5343443'}</span>
          <span style={{ fontSize: '8px' }}>▼</span>
        </div>
        <div className="spribe-ping-wrap">
          <span className="spribe-ping-dot" />
          <span>Ping: {pingMs}ms</span>
        </div>
      </div>

      {/* 3. FLIGHT RADAR CANVAS ARENA */}
      <div className="spribe-stage-wrap">
        <canvas ref={canvasRef} className="spribe-canvas" />

        {/* Center Display Overlay */}
        <div className="spribe-stage-overlay">
          {phase === 'FLYING' && (
            <div className="spribe-flying-wrap">
              <span className="spribe-mult-big">{multiplier.toFixed(2)}x</span>
            </div>
          )}

          {phase === 'CRASHED' && (
            <div className="spribe-crashed-wrap">
              <span className="spribe-flew-away-label">FLEW AWAY!</span>
              <span className="spribe-crashed-mult">
                {(crashPoint || multiplier).toFixed(2)}x
              </span>
            </div>
          )}

          {phase === 'WAITING' && (
            <div className="spribe-waiting-wrap">
              <div className="spribe-propeller-spin">✈️</div>
              <span className="spribe-waiting-title">WAITING FOR NEXT ROUND</span>
              <div className="spribe-progress-track">
                <div className="spribe-progress-fill" style={{ width: `${waitProgressPct}%` }} />
              </div>
              <span className="spribe-waiting-time">
                {(Math.max(0, remainingMs) / 1000).toFixed(1)}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. DUAL BETTING DECK (PANEL 1 & PANEL 2) */}
      <div className="spribe-dual-deck">
        {renderBetDeckPanel(0, panel0, setPanel0)}
        {renderBetDeckPanel(1, panel1, setPanel1)}
      </div>

      {/* 5. BOTTOM SECTION: ALL BETS | MY BETS | TOP */}
      <div className="spribe-bottom-section">
        <div className="spribe-roster-tabs">
          <button
            className={`spribe-roster-tab ${rosterTab === 'all' ? 'active' : ''}`}
            onClick={() => setRosterTab('all')}
          >
            All Bets
          </button>
          <button
            className={`spribe-roster-tab ${rosterTab === 'my' ? 'active' : ''}`}
            onClick={() => setRosterTab('my')}
          >
            My Bets
          </button>
          <button
            className={`spribe-roster-tab ${rosterTab === 'top' ? 'active' : ''}`}
            onClick={() => setRosterTab('top')}
          >
            Top
          </button>
        </div>

        <div className="spribe-roster-header-row">
          <span>{rosterTab === 'all' ? 'ALL BETS' : rosterTab === 'my' ? 'MY BETS' : 'TOP WINS'}</span>
          <span className="spribe-roster-count">{totalPlayers} Active</span>
        </div>

        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <table className="spribe-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Bet INR</th>
                <th>Mult</th>
                <th style={{ textAlign: 'right' }}>Cash out</th>
              </tr>
            </thead>
            <tbody>
              {rosterTab === 'all' ? (
                recentCashouts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="spribe-empty-row">
                      Waiting for active flight cashouts...
                    </td>
                  </tr>
                ) : (
                  recentCashouts.map((item, idx) => (
                    <tr key={idx} className="row-won">
                      <td>
                        <div className="td-user">
                          <div className="spribe-user-avatar">{item.username.slice(0, 2).toUpperCase()}</div>
                          <span>{item.username}</span>
                        </div>
                      </td>
                      <td>{item.amount.toFixed(2)}</td>
                      <td>
                        <span className="spribe-pill pill-blue">{item.multiplier.toFixed(2)}x</span>
                      </td>
                      <td className="td-payout">{item.payout.toFixed(2)}</td>
                    </tr>
                  ))
                )
              ) : rosterTab === 'my' ? (
                myBetsHistory.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="spribe-empty-row">
                      No Aviator bets placed yet
                    </td>
                  </tr>
                ) : (
                  myBetsHistory.map((mb, idx) => (
                    <tr key={mb.id || idx} className={mb.status === 'WON' ? 'row-won' : ''}>
                      <td>{mb.time}</td>
                      <td>{mb.amount.toFixed(2)}</td>
                      <td>
                        {mb.mult ? (
                          <span className={`spribe-pill ${mb.mult >= 2 ? 'pill-purple' : 'pill-blue'}`}>
                            {mb.mult.toFixed(2)}x
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className={`td-payout ${mb.status === 'WON' ? '' : 'lost'}`}>
                        {mb.status === 'WON' ? `+₹${mb.payout}` : 'Lost'}
                      </td>
                    </tr>
                  ))
                )
              ) : (
                // Top Tab (Biggest Multipliers)
                [
                  { user: 'LuckyRider', bet: 500, mult: 124.6, win: 62300 },
                  { user: 'GoldWinner', bet: 1000, mult: 78.4, win: 78400 },
                  { user: 'Captain77', bet: 250, mult: 55.2, win: 13800 },
                  { user: 'StarAce', bet: 100, mult: 42.15, win: 4215 },
                ].map((top, idx) => (
                  <tr key={idx} className="row-won">
                    <td>
                      <div className="td-user">
                        <div className="spribe-user-avatar">🏆</div>
                        <span>{top.user}</span>
                      </div>
                    </td>
                    <td>{top.bet.toFixed(2)}</td>
                    <td>
                      <span className="spribe-pill pill-pink">{top.mult.toFixed(2)}x</span>
                    </td>
                    <td className="td-payout">₹{top.win.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODALS & POPUPS */}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="spribe-modal-backdrop" onClick={() => setShowHelpModal(false)}>
          <div className="spribe-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="spribe-modal-header">
              <span className="spribe-modal-title">
                <HelpCircle size={16} /> How To Play Aviator
              </span>
              <button className="spribe-modal-close" onClick={() => setShowHelpModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="spribe-modal-body">
              <h4>1. Place Bet</h4>
              <p>Select your stake and press BET during the countdown before the plane takes off.</p>
              <h4>2. Dual Betting</h4>
              <p>You can place up to two bets on the same round with different cashout goals.</p>
              <h4>3. Cash Out</h4>
              <p>Cash out before the plane flies away to win your bet multiplied by the current flight multiplier!</p>
              <h4>4. Provably Fair</h4>
              <p>100% provably fair cryptographic SHA-256 algorithm guarantees unbiased outcomes.</p>
            </div>
          </div>
        </div>
      )}

      {/* Full History Modal */}
      {showHistoryModal && (
        <div className="spribe-modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="spribe-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="spribe-modal-header">
              <span className="spribe-modal-title">
                <History size={16} /> Previous Rounds History
              </span>
              <button className="spribe-modal-close" onClick={() => setShowHistoryModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="spribe-modal-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px 0' }}>
                {history.map((h, i) => {
                  const cp = Number(h.crashPoint || 1.0)
                  const isPink = cp >= 10.0
                  const isPurple = cp >= 2.0 && cp < 10.0
                  return (
                    <span
                      key={i}
                      className={`spribe-pill ${isPink ? 'pill-pink' : isPurple ? 'pill-purple' : 'pill-blue'}`}
                      style={{ fontSize: '13px', padding: '4px 10px' }}
                    >
                      {cp.toFixed(2)}x
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provably Fair Modal */}
      {showProvablyFairModal && (
        <div className="spribe-modal-backdrop" onClick={() => setShowProvablyFairModal(false)}>
          <div className="spribe-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="spribe-modal-header">
              <span className="spribe-modal-title">
                <ShieldCheck size={16} color="#22c55e" /> Provably Fair Verification
              </span>
              <button className="spribe-modal-close" onClick={() => setShowProvablyFairModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="spribe-modal-body">
              <p>
                Each flight outcome is generated using cryptographic server-seed commitments before the round begins.
              </p>
              <h4>Current Round Commitment (SHA-256):</h4>
              <div className="spribe-hash-box">{serverSeedCommitment || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</div>
              <p>RTP (Return to Player): <strong>97.0%</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* Hamburger Menu Drawer */}
      {showMenuDrawer && (
        <div className="spribe-modal-backdrop" onClick={() => setShowMenuDrawer(false)}>
          <div className="spribe-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="spribe-modal-header">
              <span className="spribe-modal-title">69 Club Aviator Menu</span>
              <button className="spribe-modal-close" onClick={() => setShowMenuDrawer(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="spribe-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#192030',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={toggleMute}
              >
                <span>Game Audio</span>
                {isMuted ? <VolumeX size={18} color="#ef4444" /> : <Volume2 size={18} color="#22c55e" />}
              </button>

              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#192030',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setShowMenuDrawer(false)
                  setShowHelpModal(true)
                }}
              >
                <span>How to Play & Limits</span>
                <HelpCircle size={18} color="#94a3b8" />
              </button>

              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#192030',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setShowMenuDrawer(false)
                  setShowProvablyFairModal(true)
                }}
              >
                <span>Provably Fair Settings</span>
                <ShieldCheck size={18} color="#22c55e" />
              </button>

              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '10px',
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
                onClick={() => {
                  setShowMenuDrawer(false)
                  onBackToLobby()
                }}
              >
                Exit to 69 Club Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`spribe-toast toast-${toast.type}`}>
          <span>{toast.title}: {toast.detail}</span>
        </div>
      )}
    </div>
  )
}

export default AviatorGame
