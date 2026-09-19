import crypto from 'crypto'

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'prince_club_super_secure_vault_2026_key!'

export function generateToken(payload, expiresInSeconds = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  const fullPayload = { ...payload, exp }

  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encHeader}.${encPayload}`)
    .digest('base64url')

  return `${encHeader}.${encPayload}.${signature}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [encHeader, encPayload, signature] = parts
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encHeader}.${encPayload}`)
    .digest('base64url')

  if (signature !== expectedSignature) return null

  try {
    const payload = JSON.parse(Buffer.from(encPayload, 'base64url').toString('utf8'))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null // Expired token
    }
    return payload
  } catch {
    return null
  }
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  let token = null

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim()
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token']
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Missing token.' })
  }

  const user = verifyToken(token)
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' })
  }

  req.user = user
  next()
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    const user = verifyToken(token)
    if (user) req.user = user
  }
  next()
}

export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing token.' })
  }

  const user = verifyToken(authHeader.slice(7).trim())
  if (!user || !(user.role === 'admin' || user.is_admin === true)) {
    return res.status(403).json({ error: 'Access denied: Admin account required' })
  }

  req.user = user
  next()
}
