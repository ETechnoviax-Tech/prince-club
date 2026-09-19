import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import {
  startMinesSession,
  revealMinesTile,
  cashoutMinesSession,
} from '../services/minesEngine.js'
import { persistMinesSession } from '../db/gamePersistence.js'

const localWallets = new Map()

export async function handleStartMines(req, res) {
  try {
    const userId = req.user?.id || req.body.userId || 'guest'
    const betAmount = Math.max(1, Number(req.body.betAmount) || 10)
    const minesCount = Math.min(24, Math.max(1, Number(req.body.minesCount) || 3))

    let currentBal = 1000

    // Deduct bet atomically
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

    const sessionData = startMinesSession(userId, betAmount, minesCount)
    await persistMinesSession({ userId, betAmount, minesCount, sessionData })

    return res.json({
      success: true,
      newBalance: Math.round(currentBal * 100) / 100,
      ...sessionData,
    })
  } catch (err) {
    console.error('[Mines Start Error]:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to start Mines round' })
  }
}

export async function handleRevealTile(req, res) {
  try {
    const { sessionId, tileIndex, userId = 'guest' } = req.body
    if (!sessionId || tileIndex === undefined) {
      return res.status(400).json({ error: 'sessionId and tileIndex are required' })
    }

    const revealResult = revealMinesTile(sessionId, tileIndex)

    // If hit mine, record lost bet
    if (revealResult.isHit && isSupabaseConfigured) {
      try {
        await supabase.from('bets').insert({
          user_id: userId,
          game_mode: 'mines',
          amount: 10,
          payout: 0,
          status: 'lost',
        })
      } catch {}
    }

    return res.json({
      success: true,
      ...revealResult,
    })
  } catch (err) {
    console.error('[Mines Reveal Error]:', err.message)
    return res.status(400).json({ error: err.message || 'Tile reveal failed' })
  }
}

export async function handleCashoutMines(req, res) {
  try {
    const { sessionId, userId = 'guest' } = req.body
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' })
    }

    const cashoutData = cashoutMinesSession(sessionId)

    // Credit payout to wallet
    let newBal = 1000
    if (isSupabaseConfigured) {
      const { data: wal } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle()

      newBal = Number(wal?.balance || 0) + cashoutData.finalPayout
      await supabase.from('wallets').update({ balance: newBal }).eq('user_id', userId)

      try {
        await supabase.from('bets').insert({
          user_id: userId,
          game_mode: 'mines',
          amount: cashoutData.betAmount,
          payout: cashoutData.finalPayout,
          status: 'won',
        })
      } catch {}
    } else {
      const cur = localWallets.get(userId) ?? 1000
      newBal = cur + cashoutData.finalPayout
      localWallets.set(userId, newBal)
    }

    return res.json({
      success: true,
      newBalance: Math.round(newBal * 100) / 100,
      ...cashoutData,
    })
  } catch (err) {
    console.error('[Mines Cashout Error]:', err.message)
    return res.status(400).json({ error: err.message || 'Cashout failed' })
  }
}
