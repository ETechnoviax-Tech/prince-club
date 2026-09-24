import crypto from 'crypto'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryTransactions, memoryWallets } from '../db/store.js'
import { memoryProfiles } from './authController.js'

// In-memory store for withdrawals, daily bonuses, and locked payout methods
const memoryWithdrawals = new Map() // id -> record
const memoryDailyBonus = new Map()  // userId -> lastTimestamp
export const memoryPayoutMethods = new Map() // `${userId}_${method}` -> record

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
          .insert({ user_id: userId, balance: 50.0 })
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
      memoryWallets.set(userId, 50.0)
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
    const DEFAULT_START = 50.0

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
    const body = req.validatedWithdrawal || req.body
    const userId = body.userId
    const amount = Number(body.amount)
    const payoutMethod = body.payoutMethod || 'UPI'

    // Normalize payoutDetails from any shape the client sends:
    // - explicit payoutDetails object (preferred)
    // - flat upiId field (from WithdrawModal UPI path)
    // - flat bankDetails object (from WithdrawModal bank path)
    const payoutDetails =
      body.payoutDetails ||
      (body.accountDetails ? body.accountDetails : null) ||
      (body.upiId ? { upiId: body.upiId } : null) ||
      (body.bankDetails ? body.bankDetails : null) ||
      {}

    if (!userId || !amount || amount < 100) {
      return res.status(400).json({ error: 'Valid userId and minimum amount ₹100 required' })
    }

    // 0. Authoritative Bound Account Resolution & Immutability Guarantee
    let effectiveDetails = payoutDetails
    if (isSupabaseConfigured) {
      try {
        const { data: boundMethod } = await supabase
          .from('user_payout_methods')
          .select('details')
          .eq('user_id', userId)
          .eq('method', payoutMethod)
          .maybeSingle()

        if (boundMethod?.details) {
          // Always use the immutable bound details from the database
          effectiveDetails = boundMethod.details
        } else if (payoutDetails && Object.keys(payoutDetails).length > 0) {
          // Auto-bind on first withdrawal to permanently lock
          await supabase.from('user_payout_methods').insert({
            user_id: userId,
            method: payoutMethod,
            details: payoutDetails,
            is_locked: true,
          })
          memoryPayoutMethods.set(`${userId}_${payoutMethod}`, {
            method: payoutMethod,
            details: payoutDetails,
            is_locked: true,
            created_at: new Date().toISOString(),
          })
        }
      } catch (bindErr) {
        console.warn('[requestWithdrawal auto-bind note]:', bindErr.message)
      }
    } else {
      const memKey = `${userId}_${payoutMethod}`
      if (memoryPayoutMethods.has(memKey)) {
        effectiveDetails = memoryPayoutMethods.get(memKey).details
      } else if (payoutDetails && Object.keys(payoutDetails).length > 0) {
        memoryPayoutMethods.set(memKey, {
          method: payoutMethod,
          details: payoutDetails,
          is_locked: true,
          created_at: new Date().toISOString(),
        })
      }
    }

    const targetUpi = (effectiveDetails.upiId || '').trim().toLowerCase()
    const targetAccount = (effectiveDetails.accountNumber || '').trim()
    const targetCrypto = (effectiveDetails.usdtAddress || '').trim().toLowerCase()

    // 1. Check if user already has an active pending withdrawal in memory
    for (const w of memoryWithdrawals.values()) {
      if (w.user_id === userId && w.status === 'PENDING') {
        return res.status(409).json({
          error: `You already have a pending withdrawal request of ₹${w.amount} via ${w.payout_method}. Please wait until it is processed.`,
          pendingWithdrawal: w
        })
      }
      // Check if duplicate UPI or Bank account or USDT address is already pending across any user
      if (w.status === 'PENDING') {
        const det = w.payout_details || {}
        if (targetUpi && (det.upiId || '').trim().toLowerCase() === targetUpi) {
          return res.status(409).json({
            error: 'A withdrawal request for this UPI ID is already pending. Please wait for completion.'
          })
        }
        if (targetAccount && (det.accountNumber || '').trim() === targetAccount) {
          return res.status(409).json({
            error: 'A withdrawal request for this Bank Account is already pending. Please wait for completion.'
          })
        }
        if (targetCrypto && (det.usdtAddress || '').trim().toLowerCase() === targetCrypto) {
          return res.status(409).json({
            error: 'A withdrawal request for this USDT address is already pending. Please wait for completion.'
          })
        }
      }
    }

    if (isSupabaseConfigured) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
      if (isUuid) {
        // Check if user has an active pending withdrawal in DB
        const { data: existingUserPending } = await supabase
          .from('withdrawal_requests')
          .select('id, amount, payout_method, created_at')
          .eq('user_id', userId)
          .eq('status', 'PENDING')
          .limit(1)

        if (existingUserPending && existingUserPending.length > 0) {
          const pending = existingUserPending[0]
          return res.status(409).json({
            error: `You already have a pending withdrawal request of ₹${pending.amount} via ${pending.payout_method}. Please wait until it is processed.`,
            pendingWithdrawal: pending
          })
        }

        // Check if destination UPI, Bank, or USDT is pending in DB
        if (targetUpi || targetAccount || targetCrypto) {
          const { data: dbPending } = await supabase
            .from('withdrawal_requests')
            .select('id, payout_details')
            .eq('status', 'PENDING')
            .limit(100)

          if (dbPending) {
            if (targetUpi && dbPending.some(p => ((p.payout_details?.upiId || '').trim().toLowerCase() === targetUpi))) {
              return res.status(409).json({
                error: 'A withdrawal request for this UPI ID is already pending. Please wait for completion.'
              })
            }
            if (targetAccount && dbPending.some(p => ((p.payout_details?.accountNumber || '').trim() === targetAccount))) {
              return res.status(409).json({
                error: 'A withdrawal request for this Bank Account is already pending. Please wait for completion.'
              })
            }
            if (targetCrypto && dbPending.some(p => ((p.payout_details?.usdtAddress || '').trim().toLowerCase() === targetCrypto))) {
              return res.status(409).json({
                error: 'A withdrawal request for this USDT address is already pending. Please wait for completion.'
              })
            }
          }
        }
      }

      // 1. Try atomic stored procedure for concurrency & race-condition safety
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('request_withdrawal_atomic', {
          p_user_id: userId,
          p_amount: amount,
          p_method: payoutMethod,
          p_details: effectiveDetails || {}
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
            payout_details: effectiveDetails || {},
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
        payout_details: effectiveDetails || {},
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
      payout_details: effectiveDetails || {},
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
    // Accept withdrawalId from URL param (admin client) OR request body (legacy)
    const withdrawalId = req.params.id || req.body.withdrawalId
    const { action, notes } = req.body
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
            // Update status in DB and memory, then return immediately — do NOT fall through
            await supabase
              .from('withdrawal_requests')
              .update({ status: 'REJECTED', admin_notes: notes || null, processed_at: nowIso })
              .eq('id', withdrawalId)
              .catch(() => {})

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

export async function listAdminWithdrawals(req, res) {
  const status = String(req.query.status || 'PENDING').toUpperCase()
  const allowed = ['PENDING', 'APPROVED', 'REJECTED', 'ALL']
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid withdrawal status filter' })
  if (isSupabaseConfigured) {
    let query = supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }).limit(100)
    if (status !== 'ALL') query = query.eq('status', status)
    const { data, error } = await query
    if (error) return res.status(500).json({ error: 'Failed to load withdrawal queue' })

    const userIds = [...new Set((data || []).map((w) => w.user_id).filter(Boolean))]
    const profileMap = new Map()
    if (userIds.length > 0) {
      try {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', userIds)
        if (profs) {
          profs.forEach((p) => profileMap.set(p.id, p))
        }
      } catch (_) {}
    }

    const withdrawals = (data || []).map((w) => {
      const p = profileMap.get(w.user_id) || memoryProfiles.get(w.user_id)
      const details = w.payout_details || {}
      const targetUpi = details.upiId || details.upi_id || details.upi || null
      const cleanPhone = p?.username && /^\d{10}$/.test(p.username) ? p.username : (p?.phone || p?.username || w.user_id?.slice(0, 10))
      return {
        ...w,
        user_phone: cleanPhone,
        username: p?.username || w.user_id?.slice(0, 10),
        user_email: p?.email || null,
        target_upi: targetUpi,
        account_number: details.accountNumber || null,
        ifsc: details.ifsc || null,
        holder_name: details.holderName || null,
        target_crypto: details.usdtAddress || details.cryptoAddress || null,
        crypto_network: details.network || 'TRC20',
        usdt_amount: details.usdtAmount || null,
        exchange_rate: details.exchangeRate || 92.0,
      }
    })
    return res.json({ withdrawals })
  }
  const withdrawals = Array.from(memoryWithdrawals.values())
    .filter((withdrawal) => status === 'ALL' || withdrawal.status === status)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 100)
    .map((w) => {
      const p = memoryProfiles.get(w.user_id)
      const details = w.payout_details || {}
      const targetUpi = details.upiId || details.upi_id || details.upi || null
      const cleanPhone = p?.username && /^\d{10}$/.test(p.username) ? p.username : (p?.phone || p?.username || w.user_id?.slice(0, 10))
      return {
        ...w,
        user_phone: cleanPhone,
        username: p?.username || w.user_id?.slice(0, 10),
        user_email: p?.email || null,
        target_upi: targetUpi,
        account_number: details.accountNumber || null,
        ifsc: details.ifsc || null,
        holder_name: details.holderName || null,
        target_crypto: details.usdtAddress || details.cryptoAddress || null,
        crypto_network: details.network || 'TRC20',
        usdt_amount: details.usdtAmount || null,
        exchange_rate: details.exchangeRate || 92.0,
      }
    })
  return res.json({ withdrawals })
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

    const STREAK_REWARDS = [15, 20, 25, 30, 35, 40, 50]

    if (isSupabaseConfigured) {
      let streak = 1
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, last_daily_bonus, daily_streak')
          .eq('id', authUserId)
          .single()

        if (profile?.last_daily_bonus) {
          const lastClaimed = new Date(profile.last_daily_bonus).getTime()
          const diff = now - lastClaimed
          if (diff < ONE_DAY_MS) {
            const hoursLeft = Math.ceil((ONE_DAY_MS - diff) / (1000 * 60 * 60))
            return res.status(400).json({
              error: `Daily attendance bonus already claimed! Next claim available in ${hoursLeft} hours.`,
              hoursLeft,
            })
          }
          // If claimed within 48 hours, advance streak; otherwise reset to 1
          if (diff < 2 * ONE_DAY_MS) {
            streak = ((Number(profile.daily_streak) || 0) % 7) + 1
          } else {
            streak = 1
          }
        }
      } catch {}

      const bonusAmount = STREAK_REWARDS[streak - 1] || 15

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
          .update({
            last_daily_bonus: new Date(now).toISOString(),
            daily_streak: streak,
          })
          .eq('id', authUserId)
      } catch {}

      try {
        await supabase.from('wallet_transactions').insert({
          user_id: authUserId,
          type: 'BONUS',
          amount: bonusAmount,
          balance_after: newBalance,
          description: `7-Day Attendance Bonus (Day ${streak}: ₹${bonusAmount})`,
        })
      } catch {}

      memoryDailyBonus.set(authUserId, now)

      return res.json({
        success: true,
        message: `🎉 Claimed Day ${streak} Attendance Bonus of ₹${bonusAmount}!`,
        bonusAmount,
        streak,
        newBalance,
      })
    }

    // In-memory fallback
    const lastClaim = memoryDailyBonus.get(authUserId)
    if (lastClaim && now - lastClaim < ONE_DAY_MS) {
      const hoursLeft = Math.ceil((ONE_DAY_MS - (now - lastClaim)) / (1000 * 60 * 60))
      return res.status(400).json({
        error: `Daily attendance bonus already claimed! Next claim available in ${hoursLeft} hours.`,
        hoursLeft,
      })
    }

    const bonusAmount = 25
    const curBal = memoryWallets.get(authUserId) || 1000
    const newBal = curBal + bonusAmount

    memoryWallets.set(authUserId, newBal)
    memoryDailyBonus.set(authUserId, now)

    return res.json({
      success: true,
      message: `🎉 Claimed Attendance Bonus of ₹${bonusAmount}!`,
      bonusAmount,
      streak: 1,
      newBalance: newBal,
    })
  } catch (err) {
    console.error('[claimDailyVIPBonus Exception]:', err)
    return res.status(500).json({ error: 'Failed to claim daily VIP bonus' })
  }
}

