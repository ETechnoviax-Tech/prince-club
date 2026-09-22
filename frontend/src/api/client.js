// Environment-aware & Domain-aware Base URL detection (Zero hardcoding)
// Automatically handles:
// 1. Local Development (localhost:5173 -> localhost:5000)
// 2. Production with .env (VITE_API_URL or VITE_API_BASE_URL)
// 3. Browser runtime domain auto-detection: If hosted on 69club1.site (or any future domain),
//    automatically resolves to `https://api.${rootDomain}/api`!
const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
const procEnv = typeof process !== 'undefined' && process.env ? process.env : {}

export function resolveApiBase() {
  const explicitUrl =
    metaEnv.VITE_API_URL ||
    metaEnv.VITE_API_BASE_URL ||
    procEnv.VITE_API_URL ||
    procEnv.VITE_API_BASE_URL

  // Browser runtime detection
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname

    // A. Localhost development
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      const localBase = explicitUrl || 'http://localhost:5000'
      const clean = String(localBase).replace(/\/+$/, '')
      return clean.endsWith('/api') ? clean : `${clean}/api`
    }

    // B. Explicit external production API URL (e.g. when pointing frontend to Render https://api.69club1.site)
    if (
      explicitUrl &&
      (explicitUrl.startsWith('https://') || explicitUrl.startsWith('http://')) &&
      !explicitUrl.includes('localhost') &&
      !explicitUrl.includes('127.0.0.1')
    ) {
      const clean = String(explicitUrl).replace(/\/+$/, '')
      return clean.endsWith('/api') ? clean : `${clean}/api`
    }

    // C. Dynamic subdomain routing for custom production domains (e.g. 69club1.site -> https://api.69club1.site/api)
    const hostParts = hostname.split('.')
    if (hostParts.length >= 2 && !hostname.endsWith('.vercel.app')) {
      const rootDomain = hostParts.length > 2 && hostParts[0] === 'www' ? hostParts.slice(1).join('.') : hostname
      const apiDomain = metaEnv.VITE_API_DOMAIN || procEnv.VITE_API_DOMAIN || `api.${rootDomain}`
      return `https://${apiDomain}/api`
    }

    // D. Fallback for single-deployment preview environments
    return `${window.location.origin}/api`
  }

  // SSR / Node testing fallback
  const fallback = explicitUrl || 'http://localhost:5000'
  const clean = String(fallback).replace(/\/+$/, '')
  return clean.endsWith('/api') ? clean : `${clean}/api`
}

export const API_BASE = resolveApiBase()

// Global loading bus hooks
import {
  triggerLoadingStart,
  triggerLoadingEnd,
} from '../components/GlobalLoadingSpinner.jsx'

const DEFAULT_REQUEST_TIMEOUT_MS = 30000
const activeRequestControllers = new Set()

export function abortAllApiRequests() {
  for (const controller of activeRequestControllers) controller.abort()
  activeRequestControllers.clear()
}

export async function apiFetch(
  url,
  options = {},
  loadingText = 'Loading...',
  withOverlay = false,
) {
  const isSilent = Boolean(options?.silent)
  const timeoutMs = Number.isFinite(Number(options?.timeoutMs))
    ? Math.max(1000, Number(options.timeoutMs))
    : DEFAULT_REQUEST_TIMEOUT_MS
  const controller = new AbortController()
  activeRequestControllers.add(controller)
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const callerSignal = options?.signal
  const abortFromCaller = () => controller.abort()
  const requestOptions = { ...options, signal: controller.signal }
  delete requestOptions.silent
  delete requestOptions.timeoutMs

  if (callerSignal) {
    if (callerSignal.aborted) controller.abort()
    else callerSignal.addEventListener('abort', abortFromCaller, { once: true })
  }

  const loadingToken = isSilent ? null : triggerLoadingStart(loadingText, withOverlay)
  try {
    const res = await fetch(url, requestOptions)
    return res
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timedOut = !callerSignal?.aborted
      throw new Error(
        timedOut
          ? `Request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please try again.`
          : 'Request was cancelled.',
      )
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    callerSignal?.removeEventListener('abort', abortFromCaller)
    activeRequestControllers.delete(controller)
    if (!isSilent) {
      triggerLoadingEnd(loadingToken)
    }
  }
}

// Token Management (Browser & Node safe)
let inMemoryToken = null

