import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryTransactions, memoryWallets } from '../db/store.js'

// In-memory store for withdrawals and daily bonuses
const memoryWithdrawals = new Map() // id -> record
const memoryDailyBonus = new Map()  // userId -> lastTimestamp

export async function getWallet(req, res) {
  try {
    const { userId } = req.params

    // Strict Authorization Guard
    if (req.user && req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied: Cannot view another user wallet' })
    }

    if (isSupabaseConfigured) {
      let { data: wallet, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        return res.status(500).json({ error: 'Failed to retrieve wallet' })
      }

      if (!wallet) {
        // Auto-create wallet with initial credits
        const { data: newWallet, error: createErr } = await supabase
          .from('wallets')
          .insert({ user_id: userId, balance: 1000.0 })
          .select()
          .single()

        if (createErr) {
          return res.status(500).json({ error: 'Failed to initialize wallet' })
        }
        wallet = newWallet
      }

      return res.json({ wallet })
    }

    // Fallback store
    if (!memoryWallets.has(userId)) {
      memoryWallets.set(userId, 1000.0)
    }
    return res.json({
      wallet: {
        user_id: userId,
        balance: memoryWallets.get(userId),
        currency: 'INR',
      },
    })
  } catch (err) {
    console.error('[getWallet Exception]:', err)
    return res.status(500).json({ error: 'Server error retrieving wallet' })
  }
}

export async function getTransactions(req, res) {
  try {
    const { userId } = req.params

    if (req.user && req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied: Cannot view another user transactions' })
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)

    if (isSupabaseConfigured && isUuid) {
      try {
        const { data, error } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!error && data) {
          return res.json({ transactions: data })
        }
      } catch (dbErr) {
        console.warn('[getTransactions] Supabase query fallback:', dbErr.message)
      }
    }

    const txs = memoryTransactions
      .filter((t) => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return res.json({ transactions: txs })

  } catch (err) {
    return res.status(500).json({ error: 'Server error fetching transactions' })
  }
}

export async function resetWallet(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.body.userId
    const DEFAULT_START = 1000.0

    if (process.env.NODE_ENV === 'production' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Wallet reset is disabled in production mode' })
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('wallets')
        .update({ balance: DEFAULT_START, updated_at: new Date().toISOString() })
        .eq('user_id', authUserId)
        .select()
        .single()

      if (error) return res.status(500).json({ error: 'Failed to reset wallet' })
      return res.json({ message: 'Wallet balance reset', wallet: data })
    }

    memoryWallets.set(authUserId, DEFAULT_START)
    return res.json({
      message: 'Wallet balance reset',
      wallet: { user_id: authUserId, balance: DEFAULT_START },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset wallet' })
  }
}

// 4. Request Payout Withdrawal (UPI / Bank Account)
export async function requestWithdrawal(req, res) {
  try {
    const { userId, amount, payoutMethod, payoutDetails } = req.validatedWithdrawal || req.body

    if (!userId || !amount || amount < 100) {
      return res.status(400).json({ error: 'Valid userId and minimum amount ₹100 required' })
    }

    if (isSupabaseConfigured) {
      // 1. Try atomic stored procedure for concurrency & race-condition safety
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('request_withdrawal_atomic', {
          p_user_id: userId,
          p_amount: amount,
          p_method: payoutMethod,
          p_details: payoutDetails || {}
        })

        if (!rpcErr && rpcRes) {
          if (!rpcRes.success) {
            return res.status(400).json({ error: rpcRes.error || 'Withdrawal request failed' })
          }

          const record = {
            id: rpcRes.withdrawal_id,
            user_id: userId,
            amount,
            payout_method: payoutMethod,
            payout_details: payoutDetails || {},
            status: 'PENDING',
            created_at: new Date().toISOString()
          }
          memoryWithdrawals.set(record.id, record)

          return res.status(201).json({
            message: 'Withdrawal request submitted successfully. Processing within 2-24 hours.',
            withdrawal: record,
            newBalance: rpcRes.new_balance,
          })
        }
      } catch (rpcEx) {
        console.warn('[Supabase] request_withdrawal_atomic fallback:', rpcEx.message)
      }

      // 2. Fallback: Optimistic balance deduction if RPC is not loaded
      const { data: wallet, error: walErr } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (walErr || !wallet) {
        return res.status(404).json({ error: 'User wallet not found' })
      }

      if (Number(wallet.balance) < amount) {
        return res.status(400).json({
          error: `Insufficient balance. Your balance is ₹${wallet.balance}, requested ₹${amount}.`,
        })
      }

      // 3. Atomic Balance Deduction with optimistic check
      const newBalance = Number(wallet.balance) - amount
      const { data: updatedWal, error: deductErr } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId)
        .gte('balance', amount)
        .select()
        .single()

      if (deductErr || !updatedWal) {
        return res.status(400).json({ error: 'Insufficient balance or concurrent transaction conflict' })
      }

      // 4. Create Withdrawal Request Record
      const record = {
        id: crypto.randomUUID(),
        user_id: userId,
        amount,
        payout_method: payoutMethod,
        payout_details: payoutDetails || {},
        status: 'PENDING',
        created_at: new Date().toISOString(),
      }

      try {
        await supabase.from('withdrawal_requests').insert(record)
      } catch (insErr) {
        console.warn('[Supabase] Withdrawal insert note:', insErr.message)
      }

      // 5. Ledger Transaction & Audit Event
      try {
        await supabase.from('wallet_transactions').insert({
          user_id: userId,
          type: 'WITHDRAWAL',
          amount: -amount,
          balance_after: newBalance,
          reference_id: record.id,
          description: `Withdrawal request to ${payoutMethod} (${amount})`,
        })

        await supabase.from('payment_events').insert({
          user_id: userId,
          event_type: 'WITHDRAWAL_REQUESTED',
          reference_id: record.id,
          payload: { amount, payout_method: payoutMethod, balance_after: newBalance }
        })
      } catch {}

      memoryWithdrawals.set(record.id, record)

      return res.status(201).json({
        message: 'Withdrawal request submitted successfully. Processing within 2-24 hours.',
        withdrawal: record,
        newBalance,
      })
    }


    // Fallback in-memory
    const curBal = memoryWallets.get(userId) || 1000
    if (curBal < amount) {
      return res.status(400).json({ error: `Insufficient balance. Balance is ₹${curBal}` })
    }

    const newBal = curBal - amount
    memoryWallets.set(userId, newBal)

    const record = {
      id: crypto.randomUUID(),
      user_id: userId,
      amount,
      payout_method: payoutMethod,
      payout_details: payoutDetails || {},
      status: 'PENDING',
      created_at: new Date().toISOString(),
    }
    memoryWithdrawals.set(record.id, record)

    return res.status(201).json({
      message: 'Withdrawal request submitted successfully',
      withdrawal: record,
      newBalance: newBal,
    })
  } catch (err) {
    console.error('[requestWithdrawal Exception]:', err)
    return res.status(500).json({ error: 'Server error processing withdrawal request' })
  }
}

