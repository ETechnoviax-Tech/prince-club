import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryWallets } from '../db/store.js'

const WHEEL_SECTORS = [
  { amount: 10, weight: 35, label: '₹10' },
  { amount: 25, weight: 25, label: '₹25' },
  { amount: 15, weight: 20, label: '₹15' },
  { amount: 50, weight: 12, label: '₹50' },
  { amount: 100, weight: 5, label: '₹100' },
  { amount: 200, weight: 2, label: '₹200' },
  { amount: 500, weight: 1, label: '₹500 (JACKPOT)' },
]

const userSpinClaims = new Map() // userId -> lastSpinTimestamp

export async function spinWheel(req, res) {
  try {
    const userId = req.user ? req.user.id : req.body.userId
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    const now = Date.now()
    const lastSpin = userSpinClaims.get(userId) || 0
    const cooldownMs = 24 * 60 * 60 * 1000 // 24 hours cooldown

    // For demonstration/testing, allow free spin or check 24h
    // If cooldown active, user can also spend ₹20 to re-spin!
    const isFree = now - lastSpin >= cooldownMs
    const spinCost = isFree ? 0 : 20

    const pool = []
    for (const s of WHEEL_SECTORS) {
      for (let i = 0; i < s.weight; i++) {
        pool.push(s)
      }
    }
    const sector = pool[crypto.randomInt(0, pool.length)]
    const wonAmount = sector.amount
    const spinId = 'spin-' + crypto.randomUUID().slice(0, 8)

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

        if (spinCost > 0 && wallet.balance < spinCost) {
          return res.status(400).json({ error: 'Insufficient balance to re-spin. Wait for daily free spin or deposit.' })
        }

        const net = wonAmount - spinCost
        const updatedBal = Math.max(0, Math.round((wallet.balance + net) * 100) / 100)

        await supabase
          .from('wallets')
          .update({ balance: updatedBal })
          .eq('user_id', userId)

        finalBalance = updatedBal
        processedViaSupabase = true
      } catch (err) {
        console.warn('[SpinWheel] Supabase fallback to memory:', err.message)
      }
    }

    if (!processedViaSupabase) {
      const current = memoryWallets.get(userId) ?? 1000
      if (spinCost > 0 && current < spinCost) {
        return res.status(400).json({ error: 'Insufficient balance to re-spin. Wait for daily free spin or deposit.' })
      }
      const net = wonAmount - spinCost
      finalBalance = Math.max(0, Math.round((current + net) * 100) / 100)
      memoryWallets.set(userId, finalBalance)
    }

    userSpinClaims.set(userId, now)

    return res.json({
      success: true,
      spinId,
      wonAmount,
      sectorLabel: sector.label,
      isFree,
      spinCost,
      balance: finalBalance,
      nextFreeTime: now + cooldownMs,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process Fortune Spin', details: error.message })
  }
}

export function getSpinStatus(req, res) {
  const userId = req.user ? req.user.id : req.query.userId
  const now = Date.now()
  const lastSpin = userSpinClaims.get(userId) || 0
  const cooldownMs = 24 * 60 * 60 * 1000
  const canFreeSpin = now - lastSpin >= cooldownMs
  const remainingMs = Math.max(0, cooldownMs - (now - lastSpin))

  return res.json({
    canFreeSpin,
    remainingMs,
    spinCost: canFreeSpin ? 0 : 20,
    maxReward: 500,
    sectors: WHEEL_SECTORS,
  })
}