export function getAuthToken() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (
        window.localStorage.getItem('club69_auth_token') ||
        window.localStorage.getItem('prince_club_auth_token') ||
        window.sessionStorage?.getItem('club69_auth_token') ||
        window.sessionStorage?.getItem('prince_club_auth_token') ||
        inMemoryToken
      )
    }
  } catch {}
  return inMemoryToken
}

export function setAuthToken(token) {
  inMemoryToken = token || null
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem('club69_auth_token', token)
      } else {
        window.localStorage.removeItem('club69_auth_token')
        window.sessionStorage?.removeItem('club69_auth_token')
        window.localStorage.removeItem('prince_club_auth_token')
        window.sessionStorage?.removeItem('prince_club_auth_token')
      }
    }
  } catch {}
}

export function clearAuthToken() {
  setAuthToken(null)
}

function authHeaders() {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function fetchCaptchaChallenge() {
  const res = await apiFetch(`${API_BASE}/auth/captcha`, {}, 'Verifying security...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Unable to load CAPTCHA')
  return json
}

export async function loginUser(username, password, captchaToken, captchaProof) {
  const res = await apiFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, captchaToken, captchaProof }),
  }, 'Logging in...', true)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to authenticate')
  }
  if (json.token) {
    setAuthToken(json.token)
  }
  return json
}

export async function signupUser(username, email, password, referralCode, captchaToken, captchaProof, otpCode) {
  const res = await apiFetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, referralCode, captchaToken, captchaProof, otpCode }),
  }, 'Creating account...', true)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to register')
  }
  if (json.token) {
    setAuthToken(json.token)
  }
  return json
}

export async function forgotPassword(identity, channel = 'AUTO') {
  const res = await apiFetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, channel }),
  }, 'Sending OTP...', true)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to send OTP')
  }
  return json
}

export async function sendOTP(identity, channel = 'AUTO', purpose = undefined) {
  const res = await fetch(`${API_BASE}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, channel, purpose }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to send OTP')
  }
  return json
}

export async function verifyOTP(identity, otpCode) {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, otpCode }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to verify OTP')
  }
  return json
}

export async function resetPassword(identity, resetCode, newPassword) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, resetCode, newPassword }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to reset password')
  }
  return json
}

export async function fetchWallet(userId) {
  const res = await fetch(`${API_BASE}/wallet/${userId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch wallet')
  return res.json()
}

export async function requestDeposit(userId, amount) {
  const res = await apiFetch(`${API_BASE}/payments/deposit`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, amount }),
  }, 'Generating UPI QR...', true)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to initiate deposit')
  }
  return json
}

export async function submitDepositUTR(depositId, utrNumber) {
  const res = await apiFetch(`${API_BASE}/payments/deposit/utr`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ depositId, utrNumber }),
    timeoutMs: 15000,
  }, 'Submitting UTR...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to submit UTR')
  }
  return json
}

export async function fetchUserDeposits(userId) {
  const res = await fetch(`${API_BASE}/payments/user/${userId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch deposit history')
  return res.json()
}

export async function fetchFirstDepositEligibility(userId) {
  try {
    const res = await apiFetch(`${API_BASE}/payments/first-deposit-eligibility/${userId}`, {
      headers: authHeaders(),
      silent: true,
    })
    if (!res.ok) return { isEligible: false }
    return await res.json()
  } catch {
    return { isEligible: false }
  }
}

export async function fetchCurrentRound(mode = 'PARITY') {
  const query = mode ? `?mode=${encodeURIComponent(mode)}` : ''
  const res = await fetch(`${API_BASE}/game/round/current${query}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch game round')
  return res.json()
}

export async function fetchVeerIssue(typeId = 30) {
  const res = await fetch(`${API_BASE}/game/veer/issue?typeId=${typeId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch VeerGame issue')
  return res.json()
}

export async function fetchVeerHistory(typeId = 30, page = 1) {
  const res = await fetch(`${API_BASE}/game/veer/history?typeId=${typeId}&page=${page}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch VeerGame history')
  return res.json()
}

export async function placeBet(userId, selection, amount, arg4 = null, arg5 = null) {
  let mode = 'PARITY'
  let issueNumber = null
  let typeId = 30

  if (typeof arg4 === 'object' && arg4 !== null) {
    mode = arg4.mode || 'PARITY'
    issueNumber = arg4.issueNumber || null
    typeId = arg4.typeId || 30
  } else if (typeof arg4 === 'string' && ['PARITY', 'SAPRE', 'BCONE', 'EMERD'].includes(arg4.toUpperCase())) {
    mode = arg4.toUpperCase()
  } else if (arg4) {
    issueNumber = arg4
    if (arg5) typeId = arg5
  }

  const res = await fetch(`${API_BASE}/game/bet`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, selection, amount, mode, issueNumber, typeId }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to place bet')
  }
  return json
}

export async function requestWithdrawal(arg1, arg2) {
  let targetUserId = arg1
  let options = arg2 || {}

  if (typeof arg1 === 'object' && arg1 !== null) {
    targetUserId = arg1.userId
    options = arg1
  }

  const { amount, payoutMethod = 'UPI' } = options
  const upiId = options.upiId || options.accountDetails?.upiId
  const bankDetails = options.bankDetails || (payoutMethod === 'BANK' ? options.accountDetails : null)

  const payoutDetails = upiId
    ? { upiId }
    : bankDetails
    ? bankDetails
    : {}

  const res = await apiFetch(`${API_BASE}/wallet/withdraw`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      userId: targetUserId,
      amount,
      payoutMethod,
      payoutDetails,
      upiId: upiId || undefined,
      bankDetails: bankDetails || undefined,
    }),
    timeoutMs: 20000,
  }, 'Submitting withdrawal...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to submit withdrawal request')
  }
  return json
}

