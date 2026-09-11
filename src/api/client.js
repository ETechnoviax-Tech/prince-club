const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function loginUser(username) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to authenticate')
  }
  return res.json()
}

export async function fetchWallet(userId) {
  const res = await fetch(`${API_BASE}/wallet/${userId}`)
  if (!res.ok) throw new Error('Failed to fetch wallet')
  return res.json()
}

export async function requestDeposit(userId, amount) {
  const res = await fetch(`${API_BASE}/payments/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to initiate deposit')
  }
  return res.json()
}

export async function submitDepositUTR(depositId, utrNumber) {
  const res = await fetch(`${API_BASE}/payments/deposit/utr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ depositId, utrNumber }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || 'Failed to submit UTR')
  }
  return json
}

export async function fetchUserDeposits(userId) {
  const res = await fetch(`${API_BASE}/payments/deposits/user/${userId}`)
  if (!res.ok) throw new Error('Failed to fetch deposit history')
  return res.json()
}
