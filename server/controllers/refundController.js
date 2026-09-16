import { supabase } from '../config/supabase.js';

// In-memory refund store for fallback
const memoryRefunds = new Map();

/**
 * Admin Initiate Refund
 * POST /api/payments/refund
 */
export const initiateRefund = async (req, res) => {
    try {
        const { target_id, target_type, amount, reason } = req.body;
        const adminId = req.user?.id || null;

        if (!target_id || !target_type || !amount || !reason) {
            return res.status(400).json({
                error: 'Missing required parameters: target_id, target_type (DEPOSIT|WITHDRAWAL), amount, reason'
            });
        }

        const refundAmount = Number(amount);
        if (isNaN(refundAmount) || refundAmount <= 0) {
            return res.status(400).json({ error: 'Refund amount must be a positive number' });
        }

        const normalizedType = target_type.toUpperCase();
        if (!['DEPOSIT', 'WITHDRAWAL'].includes(normalizedType)) {
            return res.status(400).json({ error: 'Invalid target_type. Must be DEPOSIT or WITHDRAWAL' });
        }

        if (supabase) {
            // 1. Try atomic stored procedure
            const { data: rpcRes, error: rpcErr } = await supabase.rpc('process_refund', {
                p_target_id: target_id,
                p_refund_type: normalizedType,
                p_amount: refundAmount,
                p_reason: reason,
                p_admin_id: adminId
            });

            if (!rpcErr && rpcRes) {
                if (!rpcRes.success) {
                    return res.status(400).json({ error: rpcRes.error || 'Refund rejected by database logic' });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Refund successfully processed',
                    refund_id: rpcRes.refund_id,
                    amount: rpcRes.amount,
                    new_balance: rpcRes.new_balance
                });
            }

            // 2. Fallback manual refund logic if RPC is not yet registered
            if (normalizedType === 'WITHDRAWAL') {
                const { data: withdrawal, error: wErr } = await supabase
                    .from('withdrawal_requests')
                    .select('*')
                    .eq('id', target_id)
                    .single();

                if (wErr || !withdrawal) {
                    return res.status(404).json({ error: 'Withdrawal record not found' });
                }

                if (withdrawal.status !== 'PENDING') {
                    return res.status(400).json({ error: `Withdrawal is already ${withdrawal.status}` });
                }

                const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', withdrawal.user_id).single();
                const newBal = Number((wal?.balance || 0) + refundAmount);

                await supabase.from('wallets').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('user_id', withdrawal.user_id);
                await supabase.from('withdrawal_requests').update({
                    status: 'REJECTED',
                    admin_notes: reason,
                    processed_by: adminId,
                    processed_at: new Date().toISOString()
                }).eq('id', target_id);

                let refundRow = null
                try {
                    const { data } = await supabase.from('refund_requests').insert({
                        target_id,
                        target_type: 'WITHDRAWAL',
                        user_id: withdrawal.user_id,
                        amount: refundAmount,
                        reason,
                        status: 'PROCESSED',
                        admin_id: adminId,
                        processed_at: new Date().toISOString()
                    }).select().single()
                    refundRow = data
                } catch (_) {
                    refundRow = { id: 'fallback-ref-' + Date.now() }
                }

                await supabase.from('wallet_transactions').insert({
                    user_id: withdrawal.user_id,
                    type: 'REFUND',
                    amount: refundAmount,
                    balance_after: newBal,
                    reference_id: target_id,
                    description: `Admin withdrawal refund: ${reason}`
                });

                return res.status(200).json({
                    success: true,
                    message: 'Withdrawal refunded to wallet',
                    refund_id: refundRow?.id,
                    amount: refundAmount,
                    new_balance: newBal
                });
            } else {
                // Deposit refund
                const { data: deposit, error: dErr } = await supabase
                    .from('deposit_requests')
                    .select('*')
                    .eq('id', target_id)
                    .single();

                if (dErr || !deposit) {
                    return res.status(404).json({ error: 'Deposit record not found' });
                }

                const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', deposit.user_id).single();
                const newBal = Math.max(0, Number((wal?.balance || 0) - refundAmount));

                if (deposit.status === 'APPROVED') {
                    await supabase.from('wallets').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('user_id', deposit.user_id);
                }

                await supabase.from('deposit_requests').update({
                    status: 'REJECTED',
                    admin_notes: `Refunded: ${reason}`,
                    verified_by: adminId,
                    verified_at: new Date().toISOString()
                }).eq('id', target_id);

                let refundRow = null
                try {
                    const { data } = await supabase.from('refund_requests').insert({
                        target_id,
                        target_type: 'DEPOSIT',
                        user_id: deposit.user_id,
                        amount: refundAmount,
                        reason,
                        status: 'PROCESSED',
                        admin_id: adminId,
                        processed_at: new Date().toISOString()
                    }).select().single()
                    refundRow = data
                } catch (_) {
                    refundRow = { id: 'fallback-ref-' + Date.now() }
                }


                return res.status(200).json({
                    success: true,
                    message: 'Deposit refunded',
                    refund_id: refundRow?.id,
                    amount: refundAmount,
                    new_balance: newBal
                });
            }
        }

        // 3. Fallback memory mode
        const refundId = 'ref_' + Date.now();
        memoryRefunds.set(refundId, {
            id: refundId,
            target_id,
            target_type: normalizedType,
            amount: refundAmount,
            reason,
            status: 'PROCESSED',
            createdAt: new Date().toISOString()
        });

        return res.status(200).json({
            success: true,
            refund_id: refundId,
            amount: refundAmount,
            status: 'PROCESSED'
        });
    } catch (err) {
        console.error('[Refund] Controller error:', err);
        return res.status(500).json({ error: 'Failed to process refund', details: err.message });
    }
};

/**
 * List refunds for a user or all refunds for admin
 * GET /api/payments/refunds/:userId
 */
export const listRefunds = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUser = req.user;

        if (requestingUser.role !== 'admin' && requestingUser.id !== userId) {
            return res.status(403).json({ error: 'Unauthorized to view other users refund history' });
        }

        if (supabase) {
            let query = supabase.from('refund_requests').select('*').order('created_at', { ascending: false });
            if (userId && userId !== 'all') {
                query = query.eq('user_id', userId);
            }
            const { data, error } = await query;
            if (!error && data) {
                return res.status(200).json({ refunds: data });
            }
        }

        const filtered = Array.from(memoryRefunds.values()).filter(r => !userId || userId === 'all' || r.user_id === userId);
        return res.status(200).json({ refunds: filtered });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to list refunds', details: err.message });
    }
};

/**
 * Query payment events audit log
 * GET /api/payments/events/:userId
 */
export const listPaymentEvents = async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUser = req.user;

        if (requestingUser.role !== 'admin' && requestingUser.id !== userId) {
            return res.status(403).json({ error: 'Unauthorized to view payment events' });
        }

        if (supabase) {
            let query = supabase.from('payment_events').select('*').order('created_at', { ascending: false }).limit(50);
            if (userId && userId !== 'all') {
                query = query.eq('user_id', userId);
            }
            const { data, error } = await query;
            if (!error && data) {
                return res.status(200).json({ events: data });
            }
        }

        return res.status(200).json({ events: [] });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch payment events', details: err.message });
    }
};
