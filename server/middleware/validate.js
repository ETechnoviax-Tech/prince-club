export function validateDepositRequest(req, res, next) {
  const { amount, userId } = req.body
  const parsedAmount = Number(amount)

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required and must be a string' })
  }

  if (!parsedAmount || isNaN(parsedAmount) || parsedAmount < 100) {
    return res.status(400).json({ error: 'Minimum deposit amount is ₹100' })
  }

  if (parsedAmount > 100000) {
    return res.status(400).json({ error: 'Maximum deposit amount per transaction is ₹100,000' })
  }

  req.validatedAmount = Math.round(parsedAmount)
  next()
}

export function validateUTRSubmission(req, res, next) {
  const { depositId, utrNumber } = req.body

  if (!depositId) {
    return res.status(400).json({ error: 'depositId is required' })
  }

  if (!utrNumber || typeof utrNumber !== 'string') {
    return res.status(400).json({ error: 'utrNumber is required' })
  }

  const cleanUTR = utrNumber.trim()
  const utrRegex = /^\d{12}$/

  if (!utrRegex.test(cleanUTR)) {
    return res.status(400).json({
      error: 'Invalid UTR format. UTR must be exactly 12 numeric digits (e.g., 423512345678).',
    })
  }

  req.cleanUTR = cleanUTR
  next()
}