// 5. Get User Withdrawal History
export async function getUserWithdrawals(req, res) {
  try {
    const { userId } = req.params
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (req.user && req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied: Cannot view another user withdrawals' })
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30)

        if (!error && Array.isArray(data) && data.length > 0) {
          return res.json({ withdrawals: data })
        }
      } catch {}
    }

    const userWithdrawals = Array.from(memoryWithdrawals.values())
      .filter((w) => w.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return res.json({ withdrawals: userWithdrawals })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve withdrawals' })
  }
}

// 6. Admin Verify Withdrawal (Approve or Reject with Refund)
export async function adminVerifyWithdrawal(req, res) {
  try {
    const { withdrawalId, action, notes } = req.body
    if (!withdrawalId || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'withdrawalId and action (APPROVE/REJECT) are required' })
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
    const nowIso = new Date().toISOString()

    let wRecord = null
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('id', withdrawalId)
          .single()
        if (!error && data) wRecord = data
      } catch {}
    }

    if (!wRecord) {
      wRecord = memoryWithdrawals.get(withdrawalId)
    }

    if (!wRecord) {
      return res.status(404).json({ error: 'Withdrawal request not found' })
    }

    if (wRecord.status !== 'PENDING') {
      return res.status(400).json({ error: `Withdrawal is already ${wRecord.status}` })
    }

    // 2. If rejected, refund the wallet balance atomically
    if (action === 'REJECT') {
      if (isSupabaseConfigured) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('process_refund', {
            p_target_id: withdrawalId,
            p_refund_type: 'WITHDRAWAL',
            p_amount: Number(wRecord.amount),
            p_reason: notes || 'Admin rejected withdrawal',
            p_admin_id: req.user?.id || null
          })

          if (!rpcErr && rpcRes?.success) {
            wRecord.status = 'REJECTED'
            wRecord.admin_notes = notes || null
            wRecord.processed_at = nowIso
            memoryWithdrawals.set(withdrawalId, wRecord)

            return res.json({
              success: true,
              message: 'Withdrawal rejected and refunded atomically',
              withdrawalId,
              status: 'REJECTED',
              newBalance: rpcRes.new_balance
            })
          }
        } catch (rpcEx) {
          console.warn('[Supabase] process_refund RPC fallback:', rpcEx.message)
        }

        // Fallback manual refund
        try {
          const { data: wal } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', wRecord.user_id)
            .single()

          if (wal) {
            const refundedBal = Number(wal.balance) + Number(wRecord.amount)
            await supabase.from('wallets').update({ balance: refundedBal }).eq('user_id', wRecord.user_id)
            await supabase.from('wallet_transactions').insert({
              user_id: wRecord.user_id,
              type: 'REFUND',
              amount: Number(wRecord.amount),
              balance_after: refundedBal,
              reference_id: withdrawalId,
              description: `Withdrawal rejected: ${notes || 'Refunded to wallet'}`,
            })
          }
        } catch {}
      } else {
        const cur = memoryWallets.get(wRecord.user_id) || 0
        memoryWallets.set(wRecord.user_id, cur + Number(wRecord.amount))
      }
    }

    // 3. Update status in Supabase if table exists
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('withdrawal_requests')
          .update({
            status: newStatus,
            admin_notes: notes || null,
            processed_at: nowIso,
          })
          .eq('id', withdrawalId)

        await supabase.from('payment_events').insert({
          user_id: wRecord.user_id,
          event_type: action === 'APPROVE' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
          reference_id: withdrawalId,
          payload: { admin_id: req.user?.id || null, notes }
        }).catch(() => {})
      } catch {}
    }


    wRecord.status = newStatus
    wRecord.admin_notes = notes || null
    wRecord.processed_at = nowIso
    memoryWithdrawals.set(withdrawalId, wRecord)

    return res.json({
      success: true,
      message: `Withdrawal ${newStatus.toLowerCase()} successfully`,
      withdrawalId,
      status: newStatus,
    })
  } catch (err) {
    console.error('[adminVerifyWithdrawal Exception]:', err)
    return res.status(500).json({ error: 'Failed to verify withdrawal' })
  }
}

