import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  ArrowLeft,
  Bell,
  ShieldCheck,
  RefreshCw,
  Clock,
  BookOpen,
  History,
  TrendingUp,
  Layers,
  X,
  Minus,
  Plus,
  Check,
  Loader2,
  Gift,
  Headphones,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  fetchVeerIssue,
  fetchVeerHistory,
  placeBet as apiPlaceBet,
  claimDailyVIPBonus,
  fetchUserBets,
} from '../api/client'

// Mode Mapping
const SELECTED_TO_GAME_MODE = { PARITY: '30s', SAPRE: '1m', BCONE: '3m', EMERD: '5m' }
const GAME_MODE_TO_SELECTED = { '30s': 'PARITY', '1m': 'SAPRE', '3m': 'BCONE', '5m': 'EMERD' }

const LEVELS = {
  PARITY: { duration: 30, lock: 5, label: 'Win Go 30s' },
  SAPRE: { duration: 60, lock: 10, label: 'Win Go 1Min' },
  BCONE: { duration: 180, lock: 30, label: 'Win Go 3Min' },
  EMERD: { duration: 300, lock: 45, label: 'Win Go 5Min' },
}

const PRESET_AMOUNTS = [10, 100, 1000, 10000]
const MULTIPLIERS = [1, 5, 10, 20, 50, 100]

const NUMBER_OPTIONS = [
  { digit: 0, color: 'red', dual: 'violet' },
  { digit: 1, color: 'green' },
  { digit: 2, color: 'red' },
  { digit: 3, color: 'green' },
  { digit: 4, color: 'red' },
  { digit: 5, color: 'green', dual: 'violet' },
  { digit: 6, color: 'red' },
  { digit: 7, color: 'green' },
  { digit: 8, color: 'red' },
  { digit: 9, color: 'green' },
]

const WINNER_TICKERS = [
  'Member 98***76 won ₹4,900.00 in Win Go 30s',
  'Member 91***12 won ₹1,960.00 in Win Go 1Min',
  'Member 95***43 won ₹9,800.00 on Number 7',
  'Member 88***21 won ₹4,500.00 on Violet',
  'Member 97***89 won ₹19,600.00 in Win Go 3Min',
  'Member 99***34 won ₹980.00 on Big',
]

function formatPeriod(period, modeStr = '30s') {
  if (!period) return '—'
  const str = String(period)
  if (str.length <= 10) return str
  return str.slice(0, 8) + '...' + str.slice(-4)
}

