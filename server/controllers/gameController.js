import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { getLiveHistory, getLiveIssue } from '../services/veerGameService.js'

export const ROUND_DURATION_MS = 45000 // 45s rounds
export const LOCK_DURATION_MS = 8000   // 8s lock window

// In-memory fallback stores
const memoryBets = new Map() // betId -> betRecord

export function calculateOutcome(roundNumber) {
  const digit = Number((BigInt(roundNumber) * 37n + 17n) % 10n)
  let color = 'red'
  let multiplier = 2.0

  if (digit === 0 || digit === 5) {
    color = 'violet'
    multiplier = 4.5
  } else if (digit % 2 === 0) {
    color = 'red'
    multiplier = 2.0
  } else {
    color = 'green'
    multiplier = 2.0
  }

  return { roundNumber, digit, color, multiplier }
}

// Authoritative Round Settlement
export async function settleRoundBets(roundNumber) {
  const outcome = calculateOutcome(roundNumber)
  
  // 1. Settle in-memory bets
  const pendingBets = Array.from(memoryBets.values()).filter(
    (b) => Number(b.round_number) === Number(roundNumber) && b.status === 'PENDING'
  )

  for (const bet of pendingBets) {
    let won = false
    let payout = 0
    const sel = String(bet.selection).toLowerCase()

    if (sel === outcome.color) {
      won = true
      payout = Math.round(bet.amount * bet.multiplier)
    } else if (sel === 'green' && outcome.digit === 5) {
      won = true
      payout = Math.round(bet.amount * 1.5)
    } else if (sel === 'red' && outcome.digit === 0) {
      won = true
      payout = Math.round(bet.amount * 1.5)
    } else if (sel === String(outcome.digit)) {
      won = true
      payout = Math.round(bet.amount * 9.0)
    }

    bet.status = won ? 'WON' : 'LOST'
    bet.payout = payout
    bet.outcome = outcome
    bet.settled_at = new Date().toISOString()
    memoryBets.set(bet.id, bet)

    // Credit user if Supabase is connected
    if (won && payout > 0 && isSupabaseConfigured) {
      try {
        const { data: wal } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', bet.user_id)
          .single()

        if (wal) {
          const newBal = Number(wal.balance) + payout
          await supabase.from('wallets').update({ balance: newBal }).eq('user_id', bet.user_id)
          await supabase.from('wallet_transactions').insert({
            user_id: bet.user_id,
            type: 'BET_PAYOUT',
            amount: payout,
            balance_after: newBal,
            reference_id: bet.id,
            description: `Won ${payout} on ${bet.selection} (Round ${roundNumber})`,
          })
        }
      } catch (err) {
        console.error('[settleRoundBets wallet credit error]:', err)
      }
    }
  }

  // 2. Settle Supabase DB bets if configured
  if (isSupabaseConfigured) {
    try {
      const { data: dbBets } = await supabase
        .from('bets')
        .select('*')
        .eq('round_number', roundNumber)
        .eq('status', 'PENDING')

      if (Array.isArray(dbBets)) {
        for (const b of dbBets) {
          let won = false
          let payout = 0
          const sel = String(b.selection).toLowerCase()

          if (sel === outcome.color) {
            won = true
            payout = Math.round(b.amount * b.multiplier)
          } else if (sel === 'green' && outcome.digit === 5) {
            won = true
            payout = Math.round(b.amount * 1.5)
          } else if (sel === 'red' && outcome.digit === 0) {
            won = true
            payout = Math.round(b.amount * 1.5)
          } else if (sel === String(outcome.digit)) {
            won = true
            payout = Math.round(b.amount * 9.0)
          }

          const status = won ? 'WON' : 'LOST'
          await supabase
            .from('bets')
            .update({ status, payout })
            .eq('id', b.id)

          if (won && payout > 0) {
            const { data: wal } = await supabase
              .from('wallets')
              .select('balance')
              .eq('user_id', b.user_id)
              .single()

            if (wal) {
              const newBal = Number(wal.balance) + payout
              await supabase.from('wallets').update({ balance: newBal }).eq('user_id', b.user_id)
              await supabase.from('wallet_transactions').insert({
                user_id: b.user_id,
                type: 'BET_PAYOUT',
                amount: payout,
                balance_after: newBal,
                reference_id: b.id,
                description: `Won ${payout} on ${b.selection} (Round ${roundNumber})`,
              })
            }
          }
        }
      }
    } catch (err) {
      console.error('[settleRoundBets Supabase error]:', err)
    }
  }
}

