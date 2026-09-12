import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Flame,
  History,
  Home,
  Info,
  Layers,
  Lock,
  Minus,
  Plus,
  PlusCircle,
  QrCode,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  User,
  UserCheck,
  UserPlus,
  Volume2,
  VolumeX,
  Wallet,
  X,
  Zap,
  Gift,
  ArrowDownCircle,
} from 'lucide-react'
import { DepositModal } from './components/DepositModal'
import { AuthModal } from './components/AuthModal'
import WithdrawModal from './components/WithdrawModal'
import {
  clearAuthToken,
  fetchCurrentRound,
  fetchUserBets,
  fetchWallet,
  placeBet as apiPlaceBet,
  resetWallet as apiResetWallet,
  claimDailyVIPBonus,
} from './api/client'
import { sound } from './utils/audio'

const GAME_LEVELS = [
  { id: 'PARITY', label: 'Parity', time: '30s', duration: 30, lock: 5 },
  { id: 'SAPRE', label: 'Sapre', time: '1m', duration: 60, lock: 10 },
  { id: 'BCONE', label: 'Bcone', time: '3m', duration: 180, lock: 30 },
  { id: 'EMERD', label: 'Emerd', time: '5m', duration: 300, lock: 45 },
]


const ROUND_SECONDS = 45
const LOCK_SECONDS = 8
const RESULT_SECONDS = 5
const STARTING_BALANCE = 1240
const STORAGE_KEY = 'prince-club-state-v2'

const COLOR_OPTIONS = [
  {
    id: 'green',
    label: 'Green',
    short: 'G',
    multiplier: 2.0,
    digits: '1, 3, 7, 9',
    bg: 'linear-gradient(135deg, #10b981, #059669)',
    colorCode: '#10b981',
  },
  {
    id: 'violet',
    label: 'Violet',
    short: 'V',
    multiplier: 4.5,
    digits: '0, 5',
    bg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    colorCode: '#8b5cf6',
  },
  {
    id: 'red',
    label: 'Red',
    short: 'R',
    multiplier: 2.0,
    digits: '2, 4, 6, 8',
    bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
    colorCode: '#ef4444',
  },
]

const NUMBER_OPTIONS = [
  { digit: 0, color: 'violet', dual: 'red' },
  { digit: 1, color: 'green' },
  { digit: 2, color: 'red' },
  { digit: 3, color: 'green' },
  { digit: 4, color: 'red' },
  { digit: 5, color: 'violet', dual: 'green' },
  { digit: 6, color: 'red' },
  { digit: 7, color: 'green' },
  { digit: 8, color: 'red' },
  { digit: 9, color: 'green' },
]

const PRESET_AMOUNTS = [10, 50, 100, 500, 1000]
const MULTIPLIERS = [1, 5, 10, 20]

const WINNER_TICKERS = [
  '🔥 Member 98***34 won ₹2,420 on Green!',
  '⚡ Instant UPI Deposits via PhonePe / GPay verified!',
  '🎉 Member 87***12 won ₹4,500 on Violet!',
  '💎 Member 91***88 won ₹9,000 on Number 7!',
  '🛡️ Verified Fair Algorithm - 45s Synchronized Rounds',
]

function outcomeFor(round) {
  const digit = Number((BigInt(round) * 37n + 17n) % 10n)
  let color = 'red'
  let multiplier = 2.0

  if (digit === 0 || digit === 5) {
    color = 'violet'
    multiplier = 4.5
  } else if (digit % 2 === 0) {
    color = 'red'
    multiplier = 2.0
  } else {
    color = 'green'
    multiplier = 2.0
  }

  return { round, digit, color, multiplier }
}

function formatCredits(val) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val)
}

function formatPeriod(round) {
  return `2026${String(round).slice(-6)}`
}

function initialSeedBets() {
  const r1 = outcomeFor(842180)
  const r2 = outcomeFor(842178)
  return [
    {
      id: 'bet-seed-1',
      round: 842180,
      selection: 'green',
      type: 'color',
      amount: 100,
      multiplier: 2.0,
      potentialReturn: 200,
      payout: 200,
      status: 'won',
      outcome: r1,
      createdAt: 'Just now',
    },
    {
      id: 'bet-seed-2',
      round: 842178,
      selection: '7',
      type: 'number',
      amount: 50,
      multiplier: 9.0,
      potentialReturn: 450,
      payout: 0,
      status: 'lost',
      outcome: r2,
      createdAt: '5 min ago',
    },
  ]
}

