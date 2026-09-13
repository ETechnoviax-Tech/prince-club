import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryWallets } from '../db/store.js'

const PUBG_ZONES = {
  POCHINKI: { name: 'Pochinki Town', multiplier: 2.0, weight: 35, loot: 'Level 3 Vest + M416' },
  GEORGOPOL: { name: 'Georgopol Containers', multiplier: 2.2, weight: 30, loot: 'Kar98k + 8x Scope' },
  MILITARY: { name: 'Military Base', multiplier: 3.5, weight: 20, loot: 'AWM Sniper Rifle' },
  SCHOOL: { name: 'School Hot-Drop', multiplier: 5.0, weight: 10, loot: 'Ghillie Suit + Medkit' },
  AIRDROP: { name: 'Red Flare Airdrop', multiplier: 10.0, weight: 5, loot: 'Groza + Golden Helmet' },
}

const pubgHistory = [
  { id: 'pb-1', safeZone: 'POCHINKI', survivors: 14, timestamp: Date.now() - 60000 },
  { id: 'pb-2', safeZone: 'MILITARY', survivors: 8, timestamp: Date.now() - 45000 },
  { id: 'pb-3', safeZone: 'GEORGOPOL', survivors: 19, timestamp: Date.now() - 30000 },
  { id: 'pb-4', safeZone: 'SCHOOL', survivors: 3, timestamp: Date.now() - 15000 },
]

function generatePubgOutcome() {
  const pool = []
  for (const [key, val] of Object.entries(PUBG_ZONES)) {
    for (let i = 0; i < val.weight; i++) {
      pool.push(key)
    }
  }
  return pool[crypto.randomInt(0, pool.length)]
}

export async function playPubg(req, res) {
  try {
    const userId = req.user ? req.user.id : req.body.userId
    const chosenZone = String(req.body.zone || '').toUpperCase()
    const amount = Number(req.body.amount)

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (!PUBG_ZONES[chosenZone]) {
      return res.status(400).json({ error: 'Zone must be POCHINKI, GEORGOPOL, MILITARY, SCHOOL, or AIRDROP' })
    }

    if (!amount || isNaN(amount) || amount < 10) {
      return res.status(400).json({ error: 'Bet amount must be at least ₹10' })
    }

    const safeZone = generatePubgOutcome()
    const zoneInfo = PUBG_ZONES[safeZone]
    const won = chosenZone === safeZone
    const multiplier = PUBG_ZONES[chosenZone].multiplier
    const payout = won ? Math.round(amount * multiplier) : 0
    const gameId = 'pb-' + crypto.randomUUID().slice(0, 8)

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
        console.warn('[PUBG 1Min] Supabase fallback to memory:', err.message)
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
      safeZone,
      chosenZone,
      won,
      payout,
      profit: payout - amount,
      loot: zoneInfo.loot,
      timestamp: Date.now(),
    }

    pubgHistory.unshift(outcomeRecord)
    if (pubgHistory.length > 30) pubgHistory.pop()

    return res.json({
      success: true,
      gameId,
      safeZone,
      chosenZone,
      multiplier,
      won,
      payout,
      profit: payout - amount,
      loot: zoneInfo.loot,
      balance: finalBalance,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process PUBG 1Min round', details: error.message })
  }
}

export function getPubgHistory(req, res) {
  return res.json({ history: pubgHistory })
}