// 8. Real-Time VIP Status & Reward History
export async function getVIPStatus(req, res) {
  try {
    const authUserId = req.user ? req.user.id : req.params.userId
    if (!authUserId) {
      return res.status(401).json({ error: 'User ID is required' })
    }

    let totalTurnover = 0
    let vipHistory = []
    let currentVipLevel = 0

    if (isSupabaseConfigured) {
      // 1. Calculate actual valid bet amount (1 INR bet = 1 EXP)
      const { data: userBets } = await supabase
        .from('bets')
        .select('amount')
        .eq('user_id', authUserId)

      if (userBets && userBets.length > 0) {
        totalTurnover = userBets.reduce((sum, b) => sum + Number(b.amount || 0), 0)
      }

      const TIERS = [
        { level: 10, exp: 300000000 },
        { level: 9, exp: 100000000 },
        { level: 8, exp: 30000000 },
        { level: 7, exp: 10000000 },
        { level: 6, exp: 3000000 },
        { level: 5, exp: 1000000 },
        { level: 4, exp: 300000 },
        { level: 3, exp: 100000 },
        { level: 2, exp: 30000 },
        { level: 1, exp: 3000 },
      ]

      let calculatedLevel = 0
      for (const t of TIERS) {
        if (totalTurnover >= t.exp) {
          calculatedLevel = t.level
          break
        }
      }

      currentVipLevel = calculatedLevel


      // 3. Fetch real VIP bonus / reward transactions
      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('id, amount, description, created_at')
        .eq('user_id', authUserId)
        .or('type.eq.BONUS,description.ilike.%VIP%')
        .order('created_at', { ascending: false })
        .limit(50)

      if (txs) {
        vipHistory = txs.map((t) => ({
          id: t.id,
          amount: Number(t.amount || 0),
          description: t.description || 'VIP Bonus',
          createdAt: t.created_at,
        }))
      }
    }

    const now = new Date()
    const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 2, 0, 0)
    const daysUntilPayout = Math.max(1, Math.ceil((firstOfNextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    return res.json({
      success: true,
      experience: Math.floor(totalTurnover),
      vipLevel: currentVipLevel,
      daysUntilPayout,
      history: vipHistory,
    })
  } catch (err) {
    console.error('[getVIPStatus Exception]:', err)
    return res.status(500).json({ error: 'Failed to retrieve VIP status' })
  }
}

// 8. Fetch User Bound Payout Methods (Bank, UPI, USDT)
export async function getUserPayoutMethods(req, res) {
  try {
    const { userId } = req.params
    if (!userId) return res.status(400).json({ error: 'User ID is required' })

    if (req.user && req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied: Cannot view another user payout methods' })
    }

    const methodsMap = {}

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('user_payout_methods')
          .select('method, details, is_locked, created_at, updated_at')
          .eq('user_id', userId)

        if (!error && Array.isArray(data)) {
          data.forEach((row) => {
            methodsMap[row.method] = {
              ...row.details,
              is_locked: row.is_locked,
              created_at: row.created_at,
              updated_at: row.updated_at,
            }
          })
          return res.json({ success: true, methods: methodsMap })
        }
      } catch (err) {
        console.warn('[getUserPayoutMethods DB error]:', err.message)
      }
    }

    // Memory fallback
    for (const [key, val] of memoryPayoutMethods.entries()) {
      if (key.startsWith(`${userId}_`)) {
        methodsMap[val.method] = {
          ...val.details,
          is_locked: val.is_locked,
          created_at: val.created_at,
          updated_at: val.updated_at,
        }
      }
    }

    return res.json({ success: true, methods: methodsMap })
  } catch (err) {
    console.error('[getUserPayoutMethods Exception]:', err)
    return res.status(500).json({ error: 'Failed to retrieve payout methods' })
  }
}

