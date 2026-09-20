import crypto from 'crypto'

// 1. Official 55CLUB WebAPI Endpoint & Origin
const CLUB55_API_BASE = 'https://api.api55clubapi.com/api/webapi'
const CLUB55_ORIGIN = 'https://ayhbaw55.com'

// 2. Secondary High-Availability Backup API
const VEER_API_BASE = 'https://api.veergameapi.com/api/webapi'
const VEER_ORIGIN = 'https://www.veergame32.com'

// 3. Tertiary mirror (disabled — domain unreachable)
// const MIRROR3_API_BASE = 'https://api.55clubapi.net/api/webapi'
// const MIRROR3_ORIGIN = 'https://www.55club.io'

// Circuit breaker — prevents hammering unreachable servers
const circuit = {
  failures: 0,
  open: false,
  openedAt: 0,
  THRESHOLD: 6,          // require 6 consecutive all-server failures before opening
  RESET_AFTER_MS: 20000, // retry after 20s
  lastWarnAt: 0,         // throttle console.warn to once per 20s
  startupGraceMs: 8000,  // ignore failures for 8s after process start (network warmup)
  startedAt: Date.now(),
}

function generateRandomHex() {
  return crypto.randomBytes(16).toString('hex')
}

function signPayload(data = {}) {
  const ignoredKeys = ['signature', 'track', 'xosoBettingData']
  const payload = { ...data }
  delete payload.signature
  delete payload.timestamp
  payload.language = 'en'
  payload.random = generateRandomHex()

  const sortedObj = {}
  Object.keys(payload)
    .sort()
    .forEach((key) => {
      const val = payload[key]
      if (val !== null && val !== '' && !ignoredKeys.includes(key)) {
        sortedObj[key] = val === 0 ? 0 : val
      }
    })

  const payloadStr = JSON.stringify(sortedObj)
  payload.signature = crypto
    .createHash('md5')
    .update(payloadStr)
    .digest('hex')
    .toUpperCase()
    .slice(0, 32)
  payload.timestamp = Math.floor(Date.now() / 1000)

  return payload
}

/**
 * Call 55CLUB WebAPI with automatic failover to secondary gateway.
 * Circuit-breaker prevents log spam when all servers are unreachable.
 */
