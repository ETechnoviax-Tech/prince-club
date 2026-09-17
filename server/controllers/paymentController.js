import crypto from 'crypto'
import QRCode from 'qrcode'
import { isSupabaseConfigured, supabase } from '../config/supabase.js'
import { memoryDeposits, memoryTransactions, memoryWallets } from '../db/store.js'

async function logPaymentEvent(userId, eventType, referenceId, payload = {}) {
  if (!isSupabaseConfigured || !supabase) return
  try {
    await supabase.from('payment_events').insert({
      user_id: userId,
      event_type: eventType,
      reference_id: referenceId ? String(referenceId) : null,
      payload,
    })
  } catch (_) {}
}

export async function createDeposit(req, res) {
  try {
    const userId = req.targetUserId || (req.user ? req.user.id : req.body.userId)
    const amount = req.validatedAmount || Number(req.body.amount)

    if (!userId || !amount || amount < 100) {
      return res.status(400).json({ error: 'Valid userId and minimum deposit of ₹100 required' })
    }

    const merchantVPA = process.env.MERCHANT_UPI_VPA || 'club69@upi'
    const merchantName = process.env.MERCHANT_NAME || '69 Club'
    const orderRef = `C69-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`

    // Standard UPI Intent specification
    const upiUri = `upi://pay?pa=${encodeURIComponent(merchantVPA)}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&cu=INR&tr=${orderRef}&tn=${encodeURIComponent('Deposit ' + orderRef)}`

    // Generate Base64 QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })

    const depositRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      amount,
      order_ref: orderRef,
      upi_vpa: merchantVPA,
      utr_number: null,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    }

    // Record audit event asynchronously
    logPaymentEvent(userId, 'DEPOSIT_CREATED', depositRecord.id, { order_ref: orderRef, amount, upi_vpa: merchantVPA })


    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('deposit_requests')
        .insert(depositRecord)
        .select()
        .single()

      if (error) {
        console.error('[Supabase Error] createDeposit:', error)
        return res.status(500).json({ error: 'Failed to create deposit record' })
      }
      return res.status(201).json({
        deposit: data,
        upiUri,
        qrCodeDataUrl,
        merchantVPA,
        merchantName,
      })
    }


    // Fallback store
    memoryDeposits.set(depositRecord.id, depositRecord)
    return res.status(201).json({
      deposit: depositRecord,
      upiUri,
      qrCodeDataUrl,
      merchantVPA,
      merchantName,
    })
  } catch (err) {
    console.error('[createDeposit Exception]:', err)
    return res.status(500).json({ error: 'Internal server error creating deposit' })
  }
}

export async function submitUTR(req, res) {
  try {
    const { depositId } = req.body
    const utr = req.cleanUTR || String(req.body.utrNumber).trim()
    const autoApprove = process.env.AUTO_APPROVE_UTR === 'true'

    if (isSupabaseConfigured) {
      // 1. Fetch current deposit first to verify ownership
      const { data: deposit, error: depErr } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('id', depositId)
        .single()

      if (depErr || !deposit) {
        return res.status(404).json({ error: 'Deposit request not found' })
      }

      // Ensure user owns this deposit
      if (req.user && req.user.role !== 'admin' && req.user.id !== deposit.user_id) {
        return res.status(403).json({ error: 'Security violation: Cannot submit UTR for another user deposit' })
      }

      if (deposit.status === 'APPROVED') {
        return res.status(400).json({ error: 'Deposit is already approved' })
      }

      // 2. Check if UTR already exists on any approved or pending deposit (Anti-duplicate / anti-replay)
      const { data: existingUTR, error: utrCheckErr } = await supabase
        .from('deposit_requests')
        .select('id, order_ref, status')
        .eq('utr_number', utr)
        .maybeSingle()

      if (utrCheckErr) {
        console.error('[Supabase Error] UTR check:', utrCheckErr)
        return res.status(500).json({ error: 'Failed to verify UTR uniqueness' })
      }

      if (existingUTR && existingUTR.id !== depositId) {
        return res.status(409).json({
          error: 'This UTR has already been submitted for another transaction.',
          orderRef: existingUTR.order_ref,
        })
      }

      // 3. Attach UTR
      const { data: updated, error: updateErr } = await supabase
        .from('deposit_requests')
        .update({ utr_number: utr, status: 'PENDING' })
        .eq('id', depositId)
        .select()
        .single()

      if (updateErr) {
        console.error('[Supabase Error] attach UTR:', updateErr)
        return res.status(500).json({ error: 'Failed to update UTR' })
      }

      // Auto-approve if explicitly enabled
      if (autoApprove) {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('approve_deposit_utr', {
          p_deposit_id: depositId,
          p_notes: 'Auto-approved in sandbox mode',
        })
        if (!rpcErr && rpcRes?.success) {
          logPaymentEvent(deposit.user_id, 'DEPOSIT_AUTO_APPROVED', depositId, { utr, amount: deposit.amount })

          return res.json({
            message: 'UTR submitted and auto-approved',
            deposit: { ...updated, status: 'APPROVED' },
            newBalance: rpcRes.new_balance,
          })
        }
      }

      logPaymentEvent(deposit.user_id, 'UTR_SUBMITTED', depositId, { utr, order_ref: deposit.order_ref })

      return res.json({
        message: 'UTR submitted successfully. Awaiting admin verification.',
        deposit: updated,
      })


    }

    // Fallback in-memory logic
    const deposit = memoryDeposits.get(depositId)
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit request not found' })
    }

    if (req.user && req.user.role !== 'admin' && req.user.id !== deposit.user_id) {
      return res.status(403).json({ error: 'Security violation: Cannot submit UTR for another user deposit' })
    }

    for (const [id, d] of memoryDeposits.entries()) {
      if (id !== depositId && d.utr_number === utr) {
        return res.status(409).json({
          error: 'This UTR has already been submitted for another transaction.',
          orderRef: d.order_ref,
        })
      }
    }

    deposit.utr_number = utr
    if (autoApprove) {
      deposit.status = 'APPROVED'
      const curBal = memoryWallets.get(deposit.user_id) || 0
      const newBal = curBal + deposit.amount
      memoryWallets.set(deposit.user_id, newBal)
      memoryTransactions.push({
        user_id: deposit.user_id,
        type: 'DEPOSIT',
        amount: deposit.amount,
        balance_after: newBal,
        reference_id: deposit.order_ref,
        description: `UPI Deposit verified. UTR: ${utr}`,
        created_at: new Date().toISOString(),
      })
      return res.json({
        message: 'UTR submitted and auto-approved',
        deposit,
        newBalance: newBal,
      })
    }

    return res.json({
      message: 'UTR submitted successfully. Awaiting admin verification.',
      deposit,
    })
  } catch (err) {
    console.error('[submitUTR Exception]:', err)
    return res.status(500).json({ error: 'Internal server error submitting UTR' })
  }
}

