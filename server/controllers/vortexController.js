import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryWallets } from '../db/store.js'

// Ring tier configurations
const RINGS = {
  INNER: { name: 'Inner Ring', multipliers: [1.2, 1.5, 1.8, 2.0, 2.5, 3.0], rtp: 0.9611 },
  MIDDLE: { name: 'Middle Ring', multipliers: [0, 1.5, 2.5, 4.0, 6.0, 10.0], rtp: 0.9611 },
  OUTER: { name: 'Outer Ring', multipliers: [0, 0, 2.0, 5.0, 15.0, 50.0], rtp: 0.9611 },
}

const vortexHistory = [
  { id: 'vx-1', ring: 'INNER', multiplier: 2.0, won: true, timestamp: Date.now() - 45000 },
  { id: 'vx-2', ring: 'MIDDLE', multiplier: 4.0, won: true, timestamp: Date.now() - 35000 },
  { id: 'vx-3', ring: 'OUTER', multiplier: 0, won: false, timestamp: Date.now() - 25000 },
  { id: 'vx-4', ring: 'INNER', multiplier: 1.5, won: true, timestamp: Date.now() - 15000 },
  { id: 'vx-5', ring: 'MIDDLE', multiplier: 6.0, won: true, timestamp: Date.now() - 5000 },
]

export async function playVortex(req, res) {
  try {
    const userId = req.user ? req.user.id : req.body.userId
    const ringKey = String(req.body.ring || 'INNER').toUpperCase()
    const amount = Number(req.body.amount)

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (!RINGS[ringKey]) {
      return res.status(400).json({ error: 'Ring must be INNER, MIDDLE, or OUTER' })
    }

    if (!amount || isNaN(amount) || amount < 10) {
      return res.status(400).json({ error: 'Bet amount must be at least ₹10' })
    }

    const ringConfig = RINGS[ringKey]
    const outcomeIndex = crypto.randomInt(0, ringConfig.multipliers.length)
    const multiplier = ringConfig.multipliers[outcomeIndex]
    const won = multiplier > 0
    const payout = Math.round(amount * multiplier)
    const gameId = 'vx-' + crypto.randomUUID().slice(0, 8)

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
        console.warn('[Vortex] Supabase fallback to memory:', err.message)
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
      ring: ringKey,
      multiplier,
      won,
      payout,
      profit: payout - amount,
      timestamp: Date.now(),
    }

    vortexHistory.unshift(outcomeRecord)
    if (vortexHistory.length > 30) vortexHistory.pop()

    return res.json({
      success: true,
      gameId,
      ring: ringKey,
      multiplier,
      won,
      payout,
      profit: payout - amount,
      balance: finalBalance,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process Vortex spin', details: error.message })
  }
}

export function getVortexHistory(req, res) {
  return res.json({ history: vortexHistory })
}
