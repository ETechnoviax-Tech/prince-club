// Lightweight, zero-dependency in-memory sliding window rate limiter
const ipStore = new Map()

// Clean up stale IPs every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of ipStore.entries()) {
    if (now - record.windowStart > record.windowMs * 2) {
      ipStore.delete(key)
    }
  }
}, 300000).unref()

export function rateLimit({ windowMs = 60000, max = 30, message = 'Too many requests. Please slow down.' }) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1'
    const route = req.baseUrl || req.path
    const key = `${ip}:${route}`
    const now = Date.now()

    let record = ipStore.get(key)
    if (!record || now - record.windowStart > windowMs) {
      record = { windowStart: now, count: 1, windowMs }
      ipStore.set(key, record)
      return next()
    }

    record.count++
    if (record.count > max) {
      const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000)
      res.setHeader('Retry-After', retryAfter)
      return res.status(429).json({
        error: message,
        retryAfterSeconds: Math.max(1, retryAfter),
      })
    }

    next()
  }
}

export const authRateLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 15,         // max 15 login/register attempts per minute per IP
  message: 'Too many authentication attempts. Please try again in a minute.',
})

export const betRateLimit = rateLimit({
  windowMs: 60000,
  max: 60,         // max 60 bet requests per minute
  message: 'Bet rate limit exceeded. Please wait a moment.',
})

export const paymentRateLimit = rateLimit({
  windowMs: 60000,
  max: 20,         // max 20 deposit attempts per minute
  message: 'Too many payment requests. Please try again shortly.',
})
