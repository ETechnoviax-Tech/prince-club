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
import WingoGame from './components/WingoGame'
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
import DepositHistoryPage from './components/pages/DepositHistoryPage'
import WithdrawalHistoryPage from './components/pages/WithdrawalHistoryPage'
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

// Force manual scroll restoration to prevent browser jumping during SPA view transitions
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

export function App() {
  // Navigation & Core State
  const [activeTab, setActiveTab] = useState('win')
  const [activeSubTab, setActiveSubTab] = useState(() => localStorage.getItem('club69_active_subtab') || 'record') // 'record', 'chart', 'mybets'
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(sound.isMuted)
  const [serverOnline, setServerOnline] = useState(false)
  const [currentGame, setCurrentGame] = useState(() => localStorage.getItem('club69_current_game') || null) // null = lobby
  const [activeNav, setActiveNav] = useState(() => localStorage.getItem('club69_active_nav') || 'home')
  const [returnGame, setReturnGame] = useState(null)
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
  const mainViewportRef = useRef(null)

  // Scroll viewport to top on page / subpage / game arena enter
  useEffect(() => {
    if (mainViewportRef.current) {
      mainViewportRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      mainViewportRef.current.scrollTop = 0
    }
    window.scrollTo(0, 0)
  }, [activeNav, currentGame, activeTab])

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
      queueMicrotask(() => {
        restoringHistoryRef.current = false
        if (mainViewportRef.current) {
          mainViewportRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' })
          mainViewportRef.current.scrollTop = 0
        }
      })
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
    localStorage.removeItem('club69_active_tab')
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

  const handleOpenDeposit = (fromGame = null) => {
    if (!currentUser) {
      setToast({
        type: 'warning',
        title: 'Login Required',
        detail: 'Please sign in to your 69 Club account to deposit funds.',
      })
      setAuthMode('login')
      setAuthModalOpen(true)
      return
    }
    if (fromGame) {
      setReturnGame(fromGame)
      setCurrentGame(null)
    }
    setActiveNav('deposit')
    sound.playTick()
  }

  const handleOpenWithdraw = (fromGame = null) => {
    if (!currentUser) {
      setToast({
        type: 'warning',
        title: 'Login Required',
        detail: 'Please sign in to your 69 Club account to withdraw funds.',
      })
      setAuthMode('login')
      setAuthModalOpen(true)
      return
    }
    if (fromGame) {
      setReturnGame(fromGame)
      setCurrentGame(null)
    }
    setActiveNav('withdraw')
    sound.playTick()
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
  const [resultModalData, setResultModalData] = useState(null)
  const [resultModalCountdown, setResultModalCountdown] = useState(3)
  const lastSettledIssueRef = useRef(null)

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

  // Win Go My Bets — Strictly isolate Win Go bets from other games (Aviator, Slots, Mines, etc.)
  const [wingoBetModeFilter, setWingoBetModeFilter] = useState('ALL')
  const wingoBets = useMemo(() => {
    const WINGO_MODES = new Set(['PARITY', 'SAPRE', 'BCONE', 'EMERD', 'WINGO'])
    return bets.filter((b) => {
      const m = String(b.gameMode || '').toUpperCase()
      return WINGO_MODES.has(m) || m.includes('WINGO')
    })
  }, [bets])

  const displayedWingoBets = useMemo(() => {
    if (wingoBetModeFilter === 'ALL') return wingoBets
    return wingoBets.filter((b) => String(b.gameMode || '').toUpperCase() === wingoBetModeFilter)
  }, [wingoBets, wingoBetModeFilter])

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

  // Auto-countdown timer for Win Go Result Modal (3s auto shut off)
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
          const latestRound = formatted[0]
          if (
            lastSettledIssueRef.current &&
            lastSettledIssueRef.current !== latestRound.round &&
            currentGame === 'wingo'
          ) {
            const userBets = betsRef.current.filter((b) => {
              if (!b.round) return false
              const bRound = String(b.round).trim()
              const lRound = String(latestRound.round).trim()
              return bRound === lRound || (bRound.length >= 8 && lRound.length >= 8 && (bRound.endsWith(lRound) || lRound.endsWith(bRound)))
            })

            // ONLY show settlement popup if user placed a bet in this completed round!
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
                    totalPayout += Math.round(Number(b.amount || 0) * mult)
                  }
                }
              }

              if (isWon) {
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
          setLastOutcome(latestRound)
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
          const formatted = betsData.bets.map((b) => {
            const rawStatus = String(b.status || '').toLowerCase()
            const isWon = ['cashed_out', 'won'].includes(rawStatus) || Number(b.payout) > 0
            const isLost = ['lost'].includes(rawStatus)
            const normalizedStatus = isWon ? 'won' : isLost ? 'lost' : 'pending'
            const roundNumber = String(b.round_number || b.round || b.issueNumber || '')

            return {
              id: b.id,
              gameMode: String(b.game_mode || 'WINGO').toUpperCase(),
              round: roundNumber,
              selection: String(b.selection || 'Manual'),
              type: ['green', 'red', 'violet'].includes(String(b.selection).toLowerCase())
                ? 'color'
                : ['big', 'small'].includes(String(b.selection).toLowerCase())
                ? 'size'
                : 'number',
              amount: Number(b.amount || 0),
              multiplier: Number(b.multiplier || b.mult || b.cashout_multiplier || 1),
              potentialReturn: Math.round(Number(b.amount || 0) * Number(b.multiplier || b.mult || b.cashout_multiplier || 1)),
              payout: Number(b.payout || 0),
              status: normalizedStatus,
              outcome: b.outcome || null,
              createdAt: b.created_at || b.placed_at
                ? new Date(b.created_at || b.placed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                : 'Recently',
            }
          })

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
      } catch {
        if (!isCancelled) {
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
        <div ref={mainViewportRef} className="app-main-viewport">
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
              onOpenDeposit={() => handleOpenDeposit('k3')}
              onOpenWithdraw={() => handleOpenWithdraw('k3')}
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
              onOpenDeposit={() => handleOpenDeposit('5d')}
              onOpenWithdraw={() => handleOpenWithdraw('5d')}
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
              onOpenDeposit={() => handleOpenDeposit('trx')}
              onOpenWithdraw={() => handleOpenWithdraw('trx')}
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
              setHowToPlayOpen(true)
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
            onOpenDepositHistory={() => {
              setActiveNav('deposit-history')
              sound.playTick()
            }}
            onOpenWithdrawHistory={() => {
              setActiveNav('withdraw-history')
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
              if (returnGame) {
                setCurrentGame(returnGame)
                setReturnGame(null)
              } else {
                setActiveNav('account')
              }
              sound.playTick()
            }}
            onBalanceUpdated={(newBal) => {
              setBalance(newBal)
              syncWithBackend()
            }}
            onOpenHistory={() => {
              setActiveNav('deposit-history')
              sound.playTick()
            }}
          />
        )}

        {/* 2g. Standalone Dedicated Withdraw Page */}
        {currentGame === null && activeNav === 'withdraw' && (
          <WithdrawPage
            currentUser={currentUser}
            balance={balance}
            onBack={() => {
              if (returnGame) {
                setCurrentGame(returnGame)
                setReturnGame(null)
              } else {
                setActiveNav('account')
              }
              sound.playTick()
            }}
            onWithdrawSuccess={(newBal) => {
              setBalance(newBal)
              syncWithBackend()
            }}
            onOpenHistory={() => {
              setActiveNav('withdraw-history')
              sound.playTick()
            }}
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

        {/* 2n. Standalone Dedicated Deposit History Page */}
        {currentGame === null && activeNav === 'deposit-history' && (
          <DepositHistoryPage
            currentUser={currentUser}
            onBack={() => {
              setActiveNav('account')
              sound.playTick()
            }}
          />
        )}

        {/* 2o. Standalone Dedicated Withdrawal Status Page */}
        {currentGame === null && activeNav === 'withdraw-history' && (
          <WithdrawalHistoryPage
            currentUser={currentUser}
            onBack={() => {
              setActiveNav('account')
              sound.playTick()
            }}
          />
        )}

        {/* 3. Win Go Game Arena (Modular Dedicated Component) */}
        {currentGame === 'wingo' && (
          <WingoGame
            currentUser={currentUser}
            userId={currentUser?.id || userId}
            balance={balance}
            bets={bets}
            onBetPlaced={(newBet) => {
              setBets((prev) => [newBet, ...prev])
              syncWithBackend()
            }}
            onBalanceUpdate={(newBal) => setBalance(newBal)}
            onBackToLobby={() => {
              setCurrentGame(null)
              setActiveNav('home')
              sound.playTick()
            }}
            onOpenDeposit={() => handleOpenDeposit('wingo')}
            onOpenWithdraw={() => handleOpenWithdraw('wingo')}
            onOpenAuth={() => {
              setAuthMode('login')
              setAuthModalOpen(true)
            }}
            setToast={setToast}
            sound={sound}
            isMuted={isMuted}
            toggleMute={toggleMute}
          />
        )}
      </div>

        {/* 69 CLUB BOTTOM NAVIGATION BAR (Hidden whenever any game is active) */}
        {currentGame === null && !activeThirdPartyGame && (
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
        )}

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
          userId={currentUser?.id || userId}
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