export async function fetchUserWithdrawals(userId) {
  const res = await apiFetch(`${API_BASE}/wallet/withdrawals/${userId}`, {
    headers: authHeaders(),
    silent: true,
  }, 'Loading history...')
  if (!res.ok) throw new Error('Failed to fetch withdrawal history')
  return res.json()
}

export async function claimDailyVIPBonus(userId) {
  const res = await fetch(`${API_BASE}/wallet/vip/claim`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to claim daily VIP bonus')
  }
  return json
}

export async function fetchVIPStatus(userId) {
  const res = await fetch(`${API_BASE}/wallet/vip/status/${userId}`, {
    headers: authHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to fetch VIP status')
  }
  return json
}


export async function fetchTransactions(userId) {
  const res = await fetch(`${API_BASE}/wallet/${userId}/transactions`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch transactions')
  return res.json()
}

export async function resetWallet(userId) {
  const res = await fetch(`${API_BASE}/wallet/reset`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error('Failed to reset wallet')
  return res.json()
}

export async function fetchUserBets(userId, { page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit }).toString()
  const res = await apiFetch(`${API_BASE}/game/bets/${userId}?${params}`, {
    headers: authHeaders(),
  }, 'Loading game history...', false)
  if (!res.ok) throw new Error('Failed to fetch bets')
  return res.json()
}

export async function fetchAviatorState(userId = null) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  const res = await apiFetch(`${API_BASE}/game/aviator/state${query}`, {
    headers: authHeaders(),
    silent: true,
    timeoutMs: 5000,
  })
  if (!res.ok) throw new Error('Failed to fetch Aviator state')
  return res.json()
}

export async function placeAviatorBet(userId, amount, autoCashout = null, panelId = 0) {
  const res = await apiFetch(`${API_BASE}/game/aviator/bet`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, amount, autoCashout, panelId }),
    timeoutMs: 8000,
  }, 'Placing Aviator bet...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to place Aviator bet')
  }
  return json
}

export async function cashoutAviator(userId, betId) {
  const res = await apiFetch(`${API_BASE}/game/aviator/cashout`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, betId }),
    timeoutMs: 8000,
  }, 'Cashing out...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to cash out')
  }
  return json
}

export async function cancelAviatorBet(userId, betId) {
  const res = await apiFetch(`${API_BASE}/game/aviator/cancel`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, betId }),
    timeoutMs: 8000,
  }, 'Cancelling Aviator bet...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to cancel bet')
  }
  return json
}

export async function fetchAviatorHistory() {
  const res = await apiFetch(`${API_BASE}/game/aviator/history`, {
    headers: authHeaders(),
    silent: true,
    timeoutMs: 6000,
  })
  if (!res.ok) throw new Error('Failed to fetch Aviator history')
  return res.json()
}

