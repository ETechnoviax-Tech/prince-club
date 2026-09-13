// Environment-aware Base URL detection (Vite client, Node test, or SSR)
const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
const procEnv = typeof process !== 'undefined' && process.env ? process.env : {}

const ENV_URL =
  metaEnv.VITE_API_BASE_URL ||
  metaEnv.VITE_API_URL ||
  procEnv.VITE_API_BASE_URL ||
  procEnv.VITE_API_URL ||
  'http://localhost:5000'

const CLEAN_URL = String(ENV_URL).replace(/\/+$/, '')
const API_BASE = CLEAN_URL.endsWith('/api') ? CLEAN_URL : `${CLEAN_URL}/api`

// Token Management (Browser & Node safe)
let inMemoryToken = null

export function getAuthToken() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (
        window.localStorage.getItem('prince_club_auth_token') ||
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
        window.localStorage.setItem('prince_club_auth_token', token)
      } else {
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

// Aviator Crash Game API
export async function fetchAviatorState(userId) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  const res = await fetch(`${API_BASE}/game/aviator/state${query}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch Aviator state')
  return res.json()
}

export async function placeAviatorBet(userId, amount, autoCashOut = null) {
  const res = await fetch(`${API_BASE}/game/aviator/bet`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, amount, autoCashOut }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to place Aviator bet')
  }
  return json
}

export async function cashoutAviatorBet(userId, betId = null) {
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

// Coin Flip API
export async function playCoinFlip(userId, side, amount) {
  const res = await fetch(`${API_BASE}/game/coinflip/play`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, side, amount }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to play Coin Flip')
  }
  return json
}

export async function fetchCoinFlipHistory() {
  const res = await fetch(`${API_BASE}/game/coinflip/history`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch Coin Flip history')
  return res.json()
}

// Andar Bahar API
export async function playAndarBahar(userId, side, amount) {
  const res = await fetch(`${API_BASE}/game/andarbahar/play`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, side, amount }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to play Andar Bahar')
  }
  return json
}

export async function fetchAndarBaharHistory() {
  const res = await fetch(`${API_BASE}/game/andarbahar/history`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch Andar Bahar history')
  return res.json()
}

// Vortex API
export async function playVortex(userId, ring, amount) {
  const res = await fetch(`${API_BASE}/game/vortex/play`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, ring, amount }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to play Vortex')
  return json
}

export async function fetchVortexHistory() {
  const res = await fetch(`${API_BASE}/game/vortex/history`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch Vortex history')
  return res.json()
}

// Cricket API
export async function playCricket(userId, prediction, amount) {
  const res = await fetch(`${API_BASE}/game/cricket/play`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, prediction, amount }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to play Cricket')
  return json
}

export async function fetchCricketHistory() {
  const res = await fetch(`${API_BASE}/game/cricket/history`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch Cricket history')
  return res.json()
}

// PUBG 1Min API
export async function playPubg(userId, zone, amount) {
  const res = await fetch(`${API_BASE}/game/pubg/play`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, zone, amount }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to play PUBG 1Min')
  return json
}

export async function fetchPubgHistory() {
  const res = await fetch(`${API_BASE}/game/pubg/history`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch PUBG history')
  return res.json()
}

// Fortune Spin Wheel ("Get ₹500") API
export async function claimSpinWheel(userId) {
  const res = await fetch(`${API_BASE}/game/spin/claim`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Failed to claim spin')
  return json
}

export async function fetchSpinStatus(userId) {
  const res = await fetch(`${API_BASE}/game/spin/status?userId=${encodeURIComponent(userId || '')}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch spin status')
  return res.json()
}