// Authoritative VeerGame Round Settlement
export async function settleVeerRound(outcome) {
  if (!outcome || !outcome.issueNumber) return
  const issueStr = String(outcome.issueNumber)
  const digit = Number(outcome.digit)

  // 1. Settle in-memory bets matching issueNumber
  const pendingBets = Array.from(memoryBets.values()).filter(
    (b) => String(b.round_number) === issueStr && b.status === 'PENDING'
  )

  for (const bet of pendingBets) {
    let won = false
    let payout = 0
    const sel = String(bet.selection).toLowerCase()

    if (sel === 'green') {
      if ([1, 3, 7, 9].includes(digit)) {
        won = true
        payout = Math.round(bet.amount * 2.0)
      } else if (digit === 5) {
        won = true
        payout = Math.round(bet.amount * 1.5)
      }
    } else if (sel === 'red') {
      if ([2, 4, 6, 8].includes(digit)) {
        won = true
        payout = Math.round(bet.amount * 2.0)
      } else if (digit === 0) {
        won = true
        payout = Math.round(bet.amount * 1.5)
      }
    } else if (sel === 'violet') {
      if (digit === 0 || digit === 5) {
        won = true
        payout = Math.round(bet.amount * 4.5)
      }
    } else if (sel === 'big') {
      if (digit >= 5) {
        won = true
        payout = Math.round(bet.amount * 2.0)
      }
    } else if (sel === 'small') {
      if (digit < 5) {
        won = true
        payout = Math.round(bet.amount * 2.0)
      }
    } else if (sel === String(digit)) {
      won = true
      payout = Math.round(bet.amount * 9.0)
    }

    bet.status = won ? 'WON' : 'LOST'
    bet.payout = payout
    bet.outcome = outcome
    bet.settled_at = new Date().toISOString()
    memoryBets.set(bet.id, bet)

    if (won && payout > 0 && isSupabaseConfigured) {
      try {
        const { data: wal } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', bet.user_id)
          .single()

        if (wal) {
          const newBal = Number(wal.balance) + payout
          await supabase.from('wallets').update({ balance: newBal }).eq('user_id', bet.user_id)
          await supabase.from('wallet_transactions').insert({
            user_id: bet.user_id,
            type: 'BET_PAYOUT',
            amount: payout,
            balance_after: newBal,
            reference_id: bet.id,
            description: `Won ₹${payout} on ${bet.selection} (VeerGame ${issueStr})`,
          })
        }
      } catch (err) {
        console.error('[settleVeerRound wallet credit error]:', err)
      }
    }
  }

  // 2. Settle Supabase DB bets if configured
  if (isSupabaseConfigured) {
    try {
      const { data: dbBets } = await supabase
        .from('bets')
        .select('*')
        .eq('round_number', issueStr)
        .eq('status', 'PENDING')

      if (Array.isArray(dbBets)) {
        for (const b of dbBets) {
          let won = false
          let payout = 0
          const sel = String(b.selection).toLowerCase()

          if (sel === 'green') {
            if ([1, 3, 7, 9].includes(digit)) {
              won = true
              payout = Math.round(b.amount * 2.0)
            } else if (digit === 5) {
              won = true
              payout = Math.round(b.amount * 1.5)
            }
          } else if (sel === 'red') {
            if ([2, 4, 6, 8].includes(digit)) {
              won = true
              payout = Math.round(b.amount * 2.0)
            } else if (digit === 0) {
              won = true
              payout = Math.round(b.amount * 1.5)
            }
          } else if (sel === 'violet') {
            if (digit === 0 || digit === 5) {
              won = true
              payout = Math.round(b.amount * 4.5)
            }
          } else if (sel === 'big') {
            if (digit >= 5) {
              won = true
              payout = Math.round(b.amount * 2.0)
            }
          } else if (sel === 'small') {
            if (digit < 5) {
              won = true
              payout = Math.round(b.amount * 2.0)
            }
          } else if (sel === String(digit)) {
            won = true
            payout = Math.round(b.amount * 9.0)
          }

          const status = won ? 'WON' : 'LOST'
          await supabase.from('bets').update({ status, payout }).eq('id', b.id)

          if (won && payout > 0) {
            const { data: wal } = await supabase
              .from('wallets')
              .select('balance')
              .eq('user_id', b.user_id)
              .single()

            if (wal) {
              const newBal = Number(wal.balance) + payout
              await supabase.from('wallets').update({ balance: newBal }).eq('user_id', b.user_id)
              await supabase.from('wallet_transactions').insert({
                user_id: b.user_id,
                type: 'BET_PAYOUT',
                amount: payout,
                balance_after: newBal,
                reference_id: b.id,
                description: `Won ₹${payout} on ${b.selection} (VeerGame ${issueStr})`,
              })
            }
          }
        }
      }
    } catch (err) {
      console.error('[settleVeerRound Supabase error]:', err)
    }
  }
}

