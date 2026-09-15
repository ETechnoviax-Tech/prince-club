import crypto from 'crypto'

// 1. Official 55CLUB WebAPI Endpoint & Origin
const CLUB55_API_BASE = 'https://api.api55clubapi.com/api/webapi'
const CLUB55_ORIGIN = 'https://ayhbaw55.com'

// 2. Secondary High-Availability Backup API
const VEER_API_BASE = 'https://api.veergameapi.com/api/webapi'
const VEER_ORIGIN = 'https://www.veergame32.com'

// 3. Tertiary mirror
const MIRROR3_API_BASE = 'https://api.55clubapi.net/api/webapi'
const MIRROR3_ORIGIN = 'https://www.55club.io'

function generateRandomHex() {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (e) {
    const t = (Math.random() * 16) | 0
    const n = e === 'x' ? t : (t & 3) | 8
    return n.toString(16)
  })
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
 * Call 55CLUB WebAPI with automatic failover to secondary gateway
 */
export async function call55ClubAPI(endpoint, data = {}) {
  const signed = signPayload(data)
  const servers = [
    { base: CLUB55_API_BASE, origin: CLUB55_ORIGIN, name: '55club' },
    { base: VEER_API_BASE, origin: VEER_ORIGIN, name: 'veergame' },
    { base: MIRROR3_API_BASE, origin: MIRROR3_ORIGIN, name: '55club_mirror3' },
  ]

  let lastErr = null
  for (const s of servers) {
    // Each server gets up to 2 attempts before moving on
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
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
            return json
          }
        }
        // Non-200 or bad JSON — don't retry this server
        break
      } catch (err) {
        clearTimeout(timeoutId)
        lastErr = err
        // Only retry on abort/network errors, not on logic errors
        if (err.name !== 'AbortError') break
        // Small back-off before retry
        await new Promise((r) => setTimeout(r, 300))
      }
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

        const result = {
          success: true,
          source: res._serverSource || '55club',
          typeId,
          issueNumber,
          startTime,
          endTime,
          secondsRemaining,
          isLocked: secondsRemaining <= 5,
        }
        issueCache.set(typeId, { data: result, timestamp: Date.now() })
        return result
      }
    } catch (err) {
      console.warn('[55CLUB API] Live issue fetch error:', err.message)
    } finally {
      inFlightRequests.delete(inFlightKey)
    }

    // Resilient fallback if upstream is down/slow
    const now = Date.now()
    const intervalSec = typeId === 30 ? 30 : typeId === 1 ? 60 : typeId === 2 ? 180 : 300
    const intervalMs = intervalSec * 1000
    const roundIdx = Math.floor(now / intervalMs)
    const msRem = Math.max(0, (roundIdx + 1) * intervalMs - now)
    const d = new Date()
    const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, '')
    const fallbackIssue = `${yyyymmdd}${typeId === 30 ? '10005' : '10001'}${String(roundIdx % 10000).padStart(4, '0')}`

    const fallbackResult = {
      success: true,
      source: 'fallback',
      typeId,
      issueNumber: fallbackIssue,
      secondsRemaining: Math.ceil(msRem / 1000),
      isLocked: Math.ceil(msRem / 1000) <= 5,
    }
    issueCache.set(typeId, { data: fallbackResult, timestamp: Date.now() })
    return fallbackResult
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
      console.warn('[55CLUB API] History fetch error:', err.message)
    } finally {
      inFlightRequests.delete(inFlightKey)
    }

    // Fallback history generator
    const fallbackList = []
    const currentIssue = Math.floor(Date.now() / 30000)
    for (let i = 1; i <= 15; i++) {
      const r = currentIssue - i
      const digit = (r * 37 + 17) % 10
      const color = digit === 0 || digit === 5 ? 'violet' : digit % 2 === 0 ? 'red' : 'green'
      fallbackList.push({
        issueNumber: `2026091210005${String(r % 10000).padStart(4, '0')}`,
        digit,
        color,
        rawColour: color,
        size: digit >= 5 ? 'Big' : 'Small',
      })
    }

    const fallbackResult = {
      success: true,
      source: 'fallback',
      typeId,
      list: fallbackList,
    }
    historyCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() })
    return fallbackResult
  })()

  inFlightRequests.set(inFlightKey, promise)
  return promise
}
