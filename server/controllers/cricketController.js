import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryWallets } from '../db/store.js'

const CRICKET_MARKETS = {
  DOT: { name: 'Dot Ball', multiplier: 1.5, weight: 30, desc: '0 Runs - Defensive block' },
  SINGLE: { name: '1 or 2 Runs', multiplier: 1.9, weight: 35, desc: 'Quick single or double' },
  FOUR: { name: 'Boundary Four', multiplier: 3.5, weight: 15, desc: 'Cracking shot through covers' },
  SIX: { name: 'Maximum Six', multiplier: 6.0, weight: 8, desc: 'Massive hit over long-on' },
  WICKET: { name: 'Wicket Out', multiplier: 4.5, weight: 12, desc: 'Clean bowled / caught' },
}

const cricketHistory = [
  { id: 'ck-1', outcome: 'FOUR', runs: 4, commentary: 'Smashed past point for four!', timestamp: Date.now() - 40000 },
  { id: 'ck-2', outcome: 'SINGLE', runs: 1, commentary: 'Tapped to mid-on for an easy single.', timestamp: Date.now() - 30000 },
  { id: 'ck-3', outcome: 'SIX', runs: 6, commentary: 'HUGE! Cleared the boundary with ease!', timestamp: Date.now() - 20000 },
  { id: 'ck-4', outcome: 'DOT', runs: 0, commentary: 'Beaten by the swing, dot ball.', timestamp: Date.now() - 10000 },
]

function generateCricketOutcome() {
  const pool = []
  for (const [key, val] of Object.entries(CRICKET_MARKETS)) {
    for (let i = 0; i < val.weight; i++) {
      pool.push(key)
    }
  }
  const picked = pool[crypto.randomInt(0, pool.length)]
  return picked
}

export async function playCricket(req, res) {
  try {
    const userId = req.user ? req.user.id : req.body.userId
    const prediction = String(req.body.prediction || '').toUpperCase()
    const amount = Number(req.body.amount)

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (!CRICKET_MARKETS[prediction]) {
      return res.status(400).json({ error: 'Invalid prediction. Choose DOT, SINGLE, FOUR, SIX, or WICKET.' })
    }

    if (!amount || isNaN(amount) || amount < 10) {
      return res.status(400).json({ error: 'Bet amount must be at least ₹10' })
    }

    const actualOutcome = generateCricketOutcome()
    const marketInfo = CRICKET_MARKETS[actualOutcome]
    const won = prediction === actualOutcome
    const multiplier = CRICKET_MARKETS[prediction].multiplier
    const payout = won ? Math.round(amount * multiplier) : 0
    const gameId = 'ck-' + crypto.randomUUID().slice(0, 8)

    let finalBalance = 0
    let processedViaSupabase = false

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

        if (!wallet || wallet.balance < amount) {
          return res.status(400).json({ error: 'Insufficient wallet balance' })
        }

        const netDifference = payout - amount
        const updatedBal = Math.max(0, Math.round((wallet.balance + netDifference) * 100) / 100)

        await supabase
          .from('wallets')
          .update({ balance: updatedBal })
          .eq('user_id', userId)

        finalBalance = updatedBal
        processedViaSupabase = true
      } catch (err) {
        console.warn('[Cricket] Supabase fallback to memory:', err.message)
      }
    }

    if (!processedViaSupabase) {
      const current = memoryWallets.get(userId) ?? 1000
      if (current < amount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' })
      }
      const net = payout - amount
      finalBalance = Math.max(0, Math.round((current + net) * 100) / 100)
      memoryWallets.set(userId, finalBalance)
    }

    const outcomeRecord = {
      id: gameId,
      outcome: actualOutcome,
      predicted: prediction,
      won,
      payout,
      profit: payout - amount,
      commentary: marketInfo.desc,
      timestamp: Date.now(),
    }

    cricketHistory.unshift(outcomeRecord)
    if (cricketHistory.length > 30) cricketHistory.pop()

    return res.json({
      success: true,
      gameId,
      outcome: actualOutcome,
      predicted: prediction,
      multiplier,
      won,
      payout,
      profit: payout - amount,
      commentary: marketInfo.desc,
      balance: finalBalance,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process Cricket bet', details: error.message })
  }
}

export function getCricketHistory(req, res) {
  return res.json({ history: cricketHistory })
}