// Strictly protected admin verification endpoint
export async function verifyDeposit(req, res) {
  try {
    const { depositId, action, notes, adminId } = req.body

    if (!depositId || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'depositId and valid action (APPROVE/REJECT) required' })
    }

    if (action === 'APPROVE') {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.rpc('approve_deposit_utr', {
          p_deposit_id: depositId,
          p_admin_id: adminId || req.user?.id || null,
          p_notes: notes || 'Approved by authorized admin',
        })

        if (error || !data?.success) {
          return res.status(400).json({ error: data?.error || error?.message || 'Approval failed' })
        }

        logPaymentEvent(null, 'DEPOSIT_APPROVED', depositId, { admin_id: adminId || req.user?.id || null, notes })

        return res.json({
          message: 'Deposit approved successfully',
          depositId,
          newBalance: data.new_balance,
        })
      }

      // Memory fallback
      const deposit = memoryDeposits.get(depositId)
      if (!deposit) return res.status(404).json({ error: 'Deposit not found' })
      if (deposit.status !== 'PENDING') return res.status(400).json({ error: `Deposit is ${deposit.status}` })
      if (!deposit.utr_number) return res.status(400).json({ error: 'Cannot approve deposit without UTR' })

      deposit.status = 'APPROVED'
      deposit.admin_notes = notes || 'Approved by admin'
      deposit.verified_at = new Date().toISOString()
      const curBal = memoryWallets.get(deposit.user_id) || 0
      const newBal = curBal + deposit.amount
      memoryWallets.set(deposit.user_id, newBal)
      memoryTransactions.push({
        user_id: deposit.user_id,
        type: 'DEPOSIT',
        amount: deposit.amount,
        balance_after: newBal,
        reference_id: deposit.order_ref,
        description: `UPI Deposit verified by admin. UTR: ${deposit.utr_number}`,
        created_at: new Date().toISOString(),
      })

      return res.json({
        message: 'Deposit approved successfully',
        depositId,
        newBalance: newBal,
      })
    } else {
      // REJECT
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('deposit_requests')
          .update({
            status: 'REJECTED',
            admin_notes: notes || 'Rejected by admin',
            verified_at: new Date().toISOString(),
          })
          .eq('id', depositId)
          .select()
          .single()

        if (error) return res.status(500).json({ error: 'Failed to reject deposit' })

        logPaymentEvent(null, 'DEPOSIT_REJECTED', depositId, { admin_id: adminId || req.user?.id || null, notes })

        return res.json({ message: 'Deposit rejected', deposit: data })
      }



      const deposit = memoryDeposits.get(depositId)
      if (!deposit) return res.status(404).json({ error: 'Deposit not found' })
      deposit.status = 'REJECTED'
      deposit.admin_notes = notes || 'Rejected by admin'
      return res.json({ message: 'Deposit rejected', deposit })
    }
  } catch (err) {
    console.error('[verifyDeposit Exception]:', err)
    return res.status(500).json({ error: 'Server error verifying deposit' })
  }
}

export async function getDeposit(req, res) {
  const { id } = req.params
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('deposit_requests').select('*').eq('id', id).single()
    if (error || !data) return res.status(404).json({ error: 'Deposit not found' })
    if (req.user && req.user.role !== 'admin' && req.user.id !== data.user_id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    return res.json({ deposit: data })
  }
  const dep = memoryDeposits.get(id)
  if (!dep) return res.status(404).json({ error: 'Deposit not found' })
  if (req.user && req.user.role !== 'admin' && req.user.id !== dep.user_id) {
    return res.status(403).json({ error: 'Access denied' })
  }
  return res.json({ deposit: dep })
}

export async function listUserDeposits(req, res) {
  const { userId } = req.params
  if (req.user && req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' })
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return res.status(500).json({ error: 'Failed to fetch deposits' })
    return res.json({ deposits: data || [] })
  }
  const deposits = Array.from(memoryDeposits.values())
    .filter((d) => d.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return res.json({ deposits })
}
