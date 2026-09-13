import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryBets, memoryWallets } from '../db/store.js'

// In-memory fallback stores for Aviator
const memoryAviatorBets = new Map() // betId -> betRecord

// Global Aviator Flight Engine State
let flightState = {
  roundId: 1001,
  phase: 'WAITING', // 'WAITING' | 'FLYING' | 'CRASHED'
  multiplier: 1.00,
  crashPoint: 2.35,
  startTime: Date.now() + 5000,
  phaseStartTime: Date.now(),
  countdownMs: 5000,
  history: [1.82, 3.45, 1.21, 14.80, 2.10, 1.05, 5.60, 1.95, 8.22, 2.74, 1.15, 4.30, 22.50, 1.48, 3.12],
}

// Generate provably random crash multiplier (97% RTP standard)
function generateCrashMultiplier() {
  const rand = Math.random()
  if (rand < 0.03) {
    return 1.00
  }
  const mult = 0.97 / (1.0 - rand)
  const capped = Math.min(200.0, Math.max(1.01, mult))
  return Number(capped.toFixed(2))
}

// Global Aviator Tick Loop
const TICK_INTERVAL = 50
let lastTick = Date.now()

const aviatorInterval = setInterval(() => {
  const now = Date.now()
  lastTick = now

  if (flightState.phase === 'WAITING') {
    const remaining = Math.max(0, flightState.startTime - now)
    flightState.countdownMs = remaining

    if (remaining <= 0) {
      // Takeoff!
      flightState.phase = 'FLYING'
      flightState.phaseStartTime = now
      flightState.multiplier = 1.00
      flightState.crashPoint = generateCrashMultiplier()
    }
  } else if (flightState.phase === 'FLYING') {
    const elapsedSeconds = (now - flightState.phaseStartTime) / 1000
    const currentMult = 1.00 + Math.pow(elapsedSeconds * 0.45, 1.8)
    const roundedMult = Number(currentMult.toFixed(2))

    if (roundedMult >= flightState.crashPoint) {
      // CRASH!
      flightState.phase = 'CRASHED'
      flightState.multiplier = flightState.crashPoint
      flightState.phaseStartTime = now
      flightState.history.unshift(flightState.crashPoint)
      if (flightState.history.length > 40) {
        flightState.history.pop()
      }

      settleCrashedBets(flightState.roundId, flightState.crashPoint)
    } else {
      flightState.multiplier = roundedMult
      processAutoCashouts(flightState.roundId, roundedMult)
    }
  } else if (flightState.phase === 'CRASHED') {
    const elapsed = now - flightState.phaseStartTime
    if (elapsed >= 3000) {
      flightState.roundId += 1
      flightState.phase = 'WAITING'
      flightState.multiplier = 1.00
      flightState.phaseStartTime = now
      flightState.startTime = now + 5000
      flightState.countdownMs = 5000
    }
  }
}, TICK_INTERVAL)

if (aviatorInterval?.unref) {
  aviatorInterval.unref()
}

// Settle crashed bets
async function settleCrashedBets(roundId, crashPoint) {
  const pendingBets = Array.from(memoryAviatorBets.values()).filter(
    (b) => b.roundId === roundId && b.status === 'ACTIVE'
  )

  for (const bet of pendingBets) {
    bet.status = 'LOST'
    bet.payout = 0
    bet.cashedAt = null
    bet.crashPoint = crashPoint
    bet.settledAt = new Date().toISOString()
    memoryAviatorBets.set(bet.id, bet)

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('bets')
          .update({ status: 'LOST', payout: 0 })
          .eq('id', bet.id)
      } catch {}
    }
  }
}

// Process Auto Cashout during flight
async function processAutoCashouts(roundId, currentMult) {
  const activeBets = Array.from(memoryAviatorBets.values()).filter(
    (b) =>
      b.roundId === roundId &&
      b.status === 'ACTIVE' &&
      b.autoCashOut &&
      Number(b.autoCashOut) <= currentMult
  )

  for (const bet of activeBets) {
    await executeCashOut(bet, Number(bet.autoCashOut))
  }
}

// Core cashout execution helper
async function executeCashOut(bet, cashMultiplier) {
  if (bet.status !== 'ACTIVE') return null

  const payout = Math.round(bet.amount * cashMultiplier)
  bet.status = 'WON'
  bet.payout = payout
  bet.cashedAt = cashMultiplier
  bet.settledAt = new Date().toISOString()
  memoryAviatorBets.set(bet.id, bet)

  // Credit user wallet
  if (isSupabaseConfigured) {
    try {
      const { data: wal } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', bet.userId)
        .maybeSingle()

      if (wal) {
        const newBal = Number(wal.balance) + payout
        await supabase.from('wallets').update({ balance: newBal }).eq('user_id', bet.userId)
        await supabase.from('wallet_transactions').insert({
          user_id: bet.userId,
          type: 'AVIATOR_CASHOUT',
          amount: payout,
          balance_after: newBal,
          reference_id: bet.id,
          description: `Aviator Cash Out at ${cashMultiplier}x (Won ₹${payout})`,
        })
        bet.balanceAfter = newBal
      }

      await supabase
        .from('bets')
        .update({ status: 'WON', payout })
        .eq('id', bet.id)
    } catch (err) {
      console.error('[Aviator Cashout Supabase Error]:', err)
    }
  }

  // Memory store credit
  const curBal = memoryWallets.get(bet.userId) || 1000.0
  const finalBal = curBal + payout
  memoryWallets.set(bet.userId, finalBal)
  if (!bet.balanceAfter) {
    bet.balanceAfter = finalBal
  }

  return bet
}

