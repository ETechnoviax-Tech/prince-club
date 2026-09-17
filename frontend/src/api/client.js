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

    // B. Production custom domain in browser (e.g. 69club1.site or any future domain)
    if (explicitUrl && !explicitUrl.includes('localhost') && !explicitUrl.includes('127.0.0.1')) {
      const clean = String(explicitUrl).replace(/\/+$/, '')
      return clean.endsWith('/api') ? clean : `${clean}/api`
    }

    // Extract root domain (removes 'www.' or any subdomain prefix)
    const hostParts = hostname.split('.')
    const rootDomain =
      hostParts.length > 2 && hostParts[0] === 'www'
        ? hostParts.slice(1).join('.')
        : hostname

    // Resolve to configured API subdomain from env or default to `api.${rootDomain}`
    const apiDomain = metaEnv.VITE_API_DOMAIN || procEnv.VITE_API_DOMAIN || `api.${rootDomain}`
    const protocol = window.location.protocol === 'http:' ? 'http:' : 'https:'
    return `${protocol}//${apiDomain}/api`
  }

  // SSR / Node testing fallback
  const fallback = explicitUrl || 'http://localhost:5000'
  const clean = String(fallback).replace(/\/+$/, '')
  return clean.endsWith('/api') ? clean : `${clean}/api`
}

export const API_BASE = resolveApiBase()

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

export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to authenticate')
  }
  if (json.token) {
    setAuthToken(json.token)
  }
  return json
}

export async function signupUser(username, email, password, referralCode) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, referralCode }),
  })
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
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, channel }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to request reset code')
  }
  return json
}

export async function sendOTP(identity, channel = 'AUTO') {
  const res = await fetch(`${API_BASE}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity, channel }),
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
  const res = await fetch(`${API_BASE}/payments/deposit`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, amount }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to initiate deposit')
  }
  return json
}

export async function submitDepositUTR(depositId, utrNumber) {
  const res = await fetch(`${API_BASE}/payments/deposit/utr`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ depositId, utrNumber }),
  })
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

export async function requestWithdrawal(userId, { amount, payoutMethod = 'UPI', upiId, bankDetails }) {
  const res = await fetch(`${API_BASE}/wallet/withdraw`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      userId,
      amount,
      payoutMethod,
      upiId,
      bankDetails,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to submit withdrawal request')
  }
  return json
}

export async function fetchUserWithdrawals(userId) {
  const res = await fetch(`${API_BASE}/wallet/withdrawals/${userId}`, {
    headers: authHeaders(),
  })
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

export async function fetchUserBets(userId) {
  const res = await fetch(`${API_BASE}/game/bets/${userId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch bets')
  return res.json()
}

export async function fetchAviatorState() {
  const res = await fetch(`${API_BASE}/game/aviator/state`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch Aviator state')
  return res.json()
}

export async function placeAviatorBet(userId, amount, autoCashout = null) {
  const res = await fetch(`${API_BASE}/game/aviator/bet`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, amount, autoCashout }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to place Aviator bet')
  }
  return json
}

export async function cashoutAviator(userId, betId) {
  const res = await fetch(`${API_BASE}/game/aviator/cashout`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, betId }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to cash out')
  }
  return json
}

export async function fetchAviatorHistory() {
  const res = await fetch(`${API_BASE}/game/aviator/history`, {
    headers: authHeaders(),
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

function adminHeaders(adminKey) {
  return {
    ...authHeaders(),
    'x-admin-key': adminKey,
  }
}

export async function verifyAdminAccess(adminKey) {
  const res = await fetch(`${API_BASE}/admin/verify`, {
    method: 'POST',
    headers: adminHeaders(adminKey),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Admin verification failed')
  return json
}

export async function fetchAdminMatrix(adminKey) {
  const res = await fetch(`${API_BASE}/admin/matrix`, {
    headers: adminHeaders(adminKey),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch admin matrix')
  return json.matrix
}

export async function fetchAdminBetsLedger(adminKey, params = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(`${API_BASE}/admin/bets${q ? `?${q}` : ''}`, {
    headers: adminHeaders(adminKey),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to fetch bets ledger')
  return json
}

export async function fetchAdminUsers(adminKey, search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`${API_BASE}/admin/users${q}`, {
    headers: adminHeaders(adminKey),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to list users')
  return json.users || []
}

export async function adminUpdateUserBalance(adminKey, userId, amount, action = 'credit', reason = '') {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/balance`, {
    method: 'POST',
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ amount, action, reason }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to update user balance')
  return json
}

export async function adminUpdateUserRole(adminKey, userId, role) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ role }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to update user role')
  return json
}

export async function adminUpdateUserStatus(adminKey, userId, status) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ status }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to update user status')
  return json
}

export async function adminDeleteUser(adminKey, userId) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: adminHeaders(adminKey),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to delete user')
  return json
}

export async function adminPromoteUser(adminKey, identity) {
  const res = await fetch(`${API_BASE}/admin/promote`, {
    method: 'POST',
    headers: adminHeaders(adminKey),
    body: JSON.stringify({ identity }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to promote user')
  return json
}

