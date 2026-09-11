import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'

const ROUND_DURATION_MS = 45000 // 45s rounds
const LOCK_DURATION_MS = 8000   // 8s lock window

function calculateOutcome(roundNumber) {
  const digit = Number((BigInt(roundNumber) * 37n + 17n) % 10n)
  let color = 'red'
  let multiplier = 2.2

  if (digit === 0 || digit === 5) {
    color = 'violet'
    multiplier = 4.4
  } else if (digit % 2 === 0) {
    color = 'green'
    multiplier = 2.2
  }

  return { roundNumber, digit, color, multiplier }
}

export function getCurrentRound(req, res) {
  const now = Date.now()
  const roundNumber = Math.floor(now / ROUND_DURATION_MS)
  const roundStartTime = roundNumber * ROUND_DURATION_MS
  const roundEndTime = roundStartTime + ROUND_DURATION_MS
  const lockStartTime = roundEndTime - LOCK_DURATION_MS

  const msRemaining = Math.max(0, roundEndTime - now)
  const secondsRemaining = Math.ceil(msRemaining / 1000)
  const isLocked = now >= lockStartTime

  // Build last 15 historical outcomes deterministically
  const history = []
  for (let i = 1; i <= 15; i++) {
    const r = roundNumber - i
    const outcome = calculateOutcome(r)
    history.push({
      roundNumber: r,
      digit: outcome.digit,
      color: outcome.color,
      endedAt: new Date((r + 1) * ROUND_DURATION_MS).toISOString(),
    })
  }

  return res.json({
    roundNumber,
    secondsRemaining,
    msRemaining,
    isLocked,
    roundStartTime: new Date(roundStartTime).toISOString(),
    roundEndTime: new Date(roundEndTime).toISOString(),
    lockDurationSeconds: LOCK_DURATION_MS / 1000,
    roundDurationSeconds: ROUND_DURATION_MS / 1000,
    history,
  })
}

export async function placeBet(req, res) {
  try {
    const { userId, selection, amount } = req.body
    const parsedAmount = Number(amount)

    if (!userId || !selection || !parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid bet parameters' })
    }

    const now = Date.now()
    const roundNumber = Math.floor(now / ROUND_DURATION_MS)
    const roundEndTime = (roundNumber + 1) * ROUND_DURATION_MS
    const lockStartTime = roundEndTime - LOCK_DURATION_MS

    if (now >= lockStartTime) {
      return res.status(400).json({ error: 'Round is locked. Bets are closed for this round.' })
    }

    const validSelections = ['green', 'red', 'violet', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
    if (!validSelections.includes(String(selection).toLowerCase())) {
      return res.status(400).json({ error: 'Invalid selection' })
    }

    let multiplier = 2.2
    const sel = String(selection).toLowerCase()
    if (sel === 'violet') multiplier = 4.4
    else if (!['green', 'red', 'violet'].includes(sel)) multiplier = 9.0 // direct digit bet

    const betRecord = {
      id: crypto.randomUUID(),
      round_number: roundNumber,
      user_id: userId,
      selection: sel,
      amount: parsedAmount,
      multiplier,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured) {
      // Check user wallet balance
      const { data: wallet, error: walErr } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (walErr || !wallet) {
        return res.status(404).json({ error: 'Wallet not found' })
      }

      if (wallet.balance < parsedAmount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' })
      }

      const newBalance = wallet.balance - parsedAmount

      // Deduct balance
      await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', userId)

      // Record bet
      await supabase.from('bets').insert(betRecord)

      // Record transaction
      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        type: 'BET_PLACED',
        amount: -parsedAmount,
        balance_after: newBalance,
        reference_id: betRecord.id,
        description: `Bet ${parsedAmount} on ${sel} (Round ${roundNumber})`,
      })

      return res.status(201).json({
        message: 'Bet placed successfully',
        bet: betRecord,
        newBalance,
      })
    }

    // Fallback store
    return res.status(201).json({
      message: 'Bet placed successfully',
      bet: betRecord,
    })
  } catch (err) {
    console.error('[placeBet Exception]:', err)
    return res.status(500).json({ error: 'Internal server error placing bet' })
  }
}