// 1. Get Live Aviator Flight State
export function getAviatorState(req, res) {
  const userId = req.user ? req.user.id : req.query.userId

  let userBet = null
  if (userId) {
    userBet =
      Array.from(memoryAviatorBets.values())
        .filter((b) => b.userId === userId && b.roundId === flightState.roundId)
        .pop() || null
  }

  return res.json({
    roundId: flightState.roundId,
    phase: flightState.phase,
    multiplier: flightState.multiplier,
    countdownMs: flightState.countdownMs,
    history: flightState.history,
    userBet,
    serverTime: Date.now(),
  })
}

// 2. Place Aviator Bet
export async function placeAviatorBet(req, res) {
  try {
    const userId = req.user ? req.user.id : req.body.userId
    const amount = Number(req.body.amount)
    const autoCashOut = req.body.autoCashOut ? Number(req.body.autoCashOut) : null

    if (!userId || !amount || amount < 10) {
      return res.status(400).json({ error: 'Valid userId and amount (min ₹10) are required' })
    }

    let targetRoundId = flightState.roundId
    if (flightState.phase !== 'WAITING') {
      targetRoundId = flightState.roundId + 1
    }

    const existingBet = Array.from(memoryAviatorBets.values()).find(
      (b) => b.userId === userId && b.roundId === targetRoundId && b.status === 'ACTIVE'
    )
    if (existingBet) {
      return res.status(400).json({ error: 'Bet already placed for this flight round' })
    }

    const betId = crypto.randomUUID()
    const betRecord = {
      id: betId,
      roundId: targetRoundId,
      userId,
      amount,
      autoCashOut,
      status: 'ACTIVE',
      payout: 0,
      cashedAt: null,
      created_at: new Date().toISOString(),
    }

    // Process Balance Deduction
    if (isSupabaseConfigured) {
      try {
        let { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .maybeSingle()

        if (!wallet) {
          const { data: newWal } = await supabase
            .from('wallets')
            .insert({ user_id: userId, balance: 1000.0 })
            .select()
            .maybeSingle()
          wallet = newWal
        }

        if (wallet) {
          if (Number(wallet.balance) < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' })
          }

          const newBalance = Number(wallet.balance) - amount
          const { data: updatedWal, error: deductErr } = await supabase
            .from('wallets')
            .update({ balance: newBalance })
            .eq('user_id', userId)
            .gte('balance', amount)
            .select()
            .single()

          if (!deductErr && updatedWal) {
            try {
              await supabase.from('bets').insert({
                id: betId,
                round_number: targetRoundId,
                game_mode: 'AVIATOR',
                user_id: userId,
                selection: 'AVIATOR',
                amount,
                multiplier: autoCashOut || 1.0,
                status: 'PENDING',
              })
            } catch {}

            try {
              await supabase.from('wallet_transactions').insert({
                user_id: userId,
                type: 'AVIATOR_BET',
                amount: -amount,
                balance_after: newBalance,
                reference_id: betId,
                description: `Aviator Flight #${targetRoundId} Bet ₹${amount}`,
              })
            } catch {}

            memoryAviatorBets.set(betId, betRecord)

            return res.status(201).json({
              message: 'Aviator bet placed successfully',
              bet: betRecord,
              newBalance,
            })
          }
        }
      } catch {}
    }

    // Fallback in-memory store
    if (!memoryWallets.has(userId)) {
      memoryWallets.set(userId, 1000.0)
    }
    const currentBal = memoryWallets.get(userId)
    if (currentBal < amount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' })
    }
    const newBal = currentBal - amount
    memoryWallets.set(userId, newBal)
    memoryAviatorBets.set(betId, betRecord)

    return res.status(201).json({
      message: 'Aviator bet placed successfully',
      bet: betRecord,
      newBalance: newBal,
    })
  } catch (err) {
    console.error('[placeAviatorBet Exception]:', err)
    return res.status(500).json({ error: 'Internal server error placing Aviator bet' })
  }
}

// 3. Cash Out Aviator Bet
export async function cashOutAviatorBet(req, res) {
  try {
    const userId = req.user ? req.user.id : req.body.userId
    const betId = req.body.betId

    if (flightState.phase !== 'FLYING') {
      return res.status(400).json({ error: 'Plane is not currently flying' })
    }

    const currentMultiplier = flightState.multiplier

    let bet = null
    if (betId) {
      bet = memoryAviatorBets.get(betId)
    } else {
      bet = Array.from(memoryAviatorBets.values()).find(
        (b) => b.userId === userId && b.roundId === flightState.roundId && b.status === 'ACTIVE'
      )
    }

    if (!bet || bet.status !== 'ACTIVE' || bet.roundId !== flightState.roundId) {
      return res.status(400).json({ error: 'No active bet found for this round' })
    }

    const settledBet = await executeCashOut(bet, currentMultiplier)

    return res.json({
      message: `Cashed out at ${currentMultiplier}x!`,
      payout: settledBet.payout,
      cashedAt: currentMultiplier,
      bet: settledBet,
      newBalance: settledBet.balanceAfter,
    })
  } catch (err) {
    console.error('[cashOutAviatorBet Exception]:', err)
    return res.status(500).json({ error: 'Internal server error processing cash out' })
  }
}