export async function fetchGameProviders() {
  const res = await fetch(`${API_BASE}/game/providers`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch game providers')
  return res.json()
}

export async function fetchGameCatalog(params = {}) {
  const q = new URLSearchParams()
  if (params.provider) q.set('provider', params.provider)
  if (params.category) q.set('category', params.category)
  if (params.search) q.set('search', params.search)
  if (params.page) q.set('page', params.page)
  if (params.limit) q.set('limit', params.limit)

  const res = await fetch(`${API_BASE}/game/third-party/catalog?${q.toString()}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch game catalog')
  return res.json()
}

export async function playThirdPartyRound(userId, gameId, provider, betAmount) {
  const res = await fetch(`${API_BASE}/game/third-party/play`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, gameId, provider, betAmount }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Game round failed')
  }
  return json
}

export async function fetchGameLaunchUrl(gameId, provider, userId = null) {
  const q = new URLSearchParams({ gameId, provider })
  if (userId) q.set('userId', userId)
  const res = await fetch(`${API_BASE}/game/third-party/launch?${q.toString()}`, {
    headers: authHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to get game URL')
  return json
}

export async function executeInHouseSlotSpin(userId, gameId, betAmount) {
  const res = await fetch(`${API_BASE}/game/slot/spin`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, gameId, betAmount }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Spin failed')
  }
  return json
}

export async function fetchSlotConfig(gameId) {
  const res = await fetch(`${API_BASE}/game/slot/config/${gameId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch slot config')
  return res.json()
}

// In-House Mines Game API
export async function startMines(userId, betAmount, minesCount) {
  const res = await fetch(`${API_BASE}/game/mines/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, betAmount, minesCount }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to start Mines round')
  return json
}

export async function revealMinesTile(sessionId, tileIndex, userId) {
  const res = await fetch(`${API_BASE}/game/mines/reveal`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ sessionId, tileIndex, userId }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to reveal tile')
  return json
}

export async function cashoutMines(sessionId, userId) {
  const res = await fetch(`${API_BASE}/game/mines/cashout`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ sessionId, userId }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Cashout failed')
  return json
}

// In-House Dragon vs Tiger API
export async function fetchDragonTigerState() {
  const res = await fetch(`${API_BASE}/game/dragontiger/state`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch Dragon Tiger state')
  return res.json()
}

export async function placeDragonTigerBet(userId, market, betAmount) {
  const res = await fetch(`${API_BASE}/game/dragontiger/bet`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, market, betAmount }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Bet failed')
  return json
}

// Wallet Transactions Ledger API
export async function fetchWalletTransactions(userId) {
  const res = await fetch(`${API_BASE}/wallet/${userId}/transactions`, {
    headers: authHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch transaction ledger')
  return json.transactions || []
}

// ============================================================================
// DUAL-VERIFIED ADMIN API CLIENT
// ============================================================================

function adminHeaders() {
  return authHeaders()
}

export async function verifyAdminAccess() {
  const res = await fetch(`${API_BASE}/admin/verify`, {
    method: 'POST',
    headers: adminHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Admin verification failed')
  return json
}

export async function fetchAdminMatrix() {
  const res = await fetch(`${API_BASE}/admin/matrix`, {
    headers: adminHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch admin matrix')
  return json.matrix
}

export async function fetchAdminBetsLedger(params = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(`${API_BASE}/admin/bets${q ? `?${q}` : ''}`, {
    headers: adminHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch bets ledger')
  return json
}

export async function fetchAdminDeposits(status = 'PENDING') {
  const res = await fetch(`${API_BASE}/admin/deposits?status=${encodeURIComponent(status)}`, {
    headers: adminHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch deposits')
  return json.deposits || []
}

export async function fetchAdminWithdrawals(status = 'PENDING') {
  const res = await fetch(`${API_BASE}/admin/withdrawals?status=${encodeURIComponent(status)}`, {
    headers: adminHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch withdrawals')
  return json.withdrawals || []
}

export async function adminVerifyDeposit(depositId, action, notes = '') {
  const res = await fetch(`${API_BASE}/admin/deposits/${depositId}/verify`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ depositId, action, notes }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to verify deposit')
  return json
}

export async function adminVerifyWithdrawal(withdrawalId, action, notes = '') {
  const res = await fetch(`${API_BASE}/admin/withdrawals/${withdrawalId}/verify`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ withdrawalId, action, notes }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to verify withdrawal')
  return json
}

export async function fetchAdminUsers(search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`${API_BASE}/admin/users${q}`, {
    headers: adminHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to list users')
  return json.users || []
}

export async function adminUpdateUserBalance(userId, amount, action = 'credit', reason = '') {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/balance`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ amount, action, reason }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to update user balance')
  return json
}

export async function adminUpdateUserRole(userId, role) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify({ role }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to update user role')
  return json
}

export async function adminUpdateUserStatus(userId, status) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify({ status }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to update user status')
  return json
}

export async function adminDeleteUser(userId) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to delete user')
  return json
}

export async function fetchActivityStats(userId = null) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  const res = await apiFetch(`${API_BASE}/activity/stats${query}`, {
    headers: authHeaders(),
    silent: true,
  })
  if (!res.ok) throw new Error('Failed to fetch activity stats')
  return res.json()
}

export async function redeemGiftCode(code, userId = null) {
  const res = await apiFetch(`${API_BASE}/activity/redeem-gift`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code, userId }),
  }, 'Redeeming gift code...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to redeem gift code')
  }
  return json
}

