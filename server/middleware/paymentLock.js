import crypto from 'crypto';
import { supabase } from '../config/supabase.js';

// In-memory mutex map: userId -> { token, expiresAt }
const activeUserLocks = new Map();
const LOCK_TTL_MS = 15000; // 15 seconds max lock time

// Cleanup expired locks periodically
setInterval(() => {
    const now = Date.now();
    for (const [userId, lock] of activeUserLocks.entries()) {
        if (now > lock.expiresAt) {
            activeUserLocks.delete(userId);
        }
    }
}, 5000);

/**
 * Payment Mutex Middleware
 * Prevents concurrent financial mutations (deposits, withdrawals, refunds) for the same user.
 * Blocks race conditions, double-click submissions, and parallel duplicate deductions.
 */
export const paymentLockMiddleware = async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
        // If not authenticated yet or system request, continue
        return next();
    }

    const now = Date.now();
    const existingLock = activeUserLocks.get(userId);

    // 1. Fast in-memory check
    if (existingLock && now < existingLock.expiresAt) {
        return res.status(409).json({
            error: 'Another transaction is already in progress for your account. Please wait a moment.',
            code: 'PAYMENT_CONCURRENT_LOCK',
            status: 'LOCKED'
        });
    }

    const lockToken = crypto.randomUUID();

    // 2. Database-level advisory lock (if Supabase RPC available)
    if (supabase) {
        try {
            const { data, error } = await supabase.rpc('acquire_payment_lock', {
                p_user_id: userId,
                p_token: lockToken,
                p_ttl_seconds: Math.round(LOCK_TTL_MS / 1000)
            });

            if (!error && data && data.acquired === false) {
                return res.status(409).json({
                    error: 'A transaction is currently processing on your wallet. Please retry in a few seconds.',
                    code: 'PAYMENT_CONCURRENT_LOCK',
                    status: 'LOCKED'
                });
            }
        } catch (err) {
            // Non-fatal if table/proc doesn't exist yet, fallback to in-memory lock
        }
    }

    // Set lock
    activeUserLocks.set(userId, {
        token: lockToken,
        expiresAt: now + LOCK_TTL_MS
    });

    // Cleanup hook when response finishes or connection abruptly closes
    let released = false;
    const releaseLock = async () => {
        if (released) return;
        released = true;

        const current = activeUserLocks.get(userId);
        if (current && current.token === lockToken) {
            activeUserLocks.delete(userId);
        }

        if (supabase) {
            try {
                await supabase.rpc('release_payment_lock', {
                    p_user_id: userId,
                    p_token: lockToken
                });
            } catch (_) {}
        }
    };

    res.once('finish', releaseLock);
    res.once('close', releaseLock);

    const origJson = res.json.bind(res);
    res.json = (body) => {
        releaseLock();
        return origJson(body);
    };

    const origSend = res.send.bind(res);
    res.send = (body) => {
        releaseLock();
        return origSend(body);
    };

    next();
};

export default paymentLockMiddleware;
