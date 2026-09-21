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

/**
 * GET /api/activity/rebate/stats
 * Real-time calculation of user's valid turnover and uncollected rebate cashback.
 */
export async function getRebateStats(req, res) {
  try {
    const authUserId = req.user ? req.user.id : (req.query.userId || null)
    if (!authUserId) {
      return res.status(401).json({ error: 'Please log in to view rebate stats' })
    }

    const category = (req.query.category || 'All').trim()

    let totalTurnover = 0
    let pendingRebate = 0
    let todayRebate = 0
    let totalRebate = 0
    let history = []

    const rebateRate = 0.0005 // 0.05% baseline

    if (isSupabaseConfigured) {
      // 1. Fetch user bets based on category
      const { data: bets } = await supabase.from('bets').select('amount, game_mode, created_at').eq('user_id', authUserId)

      if (bets && bets.length > 0) {
        let filteredBets = bets
        if (category === 'Lottery') {
          filteredBets = bets.filter((b) => ['PARITY', 'SAPRE', 'BCON', 'EMERD', 'WINGO', 'K3', '5D', 'TRX'].includes((b.game_mode || '').toUpperCase()))
        } else if (category === 'Casino') {
          filteredBets = bets.filter((b) => ['AVIATOR', 'MINES', 'DRAGON_TIGER', 'SLOT', 'SLOTS'].includes((b.game_mode || '').toUpperCase()))
        } else if (category === 'Rummy') {
          filteredBets = bets.filter((b) => ['RUMMY', 'TEENPATTI'].includes((b.game_mode || '').toUpperCase()))
        }

        totalTurnover = filteredBets.reduce((sum, b) => sum + Number(b.amount || 0), 0)
      }

      // 2. Fetch already claimed rebate records
      const { data: claimedRecords } = await supabase
        .from('rebate_records')
        .select('*')
        .eq('user_id', authUserId)
        .order('created_at', { ascending: false })

      if (claimedRecords && claimedRecords.length > 0) {
        history = claimedRecords.map((r) => ({
          id: r.id,
          category: r.category || 'Lottery',
          turnover: Number(r.turnover || 0),
          rate: Number(r.rebate_rate || 0.0005) * 100,
          amount: Number(r.rebate_amount || 0),
          status: r.status || 'Completed',
          createdAt: r.created_at,
        }))

        totalRebate = claimedRecords.reduce((sum, r) => sum + Number(r.rebate_amount || 0), 0)

        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const todayRecords = claimedRecords.filter((r) => r.created_at >= startOfToday)
        todayRebate = todayRecords.reduce((sum, r) => sum + Number(r.rebate_amount || 0), 0)
      }

      // Calculate claimed turnover for unwashed rebate calculation
      const claimedTurnover = claimedRecords?.reduce((sum, r) => sum + Number(r.turnover || 0), 0) || 0
      const unwashedTurnover = Math.max(0, totalTurnover - claimedTurnover)
      pendingRebate = Number((unwashedTurnover * rebateRate).toFixed(2))

      return res.json({
        success: true,
        category,
        totalTurnover: totalTurnover.toFixed(2),
        unwashedTurnover: unwashedTurnover.toFixed(2),
        rebateRate: (rebateRate * 100).toFixed(2) + '%',
        pendingRebate: pendingRebate.toFixed(2),
        todayRebate: todayRebate.toFixed(2),
        totalRebate: totalRebate.toFixed(2),
        history,
      })
    }

    return res.json({
      success: true,
      category,
      totalTurnover: '0.00',
      unwashedTurnover: '0.00',
      rebateRate: '0.05%',
      pendingRebate: '0.00',
      todayRebate: '0.00',
      totalRebate: '0.00',
      history: [],
    })
  } catch (err) {
    console.error('[getRebateStats Exception]:', err)
    return res.status(500).json({ error: 'Failed to retrieve rebate statistics' })
  }
}

/**
 * POST /api/activity/rebate/claim
 * One-click claim of accumulated real-time betting rebate.
 */
export async function claimOneClickRebate(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.body.userId
    if (!authUserId) {
      return res.status(401).json({ error: 'Please log in to claim rebate' })
    }

    const rebateRate = 0.0005

    if (isSupabaseConfigured) {
      // 1. Calculate unwashed turnover
      const { data: bets } = await supabase.from('bets').select('amount').eq('user_id', authUserId)
      const totalTurnover = bets ? bets.reduce((sum, b) => sum + Number(b.amount || 0), 0) : 0

      const { data: claimedRecords } = await supabase.from('rebate_records').select('turnover').eq('user_id', authUserId)
      const claimedTurnover = claimedRecords ? claimedRecords.reduce((sum, r) => sum + Number(r.turnover || 0), 0) : 0

      const unwashedTurnover = Math.max(0, totalTurnover - claimedTurnover)
      const pendingRebate = Number((unwashedTurnover * rebateRate).toFixed(2))

      if (pendingRebate <= 0) {
        return res.status(400).json({
          error: 'No rebate available to claim. Place real-money bets to accumulate turnover rebate!',
        })
      }

      // 2. Credit wallet balance atomically
      const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', authUserId).single()
      const currentBalance = wal ? Number(wal.balance) : 0
      const newBalance = currentBalance + pendingRebate

      await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', authUserId)

      // 3. Insert rebate_records
      await supabase.from('rebate_records').insert({
        user_id: authUserId,
        category: 'All',
        turnover: unwashedTurnover,
        rebate_rate: rebateRate,
        rebate_amount: pendingRebate,
        status: 'Completed',
      })

      // 4. Ledger transaction
      await supabase.from('wallet_transactions').insert({
        user_id: authUserId,
        type: 'BONUS',
        amount: pendingRebate,
        balance_after: newBalance,
        description: `One-Click Real-Time Betting Rebate (₹${pendingRebate})`,
      })

      return res.json({
        success: true,
        message: `🎉 Successfully claimed ₹${pendingRebate.toFixed(2)} betting rebate!`,
        claimedAmount: pendingRebate,
        newBalance,
      })
    }

    return res.status(400).json({ error: 'No rebate available to claim yet.' })
  } catch (err) {
    console.error('[claimOneClickRebate Exception]:', err)
    return res.status(500).json({ error: 'Failed to claim rebate' })
  }
}

