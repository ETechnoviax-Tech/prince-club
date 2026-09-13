import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'

// In-memory Aviator state
const state = {
  roundId: 100001,
  phase: 'WAITING', // 'WAITING' | 'FLYING' | 'CRASHED'
  crashPoint: 2.15,
  startTime: Date.now(),
  flightDurationMs: 0,
  history: [
    { roundId: 99995, crashPoint: 1.24 },
    { roundId: 99996, crashPoint: 3.85 },
    { roundId: 99997, crashPoint: 1.08 },
    { roundId: 99998, crashPoint: 14.52 },
    { roundId: 99999, crashPoint: 2.15 },
    { roundId: 100000, crashPoint: 1.62 },
  ],
  bets: new Map(), // key: betId, val: { id, userId, amount, autoCashout, status, cashoutMultiplier, payout }
}

const WAITING_DURATION_MS = 6000
const COOLDOWN_DURATION_MS = 3000

// Generate weighted crash point
function generateCrashPoint() {
  const rand = Math.random()
  if (rand < 0.1) {
    // 10% instant/low crash: 1.01x - 1.20x
    return +(1.01 + Math.random() * 0.19).toFixed(2)
  } else if (rand < 0.65) {
    // 55% standard flight: 1.21x - 3.50x
    return +(1.21 + Math.random() * 2.29).toFixed(2)
  } else if (rand < 0.92) {
    // 27% high flight: 3.51x - 12.00x
    return +(3.51 + Math.random() * 8.49).toFixed(2)
  } else {
    // 8% mega flight: 12.01x - 100.00x
    return +(12.01 + Math.random() * 87.99).toFixed(2)
  }
}

// Compute current multiplier from flight elapsed ms
function calculateMultiplier(elapsedMs) {
  if (elapsedMs <= 0) return 1.0
  const seconds = elapsedMs / 1000
  // Exponential curve
  const mult = 1.0 + 0.06 * Math.pow(seconds, 1.45)
  return +mult.toFixed(2)
}

// Calculate how many ms it takes to reach a specific crash point
function durationForCrashPoint(crashPoint) {
  // crashPoint = 1.0 + 0.06 * (s ^ 1.45)
  // (crashPoint - 1.0) / 0.06 = s ^ 1.45
  const diff = Math.max(0.01, crashPoint - 1.0)
  const seconds = Math.pow(diff / 0.06, 1 / 1.45)
  return Math.round(seconds * 1000)
}

// Aviator Server Loop
function startAviatorLoop() {
  state.phase = 'WAITING'
  state.startTime = Date.now()

  const tick = async () => {
    const now = Date.now()

    if (state.phase === 'WAITING') {
      const elapsed = now - state.startTime
      if (elapsed >= WAITING_DURATION_MS) {
        // Transition to FLYING
        state.phase = 'FLYING'
        state.crashPoint = generateCrashPoint()
        state.flightDurationMs = durationForCrashPoint(state.crashPoint)
        state.startTime = Date.now()
      }
    } else if (state.phase === 'FLYING') {
      const elapsed = now - state.startTime
      const currentMult = calculateMultiplier(elapsed)

      // Check auto-cashouts
      for (const [betId, b] of state.bets.entries()) {
        if (b.status === 'ACTIVE' && b.autoCashout && currentMult >= b.autoCashout) {
          await settleCashout(b, b.autoCashout)
        }
      }

      if (elapsed >= state.flightDurationMs || currentMult >= state.crashPoint) {
        // Plane Flew Away / Crashed!
        state.phase = 'CRASHED'
        state.startTime = Date.now()

        // Settle remaining active bets as LOST
        for (const [betId, b] of state.bets.entries()) {
          if (b.status === 'ACTIVE') {
            b.status = 'LOST'
            b.payout = 0
            if (isSupabaseConfigured) {
              supabase.from('bets').update({ status: 'LOST', payout: 0 }).eq('id', b.id).catch(() => {})
            }
          }
        }

        // Add to history
        state.history.unshift({ roundId: state.roundId, crashPoint: state.crashPoint })
        if (state.history.length > 30) state.history.pop()
      }
    } else if (state.phase === 'CRASHED') {
      const elapsed = now - state.startTime
      if (elapsed >= COOLDOWN_DURATION_MS) {
        // Start next round
        state.roundId++
        state.phase = 'WAITING'
        state.startTime = Date.now()
        state.bets.clear()
      }
    }
  }

  const loop = setInterval(tick, 200)
  if (loop?.unref) loop.unref()
}

startAviatorLoop()

// Settle Cashout helper
async function settleCashout(bet, multiplier) {
  if (bet.status !== 'ACTIVE') return false
  const mult = Math.min(multiplier, state.crashPoint)
  const payout = Math.round(bet.amount * mult)

  bet.status = 'CASHED_OUT'
  bet.cashoutMultiplier = mult
  bet.payout = payout

  if (isSupabaseConfigured) {
    try {
      await supabase.from('bets').update({ status: 'WON', payout }).eq('id', bet.id)
      const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', bet.userId).single()
      if (wal) {
        const newBal = Number(wal.balance) + payout
        await supabase.from('wallets').update({ balance: newBal }).eq('user_id', bet.userId)
        await supabase.from('wallet_transactions').insert({
          user_id: bet.userId,
          type: 'BET_PAYOUT',
          amount: payout,
          balance_after: newBal,
          reference_id: bet.id,
          description: `Aviator Cash Out at ${mult}x (+₹${payout})`,
        })
      }
    } catch (err) {
      console.error('[settleCashout Supabase error]:', err)
    }
  }

  return { payout, mult }
}

