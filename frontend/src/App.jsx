import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Flame,
  Headphones,
  History,
  Home,
  Info,
  Layers,
  Loader2,
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
  ArrowLeft,
} from 'lucide-react'
import { DepositModal } from './components/DepositModal'
import { AuthModal } from './components/AuthModal'
import { TransactionModal } from './components/TransactionModal'
import WithdrawModal from './components/WithdrawModal'

import HomeLobby from './components/HomeLobby'
import AviatorGame from './components/AviatorGame'
import K3Game from './components/K3Game'
import FiveDGame from './components/FiveDGame'
import TrxGame from './components/TrxGame'
import MinesGame from './components/MinesGame'
import DragonTigerGame from './components/DragonTigerGame'
import ThirdPartyGameModal from './components/ThirdPartyGameModal'
import FortuneWheelModal from './components/FortuneWheelModal'
import ActivityView from './components/ActivityView'
import PromotionView from './components/PromotionView'
import AccountView from './components/AccountView'
import { AdminDashboard } from './components/admin/AdminDashboard'
import GlobalLoadingSpinner from './components/GlobalLoadingSpinner'
import GameHistoryPage from './components/GameHistoryPage'
import { abortAllApiRequests } from './api/client.js'

import WalletPage from './components/pages/WalletPage'
import DepositPage from './components/pages/DepositPage'
import WithdrawPage from './components/pages/WithdrawPage'
import VIPPage from './components/pages/VIPPage'
import NotificationPage from './components/pages/NotificationPage'
import GiftsPage from './components/pages/GiftsPage'
import CouponsPage from './components/pages/CouponsPage'
import SecurityPage from './components/pages/SecurityPage'
import CustomerServicePage from './components/pages/CustomerServicePage'
import { initAntiInspect } from './utils/antiInspect'
import {
  clearAuthToken,
  getAuthToken,
  fetchCurrentRound,
  fetchUserBets,
  fetchVeerHistory,
  fetchVeerIssue,
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
  'Live results are shown only after provider verification.',
  'Your placed bets and wallet balance are synced from the server.',
  'Betting pauses automatically when a live round is unavailable.',
  'Check the Rules tab for market payout information.',
  'Never share your account password or OTP with anyone.',
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

function formatPeriod(round, mode = '30s') {
  if (!round) return ''
  const str = String(round)
  if (str.length >= 12) {
    return str
  }
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const modeCode = mode === '30s' ? '30' : mode === '1m' ? '01' : mode === '3m' ? '03' : '05'
  const seq = String(Math.abs(Number(round) || 1831) % 10000).padStart(4, '0')
  return `${yyyy}${mm}${dd}${modeCode}${seq}`
}



export function App() {
  // Navigation & Core State
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('club69_active_tab') || 'win') // 'win', 'trend', 'wallet', 'rules'
  const [activeSubTab, setActiveSubTab] = useState(() => localStorage.getItem('club69_active_subtab') || 'record') // 'record', 'chart', 'mybets'
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(sound.isMuted)
  const [serverOnline, setServerOnline] = useState(false)
  const [currentGame, setCurrentGame] = useState(() => localStorage.getItem('club69_current_game') || null) // null = lobby
  const [activeNav, setActiveNav] = useState(() => localStorage.getItem('club69_active_nav') || 'home')
  const [fortuneWheelOpen, setFortuneWheelOpen] = useState(false)
  const [activeThirdPartyGame, setActiveThirdPartyGame] = useState(null)

  // User & Wallet (Mandatory Authentication)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = getAuthToken()
      const saved = localStorage.getItem('club69_user_info') || localStorage.getItem('prince_user_info')
      if (token && saved) return JSON.parse(saved)
    } catch {}
    return null
  })
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [selectedMode, setSelectedMode] = useState(() => localStorage.getItem('club69_selected_mode') || 'PARITY') // 'PARITY' | 'SAPRE' | 'BCONE' | 'EMERD'
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)
  const [vipBonusLoading, setVipBonusLoading] = useState(false)
  const isAdminRoute = window.location.pathname === '/admin'
  const navigationReadyRef = useRef(false)
  const restoringHistoryRef = useRef(false)

  const closeTransientUi = useCallback(() => {
    setDepositModalOpen(false)
    setWithdrawModalOpen(false)
    setTransactionModalOpen(false)
    setFortuneWheelOpen(false)
    setActiveThirdPartyGame(null)
    setAuthModalOpen(false)
  }, [])

  useEffect(() => {
    const snapshot = () => ({
      activeTab,
      activeSubTab,
      selectedMode,
      activeNav,
      currentGame,
    })
    const current = snapshot()
    if (!window.history.state?.club69) {
      window.history.replaceState({ club69: true, ...current }, '', window.location.href)
    }
    navigationReadyRef.current = true

    const handlePopState = (event) => {
      abortAllApiRequests()
      closeTransientUi()
      const state = event.state?.club69 ? event.state : null
      if (!state) {
        setCurrentGame(null)
        setActiveNav('home')
        return
      }
      restoringHistoryRef.current = true
      setActiveTab(state.activeTab || 'win')
      setActiveSubTab(state.activeSubTab || 'record')
      setSelectedMode(state.selectedMode || 'PARITY')
      setActiveNav(state.activeNav || 'home')
      setCurrentGame(state.currentGame || null)
      queueMicrotask(() => { restoringHistoryRef.current = false })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [activeTab, activeSubTab, selectedMode, activeNav, currentGame, closeTransientUi])

  useEffect(() => {
    if (!navigationReadyRef.current || restoringHistoryRef.current) return
    const state = { club69: true, activeTab, activeSubTab, selectedMode, activeNav, currentGame }
    const previous = window.history.state
    if (previous?.club69 && JSON.stringify({ ...previous, club69: undefined }) === JSON.stringify({ ...state, club69: undefined })) return
    window.history.pushState(state, '', window.location.href)
  }, [activeTab, activeSubTab, selectedMode, activeNav, currentGame])

  useEffect(() => {
    localStorage.setItem('club69_active_tab', activeTab)
    localStorage.setItem('club69_active_subtab', activeSubTab)
    localStorage.setItem('club69_selected_mode', selectedMode)
    localStorage.setItem('club69_active_nav', activeNav)
    if (currentGame) localStorage.setItem('club69_current_game', currentGame)
    else localStorage.removeItem('club69_current_game')
  }, [activeTab, activeSubTab, selectedMode, activeNav, currentGame])

  // Global audio guard: strictly mute Web Audio synth whenever user is unauthenticated,
  // on auth screens, or outside an active game viewport
  useEffect(() => {
    const isGameActive = Boolean(
      currentUser &&
      !authModalOpen &&
      activeNav === 'home' &&
      currentGame !== null
    )
    sound.setGameActive(isGameActive)
  }, [currentUser, authModalOpen, activeNav, currentGame])

  const [userId, setUserId] = useState(() => {
    try {
      const token = getAuthToken()
      const saved = localStorage.getItem('club69_user_info') || localStorage.getItem('prince_user_info')
      if (token && saved) {
        const u = JSON.parse(saved)
        if (u?.id) return u.id
      }
    } catch {}
    return null
  })

  const handleAuthSuccess = (user, wallet) => {
    setCurrentUser(user)
    setBets([]) // clear any stale bets from previous session
    if (user?.id) {
      localStorage.setItem('club69_user_id', user.id)
      localStorage.setItem('club69_user_info', JSON.stringify(user))
      setUserId(user.id)
    }
    if (wallet?.balance !== undefined) {
      setBalance(wallet.balance)
    }
    setAuthModalOpen(false)
    setToast({
      type: 'success',
      title: 'Welcome to 69 Club!',
      detail: `Signed in as ${user.username || 'Member'}. Balance: ₹${formatCredits(wallet?.balance || balance)}`,
    })
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setUserId(null)
    setBets([]) // clear user bets on logout
    localStorage.removeItem('club69_user_info')
    localStorage.removeItem('club69_user_id')
    localStorage.removeItem('prince_user_info')
    localStorage.removeItem('prince_user_id')
    clearAuthToken()
    setCurrentGame(null)
    setActiveNav('home')
    setAuthModalOpen(false)
    setToast({
      type: 'neutral',
      title: 'Signed Out',
      detail: 'Please log in to access games and lobby.',
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

  // Bets state — starts empty for authenticated users; seed only for demo/guest mode
  const [bets, setBets] = useState(() => {
    try {
      const token = getAuthToken()
      const saved = localStorage.getItem(STORAGE_KEY)
      if (token && saved) {
        const parsed = JSON.parse(saved)
        // Only restore persisted bets if they belong to this session (not seed)
        if (Array.isArray(parsed.bets) && parsed.bets.some((b) => !b.id.startsWith('bet-seed'))) {
          return parsed.bets.filter((b) => !b.id.startsWith('bet-seed'))
        }
        return [] // fresh slate for authenticated users
      }
    } catch {}
    return [] // no fake seed bets shown to real users
  })

  // Game Engine State
  const [roundNumber, setRoundNumber] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [phase, setPhase] = useState('locked') // Server-authoritative only
  const [lastOutcome, setLastOutcome] = useState(null)
  const [history, setHistory] = useState([])

  // Betting Sheet (Mobile Drawer) State
  const [betSheetOpen, setBetSheetOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState(null) // { type: 'color' | 'number' | 'size', val: 'green' | 5 | 'big', multiplier: 2 | 9 }
  const [baseAmount, setBaseAmount] = useState(10)
  const [betQuantity, setBetQuantity] = useState(1)
  const [isPlacingBet, setIsPlacingBet] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(true)
  const [howToPlayOpen, setHowToPlayOpen] = useState(false)

  // Map selectedMode (PARITY/SAPRE/BCONE/EMERD) ↔ gameMode display string (30s/1m/3m/5m)
  // Single source of truth: selectedMode drives everything; gameMode is derived display alias
  const SELECTED_TO_GAME_MODE = { PARITY: '30s', SAPRE: '1m', BCONE: '3m', EMERD: '5m' }
  const GAME_MODE_TO_SELECTED = { '30s': 'PARITY', '1m': 'SAPRE', '3m': 'BCONE', '5m': 'EMERD' }
  const gameMode = SELECTED_TO_GAME_MODE[selectedMode] || '30s'

  // Toast & Notifications
  const [toast, setToast] = useState(null)
  const [tickerIndex, setTickerIndex] = useState(0)

  // Real User Notifications (Stored in localStorage, clean empty list by default in production)
  const [userNotifications, setUserNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem(`notifications_${currentUser?.id || 'guest'}`)
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  })

  useEffect(() => {
    try {
      localStorage.setItem(`notifications_${currentUser?.id || 'guest'}`, JSON.stringify(userNotifications))
    } catch {}
  }, [userNotifications, currentUser?.id])

  const unreadNotificationCount = userNotifications.filter((n) => n.unread).length

  const handleMarkAllNotificationsRead = () => {
    setUserNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const handleClearAllNotifications = () => {
    setUserNotifications([])
  }

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

  // 69 Club Security Shield: Anti-Inspect Engine
  useEffect(() => {
    initAntiInspect((msg) => {
      setToast({
        type: 'warning',
        title: 'Security Shield Active',
        detail: msg || 'Developer Tools & Inspect are disabled on 69 Club.',
      })
    })
  }, [])

  // Auto clear toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3800)
    return () => clearTimeout(timer)
  }, [toast])

  // Backend Sync Initial & Periodic with VeerGame
  // selectedModeRef is used inside the callback without being in deps, preventing
  // polling interval restarts on every mode switch.
  const selectedModeRef = useRef(selectedMode)
  useEffect(() => { selectedModeRef.current = selectedMode }, [selectedMode])

  const syncWithBackend = useCallback(async () => {
    const currentMode = selectedModeRef.current || selectedMode
    const typeId = currentMode === 'PARITY' ? 30 : currentMode === 'SAPRE' ? 1 : currentMode === 'BCONE' ? 2 : 3
    let synced = false

    // 1. Fetch live round issue from VeerGame proxy
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
        // Use server-provided lock state — already accounts for mode-specific lock window
        setPhase(issueData.isLocked ? 'locked' : 'open')
      }
    } catch {}

    // 2. Fetch live official draw history from VeerGame proxy
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
          setLastOutcome(formatted[0])
        }
      }
    } catch {}

    if (!synced) setServerOnline(false)

    // Authoritative Server Wallet Balance & Bets Sync
    if (userId && currentUser) {
      try {
        const walData = await fetchWallet(userId)
        if (walData?.wallet?.balance !== undefined) {
          setBalance(Number(walData.wallet.balance))
        }
      } catch (err) {
        if (err.message && (err.message.includes('401') || err.message.includes('Unauthorized') || err.message.includes('expired'))) {
          handleLogout()
        }
      }

      try {
        const betsData = await fetchUserBets(userId)
        // Always replace bets from server — even if empty (clears stale seed/local bets)
        if (betsData && Array.isArray(betsData.bets)) {
          const formatted = betsData.bets.map((b) => ({
            id: b.id,
            gameMode: String(b.game_mode || 'WINGO').toUpperCase(),
            round: String(b.round_number),
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
            createdAt: b.created_at
              ? new Date(b.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
              : 'Recently',
          }))

          // Merge optimistic pending bets that haven't landed on server yet
          const serverIds = new Set(formatted.map((b) => b.id))
          const optimisticPending = betsRef.current.filter(
            (b) => b.status === 'pending' && !serverIds.has(b.id) && !b.id.startsWith('bet-seed')
          )

          const merged = [...optimisticPending, ...formatted]

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

          setBets(merged)
        }
      } catch {}
    }
  }, [userId, currentUser])


  // Verify existing session on boot
  useEffect(() => {
    if (!currentUser || !userId) return
    let isCancelled = false

    async function verifyBootSession() {
      try {
        const walData = await fetchWallet(userId)
        if (!isCancelled && walData?.wallet?.balance !== undefined) {
          setBalance(Number(walData.wallet.balance))
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('[Session Boot Check]: Invalid session, returning to Auth Gate')
          handleLogout()
        }
      }
    }

    verifyBootSession()
    return () => {
      isCancelled = true
    }
  }, [])

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

  // Results and settlements are supplied by the live provider only.
  const settleCurrentRound = useCallback(() => {
    if (betsRef.current.length === 0) {
      console.log('[Win Go Debug] Period settled without user bets:', roundNumber)
    }
    return undefined
  }, [roundNumber])

  // Timer Tick Engine
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prevSec) => {
        if (prevSec > 1) {
          const next = prevSec - 1
          const isWinGoPlaying = Boolean(currentUser && !authModalOpen && activeNav === 'home' && currentGame === 'wingo')
          if (next <= LOCK_SECONDS && phase === 'open') {
            setPhase('locked')
            setBetSheetOpen(false)
            if (isWinGoPlaying) sound.playLockTick()
          } else if (next <= 5 && next > 0) {
            if (isWinGoPlaying) sound.playTick()
          }
          return next
        }

        // Wait for the provider sync instead of manufacturing the next round or result.
        setPhase('locked')
        return 0
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, settleCurrentRound, currentUser, authModalOpen, activeNav, currentGame])

  // Open bet sheet
  const handleSelectTarget = (type, val, multiplier) => {
    if (!currentUser) {
      console.log('[Win Go Bet Debug] Target clicked without login')
      setToast({
        type: 'warning',
        title: 'Login Required',
        detail: 'Please sign in to your 69 Club account to place bets.',
      })
      setAuthMode('login')
      setAuthModalOpen(true)
      return
    }

    if (isLocked || seconds <= activeLevel.lock) {
      console.log('[Win Go Bet Debug] Target clicked during lock period')
      setToast({
        type: 'warning',
        title: 'Round Locked',
        detail: 'Bets are closed for this period. Please wait for next round.',
      })
      return
    }

    sound.playTick()
    setSelectedTarget({ type, val, multiplier })
    setBetSheetOpen(true)
  }

  // Confirm bet placement
  const handleConfirmBet = async () => {
    if (!selectedTarget) return
    if (isPlacingBet) return

    if (!currentUser) {
      setToast({
        type: 'warning',
        title: 'Login Required',
        detail: 'Please sign in to your 69 Club account to place bets.',
      })
      setBetSheetOpen(false)
      setAuthMode('login')
      setAuthModalOpen(true)
      return
    }

    if (isLocked || seconds <= activeLevel.lock) {
      console.log('[Win Go Bet Debug] Confirm bet blocked: period locked')
      setToast({
        type: 'warning',
        title: 'Round Locked',
        detail: 'Betting has locked for this round. Please wait for next round.',
      })
      setBetSheetOpen(false)
      return
    }

    if (!Number.isFinite(totalBetAmount) || totalBetAmount <= 0) {
      setToast({
        type: 'loss',
        title: 'Invalid Amount',
        detail: 'Please select a valid contract amount.',
      })
      return
    }

    if (totalBetAmount > balance) {
      console.log('[Win Go Bet Debug] Insufficient balance:', { totalBetAmount, balance })
      setToast({
        type: 'loss',
        title: 'Insufficient Balance',
        detail: `Required ₹${formatCredits(totalBetAmount)}, but available balance is ₹${formatCredits(balance)}.`,
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

    console.log('[Win Go Bet Debug] Placing bet:', {
      user: currentUser?.username,
      round: roundNumber,
      target: selectedTarget,
      amount: totalBetAmount,
      balance,
    })

    setIsPlacingBet(true)
    // Try backend placeBet
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
        }
        setBets((prev) => [confirmedBet, ...prev.filter((b) => b.id !== confirmedId && b.id !== newBet.id)])
      } else {
        setBalance((curr) => curr - totalBetAmount)
        setBets((prev) => [newBet, ...prev])
      }

      setBetSheetOpen(false)
      sound.playBetPlaced()

      const targetLabel =
        selectedTarget.type === 'color'
          ? selectedTarget.val.toUpperCase()
          : selectedTarget.type === 'size'
          ? selectedTarget.val.toUpperCase()
          : 'Number ' + selectedTarget.val

      console.log('[Win Go Bet Debug] Bet confirmed successfully:', newBet)
      setToast({
        type: 'success',
        title: 'Bet Placed Successfully',
        detail: `₹${formatCredits(totalBetAmount)} on ${targetLabel} (${selectedMode})`,
      })
    } catch (err) {
      console.error('[Win Go Bet Debug] Bet placement error:', err)
      setToast({
        type: 'loss',
        title: 'Bet Rejected',
        detail: err.message || 'Server rejected bet. Please try again.',
      })
    } finally {
      setIsPlacingBet(false)
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

  const leaveAdminRoute = useCallback(() => {
    window.location.replace('/')
  }, [])

  if (isAdminRoute) {
    return (
      <AdminDashboard
        isOpen
        onClose={leaveAdminRoute}
        currentUser={currentUser}
        onUserUpdated={syncWithBackend}
        onAccessDenied={leaveAdminRoute}
      />
    )
  }

  // MANDATORY AUTHENTICATION GATE
  // Without logging in, users CANNOT enter Home Lobby, Games, or sensitive features.
  if (!currentUser) {
    return (
      <div className="mobile-app-wrapper">
        <div className="mobile-app-container auth-gate-wrapper">
          <AuthModal
            isOpen={true}
            canClose={false}
            onClose={() => {}}
            onAuthSuccess={handleAuthSuccess}
            initialMode={authMode || 'login'}
          />
          {toast && (
            <div className={`mobile-toast toast-${toast.type}`}>
              <div className="toast-icon">
                {toast.type === 'success' ? (
                  <Check size={16} />
                ) : toast.type === 'loss' ? (
                  <ArrowDownRight size={16} />
                ) : toast.type === 'warning' ? (
                  <AlertCircle size={16} />
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

  return (
    <div className="mobile-app-wrapper">
      <div className="mobile-app-container">
        {/* Universal Site Loading Spinner & Top Progress Bar */}
        <GlobalLoadingSpinner />

        {/* MAIN SCROLLABLE VIEWPORT */}
        <div className="app-main-viewport">
          {/* 1. Aviator Game Arena */}
          {currentGame === 'aviator' && (
            <AviatorGame
              userId={currentUser?.id || userId}
              balance={balance}
              onBalanceUpdate={(newBal) => setBalance(newBal)}
              onBackToLobby={() => setCurrentGame(null)}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}

          {/* 1b. K3 Lottery Arena */}
          {currentGame === 'k3' && (
            <K3Game
              userId={currentUser?.id || userId}
              balance={balance}
              onBalanceUpdate={(newBal) => setBalance(newBal)}
              onBackToLobby={() => setCurrentGame(null)}
              onOpenDeposit={() => setDepositModalOpen(true)}
              onOpenWithdraw={() => setWithdrawModalOpen(true)}
              setToast={setToast}
            />
          )}

          {/* 1c. 5D Lottery Arena */}
          {currentGame === '5d' && (
            <FiveDGame
              userId={currentUser?.id || userId}
              balance={balance}
              onBalanceUpdate={(newBal) => setBalance(newBal)}
              onBackToLobby={() => setCurrentGame(null)}
              onOpenDeposit={() => setDepositModalOpen(true)}
              onOpenWithdraw={() => setWithdrawModalOpen(true)}
              setToast={setToast}
            />
          )}

          {/* 1d. TRX Win Go Arena */}
          {currentGame === 'trx' && (
            <TrxGame
              userId={currentUser?.id || userId}
              balance={balance}
              onBalanceUpdate={(newBal) => setBalance(newBal)}
              onBackToLobby={() => setCurrentGame(null)}
              onOpenDeposit={() => setDepositModalOpen(true)}
              onOpenWithdraw={() => setWithdrawModalOpen(true)}
              setToast={setToast}
            />
          )}

          {/* 1e. Mines Game Arena */}
          {currentGame === 'mines' && (
            <MinesGame
              userId={currentUser?.id || userId}
              balance={balance}
              onBalanceUpdate={(newBal) => setBalance(newBal)}
              onBackToLobby={() => setCurrentGame(null)}
              setToast={setToast}
            />
          )}

          {/* 1f. Dragon vs Tiger Arena */}
          {currentGame === 'dragontiger' && (
            <DragonTigerGame
              userId={currentUser?.id || userId}
              balance={balance}
              onBalanceUpdate={(newBal) => setBalance(newBal)}
              onBackToLobby={() => setCurrentGame(null)}
              setToast={setToast}
            />
          )}

        {/* 2. PRINCE CLUB Main Pages */}
        {currentGame === null && activeNav === 'home' && (
          <HomeLobby
            balance={balance}
            onRefreshBalance={syncWithBackend}
            onOpenWithdraw={() => {
              setActiveNav('withdraw')
              sound.playTick()
            }}
            onOpenDeposit={() => {
              setActiveNav('deposit')
              sound.playTick()
            }}
            onOpenFortuneWheel={() => setFortuneWheelOpen(true)}
            onOpenVIP={() => {
              setActiveNav('vip')
              sound.playTick()
            }}
            onSelectGame={(gameId, modeId) => {
              if (modeId) setSelectedMode(modeId)
              setCurrentGame(gameId)
              sound.playTick()
            }}
            onLaunchThirdPartyGame={(game) => {
              setActiveThirdPartyGame(game)
              sound.playTick()
            }}
            onDownloadApp={() => {
              setToast({
                type: 'success',
                title: 'Official App APK',
                detail: '69 Club Android APK download started.',
              })
            }}
            onMessages={() => {
              setToast({
                type: 'neutral',
                title: 'System Notice',
                detail: 'All games, UPI payments & withdrawals are 100% operational.',
              })
            }}
            onAddToDesktop={() => {
              setToast({
                type: 'success',
                title: 'PWA Installed',
                detail: '69 Club shortcut successfully pinned to your screen.',
              })
            }}
          />
        )}

        {currentGame === null && activeNav === 'activity' && (
          <ActivityView
            onOpenFortuneWheel={() => setFortuneWheelOpen(true)}
            onClaimVIP={handleClaimVIPBonus}
            vipLoading={vipBonusLoading}
            onOpenDeposit={() => setDepositModalOpen(true)}
            onGoToPromotion={() => {
              setActiveNav('promotion')
              sound.playTick()
            }}
          />
        )}

        {currentGame === null && activeNav === 'promotion' && (
          <PromotionView
            userId={currentUser?.id || userId}
            onCopyNotification={(msg) => {
              setToast({
                type: 'success',
                title: 'Referral System',
                detail: msg,
              })
            }}
          />
        )}

        {currentGame === null && activeNav === 'account' && (
          <AccountView
            currentUser={currentUser}
            userId={currentUser?.id || userId}
            balance={balance}
            unreadNotificationCount={unreadNotificationCount}
            onRefreshBalance={syncWithBackend}
            onOpenWallet={() => {
              setActiveNav('wallet')
              sound.playTick()
            }}
            onOpenDeposit={() => {
              setActiveNav('deposit')
              sound.playTick()
            }}
            onOpenWithdraw={() => {
              setActiveNav('withdraw')
              sound.playTick()
            }}
            onOpenVIP={() => {
              setActiveNav('vip')
              sound.playTick()
            }}
            onOpenFortuneWheel={() => setFortuneWheelOpen(true)}
            onOpenRules={() => {
              setCurrentGame('wingo')
              setActiveTab('rules')
              sound.playTick()
            }}
            onOpenBets={() => {
              setCurrentGame(null)
              setActiveNav('game-history')
              sound.playTick()
            }}
            onOpenTransactions={() => {
              setTransactionModalOpen(true)
              sound.playTick()
            }}
            onOpenSupport={() => setHowToPlayOpen(true)}
            onOpenAdmin={() => window.location.assign('/admin')}
            onOpenNotification={() => {
              setActiveNav('notification')
              sound.playTick()
            }}
            onOpenGifts={() => {
              setActiveNav('gifts')
              sound.playTick()
            }}
            onOpenCoupons={() => {
              setActiveNav('coupons')
              sound.playTick()
            }}
            onOpenSecurity={() => {
              setActiveNav('security')
              sound.playTick()
            }}
            onOpenCustomerService={() => {
              setActiveNav('customerservice')
              sound.playTick()
            }}
            onOpenAuth={(mode) => {
              setAuthMode(mode)
              setAuthModalOpen(true)
            }}
            onLogout={handleLogout}
          />
        )}

        {currentGame === null && activeNav === 'game-history' && (
          <GameHistoryPage
            currentUser={currentUser}
            bets={bets}
            onRefresh={syncWithBackend}
            onBack={() => setActiveNav('account')}
            onLogin={() => {
              setAuthMode('login')
              setAuthModalOpen(true)
            }}
          />
        )}

        {/* 2e. Standalone Dedicated Wallet Page */}
        {currentGame === null && activeNav === 'wallet' && (
          <WalletPage
            currentUser={currentUser}
            balance={balance}
            onBack={() => {
              setActiveNav('account')
              sound.playTick()
            }}
            onNavigateDeposit={() => {
              setActiveNav('deposit')
              sound.playTick()
            }}
            onNavigateWithdraw={() => {
              setActiveNav('withdraw')
              sound.playTick()
            }}
            onRefreshBalance={syncWithBackend}
            onOpenTransactions={() => setTransactionModalOpen(true)}
          />
        )}

        {/* 2f. Standalone Dedicated Deposit Page */}
        {currentGame === null && activeNav === 'deposit' && (
          <DepositPage
            currentUser={currentUser}
            balance={balance}
            onBack={() => {
              setActiveNav('account')
              sound.playTick()
            }}
            onBalanceUpdated={(newBal) => {
              setBalance(newBal)
              syncWithBackend()
            }}
            onOpenHistory={() => setTransactionModalOpen(true)}
          />
        )}

        {/* 2g. Standalone Dedicated Withdraw Page */}
        {currentGame === null && activeNav === 'withdraw' && (
          <WithdrawPage
            currentUser={currentUser}
            balance={balance}
            onBack={() => {
              setActiveNav('account')
              sound.playTick()
            }}
            onWithdrawSuccess={(newBal) => {
              setBalance(newBal)
              syncWithBackend()
            }}
            onOpenHistory={() => setTransactionModalOpen(true)}
          />
        )}

        {/* 2h. Standalone Dedicated VIP Page */}
        {currentGame === null && activeNav === 'vip' && (
          <VIPPage
            currentUser={currentUser}
            balance={balance}
            onBack={() => {
              setActiveNav('account')
              sound.playTick()
            }}
            onClaimVIPBonus={handleClaimVIPBonus}
            vipLoading={vipBonusLoading}
          />
        )}

        {/* 2i. Standalone Dedicated Notification Page */}
        {currentGame === null && activeNav === 'notification' && (
          <NotificationPage
            notifications={userNotifications}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onClearAll={handleClearAllNotifications}
            onBack={() => {
              setActiveNav('account')
              sound.playTick()
            }}
          />
        )}

        {/* 2j. Standalone Dedicated Gifts Page */}
        {currentGame === null && activeNav === 'gifts' && (
          <GiftsPage
            balance={balance}
            onBack={() => {
              setActiveNav('account')
              sound.playTick()
            }}
            onRedeemGift={(amt) => {
              setBalance((b) => b + amt)
              syncWithBackend()
            }}
          />
        )}

        {/* 2k. Standalone Dedicated Coupons Page */}
        {currentGame === null && activeNav === 'coupons' && (
          <CouponsPage
            onBack={() => {
              setActiveNav('account')
              sound.playTick()
            }}
            onApplyCouponToDeposit={() => {
              setActiveNav('deposit')
              sound.playTick()
            }}
          />
        )}

        {/* 2l. Standalone Dedicated Security Page */}
        {currentGame === null && activeNav === 'security' && (
          <SecurityPage
            currentUser={currentUser}
            onBack={() => {
              setActiveNav('account')
              sound.playTick()
            }}
            onOpenChangePassword={() => {
              setAuthMode('forgot')
              setAuthModalOpen(true)
            }}
          />
        )}

        {/* 2m. Standalone Dedicated Customer Service Page */}
        {currentGame === null && activeNav === 'customerservice' && (
          <CustomerServicePage
            onBack={() => {
              setActiveNav('account')
              sound.playTick()
            }}
          />
        )}

        {/* 3. Win Go Game Arena */}
        {currentGame === 'wingo' && (
          <>
            <header className="raja-header">
              <button
                className="raja-circle-btn"
                onClick={() => {
                  setCurrentGame(null)
                  setActiveNav('home')
                }}
                title="Back to 69 Club Lobby"
              >
                <ArrowLeft size={20} />
              </button>
              
              <div className="raja-brand">
                <span className="raja-crown">👑</span>
                <span className="raja-brand-name">WIN GO</span>
              </div>

          <div className="raja-header-actions">
            {/* Live Server Indicator */}
            <div
              className={`server-indicator ${serverOnline ? 'online' : 'offline'}`}
              title={serverOnline ? 'Synced with Express & Supabase' : 'Offline Local Mode'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                marginRight: 4,
                background: serverOnline ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${serverOnline ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: 12,
                padding: '2px 8px',
              }}
            >
              <span className="status-dot" style={{ background: serverOnline ? '#22c55e' : '#ef4444' }} />
              <span
                className="indicator-label"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: serverOnline ? '#16a34a' : '#dc2626',
                }}
              >
                {serverOnline ? 'Live' : 'Local'}
              </span>
            </div>

            {/* VIP Daily Check-In Bonus */}
            <button
              className="raja-circle-btn"
              onClick={handleClaimVIPBonus}
              disabled={vipBonusLoading}
              title="Claim Daily VIP Bonus (₹15-₹50)"
              style={{ color: '#f59e0b' }}
            >
              <Gift size={16} />
            </button>
            <button
              className="raja-circle-btn"
              onClick={() => setHowToPlayOpen(true)}
              title="Customer Support & Rules"
            >
              <Headphones size={18} />
            </button>
            <button
              className="raja-circle-btn"
              onClick={toggleMute}
              title={isMuted ? "Unmute sound" : "Mute sound"}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
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

        {/* WIN GO IN-GAME SUBNAV TABS */}
        <div className="wingo-subnav-bar">
          <button
            className={`wingo-subnav-pill ${activeTab === 'win' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('win')
              sound.playTick()
            }}
          >
            🎮 Game
          </button>
          <button
            className={`wingo-subnav-pill ${activeTab === 'trend' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('trend')
              sound.playTick()
            }}
          >
            📊 Trend
          </button>
          <button
            className={`wingo-subnav-pill ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('wallet')
              sound.playTick()
            }}
          >
            👛 Wallet
          </button>
          <button
            className={`wingo-subnav-pill ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('rules')
              sound.playTick()
            }}
          >
            📜 Rules
          </button>
        </div>

        {/* MAIN BODY BASED ON ACTIVE TAB */}
        <main className="mobile-main">
          {activeTab === 'win' && (
            <div className="win-view-content">
              {/* RAJALUCK HERO WALLET CARD */}
              <div className="raja-wallet-card">
                <div className="raja-wallet-header">
                  <div className="raja-balance-row">
                    <span className="raja-balance-num">{balance.toFixed(2)}</span>
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
                    className="raja-btn-withdraw"
                    onClick={() => setWithdrawModalOpen(true)}
                  >
                    Withdraw
                  </button>
                  <button
                    className="raja-btn-deposit"
                    onClick={() => setDepositModalOpen(true)}
                  >
                    Deposit
                  </button>
                </div>
              </div>

              {/* WIN GO 4-TIME SELECTOR BAR */}
              <div className="raja-modes-bar">
                {[
                  { id: '30s', top: 'Win Go', sub: '30s' },
                  { id: '1m', top: 'Win Go', sub: '1Min' },
                  { id: '3m', top: 'Win Go', sub: '3Min' },
                  { id: '5m', top: 'Win Go', sub: '5Min' },
                ].map((m) => {
                  const isActive = gameMode === m.id
                  return (
                    <button
                      key={m.id}
                      className={`raja-mode-tab ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedMode(GAME_MODE_TO_SELECTED[m.id] || 'PARITY')
                        sound.playTick()
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

              {/* GAME STAGE & COUNTDOWN CARD */}
              <div className="raja-countdown-card">
                {/* Left Section */}
                <div className="raja-cd-left">
                  <button
                    className="raja-howtoplay-btn"
                    onClick={() => setHowToPlayOpen(true)}
                  >
                    <BookOpen size={13} /> How to play
                  </button>
                  <div className="raja-mode-active-text">
                    {gameMode === '30s' ? 'Win Go 30s' : gameMode === '1m' ? 'Win Go 1Min' : gameMode === '3m' ? 'Win Go 3Min' : 'Win Go 5Min'}
                  </div>
                  <div className="raja-recent-balls">
                    {history.slice(0, 5).map((h, i) => {
                      const isDual0 = Number(h.digit) === 0
                      const isDual5 = Number(h.digit) === 5
                      const ballClass = isDual0
                        ? 'raja-ball-mini raja-ball-mini--dual-0'
                        : isDual5
                        ? 'raja-ball-mini raja-ball-mini--dual-5'
                        : `raja-ball-mini raja-ball-mini--${h.color}`
                      return (
                        <div key={i} className={ballClass}>
                          <span>{h.digit}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Center Divider with notch */}
                <div className="raja-cd-divider" />

                {/* Right Section */}
                <div className="raja-cd-right">
                  <div className="raja-cd-title">time of purchase</div>
                  <div className="raja-timer-boxes">
                    <span className="raja-tbox">{String(Math.floor(seconds / 60)).padStart(2, '0')[0]}</span>
                    <span className="raja-tbox">{String(Math.floor(seconds / 60)).padStart(2, '0')[1]}</span>
                    <span className="raja-tcolon">:</span>
                    <span className={`raja-tbox ${seconds <= 8 ? 'urgent' : ''}`}>{String(seconds % 60).padStart(2, '0')[0]}</span>
                    <span className={`raja-tbox ${seconds <= 8 ? 'urgent' : ''}`}>{String(seconds % 60).padStart(2, '0')[1]}</span>
                  </div>
                  <div className="raja-period-num">{formatPeriod(roundNumber, gameMode)}</div>
                </div>
              </div>

              <section className="wingo-bet-guide" aria-label="How to place a Win Go bet">
                <span className="wingo-guide-step"><strong>1</strong> Choose stake</span>
                <span className="wingo-guide-arrow">→</span>
                <span className="wingo-guide-step"><strong>2</strong> Pick a market</span>
                <span className="wingo-guide-arrow">→</span>
                <span className="wingo-guide-step"><strong>3</strong> Confirm</span>
              </section>

              <section className="wingo-stake-picker" aria-label="Quick stake selection">
                <div className="wingo-section-heading">
                  <span>Choose your stake</span>
                  <strong>₹{baseAmount} per ticket</strong>
                </div>
                <div className="wingo-stake-options">
                  {PRESET_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className={`wingo-stake-option ${baseAmount === amount ? 'active' : ''}`}
                      onClick={() => setBaseAmount(amount)}
                    >
                      ₹{amount}
                    </button>
                  ))}
                  <label className="wingo-custom-stake">
                    <span>Custom</span>
                    <span className="wingo-custom-input-wrap">
                      <span>₹</span>
                      <input
                        type="number"
                        min="10"
                        max="50000"
                        step="1"
                        inputMode="numeric"
                        value={baseAmount || ''}
                        onChange={(event) => {
                          const value = event.target.value
                          setBaseAmount(value === '' ? 0 : Math.min(50000, Math.max(0, Math.floor(Number(value)))))
                        }}
                        aria-label="Custom stake amount"
                      />
                    </span>
                  </label>
                </div>
                <small className="wingo-stake-hint">Custom amount: ₹10–₹50,000, whole numbers only</small>
              </section>

              {/* PRIMARY 3 COLOR ACTION BUTTONS */}
              <div className="wingo-market-label">Choose a color <span>Tap to continue</span></div>
              <div className="raja-color-buttons">
                <button
                  className="raja-color-btn raja-btn--green"
                  disabled={isLocked}
                  onClick={() => handleSelectTarget('color', 'green', 2.0)}
                >
                  <span>Green</span><small>2x payout</small>
                </button>
                <button
                  className="raja-color-btn raja-btn--purple"
                  disabled={isLocked}
                  onClick={() => handleSelectTarget('color', 'violet', 4.5)}
                >
                  <span>Violet</span><small>4.5x payout</small>
                </button>
                <button
                  className="raja-color-btn raja-btn--red"
                  disabled={isLocked}
                  onClick={() => handleSelectTarget('color', 'red', 2.0)}
                >
                  <span>Red</span><small>2x payout</small>
                </button>
              </div>

              {/* NUMBER LOTTERY BALLS (0-9) 2X5 GRID */}
              <div className="raja-numbers-card">
                <div className="wingo-section-heading">
                  <span>Choose a number</span>
                  <strong>9x payout</strong>
                </div>
                <div className="raja-numbers-grid">
                  {NUMBER_OPTIONS.map((num) => (
                    <button
                      key={num.digit}
                      className={`raja-lottery-ball ball-${num.digit} ${num.dual ? `ball-dual-${num.dual}` : ''}`}
                      disabled={isLocked}
                      onClick={() => handleSelectTarget('number', num.digit, 9.0)}
                    >
                      <div className="raja-ball-inner">
                        <span className="raja-ball-digit">{num.digit}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* BIG / SMALL SPLIT BUTTONS */}
              <div className="wingo-market-label">Choose a size <span>2x payout</span></div>
              <div className="raja-bigsmall-bar">
                <button
                  className="raja-bs-btn raja-btn--big"
                  disabled={isLocked}
                  onClick={() => handleSelectTarget('size', 'Big', 2.0)}
                >
                  <span>Big</span><small>5 – 9</small>
                </button>
                <button
                  className="raja-bs-btn raja-btn--small"
                  disabled={isLocked}
                  onClick={() => handleSelectTarget('size', 'Small', 2.0)}
                >
                  <span>Small</span><small>0 – 4</small>
                </button>
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
                  {!currentUser ? (
                    <div className="empty-state-card">
                      <Layers size={32} className="empty-icon" />
                      <p>Please log in to view your real-time bet history and live settlements.</p>
                      <button
                        className="empty-login-btn"
                        onClick={() => {
                          setAuthMode('login')
                          setAuthModalOpen(true)
                        }}
                      >
                        Log in now
                      </button>
                    </div>
                  ) : bets.length === 0 ? (
                    <div className="empty-state-card">
                      <Layers size={32} className="empty-icon" />
                      <p>No bets placed yet. Pick a color, size, or number to start!</p>
                    </div>
                  ) : (
                    <div className="bets-list">
                      {bets.map((b) => {
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
                <p>69 Club Presale & Calculation Guide</p>
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
                  {gameMode === '30s' && <>Every <strong>Win Go 30s</strong> round lasts <strong>30 seconds</strong>. Selections open for 25s, locked for the last <strong>5 seconds</strong>.</>}
                  {gameMode === '1m' && <>Every <strong>Win Go 1Min</strong> round lasts <strong>60 seconds</strong>. Selections open for 50s, locked for the last <strong>10 seconds</strong>.</>}
                  {gameMode === '3m' && <>Every <strong>Win Go 3Min</strong> round lasts <strong>3 minutes</strong>. Selections open for 150s, locked for the last <strong>30 seconds</strong>.</>}
                  {gameMode === '5m' && <>Every <strong>Win Go 5Min</strong> round lasts <strong>5 minutes</strong>. Selections open for 255s, locked for the last <strong>45 seconds</strong>.</>}
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
              <div className="sheet-row-label">Stake per ticket</div>
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
                <label className="sheet-custom-stake">
                  <span>Custom</span>
                  <span className="sheet-custom-input-wrap">
                    <span>₹</span>
                    <input
                      type="number"
                      min="10"
                      max="50000"
                      step="1"
                      inputMode="numeric"
                      value={baseAmount || ''}
                      onChange={(event) => {
                        const value = event.target.value
                        setBaseAmount(value === '' ? 0 : Math.min(50000, Math.max(0, Math.floor(Number(value)))))
                      }}
                      aria-label="Custom stake amount"
                    />
                  </span>
                </label>
              </div>
              <small className="sheet-stake-hint">₹10–₹50,000 per ticket · whole numbers only</small>

              {/* Multiplier / Quantity Stepper */}
              <div className="sheet-row-label">Number of tickets</div>
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
                  <span>Total stake:</span>
                  <strong>₹{formatCredits(totalBetAmount)}</strong>
                </div>
                <div className="sum-row highlight">
                  <span>Potential payout:</span>
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
                <span>I have checked my selection and stake</span>
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
                  disabled={isPlacingBet || !agreeTerms || totalBetAmount <= 0 || totalBetAmount > balance}
                  onClick={handleConfirmBet}
                >
                  {isPlacingBet
                    ? <><Loader2 size={16} className="spin-anim" /> Placing bet...</>
                    : totalBetAmount > balance
                    ? 'Insufficient Balance'
                    : `Confirm ₹${formatCredits(totalBetAmount)} bet`}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )}
        </div>

        {/* 69 CLUB BOTTOM NAVIGATION BAR */}
        <nav className="home-55-bottom-nav">
          <button
            className={`nav-55-item ${currentGame === null && activeNav === 'home' ? 'active' : ''}`}
            onClick={() => {
              setCurrentGame(null)
              setActiveNav('home')
              sound.playTick()
            }}
          >
            <Home size={20} />
            <span className="nav-55-label">Home</span>
          </button>

          <button
            className={`nav-55-item ${currentGame === null && activeNav === 'activity' ? 'active' : ''}`}
            onClick={() => {
              setCurrentGame(null)
              setActiveNav('activity')
              sound.playTick()
            }}
          >
            <Sparkles size={20} />
            <span className="nav-red-dot" />
            <span className="nav-55-label">Activity</span>
          </button>

          {/* Elevated Center Wheel Button */}
          <button
            className="nav-center-wheel-item"
            onClick={() => {
              setFortuneWheelOpen(true)
              sound.playTick()
            }}
            title="Spin Lucky Wheel for up to ₹500"
          >
            <div className="elevated-wheel-circle">🎡</div>
            <span className="elevated-wheel-text">Get ₹500</span>
          </button>

          <button
            className={`nav-55-item ${currentGame === null && activeNav === 'promotion' ? 'active' : ''}`}
            onClick={() => {
              setCurrentGame(null)
              setActiveNav('promotion')
              sound.playTick()
            }}
          >
            <Trophy size={20} />
            <span className="nav-55-label">Promotion</span>
          </button>

          <button
            className={`nav-55-item ${currentGame === null && activeNav === 'account' ? 'active' : ''}`}
            onClick={() => {
              setCurrentGame(null)
              setActiveNav('account')
              sound.playTick()
            }}
          >
            <User size={20} />
            <span className="nav-55-label">Account</span>
          </button>
        </nav>

        {/* FORTUNE WHEEL MODAL */}
        <FortuneWheelModal
          isOpen={fortuneWheelOpen}
          onClose={() => setFortuneWheelOpen(false)}
          userId={currentUser?.id || userId}
          onRewardClaimed={(newBal, amt) => {
            if (newBal !== undefined) setBalance(newBal)
            setToast({
              type: 'success',
              title: 'Lucky Wheel Bonus!',
              detail: `+₹${amt} credited to your wallet!`,
            })
          }}
        />

        {/* THIRD-PARTY GAME LAUNCHER MODAL (JILI, EVO, PG SOFT, SPRIBE) */}
        <ThirdPartyGameModal
          game={activeThirdPartyGame}
          isOpen={!!activeThirdPartyGame}
          onClose={() => setActiveThirdPartyGame(null)}
          balance={balance}
          onBalanceUpdate={(newBal) => setBalance(newBal)}
          userId={currentUser?.id || userId}
          setToast={setToast}
        />

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

        {/* WALLET TRANSACTIONS MODAL */}
        <TransactionModal
          isOpen={transactionModalOpen}
          onClose={() => setTransactionModalOpen(false)}
          userId={currentUser?.id || userId}
          currentUser={currentUser}
        />


        {/* HOW TO PLAY MODAL */}
        {howToPlayOpen && (
          <div className="modal-overlay" onClick={() => setHowToPlayOpen(false)}>
            <div className="modal-card raja-rules-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-group">
                  <div className="modal-icon-badge" style={{ background: '#f59e0b' }}>
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3>Win Go - How to Play</h3>
                    <p>Calculation & Presale Rules</p>
                  </div>
                </div>
                <button className="icon-close-button" onClick={() => setHowToPlayOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="raja-rules-body">
                <div className="raja-rule-item">
                  <strong>⏱️ Period Rules</strong>
                  <p>Selections are open for the period duration. The final 5 seconds before outcome draw are locked for settlement.</p>
                </div>
                <div className="raja-rule-item">
                  <strong>🟢 Green (1, 3, 7, 9)</strong>
                  <p>Returns <strong>2.0X</strong> multiplier. If number 5 is drawn, returns 1.5X.</p>
                </div>
                <div className="raja-rule-item">
                  <strong>🔴 Red (2, 4, 6, 8)</strong>
                  <p>Returns <strong>2.0X</strong> multiplier. If number 0 is drawn, returns 1.5X.</p>
                </div>
                <div className="raja-rule-item">
                  <strong>🟣 Violet (0, 5)</strong>
                  <p>Returns <strong>4.5X</strong> multiplier.</p>
                </div>
                <div className="raja-rule-item">
                  <strong>🔢 Number (0–9)</strong>
                  <p>Direct number match returns <strong>9.0X</strong> payout!</p>
                </div>
                <div className="raja-rule-item">
                  <strong>⚖️ Big / Small</strong>
                  <p>Big (5, 6, 7, 8, 9) or Small (0, 1, 2, 3, 4) returns <strong>2.0X</strong> payout.</p>
                </div>
              </div>

              <button className="primary-action-btn" onClick={() => setHowToPlayOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        )}


        {toast && (
          <div className={`mobile-toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' ? (
                <Check size={16} />
              ) : toast.type === 'loss' ? (
                <ArrowDownRight size={16} />
              ) : toast.type === 'warning' ? (
                <AlertCircle size={16} />
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