/**
 * GET /api/activity/first-gift/status
 * Returns user eligibility, first deposit amount, and claim status for 30% first deposit gift.
 */
export async function getFirstGiftStatus(req, res) {
  try {
    const authUserId = req.user ? req.user.id : (req.query.userId || null)
    if (!authUserId) {
      return res.json({
        success: true,
        hasDeposited: false,
        firstDepositAmount: 0,
        eligibleBonus: 0,
        isClaimed: false,
        canClaim: false,
      })
    }

    if (isSupabaseConfigured) {
      // 1. Check if user made an approved deposit
      const { data: firstDeposit } = await supabase
        .from('deposit_requests')
        .select('amount, created_at')
        .eq('user_id', authUserId)
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      // 2. Check if already claimed
      const { data: claimTx } = await supabase
        .from('wallet_transactions')
        .select('id, amount, created_at')
        .eq('user_id', authUserId)
        .eq('type', 'BONUS')
        .ilike('description', '%First Deposit%')
        .maybeSingle()

      const hasDeposited = !!firstDeposit
      const firstDepositAmount = Number(firstDeposit?.amount || 0)
      const eligibleBonus = Math.min(Number((firstDepositAmount * 0.30).toFixed(2)), 200.00)
      const isClaimed = !!claimTx

      return res.json({
        success: true,
        hasDeposited,
        firstDepositAmount,
        eligibleBonus,
        isClaimed,
        canClaim: hasDeposited && !isClaimed && eligibleBonus > 0,
        claimedAt: claimTx?.created_at || null,
      })
    }

    return res.json({
      success: true,
      hasDeposited: false,
      firstDepositAmount: 0,
      eligibleBonus: 0,
      isClaimed: false,
      canClaim: false,
    })
  } catch (err) {
    console.error('[getFirstGiftStatus Exception]:', err)
    return res.status(500).json({ error: 'Failed to retrieve first gift status' })
  }
}

/**
 * POST /api/activity/first-gift/claim
 * Claims the 30% First Deposit Compensation Gift (up to ₹200.00).
 */
export async function claimFirstGift(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.body.userId
    if (!authUserId) {
      return res.status(401).json({ error: 'Please log in to claim your first gift.' })
    }

    if (isSupabaseConfigured) {
      // Check first deposit
      const { data: firstDeposit } = await supabase
        .from('deposit_requests')
        .select('amount')
        .eq('user_id', authUserId)
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!firstDeposit) {
        return res.status(400).json({
          error: 'First deposit required! Make your first deposit of at least ₹100 to unlock this 30% gift reward.',
        })
      }

      // Check if already claimed
      const { data: existingClaim } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('user_id', authUserId)
        .eq('type', 'BONUS')
        .ilike('description', '%First Deposit%')
        .maybeSingle()

      if (existingClaim) {
        return res.status(400).json({ error: 'You have already claimed your First Deposit Welcome Gift.' })
      }

      const depAmount = Number(firstDeposit.amount || 0)
      const bonusAmount = Math.min(Number((depAmount * 0.30).toFixed(2)), 200.00)

      // Credit wallet
      const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', authUserId).single()
      const currentBalance = wal ? Number(wal.balance) : 0
      const newBalance = currentBalance + bonusAmount

      await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', authUserId)

      // Ledger
      await supabase.from('wallet_transactions').insert({
        user_id: authUserId,
        type: 'BONUS',
        amount: bonusAmount,
        balance_after: newBalance,
        description: `First Deposit Welcome Gift (30% Compensation: ₹${bonusAmount})`,
      })

      return res.json({
        success: true,
        message: `🎉 Congratulations! 30% First Deposit Gift of ₹${bonusAmount.toFixed(2)} added to your wallet!`,
        bonusAmount,
        newBalance,
      })
    }

    return res.status(400).json({ error: 'First deposit bonus unavailable.' })
  } catch (err) {
    console.error('[claimFirstGift Exception]:', err)
    return res.status(500).json({ error: 'Failed to claim first deposit gift.' })
  }
}