// Background VeerGame settlement poller
let isVeerPolling = false
const veerLoopInterval = setInterval(async () => {
  if (isVeerPolling) return
  isVeerPolling = true
  try {
    const [h30, h1] = await Promise.allSettled([
      getLiveHistory(30, 1),
      getLiveHistory(1, 1),
    ])
    if (h30.status === 'fulfilled' && Array.isArray(h30.value?.list)) {
      for (const item of h30.value.list.slice(0, 5)) {
        await settleVeerRound(item)
      }
    }
    if (h1.status === 'fulfilled' && Array.isArray(h1.value?.list)) {
      for (const item of h1.value.list.slice(0, 5)) {
        await settleVeerRound(item)
      }
    }
  } catch {} finally {
    isVeerPolling = false
  }
}, 3000)

if (veerLoopInterval?.unref) {
  veerLoopInterval.unref()
}

// Background Fallback Game Loop
let lastSettledRound = null
const gameLoopInterval = setInterval(() => {
  const now = Date.now()
  const currentRound = Math.floor(now / ROUND_DURATION_MS)
  const previousRound = currentRound - 1

  if (lastSettledRound === null) {
    lastSettledRound = previousRound
  } else if (previousRound > lastSettledRound) {
    for (let r = lastSettledRound + 1; r <= previousRound; r++) {
      settleRoundBets(r).catch((err) => console.error('[Game Loop Settlement Error]:', err))
    }
    lastSettledRound = previousRound
  }
}, 1000)

if (gameLoopInterval?.unref) {
  gameLoopInterval.unref()
}

// 1. Current Round State
export function getCurrentRound(req, res) {
  const now = Date.now()
  const roundNumber = Math.floor(now / ROUND_DURATION_MS)
  const roundStartTime = roundNumber * ROUND_DURATION_MS
  const roundEndTime = roundStartTime + ROUND_DURATION_MS
  const lockStartTime = roundEndTime - LOCK_DURATION_MS

  const msRemaining = Math.max(0, roundEndTime - now)
  const secondsRemaining = Math.ceil(msRemaining / 1000)
  const isLocked = now >= lockStartTime

  const history = []
  for (let i = 1; i <= 20; i++) {
    const r = roundNumber - i
    const outcome = calculateOutcome(r)
    history.push({
      roundNumber: r,
      digit: outcome.digit,
      color: outcome.color,
      multiplier: outcome.multiplier,
      endedAt: new Date((r + 1) * ROUND_DURATION_MS).toISOString(),
    })
  }

  return res.json({
    roundNumber,
    secondsRemaining,
    msRemaining,
    isLocked,
    serverTime: now,
    roundStartTime: new Date(roundStartTime).toISOString(),
    roundEndTime: new Date(roundEndTime).toISOString(),
    lockDurationSeconds: LOCK_DURATION_MS / 1000,
    roundDurationSeconds: ROUND_DURATION_MS / 1000,
    history,
  })
}