// 1. Get Live State
export function getAviatorState(req, res) {
  const now = Date.now()
  let currentMultiplier = 1.0
  let remainingMs = 0

  if (state.phase === 'WAITING') {
    remainingMs = Math.max(0, WAITING_DURATION_MS - (now - state.startTime))
    currentMultiplier = 1.0
  } else if (state.phase === 'FLYING') {
    const elapsed = now - state.startTime
    currentMultiplier = calculateMultiplier(elapsed)
    remainingMs = Math.max(0, state.flightDurationMs - elapsed)
  } else if (state.phase === 'CRASHED') {
    remainingMs = Math.max(0, COOLDOWN_DURATION_MS - (now - state.startTime))
    currentMultiplier = state.crashPoint
  }

  return res.json({
    roundId: state.roundId,
    phase: state.phase,
    multiplier: currentMultiplier,
    crashPoint: state.phase === 'CRASHED' ? state.crashPoint : null,
    remainingMs,
    history: state.history.slice(0, 20),
    serverTime: now,
  })
}

// 2. Place Bet
export async function placeAviatorBet(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.body.userId
    const { amount, autoCashout } = req.body

    if (!authUserId) {
      return res.status(401).json({ error: 'User authentication required' })
    }

    const numAmount = Number(amount)
    if (!Number.isFinite(numAmount) || numAmount < 10) {
      return res.status(400).json({ error: 'Minimum bet amount is ₹10' })
    }

    if (numAmount > 50000) {
      return res.status(400).json({ error: 'Maximum bet amount is ₹50,000' })
    }

    if (state.phase !== 'WAITING') {
      return res.status(400).json({ error: 'Bets are only accepted before takeoff during waiting countdown' })
    }

    const cleanAuto = autoCashout ? Number(autoCashout) : null
    if (cleanAuto && (cleanAuto < 1.05 || cleanAuto > 100)) {
      return res.status(400).json({ error: 'Auto cashout multiplier must be between 1.05x and 100x' })
    }

    const betId = crypto.randomUUID()
    let balanceAfter = 1000

    if (isSupabaseConfigured) {
      const { data: wal, error: walErr } = await supabase.from('wallets').select('balance').eq('user_id', authUserId).single()
      if (walErr || !wal) return res.status(404).json({ error: 'Wallet not found' })
      if (Number(wal.balance) < numAmount) return res.status(400).json({ error: 'Insufficient wallet balance' })

      balanceAfter = Number(wal.balance) - numAmount
      const { error: updateErr } = await supabase
        .from('wallets')
        .update({ balance: balanceAfter })
        .eq('user_id', authUserId)
        .gte('balance', numAmount)

      if (updateErr) return res.status(400).json({ error: 'Transaction failed, insufficient balance' })

      await supabase.from('bets').insert({
        id: betId,
        user_id: authUserId,
        round_number: String(state.roundId),
        selection: 'aviator',
        amount: numAmount,
        status: 'PENDING',
        game_mode: 'AVIATOR',
      })

      await supabase.from('wallet_transactions').insert({
        user_id: authUserId,
        type: 'BET_PLACED',
        amount: -numAmount,
        balance_after: balanceAfter,
        reference_id: betId,
        description: `Aviator Bet Round #${state.roundId}`,
      })
    }

    const betRecord = {
      id: betId,
      userId: authUserId,
      amount: numAmount,
      autoCashout: cleanAuto,
      status: 'ACTIVE',
      cashoutMultiplier: null,
      payout: 0,
      roundId: state.roundId,
    }

    state.bets.set(betId, betRecord)

    return res.json({
      success: true,
      betId,
      roundId: state.roundId,
      amount: numAmount,
      autoCashout: cleanAuto,
      newBalance: balanceAfter,
    })
  } catch (err) {
    console.error('[placeAviatorBet error]:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// 3. Cash Out
export async function cashoutAviator(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.body.userId
    const { betId } = req.body

    if (!authUserId || !betId) {
      return res.status(400).json({ error: 'Valid userId and betId required' })
    }

    const bet = state.bets.get(betId)
    if (!bet || bet.userId !== authUserId) {
      return res.status(404).json({ error: 'Active bet not found' })
    }

    if (bet.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Bet is already ${bet.status}` })
    }

    if (state.phase !== 'FLYING') {
      return res.status(400).json({ error: 'Cannot cash out. Round is not in flight.' })
    }

    const now = Date.now()
    const currentMult = calculateMultiplier(now - state.startTime)

    if (currentMult >= state.crashPoint) {
      bet.status = 'LOST'
      return res.status(400).json({ error: 'Too late! The plane already flew away.' })
    }

    const result = await settleCashout(bet, currentMult)

    let finalBalance = 1000
    if (isSupabaseConfigured) {
      const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', authUserId).single()
      if (wal) finalBalance = Number(wal.balance)
    }

    return res.json({
      success: true,
      betId,
      payout: result.payout,
      multiplier: result.mult,
      newBalance: finalBalance,
      message: `Cashed out at ${result.mult}x for ₹${result.payout}!`,
    })
  } catch (err) {
    console.error('[cashoutAviator error]:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// 4. Get History
export function getAviatorHistory(req, res) {
  return res.json({
    history: state.history,
  })
}
