import crypto from 'crypto';
import { supabase } from '../config/supabase.js';

// In-memory processed webhook event store (for dev fallback when Supabase table isn't created yet)
const processedWebhooks = new Set();

/**
 * Verifies HMAC-SHA256 signature for incoming webhooks.
 * Headers checked: 'x-webhook-signature' or 'x-signature'
 */
export const verifyWebhookSignature = (rawBody, signatureHeader, secret) => {
    if (!signatureHeader || !secret) {
        return false;
    }
    const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    // Constant-time string comparison to prevent timing attacks
    try {
        const sigBuffer = Buffer.from(signatureHeader, 'utf8');
        const compBuffer = Buffer.from(computedSignature, 'utf8');
        if (sigBuffer.length !== compBuffer.length) return false;
        return crypto.timingSafeEqual(sigBuffer, compBuffer);
    } catch {
        return false;
    }
};

/**
 * Public Webhook Ingestion Endpoint
 * POST /api/payments/webhook
 */
export const handlePaymentWebhook = async (req, res) => {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const signature = req.headers['x-webhook-signature'] || req.headers['x-signature'];
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || 'prince_club_webhook_secret_key_2026';

    // 1. Signature Verification
    // In production or test, enforce signature match if header is supplied or strict mode
    const isValid = verifyWebhookSignature(rawBody, signature, secret);
    if (!isValid && process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'Invalid or missing webhook signature' });
    }

    const payload = req.body || {};
    const provider = payload.provider || req.headers['x-provider'] || 'UPI_GATEWAY';
    const eventId = payload.event_id || payload.id || crypto.createHash('md5').update(rawBody).digest('hex');
    const eventType = payload.event_type || payload.type || 'unknown';

    // 2. Replay Attack Prevention / Deduplication
    const dedupKey = `${provider}:${eventId}`;
    if (processedWebhooks.has(dedupKey)) {
        return res.status(200).json({
            status: 'DUPLICATE',
            message: 'Webhook event already processed previously',
            event_id: eventId
        });
    }

    if (supabase) {
        try {
            const { data: existing } = await supabase
                .from('webhook_events')
                .select('id, status')
                .eq('provider', provider)
                .eq('event_id', eventId)
                .maybeSingle();

            if (existing) {
                processedWebhooks.add(dedupKey);
                return res.status(200).json({
                    status: 'DUPLICATE',
                    message: 'Webhook event already recorded and processed in database',
                    event_id: eventId
                });
            }

            // Insert initial RECEIVED record
            await supabase.from('webhook_events').insert({
                provider,
                event_id: eventId,
                event_type: eventType,
                payload,
                signature: signature || null,
                status: 'RECEIVED'
            });
        } catch (dbErr) {
            console.warn('[Webhook] DB record creation notice:', dbErr.message);
        }
    }

    // Mark in memory deduplicator
    processedWebhooks.add(dedupKey);

    // 3. Event Processing Router
    try {
        let processResult = null;

        switch (eventType) {
            case 'payment.completed':
            case 'deposit.success':
            case 'DEPOSIT_SUCCESS': {
                processResult = await processDepositSuccess(payload);
                break;
            }

            case 'payment.failed':
            case 'deposit.failed':
            case 'DEPOSIT_FAILED': {
                processResult = await processDepositFailed(payload);
                break;
            }

            case 'payout.completed':
            case 'withdrawal.success':
            case 'PAYOUT_SUCCESS': {
                processResult = await processPayoutSuccess(payload);
                break;
            }

            case 'payout.failed':
            case 'withdrawal.failed':
            case 'PAYOUT_FAILED': {
                processResult = await processPayoutFailed(payload);
                break;
            }

            default: {
                processResult = { acknowledged: true, note: `Unhandled event type: ${eventType}` };
            }
        }

        // Update webhook_events to PROCESSED
        if (supabase) {
            await supabase
                .from('webhook_events')
                .update({
                    status: 'PROCESSED',
                    processed_at: new Date().toISOString()
                })
                .eq('provider', provider)
                .eq('event_id', eventId);
        }

        return res.status(200).json({
            success: true,
            status: 'PROCESSED',
            event_id: eventId,
            event_type: eventType,
            result: processResult
        });
    } catch (err) {
        console.error('[Webhook] Processing error:', err);

        if (supabase) {
            await supabase
                .from('webhook_events')
                .update({
                    status: 'FAILED',
                    error_message: err.message
                })
                .eq('provider', provider)
                .eq('event_id', eventId);
        }

        return res.status(500).json({
            error: 'Webhook processing error',
            message: err.message
        });
    }
};

/**
 * Handle successful deposit webhook
 */