// 9. Bind Payout Method (Permanently locked upon creation; change requires customer support)
export async function bindPayoutMethod(req, res) {
  try {
    const authUserId = req.user?.id
    if (!authUserId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { method, details } = req.body
    const cleanMethod = String(method || '').trim().toUpperCase()
    if (!['BANK', 'UPI', 'USDT'].includes(cleanMethod)) {
      return res.status(400).json({ error: 'Invalid payout method. Must be BANK, UPI, or USDT' })
    }

    if (!details || typeof details !== 'object') {
      return res.status(400).json({ error: 'Payout details object is required' })
    }

    // 1. Strict validation per method
    const cleanDetails = {}
    if (cleanMethod === 'BANK') {
      const { bankName, accountNumber, ifsc, holderName } = details
      if (!bankName || typeof bankName !== 'string' || bankName.trim().length < 2) {
        return res.status(400).json({ error: 'Bank name is required' })
      }
      const cleanAc = String(accountNumber || '').trim().replace(/\D/g, '')
      if (!/^\d{9,18}$/.test(cleanAc)) {
        return res.status(400).json({ error: 'Bank account number must be between 9 and 18 digits' })
      }
      const cleanIfsc = String(ifsc || '').trim().toUpperCase()
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        return res.status(400).json({ error: 'Valid 11-character Indian IFSC code required (e.g. SBIN0001234)' })
      }
      if (!holderName || typeof holderName !== 'string' || holderName.trim().length < 2) {
        return res.status(400).json({ error: 'Account holder name is required' })
      }
      cleanDetails.bankName = bankName.trim()
      cleanDetails.accountNumber = cleanAc
      cleanDetails.ifsc = cleanIfsc
      cleanDetails.holderName = holderName.trim()
    } else if (cleanMethod === 'UPI') {
      const { upiId, holderName } = details
      const cleanUpi = String(upiId || '').trim().toLowerCase()
      if (!cleanUpi || !/^[\w.-]+@[\w.-]+$/.test(cleanUpi)) {
        return res.status(400).json({ error: 'Valid UPI ID / VPA is required (e.g. 9876543210@upi)' })
      }
      cleanDetails.upiId = cleanUpi
      cleanDetails.holderName = holderName ? String(holderName).trim() : ''
    } else if (cleanMethod === 'USDT') {
      const { usdtAddress, network } = details
      const net = String(network || 'TRC20').trim().toUpperCase() === 'BEP20' ? 'BEP20' : 'TRC20'
      const cleanAddr = String(usdtAddress || '').trim()
      if (net === 'TRC20' && !/^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(cleanAddr)) {
        return res.status(400).json({ error: 'Invalid TRC20 address: must start with T and be 34 characters' })
      }
      if (net === 'BEP20' && !/^0x[a-fA-F0-9]{40}$/.test(cleanAddr)) {
        return res.status(400).json({ error: 'Invalid BEP20 address: must start with 0x and be 42 characters' })
      }
      cleanDetails.usdtAddress = cleanAddr
      cleanDetails.network = net
    }

    // 2. IMMUTABILITY CHECK: Once bound, the user cannot change it!
    if (isSupabaseConfigured) {
      const { data: existing, error: fetchErr } = await supabase
        .from('user_payout_methods')
        .select('*')
        .eq('user_id', authUserId)
        .eq('method', cleanMethod)
        .maybeSingle()

      if (!fetchErr && existing) {
        return res.status(403).json({
          error: `Your ${cleanMethod === 'BANK' ? 'Bank Card' : cleanMethod} is already bound and permanently locked for security. To modify or reset your withdrawal details, please contact 24/7 Customer Support.`,
          isLocked: true,
          details: existing.details,
        })
      }

      // 3. Insert and lock permanently
      const { data: inserted, error: insErr } = await supabase
        .from('user_payout_methods')
        .insert({
          user_id: authUserId,
          method: cleanMethod,
          details: cleanDetails,
          is_locked: true,
        })
        .select()
        .single()

      if (insErr) {
        if (insErr.code === '23505') {
          return res.status(403).json({
            error: `Your ${cleanMethod === 'BANK' ? 'Bank Card' : cleanMethod} is already bound and locked. Contact Customer Support to change.`,
            isLocked: true,
          })
        }
        return res.status(500).json({ error: 'Failed to bind payout method: ' + insErr.message })
      }

      memoryPayoutMethods.set(`${authUserId}_${cleanMethod}`, {
        method: cleanMethod,
        details: cleanDetails,
        is_locked: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      return res.status(201).json({
        success: true,
        message: `${cleanMethod === 'BANK' ? 'Bank Card' : cleanMethod} bound and locked successfully.`,
        method: cleanMethod,
        details: cleanDetails,
        isLocked: true,
      })
    }

    // In-memory fallback
    const memKey = `${authUserId}_${cleanMethod}`
    if (memoryPayoutMethods.has(memKey)) {
      const cur = memoryPayoutMethods.get(memKey)
      return res.status(403).json({
        error: `Your ${cleanMethod === 'BANK' ? 'Bank Card' : cleanMethod} is already bound and locked. Contact Customer Support to change.`,
        isLocked: true,
        details: cur.details,
      })
    }

    const record = {
      method: cleanMethod,
      details: cleanDetails,
      is_locked: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    memoryPayoutMethods.set(memKey, record)

    return res.status(201).json({
      success: true,
      message: `${cleanMethod} bound and locked successfully`,
      method: cleanMethod,
      details: cleanDetails,
      isLocked: true,
    })
  } catch (err) {
    console.error('[bindPayoutMethod Exception]:', err)
    return res.status(500).json({ error: 'Server error binding payout method' })
  }
}

// 10. Admin Reset / Modify Payout Method (Called by Admin upon user customer support ticket)
export async function adminResetPayoutMethod(req, res) {
  try {
    const { userId, method, newDetails } = req.body
    if (!userId || !method) {
      return res.status(400).json({ error: 'userId and method are required' })
    }

    const cleanMethod = String(method).trim().toUpperCase()

    if (isSupabaseConfigured) {
      if (newDetails && typeof newDetails === 'object') {
        const { error } = await supabase
          .from('user_payout_methods')
          .update({ details: newDetails, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('method', cleanMethod)
        if (error) return res.status(500).json({ error: error.message })
      } else {
        const { error } = await supabase
          .from('user_payout_methods')
          .delete()
          .eq('user_id', userId)
          .eq('method', cleanMethod)
        if (error) return res.status(500).json({ error: error.message })
      }
    }

    const memKey = `${userId}_${cleanMethod}`
    if (newDetails) {
      memoryPayoutMethods.set(memKey, { method: cleanMethod, details: newDetails, is_locked: true, updated_at: new Date().toISOString() })
    } else {
      memoryPayoutMethods.delete(memKey)
    }

    return res.json({
      success: true,
      message: `User payout method ${cleanMethod} has been successfully ${newDetails ? 'updated' : 'unbound/reset'} by Customer Support.`,
    })
  } catch (err) {
    console.error('[adminResetPayoutMethod Exception]:', err)
    return res.status(500).json({ error: 'Server error resetting payout method' })
  }
}


