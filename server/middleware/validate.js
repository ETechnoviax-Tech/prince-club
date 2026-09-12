const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UTR_REGEX = /^\d{12}$/
const OTP_REGEX = /^\d{6}$/

const VALID_BET_SELECTIONS = new Set([
  'green',
  'violet',
  'red',
  'big',
  'small',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
])

export const VALID_GAME_MODES = new Set(['PARITY', 'SAPRE', 'BCONE', 'EMERD'])


export function validateSignup(req, res, next) {
  const { username, email, password, referralCode } = req.body

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' })
  }

  const cleanUsername = username.trim()
  if (!USERNAME_REGEX.test(cleanUsername)) {
    return res.status(400).json({
      error: 'Username must be 3-24 characters long and contain only letters, numbers, and underscores (no spaces or special characters)',
    })
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' })
  }

  if (password.length > 64) {
    return res.status(400).json({ error: 'Password must not exceed 64 characters' })
  }

  let cleanEmail = null
  if (email && typeof email === 'string' && email.trim().length > 0) {
    cleanEmail = email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 100) {
      return res.status(400).json({ error: 'Invalid email address format' })
    }
  }

  let cleanReferral = null
  if (referralCode && typeof referralCode === 'string') {
    cleanReferral = referralCode.trim().toUpperCase()
    if (!/^[A-Z0-9_]{3,16}$/.test(cleanReferral)) {
      return res.status(400).json({ error: 'Invalid referral code format' })
    }
  }

  req.validatedSignup = {
    username: cleanUsername.toLowerCase(),
    email: cleanEmail,
    password,
    referralCode: cleanReferral,
  }

  next()
}

export function validateLogin(req, res, next) {
  const { username, identity, password } = req.body
  const rawId = username || identity

  if (!rawId || typeof rawId !== 'string' || rawId.trim().length < 3) {
    return res.status(400).json({ error: 'Username or phone must be at least 3 characters' })
  }

  const cleanId = rawId.trim()
  if (cleanId.length > 50) {
    return res.status(400).json({ error: 'Username exceeds maximum allowed length' })
  }

  req.validatedLogin = {
    identity: cleanId.toLowerCase(),
    password: password && typeof password === 'string' ? password : null,
  }

  next()
}

export function validateForgotPassword(req, res, next) {
  const { identity } = req.body
  if (!identity || typeof identity !== 'string' || identity.trim().length < 3) {
    return res.status(400).json({ error: 'Please provide a valid registered username or phone' })
  }

  const cleanId = identity.trim().toLowerCase()
  if (cleanId.length > 50) {
    return res.status(400).json({ error: 'Invalid identity format' })
  }

  req.cleanIdentity = cleanId
  next()
}

export function validateResetPassword(req, res, next) {
  const { identity, resetCode, newPassword } = req.body

  if (!identity || typeof identity !== 'string' || identity.trim().length < 3) {
    return res.status(400).json({ error: 'Identity is required' })
  }

  if (!resetCode || typeof resetCode !== 'string' || !OTP_REGEX.test(resetCode.trim())) {
    return res.status(400).json({ error: 'Reset verification code must be a 6-digit number' })
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' })
  }

  if (newPassword.length > 64) {
    return res.status(400).json({ error: 'New password must not exceed 64 characters' })
  }

  req.validatedReset = {
    identity: identity.trim().toLowerCase(),
    resetCode: resetCode.trim(),
    newPassword,
  }

  next()
}

export function validateBetPlacement(req, res, next) {
  const { selection, amount } = req.body
  const authUserId = req.user ? req.user.id : req.body.userId

  if (!authUserId || typeof authUserId !== 'string') {
    return res.status(401).json({ error: 'Authenticated user session is required' })
  }

  // Prevent user spoofing another user's ID
  if (req.user && req.body.userId && req.user.id !== req.body.userId) {
    return res.status(403).json({ error: 'Security violation: Cannot place bets on behalf of another user' })
  }

  if (!selection || typeof selection !== 'string') {
    return res.status(400).json({ error: 'Bet selection is required' })
  }

  const cleanSelection = selection.trim().toLowerCase()
  if (!VALID_BET_SELECTIONS.has(cleanSelection)) {
    return res.status(400).json({
      error: 'Invalid selection. Must be green, violet, red, big, small, or digits 0-9.',
    })
  }

  const rawMode = req.body.mode || 'PARITY'
  const cleanMode = String(rawMode).trim().toUpperCase()
  if (!VALID_GAME_MODES.has(cleanMode)) {
    return res.status(400).json({ error: 'Invalid game mode. Must be PARITY, SAPRE, BCONE, or EMERD.' })
  }

  const numAmount = Number(amount)
  if (!Number.isFinite(numAmount) || !Number.isInteger(numAmount) || numAmount < 10) {
    return res.status(400).json({ error: 'Minimum bet amount is ₹10 (whole number)' })
  }

  if (numAmount > 50000) {
    return res.status(400).json({ error: 'Maximum bet amount per round is ₹50,000' })
  }

  req.validatedBet = {
    userId: authUserId,
    selection: cleanSelection,
    amount: numAmount,
    mode: cleanMode,
  }

  next()
}

