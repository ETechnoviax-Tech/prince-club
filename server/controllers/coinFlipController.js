import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryWallets } from '../db/store.js'

// In-memory global history & stats for Coin Flip
const coinFlipHistory = [
  { id: 'cf-1', side: 'HEADS', timestamp: Date.now() - 50000 },
  { id: 'cf-2', side: 'TAILS', timestamp: Date.now() - 40000 },
  { id: 'cf-3', side: 'TAILS', timestamp: Date.now() - 30000 },
  { id: 'cf-4', side: 'HEADS', timestamp: Date.now() - 20000 },
  { id: 'cf-5', side: 'HEADS', timestamp: Date.now() - 10000 },
]

const userStreaks = new Map() // userId -> consecutive wins

export async function playCoinFlip(req, res) {
  try {
    const userId = req.user ? req.user.id : req.body.userId
    const chosenSide = String(req.body.side || '').toUpperCase()
    const amount = Number(req.body.amount)

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (!['HEADS', 'TAILS'].includes(chosenSide)) {
      return res.status(400).json({ error: 'Side must be HEADS or TAILS' })
    }

    if (!amount || isNaN(amount) || amount < 10) {
      return res.status(400).json({ error: 'Bet amount must be at least ₹10' })
    }

    const flipIndex = crypto.randomInt(0, 2)
    const resultSide = flipIndex === 0 ? 'HEADS' : 'TAILS'
    const won = chosenSide === resultSide
    const multiplier = 1.96
    const payout = won ? Math.round(amount * multiplier) : 0
    const flipId = crypto.randomUUID()

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

        if (wallet) {
          if (Number(wallet.balance) < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' })
          }

          const balAfterDeduct = Number(wallet.balance) - amount
          const { data: updatedWal, error: deductErr } = await supabase
            .from('wallets')
            .update({ balance: balAfterDeduct })
            .eq('user_id', userId)
            .gte('balance', amount)
            .select()
            .single()

          if (!deductErr && updatedWal) {
            finalBalance = balAfterDeduct
            processedViaSupabase = true

            try {
              await supabase.from('wallet_transactions').insert({
                user_id: userId,
                type: 'COINFLIP_BET',
                amount: -amount,
                balance_after: balAfterDeduct,
                reference_id: flipId,
                description: `Coin Flip Bet on ${chosenSide} (₹${amount})`,
              })
            } catch {}

            if (won && payout > 0) {
              finalBalance = balAfterDeduct + payout
              await supabase
                .from('wallets')
                .update({ balance: finalBalance })
                .eq('user_id', userId)

              try {
                await supabase.from('wallet_transactions').insert({
                  user_id: userId,
                  type: 'COINFLIP_PAYOUT',
                  amount: payout,
                  balance_after: finalBalance,
                  reference_id: flipId,
                  description: `Coin Flip Won ₹${payout} (${resultSide} @ ${multiplier}x)`,
                })
              } catch {}
            }

            try {
              await supabase.from('bets').insert({
                id: flipId,
                round_number: Date.now(),
                game_mode: 'COINFLIP',
                user_id: userId,
                selection: chosenSide,
                amount,
                multiplier,
                status: won ? 'WON' : 'LOST',
                payout,
              })
            } catch {}
          }
        }
      } catch {}
    }

    if (!processedViaSupabase) {
      if (!memoryWallets.has(userId)) {
        memoryWallets.set(userId, 1000.0)
      }
      const curBal = memoryWallets.get(userId)
      if (curBal < amount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' })
      }
      const balAfter = curBal - amount + payout
      memoryWallets.set(userId, balAfter)
      finalBalance = balAfter
    }

    let streak = userStreaks.get(userId) || 0
    if (won) {
      streak += 1
      userStreaks.set(userId, streak)
    } else {
      userStreaks.set(userId, 0)
      streak = 0
    }

    coinFlipHistory.unshift({
      id: flipId,
      side: resultSide,
      timestamp: Date.now(),
    })
    if (coinFlipHistory.length > 50) {
      coinFlipHistory.pop()
    }

    return res.json({
      id: flipId,
      chosenSide,
      resultSide,
      won,
      multiplier,
      payout,
      profit: won ? payout - amount : -amount,
      streak,
      newBalance: finalBalance,
      history: coinFlipHistory.slice(0, 15),
    })
  } catch (err) {
    console.error('[playCoinFlip Exception]:', err)
    return res.status(500).json({ error: 'Internal server error processing Coin Flip' })
  }
}

export function getCoinFlipHistory(req, res) {
  const headsCount = coinFlipHistory.filter((h) => h.side === 'HEADS').length
  const tailsCount = coinFlipHistory.filter((h) => h.side === 'TAILS').length
  const total = coinFlipHistory.length || 1

  return res.json({
    history: coinFlipHistory.slice(0, 30),
    stats: {
      headsPercent: Math.round((headsCount / total) * 100),
      tailsPercent: Math.round((tailsCount / total) * 100),
      totalFlips: coinFlipHistory.length,
    },
  })
}