export function App() {
  // Navigation & Core State
  const [activeTab, setActiveTab] = useState('win') // 'win', 'trend', 'wallet', 'rules'
  const [activeSubTab, setActiveSubTab] = useState('record') // 'record', 'chart', 'mybets'
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(sound.isMuted)
  const [serverOnline, setServerOnline] = useState(false)

  // User & Wallet
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('prince_user_info')
      if (saved) return JSON.parse(saved)
    } catch {}
    return null
  })
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [selectedMode, setSelectedMode] = useState('PARITY') // 'PARITY' | 'SAPRE' | 'BCONE' | 'EMERD'
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [vipBonusLoading, setVipBonusLoading] = useState(false)

  const [userId, setUserId] = useState(() => {
    if (typeof window === 'undefined') return 'usr_dev01'
    const saved = localStorage.getItem('prince_user_id')
    if (saved) return saved
    const newId = 'usr_' + Math.random().toString(36).substring(2, 9)
    localStorage.setItem('prince_user_id', newId)
    return newId
  })

  const handleAuthSuccess = (user, wallet) => {
    setCurrentUser(user)
    if (user?.id) {
      localStorage.setItem('prince_user_id', user.id)
      localStorage.setItem('prince_user_info', JSON.stringify(user))
      setUserId(user.id)
    }
    if (wallet?.balance !== undefined) {
      setBalance(wallet.balance)
    }
    setToast({
      type: 'success',
      title: 'Welcome to Prince Club!',
      detail: `Signed in as ${user.username}. Balance: ₹${formatCredits(wallet?.balance || balance)}`,
    })
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('prince_user_info')
    clearAuthToken()
    const guestId = 'usr_' + Math.random().toString(36).substring(2, 9)
    localStorage.setItem('prince_user_id', guestId)
    setUserId(guestId)
    setToast({
      type: 'neutral',
      title: 'Signed Out',
      detail: 'Switched to guest player mode.',
    })
  }

  const handleClaimVIPBonus = async () => {
    setVipBonusLoading(true)
    try {
      const res = await claimDailyVIPBonus(currentUser?.id || userId)
      if (res?.newBalance !== undefined) {
        setBalance(res.newBalance)
      }
      sound.playWin()
      setToast({
        type: 'success',
        title: 'VIP Bonus Claimed!',
        detail: res.message || `+₹${res.bonusAmount} credited to your wallet!`,
      })
    } catch (err) {
      setToast({
        type: 'warning',
        title: 'VIP Check-In',
        detail: err.message || 'Already claimed today. Check back tomorrow!',
      })
    } finally {
      setVipBonusLoading(false)
    }
  }

  const [balance, setBalance] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Number.isFinite(parsed.balance)) return parsed.balance
      }
    } catch {}
    return STARTING_BALANCE
  })

  const [bets, setBets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed.bets)) return parsed.bets
      }
    } catch {}
    return initialSeedBets()
  })

  // Game Engine State
  const [roundNumber, setRoundNumber] = useState(842182)
  const [seconds, setSeconds] = useState(38)
  const [phase, setPhase] = useState('open') // 'open', 'locked', 'result'
  const [lastOutcome, setLastOutcome] = useState(null)
  const [history, setHistory] = useState(() =>
    Array.from({ length: 20 }, (_, i) => outcomeFor(842181 - i))
  )

  // Betting Sheet (Mobile Drawer) State
  const [betSheetOpen, setBetSheetOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState(null) // { type: 'color' | 'number' | 'size', val: 'green' | 5 | 'big', multiplier: 2 | 9 }
  const [baseAmount, setBaseAmount] = useState(10)
  const [betQuantity, setBetQuantity] = useState(1)
  const [agreeTerms, setAgreeTerms] = useState(true)

  // Toast & Notifications
  const [toast, setToast] = useState(null)
  const [tickerIndex, setTickerIndex] = useState(0)
  const betsRef = useRef(bets)

  const activeLevel = GAME_LEVELS.find((l) => l.id === selectedMode) || GAME_LEVELS[0]
  const isLocked = phase === 'locked' || (phase === 'open' && seconds <= activeLevel.lock)
  const totalBetAmount = baseAmount * betQuantity
  const potentialPayout = selectedTarget ? Math.round(totalBetAmount * selectedTarget.multiplier) : 0

  useEffect(() => {
    betsRef.current = bets
  }, [bets])

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ balance, bets }))
    } catch {}
  }, [balance, bets])

  // Winner notice ticker rotation
  useEffect(() => {
    const tInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % WINNER_TICKERS.length)
    }, 4000)
    return () => clearInterval(tInterval)
  }, [])

  // Auto clear toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3800)
    return () => clearTimeout(timer)
  }, [toast])

  // Backend Sync Initial & Periodic
  const syncWithBackend = useCallback(async () => {
    try {
      const data = await fetchCurrentRound(selectedMode)
      setServerOnline(true)
      if (data.roundNumber) {
        setRoundNumber(data.roundNumber)
        setSeconds((currSec) => {
          if (Math.abs(currSec - data.secondsRemaining) >= 2 || phase === 'result') {
            return data.secondsRemaining
          }
          return currSec
        })
        setPhase(data.isLocked ? 'locked' : 'open')
        if (Array.isArray(data.history) && data.history.length > 0) {
          const formatted = data.history.map((h) => ({
            round: h.roundNumber,
            digit: h.digit,
            color: h.color,
            size: h.size,
            multiplier: h.color === 'violet' ? 4.5 : 2.0,
          }))
          setHistory(formatted)
        }
      }
    } catch {
      setServerOnline(false)
    }

    // Authoritative Server Wallet Balance Sync
    try {
      const walData = await fetchWallet(userId)
      if (walData?.wallet?.balance !== undefined) {
        setBalance(Number(walData.wallet.balance))
      }
    } catch {}

    // Authoritative Server Bets Sync
    try {
      const betsData = await fetchUserBets(userId)
      if (Array.isArray(betsData?.bets) && betsData.bets.length > 0) {
        const formatted = betsData.bets.map((b) => ({
          id: b.id,
          round: Number(b.round_number),
          selection: String(b.selection),
          type: ['green', 'red', 'violet'].includes(String(b.selection).toLowerCase())
            ? 'color'
            : ['big', 'small'].includes(String(b.selection).toLowerCase())
            ? 'size'
            : 'number',
          amount: Number(b.amount),
          multiplier: Number(b.multiplier),
          potentialReturn: Math.round(Number(b.amount) * Number(b.multiplier)),
          payout: Number(b.payout || 0),
          status: String(b.status).toLowerCase(),
          outcome: b.outcome || null,
          createdAt: b.created_at ? new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        }))

        const hadWonBet = formatted.find(
          (nb) => nb.status === 'won' && betsRef.current.some((ob) => ob.id === nb.id && ob.status === 'pending')
        )
        if (hadWonBet) {
          sound.playWin()
          setToast({
            type: 'success',
            title: '🎉 Bet Won!',
            detail: `Period ${formatPeriod(hadWonBet.round)}: +₹${formatCredits(hadWonBet.payout)} credited to your wallet.`,
          })
        }

        setBets(formatted)
      }
    } catch {}
  }, [userId, phase, selectedMode])

  useEffect(() => {
    syncWithBackend()
    // Real-time server sync every 2.5 seconds
    const syncInt = setInterval(syncWithBackend, 2500)
    return () => clearInterval(syncInt)
  }, [syncWithBackend])

  // Sound toggle
  const toggleMute = () => {
    const next = sound.toggleMute()
    setIsMuted(next)
  }

  // Settle Round outcome
  const settleCurrentRound = useCallback(() => {
    const outcome = outcomeFor(roundNumber)
    setLastOutcome(outcome)
    setHistory((prev) => [outcome, ...prev.slice(0, 19)])

    const currentPending = betsRef.current.filter(
      (b) => b.status === 'pending' && b.round === roundNumber
    )

    if (currentPending.length === 0) {
      setToast({
        type: 'neutral',
        title: `Period ${formatPeriod(roundNumber)} Result`,
        detail: `Winning Number: ${outcome.digit} (${outcome.color.toUpperCase()}) - ${outcome.digit >= 5 ? 'BIG' : 'SMALL'}`,
      })
      return
    }

    let totalWinCredits = 0
    let hasWin = false

    setBets((prev) =>
      prev.map((b) => {
        if (b.status === 'pending' && b.round === roundNumber) {
          let won = false
          if (b.type === 'color' && b.selection === outcome.color) won = true
          if (b.type === 'number' && Number(b.selection) === outcome.digit) won = true
          if (b.type === 'size' && b.selection === (outcome.digit >= 5 ? 'big' : 'small')) won = true

          const payout = won ? Math.round(b.amount * b.multiplier) : 0
          if (won) {
            hasWin = true
            totalWinCredits += payout
          }
          return {
            ...b,
            status: won ? 'won' : 'lost',
            payout,
            outcome,
            settledAt: 'Just now',
          }
        }
        return b
      })
    )

    if (hasWin) {
      setBalance((curr) => curr + totalWinCredits)
      sound.playWin()
      setToast({
        type: 'success',
        title: '🎉 Congratulations! You Won!',
        detail: `Credited +₹${formatCredits(totalWinCredits)} to your wallet balance.`,
      })
    } else {
      setToast({
        type: 'loss',
        title: 'Round Closed',
        detail: `Result was ${outcome.digit} (${outcome.color.toUpperCase()}). Better luck next round!`,
      })
    }
  }, [roundNumber])

  // Timer Tick Engine
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prevSec) => {
        if (prevSec > 1) {
          const next = prevSec - 1
          if (next <= LOCK_SECONDS && phase === 'open') {
            setPhase('locked')
            setBetSheetOpen(false)
            sound.playLockTick()
          } else if (next <= 5 && next > 0) {
            sound.playTick()
          }
          return next
        }

        // Cycle phase
        if (phase === 'result') {
          setRoundNumber((r) => r + 1)
          setPhase('open')
          setLastOutcome(null)
          return ROUND_SECONDS
        }

        // Trigger result phase
        settleCurrentRound()
        setPhase('result')
        return RESULT_SECONDS
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, settleCurrentRound])

  // Open bet sheet
  const handleSelectTarget = (type, val, multiplier) => {
    if (isLocked) {
      setToast({
        type: 'warning',
        title: 'Round Locked',
        detail: 'Bets are closed for this period. Please wait for next round.',
      })
      return
    }
    setSelectedTarget({ type, val, multiplier })
    setBetSheetOpen(true)
  }

  // Confirm bet placement
  const handleConfirmBet = async () => {
    if (!selectedTarget) return
    if (totalBetAmount > balance) {
      setToast({
        type: 'loss',
        title: 'Insufficient Balance',
        detail: 'Please recharge your wallet or choose a smaller amount.',
      })
      return
    }

    const newBet = {
      id: `bet-${Date.now()}`,
      round: roundNumber,
      selection: String(selectedTarget.val),
      type: selectedTarget.type,
      amount: totalBetAmount,
      multiplier: selectedTarget.multiplier,
      potentialReturn: potentialPayout,
      payout: 0,
      status: 'pending',
      outcome: null,
      createdAt: 'Just now',
    }

    // Try backend placeBet
    try {
      if (serverOnline) {
        const res = await apiPlaceBet(userId, String(selectedTarget.val), totalBetAmount, selectedMode)
        if (res?.newBalance !== undefined) {
          setBalance(res.newBalance)
        } else {
          setBalance((curr) => curr - totalBetAmount)
        }
      } else {
        setBalance((curr) => curr - totalBetAmount)
      }

      setBets((prev) => [newBet, ...prev])
      setBetSheetOpen(false)
      sound.playBetPlaced()

      const targetLabel =
        selectedTarget.type === 'color'
          ? selectedTarget.val.toUpperCase()
          : selectedTarget.type === 'size'
          ? selectedTarget.val.toUpperCase()
          : 'Number ' + selectedTarget.val

      setToast({
        type: 'success',
        title: 'Bet Placed Successfully',
        detail: `₹${formatCredits(totalBetAmount)} on ${targetLabel} (${selectedMode})`,
      })
    } catch (err) {
      setToast({
        type: 'loss',
        title: 'Bet Rejected',
        detail: err.message || 'Server rejected bet. Please try again.',
      })
    }
  }

  // Handle wallet reset
  const handleResetCredits = async () => {
    try {
      await apiResetWallet(userId)
    } catch {}
    setBalance(STARTING_BALANCE)
    setBets([])
    setToast({
      type: 'neutral',
      title: 'Wallet Reset',
      detail: `Balance restored to ₹${formatCredits(STARTING_BALANCE)}.`,
    })
  }

  // Trend stats computation
  const stats = useMemo(() => {
    const recent = history.slice(0, 20)
    const greenCount = recent.filter((r) => r.color === 'green').length
    const redCount = recent.filter((r) => r.color === 'red').length
    const violetCount = recent.filter((r) => r.color === 'violet').length
    const total = recent.length || 1

    return {
      greenPercent: Math.round((greenCount / total) * 100),
      redPercent: Math.round((redCount / total) * 100),
      violetPercent: Math.round((violetCount / total) * 100),
      greenCount,
      redCount,
      violetCount,
    }
  }, [history])

  return (
    <div className="mobile-app-wrapper">
      <div className="mobile-app-container">
        {/* TOP STATUS BAR */}
        <header className="mobile-topbar">
          <div
            className="topbar-user"
            onClick={() => {
              setAuthMode('login')
              setAuthModalOpen(true)
            }}
            role="button"
            tabIndex={0}
            title={currentUser ? `Logged in as ${currentUser.username} (Tap to manage)` : 'Tap to Sign In / Sign Up'}
          >
            <div className="user-avatar">
              {currentUser ? <UserCheck size={14} className="avatar-icon" /> : <Sparkles size={14} className="avatar-icon" />}
            </div>
            <div className="user-meta">
              <span className="user-name">{currentUser ? currentUser.username : 'Prince VIP'}</span>
              <span className="user-id">{currentUser ? 'VIP Member' : 'Tap to Login'}</span>
            </div>
          </div>

          <div className="topbar-actions">
            {/* Live Server Indicator */}
            <div
              className={`server-indicator ${serverOnline ? 'online' : 'offline'}`}
              title={serverOnline ? 'Synced with Express & Supabase' : 'Offline Local Mode'}
            >
              <span className="status-dot" />
              <span className="indicator-label">{serverOnline ? 'Live' : 'Local'}</span>
            </div>

            {/* VIP Daily Check-In Bonus */}
            <button
              className="topbar-vip-btn"
              onClick={handleClaimVIPBonus}
              disabled={vipBonusLoading}
              title="Claim Daily VIP Bonus (₹15-₹50)"
            >
              <Gift size={13} className="text-amber" />
              <span>VIP ₹</span>
            </button>

            {/* Audio Mute Toggle */}
            <button
              className="topbar-icon-btn"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
              title={isMuted ? 'Unmute sound' : 'Mute sound'}
            >
              {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            {/* Balance Card Chip */}
            <div
              className="topbar-balance-chip"
              onClick={() => setActiveTab('wallet')}
              role="button"
              tabIndex={0}
            >
              <Wallet size={14} className="balance-icon" />
              <span className="balance-val">₹{formatCredits(balance)}</span>
              <button
                className="chip-plus-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  setDepositModalOpen(true)
                }}
                title="Quick UPI Deposit"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </header>

        {/* WINNER TICKER MARQUEE */}
        <div className="mobile-ticker">
          <Bell size={13} className="ticker-bell" />
          <div className="ticker-content" key={tickerIndex}>
            <span>{WINNER_TICKERS[tickerIndex]}</span>
          </div>
          <ShieldCheck size={14} className="ticker-shield" />
        </div>

        {/* MAIN BODY BASED ON ACTIVE TAB */}
        <main className="mobile-main">
          {activeTab === 'win' && (
            <div className="win-view-content">
              {/* GAME LEVEL / MODE SELECTOR TABS */}
              <div className="mode-selector-bar">
                {GAME_LEVELS.map((m) => (
                  <button
                    key={m.id}
                    className={`mode-tab-btn ${selectedMode === m.id ? 'active' : ''}`}
                    onClick={() => setSelectedMode(m.id)}
                  >
                    <span className="mode-tab-title">{m.label}</span>
                    <span className="mode-tab-badge">{m.time}</span>
                  </button>
                ))}
              </div>

              {/* GAME STAGE & TIMER CARD */}
              <div className={`game-stage-card ${isLocked ? 'is-locked' : ''}`}>
                <div className="stage-topline">
                  <div className="period-box">
                    <span className="period-label">Period ({activeLevel.label})</span>
                    <strong className="period-num">{formatPeriod(roundNumber)}</strong>
                  </div>
                  <div className={`status-badge-chip ${isLocked ? 'locked' : 'open'}`}>
                    {isLocked ? <Lock size={12} /> : <Clock size={12} />}
                    <span>{phase === 'result' ? 'Drawing' : isLocked ? 'Locked' : 'Open'}</span>
                  </div>
                </div>

                <div className="stage-clock-area">
                  <div className="clock-countdown-unit">
                    <span className="clock-caption">
                      {phase === 'result'
                        ? 'Round Outcome'
                        : isLocked
                        ? 'Selections Closing'
                        : 'Count Down'}
                    </span>
                    <div className="clock-digits">
                      {phase === 'result' && lastOutcome ? (
                        <div className={`result-reveal-pill pill-${lastOutcome.color}`}>
                          <span className="digit">{lastOutcome.digit}</span>
                          <span className="label">{lastOutcome.color.toUpperCase()}</span>
                        </div>
                      ) : (
                        <div className="digital-timer">
                          <span className="time-block">0</span>
                          <span className="time-block">0</span>
                          <span className="time-sep">:</span>
                          <span className={`time-block ${seconds <= activeLevel.lock ? 'urgent' : ''}`}>
                            {String(seconds).padStart(2, '0')[0]}
                          </span>
                          <span className={`time-block ${seconds <= activeLevel.lock ? 'urgent' : ''}`}>
                            {String(seconds).padStart(2, '0')[1]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Color Indicators */}
                  <div className="stage-balls">
                    <span className="stage-dot dot-green" />
                    <span className="stage-dot dot-violet" />
                    <span className="stage-dot dot-red" />
                  </div>
                </div>

                {isLocked && phase !== 'result' && (
                  <div className="stage-lock-notice">
                    <Lock size={13} />
                    <span>Locked! Preparing next result...</span>
                  </div>
                )}
              </div>

              {/* PRIMARY 3 COLOR ACTION BUTTONS */}
              <div className="color-action-buttons">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    className={`color-btn btn-${c.id}`}
                    disabled={isLocked}
                    onClick={() => handleSelectTarget('color', c.id, c.multiplier)}
                  >
                    <span className="btn-label">{c.label}</span>
                    <span className="btn-multiplier">{c.multiplier.toFixed(1)}x</span>
                  </button>
                ))}
              </div>

              {/* BIG / SMALL PREDICTION BUTTONS */}
              <div className="size-action-buttons">
                <button
                  className="size-btn btn-big"
                  disabled={isLocked}
                  onClick={() => handleSelectTarget('size', 'big', 2.0)}
                >
                  <span className="btn-label">Big (5-9)</span>
                  <span className="btn-multiplier">2.0x</span>
                </button>
                <button
                  className="size-btn btn-small"
                  disabled={isLocked}
                  onClick={() => handleSelectTarget('size', 'small', 2.0)}
                >
                  <span className="btn-label">Small (0-4)</span>
                  <span className="btn-multiplier">2.0x</span>
                </button>
              </div>

              {/* NUMBER SELECTION GRID (0-9) */}
              <div className="number-grid-card">
                <div className="card-subtitle">Select Number (9.0x Payout)</div>
                <div className="digits-flex-grid">
                  {NUMBER_OPTIONS.map((num) => {
                    const isDual = num.dual
                    return (
                      <button
                        key={num.digit}
                        className={`digit-btn digit-${num.color} ${isDual ? `dual-${num.dual}` : ''}`}
                        disabled={isLocked}
                        onClick={() => handleSelectTarget('number', num.digit, 9.0)}
                      >
                        <span className="digit-val">{num.digit}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* SUB-TABS: RECORD / CHART / MY BETS */}
              <div className="game-subtabs">
                <button
                  className={`subtab-btn ${activeSubTab === 'record' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('record')}
                >
                  <History size={14} /> Game Record
                </button>
                <button
                  className={`subtab-btn ${activeSubTab === 'chart' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('chart')}
                >
                  <TrendingUp size={14} /> Trend Parity
                </button>
                <button
                  className={`subtab-btn ${activeSubTab === 'mybets' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('mybets')}
                >
                  <Layers size={14} /> My Bets ({bets.length})
                </button>
              </div>

              {/* SUBTAB 1: GAME RECORDS */}
              {activeSubTab === 'record' && (
                <div className="subtab-content">
                  <div className="records-table-wrap">
                    <table className="records-table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Number</th>
                          <th>Size</th>
                          <th>Color</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, 10).map((h) => (
                          <tr key={h.round}>
                            <td className="mono">{formatPeriod(h.round)}</td>
                            <td>
                              <span className={`num-badge badge-${h.color}`}>{h.digit}</span>
                            </td>
                            <td>
                              <span className={`size-tag ${h.digit >= 5 ? 'big' : 'small'}`}>
                                {h.digit >= 5 ? 'Big' : 'Small'}
                              </span>
                            </td>
                            <td>
                              <div className="color-dots-group">
                                <span className={`mini-dot dot-${h.color}`} />
                                {(h.digit === 0 || h.digit === 5) && (
                                  <span
                                    className={`mini-dot dot-${h.digit === 0 ? 'red' : 'green'}`}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: TREND PARITY */}
              {activeSubTab === 'chart' && (
                <div className="subtab-content">
                  {/* Statistics Summary */}
                  <div className="trend-stats-bar">
                    <div className="stat-pill">
                      <span className="stat-label">Green</span>
                      <strong className="stat-val text-green">{stats.greenPercent}%</strong>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-label">Red</span>
                      <strong className="stat-val text-red">{stats.redPercent}%</strong>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-label">Violet</span>
                      <strong className="stat-val text-violet">{stats.violetPercent}%</strong>
                    </div>
                  </div>

                  {/* Trend Bead Matrix */}
                  <div className="trend-matrix">
                    <div className="matrix-title">Recent 20 Draws Roadmap</div>
                    <div className="matrix-beads">
                      {history.slice(0, 20).map((h) => (
                        <div
                          key={h.round}
                          className={`matrix-bead bead-${h.color}`}
                          title={`Period: ${formatPeriod(h.round)} | Digit: ${h.digit}`}
                        >
                          <span>{h.digit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: MY BETS */}
              {activeSubTab === 'mybets' && (
                <div className="subtab-content">
                  {bets.length === 0 ? (
                    <div className="empty-state-card">
                      <Layers size={32} className="empty-icon" />
                      <p>No bets placed yet. Pick a color or number to start!</p>
                    </div>
                  ) : (
                    <div className="bets-list">
                      {bets.map((b) => (
                        <div key={b.id} className={`bet-card-item status-${b.status}`}>
                          <div className="bet-card-header">
                            <div>
                              <span className="bet-period">{formatPeriod(b.round)}</span>
                              <span className="bet-target">
                                {b.type === 'color' ? b.selection.toUpperCase() : `Number ${b.selection}`}
                              </span>
                            </div>
                            <span className={`bet-badge ${b.status}`}>
                              {b.status === 'won'
                                ? `+₹${formatCredits(b.payout)}`
                                : b.status === 'lost'
                                ? 'Failed'
                                : 'Waiting'}
                            </span>
                          </div>
                          <div className="bet-card-details">
                            <span>Amount: ₹{formatCredits(b.amount)}</span>
                            <span>Multiplier: {b.multiplier}x</span>
                            <span>Return: ₹{formatCredits(b.potentialReturn)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FULL TREND VIEW */}
          {activeTab === 'trend' && (
            <div className="tab-view-container">
              <div className="view-title-header">
                <h2>Parity & Statistics</h2>
                <p>Real-time statistical trend analysis</p>
              </div>

              <div className="trend-hero-card">
                <div className="hero-stat-row">
                  <div className="hero-stat">
                    <span className="stat-dot dot-green" />
                    <span>Green ({stats.greenCount})</span>
                    <strong>{stats.greenPercent}%</strong>
                  </div>
                  <div className="hero-stat">
                    <span className="stat-dot dot-red" />
                    <span>Red ({stats.redCount})</span>
                    <strong>{stats.redPercent}%</strong>
                  </div>
                  <div className="hero-stat">
                    <span className="stat-dot dot-violet" />
                    <span>Violet ({stats.violetCount})</span>
                    <strong>{stats.violetPercent}%</strong>
                  </div>
                </div>

                <div className="trend-progress-track">
                  <div
                    className="prog-seg green"
                    style={{ width: `${stats.greenPercent}%` }}
                  />
                  <div
                    className="prog-seg red"
                    style={{ width: `${stats.redPercent}%` }}
                  />
                  <div
                    className="prog-seg violet"
                    style={{ width: `${stats.violetPercent}%` }}
                  />
                </div>
              </div>

              <div className="records-table-wrap" style={{ marginTop: '14px' }}>
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Digit</th>
                      <th>Parity</th>
                      <th>Color</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.round}>
                        <td className="mono">{formatPeriod(h.round)}</td>
                        <td>
                          <span className={`num-badge badge-${h.color}`}>{h.digit}</span>
                        </td>
                        <td>{h.digit % 2 === 0 ? 'Even' : 'Odd'}</td>
                        <td>
                          <span className={`tag-color tag-${h.color}`}>
                            {h.color.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: WALLET VIEW */}
          {activeTab === 'wallet' && (
            <div className="tab-view-container">
              <div className="view-title-header">
                <h2>Wallet Balance</h2>
                <p>UPI Instant Recharge & Balance Management</p>
              </div>

              {/* Wallet Main Card */}
              <div className="wallet-hero-glass">
                <span className="hero-eyebrow">Available Balance</span>
                <div className="hero-balance-sum">
                  <span className="currency">₹</span>
                  <strong>{formatCredits(balance)}</strong>
                </div>
                <div className="hero-chip-id">
                  <span>User ID: {userId}</span>
                  <span className="badge-verified">Verified</span>
                </div>

                <div className="wallet-hero-actions">
                  <button
                    className="wallet-btn deposit-btn"
                    onClick={() => setDepositModalOpen(true)}
                  >
                    <QrCode size={16} /> Deposit
                  </button>
                  <button
                    className="wallet-btn withdraw-btn"
                    onClick={() => setWithdrawModalOpen(true)}
                  >
                    <ArrowDownCircle size={16} /> Withdraw
                  </button>
                  <button
                    className="wallet-btn reset-btn"
                    onClick={handleResetCredits}
                  >
                    <RotateCcw size={16} /> Reset
                  </button>
                </div>
              </div>

              {/* Wallet Features Grid */}
              <div className="wallet-feature-list">
                <div
                  className="wallet-feature-row"
                  onClick={() => setDepositModalOpen(true)}
                >
                  <div className="feature-icon deposit-icon">
                    <PlusCircle size={18} />
                  </div>
                  <div className="feature-info">
                    <strong>UPI Fast Deposit</strong>
                    <p>PhonePe, Google Pay, Paytm, BHIM with 12-digit UTR</p>
                  </div>
                  <ChevronRight size={16} className="arrow" />
                </div>

                <div
                  className="wallet-feature-row"
                  onClick={() => setWithdrawModalOpen(true)}
                >
                  <div className="feature-icon withdraw-icon">
                    <ArrowDownCircle size={18} />
                  </div>
                  <div className="feature-info">
                    <strong>Withdrawal Payouts</strong>
                    <p>Direct UPI VPA & IMPS Bank Account Transfers</p>
                  </div>
                  <ChevronRight size={16} className="arrow" />
                </div>

                <div className="wallet-feature-row">
                  <div className="feature-icon secure-icon">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="feature-info">
                    <strong>Atomic Ledger Verification</strong>
                    <p>Supabase database stored procedure approval</p>
                  </div>
                  <Check size={16} className="text-green" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RULES / PROFILE VIEW */}
          {activeTab === 'rules' && (
            <div className="tab-view-container">
              <div className="view-title-header">
                <h2>Game Rules</h2>
                <p>Prince Club Presale & Calculation Guide</p>
              </div>

              {/* Account Management Card */}
              <div className="rules-section-card" style={{ marginBottom: '14px' }}>
                <h3>Account & Security</h3>
                <p style={{ marginBottom: '12px' }}>
                  {currentUser
                    ? `Active Session: ${currentUser.username} (${currentUser.role || 'Member'})`
                    : 'Currently playing as Guest. Sign in or register an account to preserve your balance and betting records.'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className="preset-btn"
                    style={{ background: '#2563eb', color: '#fff', border: 'none' }}
                    onClick={() => {
                      setAuthMode('login')
                      setAuthModalOpen(true)
                    }}
                  >
                    {currentUser ? 'Switch Account' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    style={{ background: '#10b981', color: '#fff', border: 'none' }}
                    onClick={() => {
                      setAuthMode('signup')
                      setAuthModalOpen(true)
                    }}
                  >
                    Register / Sign Up
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => {
                      setAuthMode('forgot')
                      setAuthModalOpen(true)
                    }}
                  >
                    Forgot Password
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => {
                      setAuthMode('reset')
                      setAuthModalOpen(true)
                    }}
                  >
                    Reset Password
                  </button>
                </div>
                {currentUser && (
                  <button
                    type="button"
                    className="preset-btn"
                    style={{ marginTop: '8px', width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                    onClick={handleLogout}
                  >
                    Sign Out ({currentUser.username})
                  </button>
                )}
              </div>

              <div className="rules-section-card">
                <h3>1. Period Cycle</h3>
                <p>
                  Every round lasts <strong>45 seconds</strong>. Selections are open for the first 37 seconds.
                  The last <strong>8 seconds</strong> are locked for order matching and outcome draw.
                </p>

                <h3>2. Color Outcomes & Payouts</h3>
                <div className="rule-badge-list">
                  <div className="rule-badge-item">
                    <span className="badge-color bg-green">Green</span>
                    <span>Numbers 1, 3, 7, 9 · Returns <strong>2.0x</strong></span>
                  </div>
                  <div className="rule-badge-item">
                    <span className="badge-color bg-red">Red</span>
                    <span>Numbers 2, 4, 6, 8 · Returns <strong>2.0x</strong></span>
                  </div>
                  <div className="rule-badge-item">
                    <span className="badge-color bg-violet">Violet</span>
                    <span>Numbers 0, 5 · Returns <strong>4.5x</strong></span>
                  </div>
                  <div className="rule-badge-item">
                    <span className="badge-color bg-gold">Number</span>
                    <span>Direct number match 0–9 · Returns <strong>9.0x</strong></span>
                  </div>
                </div>

                <h3>3. Practice Simulator Notice</h3>
                <p>
                  This platform is a real-time mathematical trading simulation.
                  Virtual credits do not hold fiat cash value or represent legal gambling.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* BOTTOM SHEET BET MODAL */}
        {betSheetOpen && selectedTarget && (
          <div className="bottom-sheet-overlay" onClick={() => setBetSheetOpen(false)}>
            <div className="bottom-sheet-card" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-header">
                <div>
                  <h3 className="sheet-title">
                    Select {selectedTarget.type === 'color' ? selectedTarget.val.toUpperCase() : selectedTarget.type === 'size' ? selectedTarget.val.toUpperCase() : `Number ${selectedTarget.val}`}
                  </h3>
                  <span className="sheet-payout-tag">{selectedTarget.multiplier.toFixed(1)}x Potential Payout ({selectedMode})</span>
                </div>
                <button className="sheet-close-btn" onClick={() => setBetSheetOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              {/* Amount Presets */}
              <div className="sheet-row-label">Contract Amount</div>
              <div className="sheet-preset-chips">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    className={`preset-chip ${baseAmount === amt ? 'active' : ''}`}
                    onClick={() => setBaseAmount(amt)}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* Multiplier / Quantity Stepper */}
              <div className="sheet-row-label">Quantity Multiplier</div>
              <div className="sheet-stepper-row">
                <div className="stepper-controls">
                  <button
                    className="step-btn"
                    onClick={() => setBetQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="step-val">{betQuantity}</span>
                  <button
                    className="step-btn"
                    onClick={() => setBetQuantity((q) => q + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="multiplier-quick-chips">
                  {MULTIPLIERS.map((m) => (
                    <button
                      key={m}
                      className={`mult-chip ${betQuantity === m ? 'active' : ''}`}
                      onClick={() => setBetQuantity(m)}
                    >
                      {m}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Calculation & Terms */}
              <div className="sheet-summary-box">
                <div className="sum-row">
                  <span>Total Bet:</span>
                  <strong>₹{formatCredits(totalBetAmount)}</strong>
                </div>
                <div className="sum-row highlight">
                  <span>Potential Win:</span>
                  <strong>₹{formatCredits(potentialPayout)}</strong>
                </div>
              </div>

              <div
                className="sheet-terms-check"
                onClick={() => setAgreeTerms(!agreeTerms)}
              >
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span>I agree to the Presale Rule</span>
              </div>

              {/* Action Buttons */}
              <div className="sheet-action-btns">
                <button
                  className="sheet-cancel-btn"
                  onClick={() => setBetSheetOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="sheet-submit-btn"
                  disabled={!agreeTerms || totalBetAmount <= 0 || totalBetAmount > balance}
                  onClick={handleConfirmBet}
                >
                  {totalBetAmount > balance
                    ? 'Insufficient Balance'
                    : `Total ₹${formatCredits(totalBetAmount)} Confirm`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FIXED BOTTOM NAVIGATION BAR */}
        <nav className="mobile-bottom-nav">
          <button
            className={`nav-tab-item ${activeTab === 'win' ? 'active' : ''}`}
            onClick={() => setActiveTab('win')}
          >
            <Trophy size={20} />
            <span>Win</span>
          </button>
          <button
            className={`nav-tab-item ${activeTab === 'trend' ? 'active' : ''}`}
            onClick={() => setActiveTab('trend')}
          >
            <TrendingUp size={20} />
            <span>Trend</span>
          </button>
          <button
            className={`nav-tab-item ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => setActiveTab('wallet')}
          >
            <Wallet size={20} />
            <span>Wallet</span>
          </button>
          <button
            className={`nav-tab-item ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <CircleHelp size={20} />
            <span>Rules</span>
          </button>
        </nav>

        {/* UPI DEPOSIT MODAL */}
        <DepositModal
          isOpen={depositModalOpen}
          onClose={() => setDepositModalOpen(false)}
          userId={userId}
          onBalanceUpdated={(newBal) => setBalance(newBal)}
        />

        {/* WITHDRAW MODAL (UPI & BANK PAYOUTS) */}
        <WithdrawModal
          isOpen={withdrawModalOpen}
          onClose={() => setWithdrawModalOpen(false)}
          user={currentUser || { id: userId, username: 'Guest' }}
          walletBalance={balance}
          onWithdrawSuccess={(newBal) => {
            setBalance(newBal)
            sound.playWin()
            setToast({
              type: 'success',
              title: 'Withdrawal Submitted',
              detail: `Request placed. New balance: ₹${formatCredits(newBal)}`,
            })
          }}
        />

        {/* AUTH MODAL (LOGIN, SIGNUP, FORGOT, RESET) */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authMode}
        />

        {/* TOAST NOTIFICATION POPUP */}
        {toast && (
          <div className={`mobile-toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' ? (
                <Check size={16} />
              ) : toast.type === 'loss' ? (
                <ArrowDownRight size={16} />
              ) : (
                <Info size={16} />
              )}
            </div>
            <div className="toast-body">
              <strong>{toast.title}</strong>
              <p>{toast.detail}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
