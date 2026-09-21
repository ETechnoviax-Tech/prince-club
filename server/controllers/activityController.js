import { supabase, isSupabaseConfigured } from '../config/supabase.js'
import pg from 'pg'

const memoryGiftRedemptions = new Set() // `${userId}:${code}`
const memoryGiftCodes = new Map([
  ['WELCOME69', { amount: 50, maxUses: 50000, currentUses: 0, active: true }],
  ['69CLUB', { amount: 100, maxUses: 50000, currentUses: 0, active: true }],
  ['BONUS100', { amount: 100, maxUses: 20000, currentUses: 0, active: true }],
  ['SUPER69', { amount: 200, maxUses: 10000, currentUses: 0, active: true }],
  ['VIPREWARD', { amount: 75, maxUses: 10000, currentUses: 0, active: true }],
])

const STREAK_REWARDS = [15, 20, 25, 30, 35, 40, 50]

/**
 * GET /api/activity/stats
 * Returns live bonus statistics, 7-day attendance streak, rebate turnover, and jackpot pool.
 */
export async function getActivityStats(req, res) {
  try {
    const authUserId = req.user ? req.user.id : (req.query.userId || null)

    let todayBonus = 0
    let totalBonus = 0
    let bonusHistory = []
    let streak = 0
    let canClaimStreak = true
    let totalTurnover = 0
    let estimatedRebate = 0

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    if (authUserId && isSupabaseConfigured) {
      // 1. Fetch user bonus transactions
      const { data: bonusTxs } = await supabase
        .from('wallet_transactions')
        .select('id, amount, description, created_at')
        .eq('user_id', authUserId)
        .eq('type', 'BONUS')
        .order('created_at', { ascending: false })
        .limit(20)

      if (bonusTxs && bonusTxs.length > 0) {
        bonusHistory = bonusTxs.map((tx) => ({
          id: tx.id,
          amount: Number(tx.amount || 0),
          description: tx.description || 'Bonus Credit',
          createdAt: tx.created_at,
        }))

        totalBonus = bonusTxs.reduce((sum, tx) => sum + Math.max(0, Number(tx.amount || 0)), 0)

        const todayTxs = bonusTxs.filter((tx) => tx.created_at >= startOfToday)
        todayBonus = todayTxs.reduce((sum, tx) => sum + Math.max(0, Number(tx.amount || 0)), 0)
      }

      // 2. Fetch user profile streak & last daily bonus
      const { data: profile } = await supabase
        .from('profiles')
        .select('daily_streak, last_daily_bonus')
        .eq('id', authUserId)
        .single()

      if (profile) {
        streak = Number(profile.daily_streak || 0)
        if (profile.last_daily_bonus) {
          const lastClaim = new Date(profile.last_daily_bonus)
          const isToday =
            lastClaim.getUTCFullYear() === now.getUTCFullYear() &&
            lastClaim.getUTCMonth() === now.getUTCMonth() &&
            lastClaim.getUTCDate() === now.getUTCDate()

          if (isToday) {
            canClaimStreak = false
          }
        }
      }

      // 3. User betting turnover for rebate
      const { data: userBets } = await supabase
        .from('bets')
        .select('amount')
        .eq('user_id', authUserId)

      if (userBets) {
        totalTurnover = userBets.reduce((sum, b) => sum + Number(b.amount || 0), 0)
        // Baseline VIP 0 rebate rate = 0.60%
        estimatedRebate = Number((totalTurnover * 0.006).toFixed(2))
      }
    }

    // 4. Calculate 7-day streak status
    // Safe clamp streak between 0 and 7
    const currentStreakIdx = Math.min(streak, 6)
    const streakDays = STREAK_REWARDS.map((rewardVal, index) => {
      let status = 'locked'
      if (index < streak) {
        status = 'completed'
      } else if (index === streak) {
        status = canClaimStreak ? 'today' : 'completed'
      } else {
        status = 'locked'
      }

      return {
        day: `Day ${index + 1}`,
        reward: `₹${rewardVal}`,
        rewardNum: rewardVal,
        status,
      }
    })

    // 5. Dynamic community jackpot pool calculation
    // Seed pool baseline ₹1,850,000 + progressive growth based on timestamp
    const baseJackpot = 1852400
    const timeFactor = Math.floor((Date.now() - 1726000000000) / 1000) * 1.5
    const jackpotPool = (baseJackpot + (timeFactor % 1000000)).toFixed(2)

    return res.json({
      success: true,
      todayBonus: todayBonus.toFixed(2),
      totalBonus: totalBonus.toFixed(2),
      streak,
      canClaimStreak,
      streakDays,
      bonusHistory,
      totalTurnover: totalTurnover.toFixed(2),
      estimatedRebate: estimatedRebate.toFixed(2),
      jackpotPool,
    })
  } catch (err) {
    console.error('[getActivityStats Exception]:', err)
    return res.status(500).json({ error: 'Failed to retrieve activity statistics' })
  }
}