export async function fetchPromotionStats(userId = null) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  const res = await apiFetch(`${API_BASE}/promotion/stats${query}`, {
    headers: authHeaders(),
    silent: true,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to fetch promotion stats')
  }
  return json
}

export async function fetchRebateStats(userId = null, category = 'All') {
  const params = new URLSearchParams()
  if (userId) params.set('userId', userId)
  if (category) params.set('category', category)
  const query = params.toString() ? `?${params.toString()}` : ''

  const res = await apiFetch(`${API_BASE}/activity/rebate/stats${query}`, {
    headers: authHeaders(),
    silent: true,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch rebate stats')
  return json
}

export async function claimOneClickRebate(userId = null) {
  const res = await apiFetch(`${API_BASE}/activity/rebate/claim`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId }),
  }, 'Claiming rebate...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to claim rebate')
  }
  return json
}

export async function fetchFirstGiftStatus(userId = null) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  const res = await apiFetch(`${API_BASE}/activity/first-gift/status${query}`, {
    headers: authHeaders(),
    silent: true,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch first gift status')
  return json
}

export async function claimFirstGift(userId = null) {
  const res = await apiFetch(`${API_BASE}/activity/first-gift/claim`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId }),
  }, 'Claiming first gift...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to claim first gift')
  }
  return json
}

export async function fetchAttendanceStats(userId = null) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  const res = await apiFetch(`${API_BASE}/activity/attendance/stats${query}`, {
    headers: authHeaders(),
    silent: true,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch attendance stats')
  return json
}

export async function claimAttendanceBonus(userId = null) {
  const res = await apiFetch(`${API_BASE}/activity/attendance/claim`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId }),
  }, 'Signing attendance...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to claim attendance bonus')
  }
  return json
}

export async function fetchAnnouncements(category = 'All') {
  const q = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : ''
  const res = await apiFetch(`${API_BASE}/service/announcements${q}`, {
    headers: authHeaders(),
    silent: true,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch announcements')
  return json.announcements || []
}

export async function submitFeedbackTicket(category, message, contactInfo = '') {
  const res = await apiFetch(`${API_BASE}/service/feedback`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ category, message, contactInfo }),
  }, 'Submitting feedback...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to submit feedback')
  }
  return json
}

export async function fetchUserFeedback(userId = null) {
  const q = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  const res = await apiFetch(`${API_BASE}/service/feedback${q}`, {
    headers: authHeaders(),
    silent: true,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch feedback history')
  return json.tickets || []
}

export async function fetchProfileSettings() {
  const res = await apiFetch(`${API_BASE}/service/settings/profile`, {
    headers: authHeaders(),
    silent: true,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to fetch profile settings')
  }
  return json
}

export async function updateProfileSettings(data = {}) {
  const res = await apiFetch(`${API_BASE}/service/settings/profile`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }, 'Saving profile...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to update profile')
  }
  return json
}

export async function changeSecurityPassword(currentPassword, newPassword) {
  const res = await apiFetch(`${API_BASE}/service/settings/password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  }, 'Updating password...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to change password')
  }
  return json
}

export async function bindBackupEmail(email) {
  const res = await apiFetch(`${API_BASE}/service/settings/bind-email`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email }),
  }, 'Binding backup email...', false)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to bind backup email')
  }
  return json
}