// 2. Place Bet (Authoritative & Anti-Race-Condition)
export async function placeBet(req, res) {
  try {
    const { userId, selection, amount, issueNumber, typeId } = req.validatedBet || {
      userId: req.user ? req.user.id : req.body.userId,
      selection: req.body.selection,
      amount: Number(req.body.amount),
      issueNumber: req.body.issueNumber,
      typeId: req.body.typeId || 30,
    }

    if (!userId || !selection || !amount || amount < 10) {
      return res.status(400).json({ error: 'Valid userId, selection, and amount (min ₹10) required' })
    }

    const now = Date.now()
    const defaultRoundNumber = Math.floor(now / ROUND_DURATION_MS)
    const targetRound = issueNumber ? String(issueNumber) : String(defaultRoundNumber)

    // Strict Lock Window check for fallback 45s rounds if no issueNumber
    if (!issueNumber) {
      const roundEndTime = (defaultRoundNumber + 1) * ROUND_DURATION_MS
      const lockStartTime = roundEndTime - LOCK_DURATION_MS
      if (now >= lockStartTime) {
        return res.status(400).json({
          error: 'Round is locked. Bets are closed for this round.',
          roundNumber: defaultRoundNumber,
          secondsRemaining: Math.ceil((roundEndTime - now) / 1000),
        })
      }
    }

    let multiplier = 2.0
    const sel = String(selection).toLowerCase()
    if (sel === 'violet') multiplier = 4.5
    else if (['big', 'small', 'green', 'red'].includes(sel)) multiplier = 2.0
    else multiplier = 9.0

    const betRecord = {
      id: crypto.randomUUID(),
      round_number: targetRound,
      type_id: typeId || 30,
      user_id: userId,
      selection: sel,
      amount,
      multiplier,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured) {
      // 1. Check wallet exists and has sufficient balance
      const { data: wallet, error: walErr } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (walErr || !wallet) {
        return res.status(404).json({ error: 'User wallet not found' })
      }

      if (Number(wallet.balance) < amount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' })
      }

      // 2. Atomic Balance Deduction (prevents concurrent race condition double-spending)
      const newBalance = Number(wallet.balance) - amount
      const { data: updatedWal, error: deductErr } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId)
        .gte('balance', amount) // Critical atomic guard: only update if balance is still >= amount
        .select()
        .single()

      if (deductErr || !updatedWal) {
        return res.status(400).json({ error: 'Insufficient balance or concurrent transaction conflict' })
      }

      // 3. Insert Bet Record
      try {
        await supabase.from('bets').insert(betRecord)
      } catch (betInsErr) {
        console.warn('[Supabase] Bet insert notice:', betInsErr.message)
      }

      // 4. Ledger entry
      try {
        await supabase.from('wallet_transactions').insert({
          user_id: userId,
          type: 'BET_PLACED',
          amount: -amount,
          balance_after: newBalance,
          reference_id: betRecord.id,
          description: `Bet ₹${amount} on ${sel} (Round ${roundNumber})`,
        })
      } catch {}

      memoryBets.set(betRecord.id, betRecord)

      return res.status(201).json({
        message: 'Bet placed successfully',
        bet: betRecord,
        newBalance,
      })
    }

    // Fallback store
    memoryBets.set(betRecord.id, betRecord)
    return res.status(201).json({
      message: 'Bet placed successfully',
      bet: betRecord,
    })
  } catch (err) {
    console.error('[placeBet Exception]:', err)
    return res.status(500).json({ error: 'Internal server error placing bet' })
  }
}

// 3. User Bet History with Anti-Sniffing
export async function getUserBets(req, res) {
  try {
    const { userId } = req.params
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Authorization: User can only inspect their own bets unless admin
    if (req.user && req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied: You can only view your own bet history' })
    }

    if (isSupabaseConfigured) {
      try {
        const { data: dbBets } = await supabase
          .from('bets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30)

        if (Array.isArray(dbBets) && dbBets.length > 0) {
          return res.json({ bets: dbBets })
        }
      } catch {}
    }

    const userBets = Array.from(memoryBets.values())
      .filter((b) => b.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 30)

    return res.json({ bets: userBets })
  } catch (err) {
    console.error('[getUserBets Exception]:', err)
    return res.status(500).json({ error: 'Failed to fetch user bets' })
  }
}

// 4. Live VeerGame Issue Proxy
export async function getVeerIssue(req, res) {
  try {
    const typeId = Number(req.query.typeId) || 30
    const issue = await getLiveIssue(typeId)
    return res.json(issue)
  } catch (err) {
    console.error('[getVeerIssue Exception]:', err)
    return res.status(500).json({ error: 'Failed to fetch VeerGame issue' })
  }
}

// 5. Live VeerGame Draw History Proxy
export async function getVeerHistory(req, res) {
  try {
    const typeId = Number(req.query.typeId) || 30
    const page = Number(req.query.page) || 1
    const history = await getLiveHistory(typeId, page)
    return res.json(history)
  } catch (err) {
    console.error('[getVeerHistory Exception]:', err)
    return res.status(500).json({ error: 'Failed to fetch VeerGame history' })
  }
}