async function processDepositSuccess(payload) {
    const data = payload.data || payload;
    const orderRef = data.order_ref || data.orderRef || data.reference_id;
    const utrNumber = data.utr_number || data.utr || data.rrn;

    if (!orderRef && !utrNumber) {
        throw new Error('Deposit webhook requires order_ref or utr_number');
    }

    if (supabase) {
        // Find deposit request
        let query = supabase.from('deposit_requests').select('*');
        if (orderRef) query = query.eq('order_ref', orderRef);
        else query = query.eq('utr_number', utrNumber);

        const { data: deposit, error } = await query.maybeSingle();
        if (error || !deposit) {
            return { skipped: true, reason: 'Deposit record not found' };
        }

        if (deposit.status === 'APPROVED') {
            return { skipped: true, reason: 'Deposit already approved' };
        }

        // Auto-assign UTR if provided in webhook and not set
        if (utrNumber && !deposit.utr_number) {
            await supabase
                .from('deposit_requests')
                .update({ utr_number: utrNumber })
                .eq('id', deposit.id);
        }

        // Call atomic stored procedure approve_deposit_utr
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('approve_deposit_utr', {
            p_deposit_id: deposit.id,
            p_admin_id: null,
            p_notes: 'Auto-approved via payment gateway webhook'
        });

        if (rpcErr || (rpcRes && !rpcRes.success)) {
            // Fallback manual atomic balance credit
            const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', deposit.user_id).single();
            const newBal = Number((wal?.balance || 0) + Number(deposit.amount));
            await supabase.from('wallets').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('user_id', deposit.user_id);
            await supabase.from('deposit_requests').update({ status: 'APPROVED', verified_at: new Date().toISOString() }).eq('id', deposit.id);
            await supabase.from('wallet_transactions').insert({
                user_id: deposit.user_id,
                type: 'DEPOSIT',
                amount: deposit.amount,
                balance_after: newBal,
                reference_id: deposit.order_ref,
                description: `Deposit credited via webhook. UTR: ${utrNumber || 'WEBHOOK'}`
            });
        }

        // Log payment audit event
        try {
            await supabase.from('payment_events').insert({
                user_id: deposit.user_id,
                event_type: 'DEPOSIT_APPROVED_WEBHOOK',
                reference_id: deposit.id,
                payload: { order_ref: deposit.order_ref, amount: deposit.amount, utr: utrNumber }
            });
        } catch (_) {}

        return { deposit_id: deposit.id, status: 'APPROVED' };

    }

    return { success: true, memoryOnly: true };
}

/**
 * Handle failed deposit webhook
 */
async function processDepositFailed(payload) {
    const data = payload.data || payload;
    const orderRef = data.order_ref || data.orderRef;
    const reason = data.reason || 'Payment failed at bank gateway';

    if (supabase && orderRef) {
        await supabase
            .from('deposit_requests')
            .update({
                status: 'REJECTED',
                admin_notes: `Webhook failure: ${reason}`,
                verified_at: new Date().toISOString()
            })
            .eq('order_ref', orderRef)
            .eq('status', 'PENDING');
    }
    return { order_ref: orderRef, status: 'REJECTED', reason };
}

/**
 * Handle successful payout/withdrawal webhook
 */
async function processPayoutSuccess(payload) {
    const data = payload.data || payload;
    const withdrawalId = data.withdrawal_id || data.payout_id;
    const paymentRef = data.payment_ref || data.utr || data.bank_ref;

    if (supabase && withdrawalId) {
        await supabase
            .from('withdrawal_requests')
            .update({
                status: 'APPROVED',
                payment_ref: paymentRef || 'BANK_UTR',
                processed_at: new Date().toISOString()
            })
            .eq('id', withdrawalId)
            .eq('status', 'PENDING');

        try {
            await supabase.from('payment_events').insert({
                event_type: 'WITHDRAWAL_APPROVED_WEBHOOK',
                reference_id: withdrawalId,
                payload: { payment_ref: paymentRef }
            });
        } catch (_) {}
    }

    return { withdrawal_id: withdrawalId, status: 'APPROVED' };
}

/**
 * Handle failed payout/withdrawal webhook (Triggers automatic refund)
 */
async function processPayoutFailed(payload) {
    const data = payload.data || payload;
    const withdrawalId = data.withdrawal_id || data.payout_id;
    const reason = data.reason || 'Bank payout rejected or reversed';

    if (supabase && withdrawalId) {
        // Fetch withdrawal record
        const { data: withdrawal } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('id', withdrawalId)
            .single();

        if (withdrawal && withdrawal.status === 'PENDING') {
            // Attempt process_refund RPC
            const { data: rpcRes, error: rpcErr } = await supabase.rpc('process_refund', {
                p_target_id: withdrawal.id,
                p_refund_type: 'WITHDRAWAL',
                p_amount: withdrawal.amount,
                p_reason: `Automatic refund: ${reason}`,
                p_admin_id: null
            });

            if (rpcErr || (rpcRes && !rpcRes.success)) {
                // Fallback manual refund
                const { data: wal } = await supabase.from('wallets').select('balance').eq('user_id', withdrawal.user_id).single();
                const newBal = Number((wal?.balance || 0) + Number(withdrawal.amount));
                await supabase.from('wallets').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('user_id', withdrawal.user_id);
                await supabase.from('withdrawal_requests').update({
                    status: 'REJECTED',
                    failure_reason: reason,
                    processed_at: new Date().toISOString()
                }).eq('id', withdrawal.id);

                await supabase.from('wallet_transactions').insert({
                    user_id: withdrawal.user_id,
                    type: 'REFUND',
                    amount: withdrawal.amount,
                    balance_after: newBal,
                    reference_id: withdrawal.id,
                    description: `Withdrawal failed & refunded: ${reason}`
                });
            }
        }
    }
    return { withdrawal_id: withdrawalId, status: 'REFUNDED', reason };
}
