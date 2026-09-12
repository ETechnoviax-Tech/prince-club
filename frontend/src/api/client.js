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

export async function fetchCurrentRound() {
  const res = await fetch(`${API_BASE}/game/round/current`, {
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

export async function placeBet(userId, selection, amount, issueNumber = null, typeId = 30) {
  const res = await fetch(`${API_BASE}/game/bet`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId, selection, amount, issueNumber, typeId }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to place bet')
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
