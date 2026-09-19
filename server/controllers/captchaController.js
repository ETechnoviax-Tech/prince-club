import crypto from 'crypto'

const CAPTCHA_TTL_MS = 2 * 60 * 1000
const challenges = new Map()
const runtimeSecret = crypto.randomBytes(32).toString('hex')
const secret = () => process.env.CAPTCHA_SECRET || process.env.AUTH_SECRET || runtimeSecret

function fingerprint(req) {
  return crypto.createHash('sha256')
    .update(`${req.ip || ''}|${req.get('user-agent') || ''}`)
    .digest('hex')
}

function sign(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

export function issueCaptcha(req, res) {
  const id = crypto.randomUUID()
  const challenge = {
    id,
    targetX: crypto.randomInt(110, 220),
    targetY: crypto.randomInt(25, 95),
    createdAt: Date.now(),
    fingerprint: fingerprint(req),
  }
  challenges.set(id, challenge)
  res.json({
    challenge: sign({ id, targetX: challenge.targetX, targetY: challenge.targetY, createdAt: challenge.createdAt }),
    targetX: challenge.targetX,
    targetY: challenge.targetY,
    expiresInMs: CAPTCHA_TTL_MS,
  })
}

export function verifyCaptcha(req, res, next) {
  const token = req.body?.captchaToken
  const proof = req.body?.captchaProof
  if (typeof token !== 'string' || !proof || typeof proof !== 'object') {
    return res.status(400).json({ error: 'CAPTCHA verification is required' })
  }

  const [encoded, receivedSignature] = token.split('.')
  if (!encoded || !receivedSignature) return res.status(400).json({ error: 'Invalid CAPTCHA token' })
  const expectedSignature = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url')
  const expected = Buffer.from(expectedSignature)
  const received = Buffer.from(receivedSignature)
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return res.status(400).json({ error: 'Invalid CAPTCHA token' })
  }

  let payload
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'Invalid CAPTCHA token' })
  }

  const challenge = challenges.get(payload.id)
  challenges.delete(payload.id)
  if (!challenge || Date.now() - challenge.createdAt > CAPTCHA_TTL_MS) {
    return res.status(400).json({ error: 'CAPTCHA expired. Please try again.' })
  }
  if (challenge.fingerprint !== fingerprint(req)) {
    return res.status(400).json({ error: 'CAPTCHA session mismatch. Please try again.' })
  }
  if (
    Number(proof.targetX) !== challenge.targetX ||
    Number(proof.targetY) !== challenge.targetY ||
    !Number.isFinite(Number(proof.startedAt)) ||
    !Number.isFinite(Number(proof.completedAt)) ||
    Number(proof.completedAt) - Number(proof.startedAt) < 350 ||
    Number(proof.completedAt) - Number(proof.startedAt) > CAPTCHA_TTL_MS ||
    !Array.isArray(proof.path) ||
    proof.path.length < 4 ||
    proof.path.length > 300
  ) {
    return res.status(400).json({ error: 'CAPTCHA interaction could not be verified' })
  }

  req.captchaVerified = true
  next()
}

setInterval(() => {
  const cutoff = Date.now() - CAPTCHA_TTL_MS
  for (const [id, challenge] of challenges) {
    if (challenge.createdAt < cutoff) challenges.delete(id)
  }
}, 60_000).unref()