export function validateWithdrawalRequest(req, res, next) {
  const { amount, payoutMethod, upiId, bankDetails } = req.body
  const authUserId = req.user ? req.user.id : req.body.userId

  if (!authUserId || typeof authUserId !== 'string') {
    return res.status(401).json({ error: 'Authenticated user session is required' })
  }

  if (req.user && req.body.userId && req.user.id !== req.body.userId) {
    return res.status(403).json({ error: 'Security violation: Cannot request withdrawal for another user' })
  }

  const numAmount = Number(amount)
  if (!Number.isFinite(numAmount) || numAmount < 100) {
    return res.status(400).json({ error: 'Minimum withdrawal amount is ₹100' })
  }

  if (numAmount > 100000) {
    return res.status(400).json({ error: 'Maximum withdrawal amount per transaction is ₹100,000' })
  }

  const method = String(payoutMethod || 'UPI').trim().toUpperCase()
  if (method !== 'UPI' && method !== 'BANK') {
    return res.status(400).json({ error: 'Payout method must be UPI or BANK' })
  }

  const cleanDetails = {}

  if (method === 'UPI') {
    if (!upiId || typeof upiId !== 'string' || !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
      return res.status(400).json({ error: 'Valid UPI ID is required (e.g. name@okhdfcbank)' })
    }
    cleanDetails.upiId = upiId.trim()
  } else {
    if (!bankDetails || typeof bankDetails !== 'object') {
      return res.status(400).json({ error: 'Bank details object is required' })
    }
    const { accountNumber, ifsc, holderName } = bankDetails
    if (!accountNumber || !/^\d{9,18}$/.test(String(accountNumber).trim())) {
      return res.status(400).json({ error: 'Bank account number must be 9-18 digits' })
    }
    if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(ifsc).trim().toUpperCase())) {
      return res.status(400).json({ error: 'Valid 11-character Indian bank IFSC code required (e.g. SBIN0001234)' })
    }
    if (!holderName || typeof holderName !== 'string' || holderName.trim().length < 2) {
      return res.status(400).json({ error: 'Account holder name is required' })
    }
    cleanDetails.accountNumber = String(accountNumber).trim()
    cleanDetails.ifsc = String(ifsc).trim().toUpperCase()
    cleanDetails.holderName = holderName.trim()
  }

  req.validatedWithdrawal = {
    userId: authUserId,
    amount: Math.floor(numAmount),
    payoutMethod: method,
    payoutDetails: cleanDetails,
  }

  next()
}

export function validateDepositRequest(req, res, next) {
  const { amount } = req.body
  const authUserId = req.user ? req.user.id : req.body.userId

  if (!authUserId || typeof authUserId !== 'string') {
    return res.status(401).json({ error: 'Authenticated user session is required' })
  }

  // Anti-spoofing
  if (req.user && req.body.userId && req.user.id !== req.body.userId) {
    return res.status(403).json({ error: 'Security violation: Cannot create deposit for another user' })
  }

  const parsedAmount = Number(amount)
  if (!Number.isFinite(parsedAmount) || isNaN(parsedAmount) || parsedAmount < 100) {
    return res.status(400).json({ error: 'Minimum deposit amount is ₹100' })
  }

  if (parsedAmount > 100000) {
    return res.status(400).json({ error: 'Maximum deposit amount per transaction is ₹100,000' })
  }

  req.validatedAmount = Math.round(parsedAmount)
  req.targetUserId = authUserId
  next()
}

export function validateUTRSubmission(req, res, next) {
  const { depositId, utrNumber } = req.body

  if (!depositId || typeof depositId !== 'string') {
    return res.status(400).json({ error: 'Valid depositId is required' })
  }

  if (!utrNumber || typeof utrNumber !== 'string') {
    return res.status(400).json({ error: 'utrNumber is required' })
  }

  const cleanUTR = utrNumber.trim()
  if (!UTR_REGEX.test(cleanUTR)) {
    return res.status(400).json({
      error: 'Invalid UTR format. UTR must be exactly 12 numeric digits (e.g., 423512345678).',
    })
  }

  req.cleanUTR = cleanUTR
  next()
}