// 7. VIP Daily Check-In Bonus
export async function claimDailyVIPBonus(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.body.userId

    if (!authUserId) {
      return res.status(401).json({ error: 'Authenticated user session is required' })
    }

    const now = Date.now()
    const ONE_DAY_MS = 24 * 60 * 60 * 1000

    // Immediate memory guard against duplicate claims
    const cachedClaim = memoryDailyBonus.get(authUserId)
    if (cachedClaim && now - cachedClaim < ONE_DAY_MS) {
      const hoursLeft = Math.ceil((ONE_DAY_MS - (now - cachedClaim)) / (1000 * 60 * 60))
      return res.status(400).json({
        error: `Daily VIP bonus already claimed! Next claim available in ${hoursLeft} hours.`,
        hoursLeft,
      })
    }

    if (isSupabaseConfigured) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, last_daily_bonus')
          .eq('id', authUserId)
          .single()

        if (profile?.last_daily_bonus) {
          const lastClaimed = new Date(profile.last_daily_bonus).getTime()
          const diff = now - lastClaimed
          if (diff < ONE_DAY_MS) {
            const hoursLeft = Math.ceil((ONE_DAY_MS - diff) / (1000 * 60 * 60))
            return res.status(400).json({
              error: `Daily VIP bonus already claimed! Next claim available in ${hoursLeft} hours.`,
              hoursLeft,
            })
          }
        }
      } catch {}

      // Random daily bonus between ₹15 and ₹50
      const bonusAmount = Math.floor(Math.random() * 36) + 15

      // Credit wallet
      const { data: wal } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', authUserId)
        .single()

      const currentBalance = wal ? Number(wal.balance) : 0
      const newBalance = currentBalance + bonusAmount

      await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', authUserId)
      try {
        await supabase
          .from('profiles')
          .update({ last_daily_bonus: new Date(now).toISOString() })
          .eq('id', authUserId)
      } catch {}

      try {
        await supabase.from('wallet_transactions').insert({
          user_id: authUserId,
          type: 'BONUS',
          amount: bonusAmount,
          balance_after: newBalance,
          description: `VIP Daily Check-In Bonus (₹${bonusAmount})`,
        })
      } catch {}

      memoryDailyBonus.set(authUserId, now)

      return res.json({
        success: true,
        message: `🎉 Claimed VIP Daily Bonus of ₹${bonusAmount}!`,
        bonusAmount,
        newBalance,
      })
    }

    // In-memory fallback
    const lastClaim = memoryDailyBonus.get(authUserId)
    if (lastClaim && now - lastClaim < ONE_DAY_MS) {
      const hoursLeft = Math.ceil((ONE_DAY_MS - (now - lastClaim)) / (1000 * 60 * 60))
      return res.status(400).json({
        error: `Daily VIP bonus already claimed! Next claim available in ${hoursLeft} hours.`,
        hoursLeft,
      })
    }

    const bonusAmount = Math.floor(Math.random() * 36) + 15
    const curBal = memoryWallets.get(authUserId) || 1000
    const newBal = curBal + bonusAmount

    memoryWallets.set(authUserId, newBal)
    memoryDailyBonus.set(authUserId, now)

    return res.json({
      success: true,
      message: `🎉 Claimed VIP Daily Bonus of ₹${bonusAmount}!`,
      bonusAmount,
      newBalance: newBal,
    })
  } catch (err) {
    console.error('[claimDailyVIPBonus Exception]:', err)
    return res.status(500).json({ error: 'Failed to claim daily VIP bonus' })
  }
}