export async function call55ClubAPI(endpoint, data = {}) {
  // Check circuit breaker
  if (circuit.open) {
    const elapsed = Date.now() - circuit.openedAt
    if (elapsed < circuit.RESET_AFTER_MS) {
      // Do not fabricate round data when the live provider is unavailable.
      const now = Date.now()
      if (now - circuit.lastWarnAt > 60000) {
        circuit.lastWarnAt = now
        console.warn(`[55CLUB API] All servers unreachable — live data paused (retry in ${Math.ceil((circuit.RESET_AFTER_MS - elapsed) / 1000)}s)`)
      }
      throw new Error('circuit open')
    }
    // Reset circuit and try again
    circuit.open = false
    circuit.failures = 0
  }

  const signed = signPayload(data)
  const servers = [
    { base: CLUB55_API_BASE, origin: CLUB55_ORIGIN, name: '55club' },
    { base: VEER_API_BASE, origin: VEER_ORIGIN, name: 'veergame' },
  ]

  let lastErr = null
  for (const s of servers) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000) // 6s per server
    try {
      const res = await fetch(`${s.base}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Ar-Origin': s.origin,
          Referer: `${s.origin}/`,
          Origin: s.origin,
        },
        body: JSON.stringify(signed),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const json = await res.json()
        if (json && (json.code === 0 || json.data)) {
          json._serverSource = s.name
          circuit.failures = 0 // reset on success
          return json
        }
      }
    } catch (err) {
      clearTimeout(timeoutId)
      lastErr = err
    }
  }

  // All servers failed — trip circuit breaker (ignore during startup grace period)
  const inGrace = (Date.now() - circuit.startedAt) < circuit.startupGraceMs
  if (!inGrace) {
    circuit.failures++
    if (circuit.failures >= circuit.THRESHOLD && !circuit.open) {
      circuit.open = true
      circuit.openedAt = Date.now()
      console.warn('[55CLUB API] Circuit breaker OPEN — all servers unreachable. Live data is unavailable for 20s.')
    }
  }

  throw lastErr || new Error(`All 55club API servers failed for ${endpoint}`)
}

// Backward-compatibility alias
export const callVeerAPI = call55ClubAPI

// Map game mode string to 55CLUB / Win Go typeId
export const MODE_TO_TYPE_ID = {
  '30s': 30,
  '1m': 1,
  '3m': 2,
  '5m': 3,
}

export const TYPE_ID_TO_MODE = {
  30: '30s',
  1: '1m',
  2: '3m',
  3: '5m',
}

// Lock window seconds per typeId (mirrors GAME_MODES.lockMs on server)
const TYPE_ID_LOCK_SECONDS = {
  30: 5,   // Win Go 30s
  1: 10,   // Win Go 1Min
  2: 30,   // Win Go 3Min
  3: 45,   // Win Go 5Min
}

const issueCache = new Map()
const historyCache = new Map()
const inFlightRequests = new Map()

// 1. Fetch current live game issue/round from 55CLUB
export async function getLiveIssue(typeId = 30) {
  const cached = issueCache.get(typeId)
  if (cached && Date.now() - cached.timestamp < 1500) {
    return cached.data
  }

  const inFlightKey = `issue_${typeId}`
  if (inFlightRequests.has(inFlightKey)) {
    return inFlightRequests.get(inFlightKey)
  }

  const promise = (async () => {
    try {
      const res = await call55ClubAPI('/GetGameIssue', { typeId })
      if (res && (res.code === 0 || res.data) && res.data) {
        const { issueNumber, startTime, endTime, serviceTime } = res.data
        const endTimestamp = new Date(endTime.replace(/-/g, '/')).getTime()
        const currentTimestamp = serviceTime
          ? new Date(serviceTime.replace(/-/g, '/')).getTime()
          : Date.now()
        const msRemaining = Math.max(0, endTimestamp - currentTimestamp)
        const secondsRemaining = Math.ceil(msRemaining / 1000)
        const lockSec = TYPE_ID_LOCK_SECONDS[typeId] || 5

        const result = {
          success: true,
          source: res._serverSource || '55club',
          typeId,
          issueNumber,
          startTime,
          endTime,
          secondsRemaining,
          lockSeconds: lockSec,
          isLocked: secondsRemaining <= lockSec,
        }
        issueCache.set(typeId, { data: result, timestamp: Date.now() })
        return result
      }
    } catch (err) {
      // Suppress repeated log spam — circuit breaker handles throttling
      if (err.message !== 'circuit open') {
        console.warn('[55CLUB API] Live issue fetch error:', err.message)
      }
    } finally {
      inFlightRequests.delete(inFlightKey)
    }

    // Resilience fallback: Serve last-known issue with adjusted countdown if available
    if (cached?.data) {
      const endTimestamp = new Date(cached.data.endTime.replace(/-/g, '/')).getTime()
      const msRemaining = Math.max(0, endTimestamp - Date.now())
      const secondsRemaining = Math.ceil(msRemaining / 1000)
      const lockSec = cached.data.lockSeconds || 5
      return {
        ...cached.data,
        secondsRemaining,
        isLocked: secondsRemaining <= lockSec,
        stale: true,
      }
    }

    throw new Error('Live Win Go issue is temporarily unavailable')
  })()

  inFlightRequests.set(inFlightKey, promise)
  return promise
}

// 2. Fetch live official draw history from 55CLUB
export async function getLiveHistory(typeId = 30, page = 1) {
  const cacheKey = `${typeId}_${page}`
  const cached = historyCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < 2500) {
    return cached.data
  }

  const inFlightKey = `history_${cacheKey}`
  if (inFlightRequests.has(inFlightKey)) {
    return inFlightRequests.get(inFlightKey)
  }

  const promise = (async () => {
    try {
      const res = await call55ClubAPI('/GetNoaverageEmerdList', { typeId, pageno: page })
      if (res && (res.code === 0 || res.data) && res.data?.list) {
        const list = res.data.list.map((item) => {
          const digit = Number(item.number)
          let color = 'red'
          if (item.colour.includes('green') && item.colour.includes('violet')) color = 'violet'
          else if (item.colour.includes('red') && item.colour.includes('violet')) color = 'violet'
          else if (item.colour.includes('green')) color = 'green'
          else if (item.colour.includes('violet')) color = 'violet'

          return {
            issueNumber: item.issueNumber,
            typeId,          // propagate so settlement can route to correct mode
            digit,
            color,
            rawColour: item.colour,
            premium: item.premium,
            size: digit >= 5 ? 'Big' : 'Small',
          }
        })

        const result = {
          success: true,
          source: res._serverSource || '55club',
          typeId,
          list,
        }
        historyCache.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      }
    } catch (err) {
      // Suppress repeated log spam — circuit breaker handles throttling
      if (err.message !== 'circuit open') {
        console.warn('[55CLUB API] History fetch error:', err.message)
      }
    } finally {
      inFlightRequests.delete(inFlightKey)
    }

    // Resilience fallback: Serve last-known draw history if available
    if (cached?.data) {
      return {
        ...cached.data,
        stale: true,
      }
    }

    throw new Error('Live Win Go history is temporarily unavailable')
  })()

  inFlightRequests.set(inFlightKey, promise)
  return promise
}
