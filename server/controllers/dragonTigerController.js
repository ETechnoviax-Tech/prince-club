import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import {
  getDragonTigerState,
  dealInstantRound,
} from '../services/dragonTigerEngine.js'

const localWallets = new Map()

export function getDragonTigerStatus(req, res) {
  try {
    const state = getDragonTigerState()
    return res.json({ success: true, ...state })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch table state' })
  }
}

export async function placeDragonTigerBet(req, res) {
  try {
    const userId = req.user?.id || req.body.userId || 'guest'
    const market = String(req.body.market || 'DRAGON').toUpperCase()
    const betAmount = Math.max(1, Number(req.body.betAmount) || 10)

    let currentBal = 1000

    // Deduct bet amount
    if (isSupabaseConfigured) {
      let { data: wal } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle()

      if (!wal) {
        const { data: newWal } = await supabase
          .from('wallets')
          .insert({ user_id: userId, balance: 1000.0 })
          .select()
          .single()
        wal = newWal
      }

      currentBal = Number(wal?.balance || 0)
      if (currentBal < betAmount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' })
      }

      const deducted = currentBal - betAmount
      await supabase.from('wallets').update({ balance: deducted }).eq('user_id', userId)
      currentBal = deducted
    } else {
      currentBal = localWallets.get(userId) ?? 1000
      if (currentBal < betAmount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' })
      }
      currentBal -= betAmount
      localWallets.set(userId, currentBal)
    }

    // Deal card duel
    const roundResult = dealInstantRound(market, betAmount)

    // Settle winnings
    if (roundResult.isWin && roundResult.payout > 0) {
      currentBal += roundResult.payout
      if (isSupabaseConfigured) {
        await supabase.from('wallets').update({ balance: currentBal }).eq('user_id', userId)
        try {
          await supabase.from('bets').insert({
            user_id: userId,
            game_mode: 'dragontiger',
            amount: betAmount,
            payout: roundResult.payout,
            status: 'won',
          })
        } catch {}
      } else {
        localWallets.set(userId, currentBal)
      }
    } else if (isSupabaseConfigured) {
      try {
        await supabase.from('bets').insert({
          user_id: userId,
          game_mode: 'dragontiger',
          amount: betAmount,
          payout: 0,
          status: 'lost',
        })
      } catch {}
    }

    return res.json({
      success: true,
      newBalance: Math.round(currentBal * 100) / 100,
      roundResult,
    })
  } catch (err) {
    console.error('[DragonTiger Bet Error]:', err.message)
    return res.status(500).json({ error: err.message || 'Bet failed' })
  }
}
