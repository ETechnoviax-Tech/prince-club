import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import {
  executeInHouseSpin,
  CRAZY777_SYMBOLS,
  FORTUNE_GEMS_SYMBOLS,
  SUPER_ACE_SYMBOLS,
} from '../services/inHouseSlotEngine.js'
import { persistSlotSpin } from '../db/gamePersistence.js'

// In-memory wallet balance fallback for guests or local testing
const localWallets = new Map()

export async function handleSlotSpin(req, res) {
  try {
    const userId = req.user?.id || req.body.userId || 'guest'
    const gameId = req.body.gameId || 'crazy777'
    const betAmount = Math.max(1, Number(req.body.betAmount) || 10)

    let currentBalance = 1000

    // 1. Balance check & deduction
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

      currentBalance = Number(wal?.balance || 0)
      if (currentBalance < betAmount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' })
      }

      // Deduct bet amount
      const deductedBal = currentBalance - betAmount
      await supabase
        .from('wallets')
        .update({ balance: deductedBal })
        .eq('user_id', userId)

      currentBalance = deductedBal
    } else {
      currentBalance = localWallets.get(userId) ?? 1000
      if (currentBalance < betAmount) {
        return res.status(400).json({ error: 'Insufficient wallet balance' })
      }
      currentBalance -= betAmount
      localWallets.set(userId, currentBalance)
    }

    // 2. Authoritative RNG Spin Calculation
    const spinResult = executeInHouseSpin(gameId, betAmount)
    await persistSlotSpin({ userId, gameCode: gameId, betAmount, spinResult })

    // 3. Credit winnings
    if (spinResult.finalWin > 0) {
      currentBalance += spinResult.finalWin
      if (isSupabaseConfigured) {
        await supabase
          .from('wallets')
          .update({ balance: currentBalance })
          .eq('user_id', userId)

        // Log winning bet in bets table
        try {
          await supabase.from('bets').insert({
            user_id: userId,
            game_mode: `slot_${gameId}`,
            amount: betAmount,
            payout: spinResult.finalWin,
            status: 'won',
          })
        } catch {}
      } else {
        localWallets.set(userId, currentBalance)
      }
    } else if (isSupabaseConfigured) {
      // Log lost bet
      try {
        await supabase.from('bets').insert({
          user_id: userId,
          game_mode: `slot_${gameId}`,
          amount: betAmount,
          payout: 0,
          status: 'lost',
        })
      } catch {}
    }

    return res.json({
      success: true,
      gameId,
      newBalance: Math.round(currentBalance * 100) / 100,
      spinResult,
    })
  } catch (err) {
    console.error('[InHouseSlotController Error]:', err)
    return res.status(500).json({ error: err.message || 'Internal spin error' })
  }
}

export async function getSlotConfig(req, res) {
  try {
    const { gameId = 'crazy777' } = req.params
    return res.json({
      success: true,
      gameId,
      rtp: '96.5%',
      symbols:
        gameId === 'crazy777'
          ? CRAZY777_SYMBOLS
          : gameId === 'fortunegems'
          ? FORTUNE_GEMS_SYMBOLS
          : SUPER_ACE_SYMBOLS,
    })
  } catch {
    return res.status(500).json({ error: 'Failed to fetch slot config' })
  }
}