/**
 * POST /api/activity/redeem-gift
 * Redeems a promotional gift code, validating usage limits and crediting wallet balance.
 */
export async function redeemGiftCode(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.body.userId
    if (!authUserId) {
      return res.status(401).json({ error: 'Please log in to redeem gift codes.' })
    }

    const rawCode = req.body.code
    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
      return res.status(400).json({ error: 'Please enter a valid gift redemption code.' })
    }

    const code = rawCode.trim().toUpperCase()

    if (isSupabaseConfigured) {
      // 1. Check if user already redeemed this code
      const { data: existingRedemption } = await supabase
        .from('gift_redemptions')
        .select('id')
        .eq('user_id', authUserId)
        .eq('code', code)
        .maybeSingle()

      if (existingRedemption) {
        return res.status(400).json({ error: 'You have already redeemed this gift code.' })
      }

      // 2. Fetch code from gift_codes table
      const { data: giftCodeRow, error: codeErr } = await supabase
        .from('gift_codes')
        .select('*')
        .eq('code', code)
        .maybeSingle()

      if (codeErr || !giftCodeRow || !giftCodeRow.is_active) {
        return res.status(404).json({
          error: 'Invalid or expired redemption code. Please check the official Telegram channel.',
        })
      }

      if (giftCodeRow.expires_at && new Date(giftCodeRow.expires_at) < new Date()) {
        return res.status(400).json({ error: 'This gift redemption code has expired.' })
      }

      if (Number(giftCodeRow.current_uses) >= Number(giftCodeRow.max_uses)) {
        return res.status(400).json({ error: 'Gift redemption code limit reached.' })
      }

      const rewardAmount = Number(giftCodeRow.amount)

      // 3. Atomically record redemption
      const { error: redeemInsertErr } = await supabase.from('gift_redemptions').insert({
        user_id: authUserId,
        code,
        amount: rewardAmount,
      })

      if (redeemInsertErr) {
        if (redeemInsertErr.code === '23505') {
          // Unique violation
          return res.status(400).json({ error: 'You have already redeemed this gift code.' })
        }
        throw redeemInsertErr
      }

      // 4. Increment code usage count
      await supabase
        .from('gift_codes')
        .update({ current_uses: Number(giftCodeRow.current_uses || 0) + 1 })
        .eq('id', giftCodeRow.id)

      // 5. Credit user wallet
      const { data: wal } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', authUserId)
        .single()

      const currentBalance = wal ? Number(wal.balance) : 0
      const newBalance = currentBalance + rewardAmount

      await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', authUserId)

      // 6. Record transaction in wallet_transactions ledger
      await supabase.from('wallet_transactions').insert({
        user_id: authUserId,
        type: 'BONUS',
        amount: rewardAmount,
        balance_after: newBalance,
        description: `Gift Code Redeemed: ${code}`,
      })

      return res.json({
        success: true,
        message: `🎉 Congratulations! Gift code ${code} redeemed successfully. ₹${rewardAmount.toFixed(2)} added to your wallet!`,
        amount: rewardAmount,
        newBalance,
      })
    }

    // Fallback in-memory
    const key = `${authUserId}:${code}`
    if (memoryGiftRedemptions.has(key)) {
      return res.status(400).json({ error: 'You have already redeemed this gift code.' })
    }

    const memCode = memoryGiftCodes.get(code)
    if (!memCode || !memCode.active) {
      return res.status(404).json({
        error: 'Invalid or expired redemption code. Please check the official Telegram channel.',
      })
    }

    memoryGiftRedemptions.add(key)
    memCode.currentUses += 1

    return res.json({
      success: true,
      message: `🎉 Congratulations! Gift code ${code} redeemed successfully. ₹${memCode.amount.toFixed(2)} added to your wallet!`,
      amount: memCode.amount,
      newBalance: 1200,
    })
  } catch (err) {
    console.error('[redeemGiftCode Exception]:', err)
    return res.status(500).json({ error: 'Failed to redeem gift code. Please try again.' })
  }
}
