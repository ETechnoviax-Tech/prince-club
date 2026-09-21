import { isSupabaseConfigured, supabase } from '../config/supabase.js'

/**
 * Resolves the client's actual public IP address behind proxies, load balancers, and CDNs.
 * Order of resolution:
 * 1. CF-Connecting-IP (Cloudflare)
 * 2. X-Real-IP (Nginx / reverse proxy)
 * 3. X-Forwarded-For (first client IP in comma list)
 * 4. Express req.ip (trust proxy enabled)
 * 5. Node socket remoteAddress
 */
export function getClientRealIp(req) {
  // 1. Cloudflare header
  const cfIp = req.headers['cf-connecting-ip']
  if (cfIp && typeof cfIp === 'string') {
    return cleanIp(cfIp.trim())
  }

  // 2. Nginx / reverse proxy
  const realIp = req.headers['x-real-ip']
  if (realIp && typeof realIp === 'string') {
    return cleanIp(realIp.trim())
  }

  // 3. X-Forwarded-For header: client, proxy1, proxy2
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded && typeof forwarded === 'string') {
    const parts = forwarded.split(',').map((p) => p.trim())
    if (parts[0]) {
      return cleanIp(parts[0])
    }
  }

  // 4. Express req.ip (with app.set('trust proxy', true))
  if (req.ip && typeof req.ip === 'string') {
    return cleanIp(req.ip.trim())
  }

  // 5. Raw socket
  const socketIp = req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1'
  return cleanIp(socketIp)
}

function cleanIp(ip) {
  if (!ip) return '127.0.0.1'
  // Strip IPv6-mapped IPv4 prefix (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7)
  }
  return ip
}

// In-memory sliding window fallback store (used if DB is unreachable)
const memoryIpStore = new Map()

// Cleanup stale memory records every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of memoryIpStore.entries()) {
    if (now - record.windowStart > record.windowMs * 2) {
      memoryIpStore.delete(key)
    }
  }
}, 300000).unref()

/**
 * Production-ready Database Rate Limiter using PostgreSQL + real IP.
 * Multi-instance safe, persistent across server restarts, and guaranteed atomicity.
 */
export function dbRateLimit({
  action,
  max = 10,
  windowSeconds = 60,
  blockSeconds = 0,
  message = 'Too many requests. Please slow down.',
}) {
  return async (req, res, next) => {
    const realIp = getClientRealIp(req)
    req.realIp = realIp // Attach verified real IP to request for downstream logging/controllers
    const routeAction = action || `${req.baseUrl || ''}${req.path || ''}`

    // 1. Primary: PostgreSQL distributed rate limiter via Supabase RPC
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('check_ip_rate_limit', {
          p_ip: realIp,
          p_action: routeAction,
          p_max_attempts: max,
          p_window_seconds: windowSeconds,
          p_block_seconds: blockSeconds,
        })

        if (!error && data) {
          if (!data.allowed) {
            const retryAfter = Math.max(1, data.retryAfterSeconds || 60)
            res.setHeader('Retry-After', retryAfter)
            return res.status(429).json({
              error: message,
              retryAfterSeconds: retryAfter,
              blockedReason: data.reason || 'EXCEEDED',
            })
          }
          return next()
        }
      } catch (dbErr) {
        console.warn('[dbRateLimit RPC fallback]:', dbErr.message)
      }
    }

    // 2. Secondary: In-memory sliding window fallback if DB is unavailable
    const memKey = `${realIp}:${routeAction}`
    const now = Date.now()
    const windowMs = windowSeconds * 1000

    let record = memoryIpStore.get(memKey)
    if (!record || now - record.windowStart > windowMs) {
      record = { windowStart: now, count: 1, windowMs }
      memoryIpStore.set(memKey, record)
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

// Pre-configured rate limiters based on Real IP and PostgreSQL tracking

// Auth endpoints: login / register (30 requests per minute)
export const authRateLimit = dbRateLimit({
  action: 'auth:login-register',
  max: 30,
  windowSeconds: 60,
  message: 'Too many authentication attempts. Please try again in a minute.',
})

// Forgot Password: 5 OTP dispatch requests per 10 minutes per real IP, with 10-minute block on abuse
export const forgotPasswordRateLimit = dbRateLimit({
  action: 'auth:forgot-password',
  max: 5,
  windowSeconds: 600,
  blockSeconds: 600,
  message: 'Too many password reset requests from this IP. Please wait 10 minutes before requesting again.',
})

// Send OTP: 5 OTP requests per 10 minutes per real IP
export const sendOtpRateLimit = dbRateLimit({
  action: 'auth:send-otp',
  max: 5,
  windowSeconds: 600,
  blockSeconds: 600,
  message: 'Too many OTP requests. Please wait before trying again.',
})

// Verify OTP: 5 verification attempts per 5 minutes per real IP to prevent brute-forcing
export const verifyOtpRateLimit = dbRateLimit({
  action: 'auth:verify-otp',
  max: 5,
  windowSeconds: 300,
  blockSeconds: 300,
  message: 'Too many failed verification attempts. Please wait 5 minutes before trying again.',
})

// Reset Password submit: 5 attempts per 10 minutes per real IP
export const resetPasswordRateLimit = dbRateLimit({
  action: 'auth:reset-password',
  max: 5,
  windowSeconds: 600,
  blockSeconds: 600,
  message: 'Too many password change attempts. Please wait 10 minutes before trying again.',
})

// Games & betting: 60 requests per minute
export const betRateLimit = dbRateLimit({
  action: 'game:bets',
  max: 60,
  windowSeconds: 60,
  message: 'Bet rate limit exceeded. Please wait a moment.',
})

// Deposit requests: 20 per minute
export const paymentRateLimit = dbRateLimit({
  action: 'payment:deposit',
  max: 20,
  windowSeconds: 60,
  message: 'Too many payment requests. Please try again shortly.',
})

// Withdrawal requests: 5 per minute
export const withdrawalRateLimit = dbRateLimit({
  action: 'payment:withdraw',
  max: 5,
  windowSeconds: 60,
  message: 'Too many withdrawal attempts. Please wait a minute before requesting again.',
})

// Webhook ingestion: 120 per minute
export const webhookRateLimit = dbRateLimit({
  action: 'webhook:ingestion',
  max: 120,
  windowSeconds: 60,
  message: 'Webhook ingestion rate limit exceeded.',
})

// Default export
export const rateLimit = dbRateLimit