function formatCredits(val) {
  const num = Number(val) || 0
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const WingoLotteryBall = React.memo(({ digit, size = 48, className = '', style = {} }) => {
  const d = Number(digit)
  const isDual0 = d === 0
  const isDual5 = d === 5
  const isGreen = [1, 3, 7, 9].includes(d)
  const isRed = [2, 4, 6, 8].includes(d)

  let digitColor = '#dc2626'
  if (isGreen) digitColor = '#16a34a'
  if (isDual0 || isDual5) digitColor = '#9333ea'

  let rimFill = 'url(#wball-rim-red)'
  if (isGreen) rimFill = 'url(#wball-rim-green)'
  else if (isDual0) rimFill = 'url(#wball-rim-dual0)'
  else if (isDual5) rimFill = 'url(#wball-rim-dual5)'

  let innerFill = 'url(#wball-inner-red)'
  if (isGreen) innerFill = 'url(#wball-inner-green)'
  else if (isDual0 || isDual5) innerFill = 'url(#wball-inner-violet)'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      className={`wingo-lottery-ball-svg ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.16))',
        flexShrink: 0,
        ...style,
      }}
    >
      <defs>
        <mask id="wball-notch-mask">
          <circle cx="30" cy="30" r="28" fill="#ffffff" />
          <circle cx="30" cy="2" r="4.8" fill="#000000" />
          <circle cx="58" cy="30" r="4.8" fill="#000000" />
          <circle cx="30" cy="58" r="4.8" fill="#000000" />
          <circle cx="2" cy="30" r="4.8" fill="#000000" />
        </mask>
        <radialGradient id="wball-rim-green" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="60%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#14532d" />
        </radialGradient>
        <radialGradient id="wball-rim-red" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="60%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </radialGradient>
        <linearGradient id="wball-rim-dual0" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="47%" stopColor="#ef4444" />
          <stop offset="53%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#6b21a8" />
        </linearGradient>
        <linearGradient id="wball-rim-dual5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="47%" stopColor="#16a34a" />
          <stop offset="53%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#6b21a8" />
        </linearGradient>
        <radialGradient id="wball-inner-green" cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </radialGradient>
        <radialGradient id="wball-inner-red" cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#fecaca" />
        </radialGradient>
        <radialGradient id="wball-inner-violet" cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e9d5ff" />
        </radialGradient>
        <linearGradient id="wball-specular" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="30" cy="30" r="28" fill={rimFill} mask="url(#wball-notch-mask)" />
      <circle cx="30" cy="30" r="27.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" mask="url(#wball-notch-mask)" />
      <circle cx="30" cy="30" r="18.5" fill={innerFill} stroke="rgba(0,0,0,0.08)" strokeWidth="0.8" />
      <ellipse cx="30" cy="21" rx="13" ry="6.5" fill="url(#wball-specular)" opacity="0.65" />
      <text x="30" y="32" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="900" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fill={digitColor}>
        {d}
      </text>
    </svg>
  )
})

export default function WingoGame({
  currentUser,
  userId,
  balance,
  bets: externalBets = [],
  onBetPlaced,
  onBalanceUpdate,
  onBackToLobby,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenAuth,
  setToast,
  sound,
  isMuted,
  toggleMute,
}) {
  const [selectedMode, setSelectedMode] = useState(() => localStorage.getItem('club69_selected_mode') || 'PARITY')
  const gameMode = SELECTED_TO_GAME_MODE[selectedMode] || '30s'
  const activeLevel = LEVELS[selectedMode] || LEVELS.PARITY

  // Engine state
  const [roundNumber, setRoundNumber] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [phase, setPhase] = useState('open')
  const [serverOnline, setServerOnline] = useState(false)
  const [history, setHistory] = useState([])
  const [tickerIndex, setTickerIndex] = useState(0)
  const [howToPlayOpen, setHowToPlayOpen] = useState(false)
  const [vipBonusLoading, setVipBonusLoading] = useState(false)

  // Bets state — initialize with external bets or persisted state
  const [bets, setBets] = useState(() => {
    if (Array.isArray(externalBets) && externalBets.length > 0) return externalBets
    try {
      const saved = localStorage.getItem('prince-club-state-v2')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed.bets)) return parsed.bets
      }
    } catch {}
    return []
  })
  const betsRef = useRef(bets)
  useEffect(() => {
    betsRef.current = bets
  }, [bets])

  // Sync external bets when updated by parent
  useEffect(() => {
    if (Array.isArray(externalBets) && externalBets.length > 0) {
      setBets((prev) => {
        const extIds = new Set(externalBets.map((b) => b.id))
        const localOnlyPending = prev.filter((b) => b.status === 'pending' && !extIds.has(b.id))
        return [...localOnlyPending, ...externalBets]
      })
    }
  }, [externalBets])

  // Fetch real-time bets directly from server
  const fetchMyBets = useCallback(async () => {
    if (!userId) return
    try {
      const data = await fetchUserBets(userId)
      if (data && Array.isArray(data.bets)) {
        const formatted = data.bets.map((b) => {
          const rawStatus = String(b.status || '').toLowerCase()
          const isWon = ['cashed_out', 'won'].includes(rawStatus) || Number(b.payout) > 0
          const isLost = ['lost'].includes(rawStatus)
          const normalizedStatus = isWon ? 'won' : isLost ? 'lost' : 'pending'
          const roundNum = String(b.round_number || b.round || b.issueNumber || '')

          return {
            id: b.id,
            gameMode: String(b.game_mode || b.mode || 'PARITY').toUpperCase(),
            round: roundNum,
            selection: String(b.selection || 'Manual'),
            type: ['green', 'red', 'violet'].includes(String(b.selection).toLowerCase())
              ? 'color'
              : ['big', 'small'].includes(String(b.selection).toLowerCase())
              ? 'size'
              : 'number',
            amount: Number(b.amount || 0),
            multiplier: Number(b.multiplier || b.mult || 1),
            potentialReturn: Math.round(Number(b.amount || 0) * Number(b.multiplier || b.mult || 1)),
            payout: Number(b.payout || 0),
            status: normalizedStatus,
            outcome: b.outcome || null,
            createdAt: b.created_at || b.placed_at
              ? new Date(b.created_at || b.placed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
              : 'Recently',
          }
        })
        setBets((prev) => {
          const serverIds = new Set(formatted.map((b) => b.id))
          const optimistic = prev.filter((b) => b.status === 'pending' && !serverIds.has(b.id))
          return [...optimistic, ...formatted]
        })
      }
    } catch {}
  }, [userId])

  useEffect(() => {
    fetchMyBets()
  }, [fetchMyBets])

  // Subtabs
  const [activeSubTab, setActiveSubTab] = useState('record')
  const [wingoBetModeFilter, setWingoBetModeFilter] = useState('ALL')

  // Betting Sheet (Drawer)
  const [betSheetOpen, setBetSheetOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [balanceUnit, setBalanceUnit] = useState(1)
  const [betQuantity, setBetQuantity] = useState(1)
  const [betMultiplier, setBetMultiplier] = useState(1)
  const [agreeTerms, setAgreeTerms] = useState(true)
  const [isPlacingBet, setIsPlacingBet] = useState(false)

  // Result popup modal
  const [resultModalData, setResultModalData] = useState(null)
  const [resultModalCountdown, setResultModalCountdown] = useState(3)
  const lastSettledIssueRef = useRef(null)

  // Rapid stepper hold refs & handlers for instantaneous +/-
  const holdTimerRef = useRef(null)
  const holdIntervalRef = useRef(null)

  const stopAdjust = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current)
    holdTimerRef.current = null
    holdIntervalRef.current = null
  }, [])

  const startAdjust = useCallback((delta) => {
    stopAdjust()
    setBetQuantity((q) => Math.max(1, q + delta))
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        setBetQuantity((q) => Math.max(1, q + delta))
      }, 70)
    }, 200)
  }, [stopAdjust])

  useEffect(() => {
    return () => stopAdjust()
  }, [stopAdjust])

  const isLocked = phase === 'locked' || seconds <= activeLevel.lock

  // Total bet & potential return (0.4% platform tax on bet amount)
  const WINGO_TAX_RATE = 0.004
  const totalBetAmount = balanceUnit * betQuantity * betMultiplier
  const taxAmount = Number((totalBetAmount * WINGO_TAX_RATE).toFixed(2))
  const effectiveBetAmount = totalBetAmount - taxAmount
  const potentialPayout = Number((effectiveBetAmount * (selectedTarget?.multiplier || 2.0)).toFixed(2))

  // Authentic 55Club target color & label mapping for bottom sheet (Orange/White Casino Palette)
  const targetThemeColor = useMemo(() => {
    if (!selectedTarget) return '#ff6b35'
    const sel = String(selectedTarget.val).toLowerCase()
    if (sel === 'green' || [1, 3, 7, 9].includes(Number(sel))) return '#10b981'
    if (sel === 'red' || [2, 4, 6, 8].includes(Number(sel))) return '#ef4444'
    if (sel === 'violet' || sel === '0' || sel === '5') return '#a855f7'
    return '#ff6b35' // Vibrant Orange for Big / Small
  }, [selectedTarget])

  const targetTitle = useMemo(() => {
    if (!selectedTarget) return ''
    if (selectedTarget.type === 'color') {
      return `Select ${selectedTarget.val.charAt(0).toUpperCase() + selectedTarget.val.slice(1)}`
    }
    if (selectedTarget.type === 'size') {
      return `Select ${selectedTarget.val}`
    }
    return `Select ${selectedTarget.val}`
  }, [selectedTarget])

  // Win Go My Bets isolation — robustly match any Win Go bet by mode or selection
  const wingoBets = useMemo(() => {
    const WINGO_MODES = new Set(['PARITY', 'SAPRE', 'BCONE', 'EMERD', 'WINGO'])
    const NON_WINGO_MODES = new Set(['AVIATOR', 'CRAZY_777', 'FORTUNE_GEMS', 'SUPER_ACE', 'MINES', 'DRAGON_TIGER'])
    return bets.filter((b) => {
      const m = String(b.gameMode || b.mode || '').toUpperCase()
      if (NON_WINGO_MODES.has(m)) return false
      const selStr = String(b.selection || '').toLowerCase()
      const isWingoTarget = ['green', 'red', 'violet', 'big', 'small'].includes(selStr) || /^\d$/.test(selStr)
      return WINGO_MODES.has(m) || m.includes('WINGO') || isWingoTarget
    })
  }, [bets])

  const displayedWingoBets = useMemo(() => {
    if (wingoBetModeFilter === 'ALL') return wingoBets
    return wingoBets.filter((b) => String(b.gameMode || '').toUpperCase() === wingoBetModeFilter)
  }, [wingoBets, wingoBetModeFilter])

  // Ticker marquee timer
  useEffect(() => {
    const tInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % WINNER_TICKERS.length)
    }, 4000)
    return () => clearInterval(tInterval)
  }, [])

  // Auto-countdown timer for Result Modal (3s auto shut off)
  useEffect(() => {
    if (!resultModalData) return
    if (resultModalCountdown <= 0) {
      setResultModalData(null)
      return
    }
    const timer = setTimeout(() => {
      setResultModalCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [resultModalData, resultModalCountdown])

  // Store selected mode in localStorage
  useEffect(() => {
    localStorage.setItem('club69_selected_mode', selectedMode)
  }, [selectedMode])

  // Backend Sync
  const selectedModeRef = useRef(selectedMode)
  useEffect(() => {
    selectedModeRef.current = selectedMode
  }, [selectedMode])

  const syncWithBackend = useCallback(async () => {
    const currentMode = selectedModeRef.current || selectedMode
    const typeId = currentMode === 'PARITY' ? 30 : currentMode === 'SAPRE' ? 1 : currentMode === 'BCONE' ? 2 : 3
    let synced = false

    try {
      const issueData = await fetchVeerIssue(typeId)
      if (issueData?.issueNumber) {
        setServerOnline(true)
        synced = true
        setRoundNumber(issueData.issueNumber)
        setSeconds((currSec) => {
          if (Math.abs(currSec - issueData.secondsRemaining) >= 2 || phase === 'result') {
            return issueData.secondsRemaining
          }
          return currSec
        })
        setPhase(issueData.isLocked ? 'locked' : 'open')
      }
    } catch {}

    try {
      const historyData = await fetchVeerHistory(typeId, 1)
      if (Array.isArray(historyData?.list) && historyData.list.length > 0) {
        const formatted = historyData.list.map((h) => ({
          round: h.issueNumber,
          digit: h.digit,
          color: h.color,
          rawColour: h.rawColour,
          size: h.size,
          premium: h.premium,
          multiplier: h.color === 'violet' ? 4.5 : 2.0,
        }))
        setHistory(formatted)

        if (formatted[0]) {
          const latestRound = formatted[0]
          if (
            lastSettledIssueRef.current &&
            lastSettledIssueRef.current !== latestRound.round
          ) {
            const userBets = betsRef.current.filter((b) => {
              if (!b.round) return false
              const bRound = String(b.round).trim()
              const lRound = String(latestRound.round).trim()
              return bRound === lRound || (bRound.length >= 8 && lRound.length >= 8 && (bRound.endsWith(lRound) || lRound.endsWith(bRound)))
            })

            // Only show settlement popup if user placed a bet in this completed round
            if (userBets.length > 0) {
              let isWon = false
              let totalPayout = 0

              for (const b of userBets) {
                if (b.status === 'won' || Number(b.payout) > 0) {
                  isWon = true
                  totalPayout += Number(b.payout || 0)
                } else {
                  const sel = String(b.selection || '').toLowerCase().trim()
                  const digit = Number(latestRound.digit)
                  const size = digit >= 5 ? 'big' : 'small'
                  let betWon = false
                  let mult = 2

                  if (sel === size) {
                    betWon = true
                    mult = 1.96
                  } else if (sel === String(digit)) {
                    betWon = true
                    mult = 9
                  } else if (sel === 'green') {
                    if ([1, 3, 7, 9].includes(digit)) {
                      betWon = true
                      mult = 2
                    } else if (digit === 5) {
                      betWon = true
                      mult = 1.5
                    }
                  } else if (sel === 'red') {
                    if ([2, 4, 6, 8].includes(digit)) {
                      betWon = true
                      mult = 2
                    } else if (digit === 0) {
                      betWon = true
                      mult = 1.5
                    }
                  } else if (sel === 'violet') {
                    if (digit === 0 || digit === 5) {
                      betWon = true
                      mult = 4.5
                    }
                  }

                  if (betWon) {
                    isWon = true
                    const effStake = Number(b.amount || 0) * (1 - 0.004)
                    totalPayout += Number((effStake * mult).toFixed(2))
                  }
                }
              }

              if (isWon && sound?.playWin) {
                sound.playWin()
              }

              setResultModalData({
                round: latestRound.round,
                digit: latestRound.digit,
                color: latestRound.color,
                size: latestRound.size || (Number(latestRound.digit) >= 5 ? 'Big' : 'Small'),
                isWon,
                hadBet: true,
                payout: totalPayout,
              })
              setResultModalCountdown(3)
            } else {
              setResultModalData(null)
            }
          }
          lastSettledIssueRef.current = latestRound.round
        }
      }
    } catch {}

    if (!synced) setServerOnline(false)
  }, [selectedMode, sound])

  // Periodic polling & timer
  useEffect(() => {
    syncWithBackend()
    const pollInterval = setInterval(syncWithBackend, 2500)
    return () => clearInterval(pollInterval)
  }, [syncWithBackend])

  // 1-second interval countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          syncWithBackend()
          return 0
        }
        if (prev <= 5 && sound?.playTick) {
          sound.playTick()
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [syncWithBackend, sound])

  // Statistics calculation for Trend Parity
  const stats = useMemo(() => {
    const total = history.length || 1
    const greenCount = history.filter((h) => h.color === 'green').length
    const redCount = history.filter((h) => h.color === 'red').length
    const violetCount = history.filter((h) => h.color === 'violet').length
    return {
      total,
      greenCount,
      redCount,
      violetCount,
      greenPercent: Math.round((greenCount / total) * 100),
      redPercent: Math.round((redCount / total) * 100),
      violetPercent: Math.round((violetCount / total) * 100),
    }
  }, [history])

  // Target selection handler
  const handleSelectTarget = (type, val, multiplier) => {
    if (isLocked) {
      setToast?.({
        type: 'warning',
        title: 'Round Locked',
        detail: 'Betting is locked for the final seconds of this round.',
      })
      return
    }
    sound?.playTick?.()
    setSelectedTarget({ type, val, multiplier })
    setBalanceUnit(1)
    setBetQuantity(1)
    setBetMultiplier(1)
    setAgreeTerms(true)
    setBetSheetOpen(true)
  }

  // Confirm bet placement
  const handleConfirmBet = async () => {
    if (!selectedTarget || isPlacingBet) return

    if (!currentUser) {
      setToast?.({
        type: 'warning',
        title: 'Login Required',
        detail: 'Please sign in to your 69 Club account to place bets.',
      })
      setBetSheetOpen(false)
      onOpenAuth?.()
      return
    }

    if (isLocked || seconds <= activeLevel.lock) {
      setToast?.({
        type: 'warning',
        title: 'Round Locked',
        detail: 'Betting has locked for this round. Please wait for the next round.',
      })
      setBetSheetOpen(false)
      return
    }

    if (!Number.isFinite(totalBetAmount) || totalBetAmount <= 0) {
      setToast?.({
        type: 'loss',
        title: 'Invalid Amount',
        detail: 'Please select a valid contract amount.',
      })
      return
    }

    if (totalBetAmount > balance) {
      setToast?.({
        type: 'loss',
        title: 'Insufficient Balance',
        detail: `Required ₹${formatCredits(totalBetAmount)}, but available balance is ₹${formatCredits(balance)}.`,
      })
      return
    }

    const newBet = {
      id: `bet-${Date.now()}`,
      round: roundNumber,
      gameMode: String(selectedMode || 'PARITY').toUpperCase(),
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

    setIsPlacingBet(true)
    try {
      const typeId = gameMode === '30s' ? 30 : gameMode === '1m' ? 1 : gameMode === '3m' ? 2 : 3
      if (serverOnline) {
        const res = await apiPlaceBet(userId, String(selectedTarget.val), totalBetAmount, {
          mode: selectedMode,
          issueNumber: String(roundNumber),
          typeId,
        })
        const confirmedId = res?.bet?.id || res?.betId || newBet.id
        const confirmedBet = {
          ...newBet,
          id: confirmedId,
          gameMode: String(selectedMode || 'PARITY').toUpperCase(),
        }
        setBets((prev) => [confirmedBet, ...prev.filter((b) => b.id !== confirmedId && b.id !== newBet.id)])
        onBetPlaced?.(confirmedBet)
        if (res?.newBalance !== undefined) {
          onBalanceUpdate?.(res.newBalance)
        }
      } else {
        onBalanceUpdate?.(balance - totalBetAmount)
        setBets((prev) => [newBet, ...prev])
        onBetPlaced?.(newBet)
      }

      setBetSheetOpen(false)
      sound?.playBetPlaced?.()

      const targetLabel =
        selectedTarget.type === 'color'
          ? selectedTarget.val.toUpperCase()
          : selectedTarget.type === 'size'
          ? selectedTarget.val.toUpperCase()
          : 'Number ' + selectedTarget.val

      setToast?.({
        type: 'success',
        title: 'Bet Placed Successfully',
        detail: `₹${formatCredits(totalBetAmount)} on ${targetLabel} (${selectedMode})`,
      })
    } catch (err) {
      setToast?.({
        type: 'loss',
        title: 'Bet Rejected',
        detail: err.message || 'Server rejected bet. Please try again.',
      })
    } finally {
      setIsPlacingBet(false)
    }
  }

  // Claim VIP bonus handler
  const handleClaimVIPBonus = async () => {
    if (!currentUser) {
      setToast?.({
        type: 'warning',
        title: 'Login Required',
        detail: 'Please sign in to claim your daily VIP bonus.',
      })
      onOpenAuth?.()
      return
    }
    setVipBonusLoading(true)
    try {
      const res = await claimDailyVIPBonus(currentUser.id)
      if (res?.bonus) {
        sound?.playWin?.()
        setToast?.({
          type: 'success',
          title: 'Daily VIP Bonus Claimed!',
          detail: `+₹${res.bonus.toFixed(2)} credited to your wallet balance.`,
        })
        if (res.newBalance !== undefined) {
          onBalanceUpdate?.(res.newBalance)
        }
      }
    } catch (err) {
      setToast?.({
        type: 'warning',
        title: 'VIP Bonus',
        detail: err.message || 'Daily VIP bonus already claimed today.',
      })
    } finally {
      setVipBonusLoading(false)
    }
  }

  return (
    <div className="wingo-arena-page">
      {/* 1. TOP HEADER */}
      <header className="raja-header">
        <button
          className="raja-circle-btn"
          onClick={onBackToLobby}
          title="Back to 69 Club Lobby"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="raja-brand">
          <span className="raja-crown">👑</span>
          <span className="raja-brand-name">WIN GO</span>
        </div>

        <div className="raja-header-actions">
          {/* VIP Bonus */}
          <button
            className="raja-circle-btn"
            onClick={handleClaimVIPBonus}
            disabled={vipBonusLoading}
            title="Claim Daily VIP Bonus (₹15-₹50)"
            style={{ color: '#f59e0b' }}
          >
            <Gift size={16} />
          </button>

          {/* Rules / Customer Service */}
          <button
            className="raja-circle-btn"
            onClick={() => setHowToPlayOpen(true)}
            title="Customer Support & Rules"
          >
            <Headphones size={18} />
          </button>

          {/* Audio Mute / Unmute */}
          <button
            className="raja-circle-btn"
            onClick={toggleMute}
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {/* 2. WINNER TICKER MARQUEE */}
      <div className="mobile-ticker">
        <Bell size={13} className="ticker-bell" />
        <div className="ticker-content" key={tickerIndex}>
          <span>{WINNER_TICKERS[tickerIndex]}</span>
        </div>
        <ShieldCheck size={14} className="ticker-shield" />
      </div>

      {/* 3. MAIN ARENA CONTENT */}
      <main className="mobile-main">
        <div className="win-view-content">
          {/* RAJALUCK HERO WALLET CARD */}
          <div className="raja-wallet-card">
            <div className="raja-wallet-header">
              <div className="raja-balance-row">
                <span className="raja-balance-num">{Number(balance || 0).toFixed(2)}</span>
                <button
                  className="raja-refresh-btn"
                  onClick={syncWithBackend}
                  title="Refresh balance"
                >
                  <RefreshCw size={17} />
                </button>
              </div>
              <div className="raja-wallet-subtitle">
                <span className="raja-wallet-icon">👛</span>
                <span>wallet balance</span>
              </div>
            </div>

            <div className="raja-wallet-actions">
              <button
                className="raja-btn-deposit"
                onClick={onOpenDeposit}
              >
                Deposit
              </button>
              <button
                className="raja-btn-withdraw"
                onClick={onOpenWithdraw}
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* WIN GO 4-TIME SELECTOR BAR */}
          <div className="raja-modes-bar">
            {[
              { id: '30s', top: 'WinGo', sub: '30sec' },
              { id: '1m', top: 'WinGo 1', sub: 'Min' },
              { id: '3m', top: 'WinGo 3', sub: 'Min' },
              { id: '5m', top: 'WinGo 5', sub: 'Min' },
            ].map((m) => {
              const isActive = gameMode === m.id
              return (
                <button
                  key={m.id}
                  className={`raja-mode-tab ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedMode(GAME_MODE_TO_SELECTED[m.id] || 'PARITY')
                    sound?.playTick?.()
                  }}
                >
                  <div className={`raja-clock-icon-wrap ${isActive ? 'active' : ''}`}>
                    <Clock size={20} />
                  </div>
                  <span className="raja-mode-title">{m.top}</span>
                  <span className="raja-mode-sub">{m.sub}</span>
                </button>
              )
            })}
          </div>

          {/* GAME STAGE & COUNTDOWN CARD (55CLUB TICKET STYLE) */}
          <div className="raja-countdown-card">
            {/* Left Section */}
            <div className="raja-cd-left">
              <button
                className="raja-howtoplay-btn"
                onClick={() => setHowToPlayOpen(true)}
              >
                <BookOpen size={12} /> How to play
              </button>
              <div className="raja-mode-active-text">
                {gameMode === '30s' ? 'WinGo 30sec' : gameMode === '1m' ? 'WinGo 1 Min' : gameMode === '3m' ? 'WinGo 3 Min' : 'WinGo 5 Min'}
              </div>
              <div className="raja-recent-balls">
                {history.slice(0, 5).map((h, i) => (
                  <WingoLotteryBall key={i} digit={h.digit} size={24} />
                ))}
              </div>
            </div>

            {/* Center Divider with notch */}
            <div className="raja-cd-divider" />

            {/* Right Section */}
            <div className="raja-cd-right">
              <div className="raja-cd-title">Time remaining</div>
              <div className="raja-timer-boxes">
                <span className="raja-tbox">{String(Math.floor(seconds / 60)).padStart(2, '0')[0]}</span>
                <span className="raja-tbox">{String(Math.floor(seconds / 60)).padStart(2, '0')[1]}</span>
                <span className="raja-tcolon">:</span>
                <span className="raja-tbox">{String(seconds % 60).padStart(2, '0')[0]}</span>
                <span className="raja-tbox">{String(seconds % 60).padStart(2, '0')[1]}</span>
              </div>
              <div className="raja-period-num">{roundNumber || '20260920100051597'}</div>
            </div>
          </div>

          {/* BETTING CONTROLS STAGE WITH GIANT RADAR COUNTDOWN OVERLAY */}
          <div className="wingo-betting-stage-wrapper">
            {(isLocked || seconds <= 5) && (
              <div className="wingo-countdown-overlay">
                <div className="wingo-countdown-disc">
                  <div className="wingo-disc-ring ring-outer" />
                  <div className="wingo-disc-ring ring-middle" />
                  <div className="wingo-disc-ring ring-inner" />

                  <div className="wingo-digit-cards-row">
                    <div className="wingo-digit-card">
                      <span className="wingo-digit-num">
                        {String(Math.max(0, seconds)).padStart(2, '0')[0]}
                      </span>
                    </div>
                    <span className="wingo-digit-colon">:</span>
                    <div className="wingo-digit-card">
                      <span className="wingo-digit-num">
                        {String(Math.max(0, seconds)).padStart(2, '0')[1]}
                      </span>
                    </div>
                  </div>

                  <div className="wingo-countdown-label">COUNTDOWN</div>
                </div>
              </div>
            )}

            {/* PRIMARY 3 COLOR ACTION BUTTONS */}
            <div className="raja-color-buttons">
              <button
                className="raja-color-btn raja-btn--green"
                disabled={isLocked}
                onClick={() => handleSelectTarget('color', 'green', 2.0)}
              >
                <span>Green</span>
              </button>
              <button
                className="raja-color-btn raja-btn--purple"
                disabled={isLocked}
                onClick={() => handleSelectTarget('color', 'violet', 4.5)}
              >
                <span>Violet</span>
              </button>
              <button
                className="raja-color-btn raja-btn--red"
                disabled={isLocked}
                onClick={() => handleSelectTarget('color', 'red', 2.0)}
              >
                <span>Red</span>
              </button>
            </div>

            {/* NUMBER LOTTERY BALLS (0-9) 2X5 GRID */}
            <div className="raja-numbers-card">
              <div className="raja-numbers-grid">
                {NUMBER_OPTIONS.map((num) => (
                  <button
                    key={num.digit}
                    type="button"
                    className={`raja-lottery-ball ball-${num.digit}`}
                    disabled={isLocked}
                    onClick={() => handleSelectTarget('number', num.digit, 9.0)}
                    aria-label={`Select number ${num.digit}`}
                  >
                    <WingoLotteryBall digit={num.digit} size={50} />
                  </button>
                ))}
              </div>
            </div>

            {/* BIG / SMALL SPLIT BUTTONS */}
            <div className="raja-bigsmall-bar">
              <button
                className="raja-bs-btn raja-btn--big"
                disabled={isLocked}
                onClick={() => handleSelectTarget('size', 'Big', 2.0)}
              >
                <span>Big</span>
              </button>
              <button
                className="raja-bs-btn raja-btn--small"
                disabled={isLocked}
                onClick={() => handleSelectTarget('size', 'Small', 2.0)}
              >
                <span>Small</span>
              </button>
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
              <Layers size={14} /> My Bets ({wingoBets.length})
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
                        <td className="records-digit-cell">
                          <WingoLotteryBall digit={h.digit} size={28} />
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

              <div className="trend-matrix">
                <div className="matrix-title">Recent 20 Draws Roadmap</div>
                <div className="matrix-beads">
                  {history.slice(0, 20).map((h) => (
                    <div
                      key={h.round}
                      className="matrix-bead-wrap"
                      title={`Period: ${formatPeriod(h.round)} | Digit: ${h.digit}`}
                    >
                      <WingoLotteryBall digit={h.digit} size={26} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 3: MY BETS (WIN GO EXCLUSIVE) */}
          {activeSubTab === 'mybets' && (
            <div className="subtab-content">
              {!currentUser ? (
                <div className="empty-state-card">
                  <Layers size={32} className="empty-icon" />
                  <p>Please log in to view your real-time bet history and live settlements.</p>
                  <button
                    className="empty-login-btn"
                    onClick={onOpenAuth}
                  >
                    Log in now
                  </button>
                </div>
              ) : wingoBets.length === 0 ? (
                <div className="empty-state-card">
                  <Layers size={32} className="empty-icon" />
                  <p>No Win Go bets placed yet. Pick a color, size, or number to start!</p>
                </div>
              ) : (
                <>
                  <div className="wingo-mybets-filters">
                    <button
                      className={`mybets-filter-chip ${wingoBetModeFilter === 'ALL' ? 'active' : ''}`}
                      onClick={() => setWingoBetModeFilter('ALL')}
                    >
                      All ({wingoBets.length})
                    </button>
                    <button
                      className={`mybets-filter-chip ${wingoBetModeFilter === 'PARITY' ? 'active' : ''}`}
                      onClick={() => setWingoBetModeFilter('PARITY')}
                    >
                      30s ({wingoBets.filter((b) => String(b.gameMode || '').toUpperCase() === 'PARITY').length})
                    </button>
                    <button
                      className={`mybets-filter-chip ${wingoBetModeFilter === 'SAPRE' ? 'active' : ''}`}
                      onClick={() => setWingoBetModeFilter('SAPRE')}
                    >
                      1Min ({wingoBets.filter((b) => String(b.gameMode || '').toUpperCase() === 'SAPRE').length})
                    </button>
                    <button
                      className={`mybets-filter-chip ${wingoBetModeFilter === 'BCONE' ? 'active' : ''}`}
                      onClick={() => setWingoBetModeFilter('BCONE')}
                    >
                      3Min ({wingoBets.filter((b) => String(b.gameMode || '').toUpperCase() === 'BCONE').length})
                    </button>
                    <button
                      className={`mybets-filter-chip ${wingoBetModeFilter === 'EMERD' ? 'active' : ''}`}
                      onClick={() => setWingoBetModeFilter('EMERD')}
                    >
                      5Min ({wingoBets.filter((b) => String(b.gameMode || '').toUpperCase() === 'EMERD').length})
                    </button>
                  </div>

                  {displayedWingoBets.length === 0 ? (
                    <div className="empty-state-card">
                      <Layers size={28} className="empty-icon" />
                      <p>No Win Go bets found for this timer period.</p>
                    </div>
                  ) : (
                    <div className="bets-list">
                      {displayedWingoBets.map((b) => {
                        const selStr = String(b.selection).toLowerCase()
                        const targetLabel =
                          b.type === 'color' || ['green', 'red', 'violet'].includes(selStr)
                            ? selStr.toUpperCase()
                            : b.type === 'size' || ['big', 'small'].includes(selStr)
                            ? selStr.toUpperCase()
                            : `Number ${b.selection}`

                        const targetColor =
                          selStr === 'green'
                            ? '#22c55e'
                            : selStr === 'red'
                            ? '#ef4444'
                            : selStr === 'violet'
                            ? '#a855f7'
                            : selStr === 'big'
                            ? '#f59e0b'
                            : selStr === 'small'
                            ? '#0ea5e9'
                            : '#64748b'

                        return (
                          <div key={b.id} className={`bet-card-item status-${b.status}`}>
                            <div className="bet-card-header">
                              <div>
                                <span className="bet-period">{b.gameMode || 'WINGO'} · {b.round && b.round !== 'undefined' ? formatPeriod(b.round) : 'Round record'}</span>
                                <span className="bet-target" style={{ color: targetColor }}>
                                  {targetLabel}
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
                              <span>{b.createdAt}</span>
                              <span>
                                {b.status === 'won'
                                  ? `Won: ₹${formatCredits(b.payout)}`
                                  : `Return: ₹${formatCredits(b.potentialReturn)}`}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 4. BOTTOM SHEET BETTING DRAWER (EXACT 55CLUB SCREENSHOT 2 REPLICA) */}
      {betSheetOpen && selectedTarget && (
        <div className="wingo-sheet-overlay-v2" onClick={() => setBetSheetOpen(false)}>
          <div className="wingo-sheet-card-v2" onClick={(e) => e.stopPropagation()}>
            {/* Header Banner with Target Theme Color & Downward Pointing Chevron */}
            <div
              className="wingo-sheet-header-v2"
              style={{ backgroundColor: targetThemeColor }}
            >
              <div className="wingo-sheet-modename">
                {gameMode === '30s' ? 'WinGo 30sec' : gameMode === '1m' ? 'WinGo 1 Min' : gameMode === '3m' ? 'WinGo 3 Min' : 'WinGo 5 Min'}
              </div>
              <div className="wingo-sheet-pill-card">
                {targetTitle}
              </div>
            </div>

            {/* Sheet Body Content */}
            <div className="wingo-sheet-body-v2">
              {/* Balance Row */}
              <div className="wingo-sheet-row">
                <span className="wingo-sheet-label">Balance</span>
                <div className="wingo-sheet-chips">
                  {[1, 10, 100, 1000].map((amt) => {
                    const isSelected = balanceUnit === amt
                    return (
                      <button
                        key={amt}
                        type="button"
                        className={`wingo-balance-chip ${isSelected ? 'active' : ''}`}
                        style={isSelected ? { backgroundColor: targetThemeColor, color: '#ffffff' } : {}}
                        onClick={() => setBalanceUnit(amt)}
                      >
                        {amt}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quantity Row */}
              <div className="wingo-sheet-row">
                <span className="wingo-sheet-label">Quantity</span>
                <div className="wingo-stepper-wrap">
                  <button
                    type="button"
                    className="wingo-step-square-btn"
                    style={{ backgroundColor: targetThemeColor }}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      startAdjust(-1)
                    }}
                    onPointerUp={stopAdjust}
                    onPointerLeave={stopAdjust}
                    onPointerCancel={stopAdjust}
                    onClick={(e) => e.preventDefault()}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} color="#ffffff" strokeWidth={3} />
                  </button>
                  <input
                    type="number"
                    className="wingo-stepper-input"
                    value={betQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      setBetQuantity(isNaN(val) || val < 1 ? 1 : Math.min(99999, val))
                    }}
                    aria-label="Bet quantity"
                  />
                  <button
                    type="button"
                    className="wingo-step-square-btn"
                    style={{ backgroundColor: targetThemeColor }}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      startAdjust(1)
                    }}
                    onPointerUp={stopAdjust}
                    onPointerLeave={stopAdjust}
                    onPointerCancel={stopAdjust}
                    onClick={(e) => e.preventDefault()}
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} color="#ffffff" strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Multiplier Quick Chips Row */}
              <div className="wingo-mult-chips-row">
                {[1, 5, 10, 20, 50, 100].map((m) => {
                  const isSelected = betMultiplier === m
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`wingo-mult-chip-v2 ${isSelected ? 'active' : ''}`}
                      style={isSelected ? { backgroundColor: targetThemeColor, color: '#ffffff' } : {}}
                      onClick={() => setBetMultiplier(m)}
                    >
                      X{m}
                    </button>
                  )
                })}
              </div>

              {/* Contract & 0.4% Tax Breakdown */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', padding: '6px 4px 2px', borderTop: '1px dashed #e2e8f0' }}>
                <span>Contract: ₹{totalBetAmount.toFixed(2)}</span>
                <span style={{ color: '#ea580c', fontWeight: 600 }}>Tax (0.4%): -₹{taxAmount.toFixed(2)}</span>
                <span>Delivery: ₹{effectiveBetAmount.toFixed(2)}</span>
              </div>

              {/* Pre-sale Rules Agreement Row */}
              <div
                className="wingo-terms-row-v2"
                onClick={() => setAgreeTerms(!agreeTerms)}
              >
                <div className={`wingo-check-circle ${agreeTerms ? 'checked' : ''}`}>
                  {agreeTerms && <Check size={11} color="#ffffff" strokeWidth={3.5} />}
                </div>
                <span className="wingo-terms-text">
                  I agree <span className="wingo-rules-red">《Pre-sale rules》</span>
                </span>
              </div>
            </div>

            {/* Placing Bet Animated Loading Spinner Overlay */}
            {isPlacingBet && (
              <div className="wingo-bet-loading-overlay">
                <div className="wingo-bet-spinner-card">
                  <div className="wingo-spinner-ring-anim">
                    <div className="wingo-spinner-dot" />
                  </div>
                  <span className="wingo-spinner-title">Placing Bet...</span>
                  <span className="wingo-spinner-desc">Confirming with official game server</span>
                </div>
              </div>
            )}

            {/* Bottom Action Buttons (Flush Side-by-Side) */}
            <div className="wingo-sheet-footer-v2">
              <button
                type="button"
                className="wingo-btn-cancel-v2"
                disabled={isPlacingBet}
                onClick={() => setBetSheetOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="wingo-btn-confirm-v2"
                style={{ backgroundColor: targetThemeColor }}
                disabled={isPlacingBet || !agreeTerms || totalBetAmount <= 0}
                onClick={handleConfirmBet}
              >
                {isPlacingBet ? (
                  <span className="wingo-btn-spinner-wrap">
                    <Loader2 size={18} className="spin-anim" />
                    <span>Placing Bet...</span>
                  </span>
                ) : (
                  `Total amount ₹${totalBetAmount.toFixed(2)}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ROUND SETTLEMENT POPUP (GOLDEN WIN / LOSS MODAL) */}
      {resultModalData && (
        <div className="wingo-result-modal-overlay" onClick={() => setResultModalData(null)}>
          <div
            className={`wingo-result-modal-card ${resultModalData.isWon ? 'won golden-theme' : 'lost'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {resultModalData.isWon && <div className="wingo-golden-rays" />}

            <div className={`wingo-result-crown-badge ${resultModalData.isWon ? 'won' : 'lost'}`}>
              {resultModalData.isWon ? '🏆' : '👑'}
            </div>

            <h3 className={`wingo-result-title ${resultModalData.isWon ? 'won' : 'lost'}`}>
              {resultModalData.isWon ? 'Congratulations' : 'Unfortunately'}
            </h3>

            <div className="wingo-result-section-label">LOTTERY RESULT</div>

            <div className="wingo-result-pills-row">
              <span className={`wingo-result-pill pill-${String(resultModalData.color || '').toLowerCase()}`}>
                {resultModalData.color}
              </span>
              <WingoLotteryBall digit={resultModalData.digit} size={56} />
              <span className={`wingo-result-pill pill-${String(resultModalData.size || '').toLowerCase()}`}>
                {resultModalData.size}
              </span>
            </div>

            <div className={`wingo-result-status-text ${resultModalData.isWon ? 'won' : 'lost'}`}>
              {resultModalData.isWon
                ? `Bonus: +₹${formatCredits(resultModalData.payout)}`
                : "Didn't win"}
            </div>

            <div className="wingo-result-issue-text">
              Win Go {gameMode === '30s' ? '30s' : gameMode === '1m' ? '1Minute' : gameMode === '3m' ? '3Minute' : '5Minute'} {resultModalData.round}
            </div>

            <button
              className={`wingo-result-autoclose-btn ${resultModalData.isWon ? 'won' : ''}`}
              onClick={() => setResultModalData(null)}
            >
              <span className="autoclose-check">✓</span>
              <span>{resultModalCountdown}s auto shut off</span>
            </button>

            <button
              className="wingo-result-close-x"
              onClick={() => setResultModalData(null)}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 6. HOW TO PLAY / RULES MODAL */}
      {howToPlayOpen && (
        <div className="modal-overlay" onClick={() => setHowToPlayOpen(false)}>
          <div className="modal-content info-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="dialog-title-group">
                <BookOpen size={20} className="dialog-title-icon" />
                <h3>Win Go Game Rules</h3>
              </div>
              <button className="icon-close-button" onClick={() => setHowToPlayOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="rules-scroll-area">
              <div className="rule-card">
                <h4>1. Period Cycle</h4>
                <p>
                  Every round lasts <strong>{activeLevel.duration} seconds</strong>. Betting opens for {activeLevel.duration - activeLevel.lock}s and locks for the final <strong>{activeLevel.lock} seconds</strong>.
                </p>
              </div>

              <div className="rule-card">
                <h4>2. Color Outcomes & Payouts</h4>
                <div className="rule-odds-row">
                  <span className="color-badge green">Green (1, 3, 7, 9)</span>
                  <strong>2.0x Payout</strong>
                </div>
                <div className="rule-odds-row">
                  <span className="color-badge red">Red (2, 4, 6, 8)</span>
                  <strong>2.0x Payout</strong>
                </div>
                <div className="rule-odds-row">
                  <span className="color-badge purple">Violet (0, 5)</span>
                  <strong>4.5x Payout</strong>
                </div>
              </div>

              <div className="rule-card">
                <h4>3. Numbers & Big/Small</h4>
                <div className="rule-odds-row">
                  <span>Direct Number (0–9)</span>
                  <strong>9.0x Payout</strong>
                </div>
                <div className="rule-odds-row">
                  <span>Big (5, 6, 7, 8, 9)</span>
                  <strong>1.96x Payout</strong>
                </div>
                <div className="rule-odds-row">
                  <span>Small (0, 1, 2, 3, 4)</span>
                  <strong>1.96x Payout</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="primary-action-btn" onClick={() => setHowToPlayOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
