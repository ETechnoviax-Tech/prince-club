import crypto from 'crypto';
import { supabase } from '../config/supabase.js';

// Fast in-memory cache for hot idempotency checks: key -> { status, statusCode, body, createdAt }
const memoryStore = new Map();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Periodic cleanup of expired memory keys
setInterval(() => {
    const now = Date.now();
    for (const [key, item] of memoryStore.entries()) {
        if (now - item.createdAt > TTL_MS) {
            memoryStore.delete(key);
        }
    }
}, 10 * 60 * 1000);

/**
 * Express middleware to ensure idempotent execution for sensitive payment requests.
 * Reads 'Idempotency-Key' or 'x-idempotency-key' header.
 */
export const idempotencyMiddleware = async (req, res, next) => {
    // Only apply to state-modifying requests
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
        return next();
    }

    const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!key) {
        // If client did not provide an explicit idempotency key, proceed normally
        return next();
    }

    const endpoint = req.originalUrl || req.url;
    const userId = req.user?.id || null;

    // 1. Fast path: check in-memory cache
    const memoryRecord = memoryStore.get(key);
    if (memoryRecord) {
        if (memoryRecord.status === 'PENDING') {
            return res.status(409).json({
                error: 'A request with this Idempotency-Key is currently being processed. Please retry shortly.',
                idempotent: true,
                status: 'PROCESSING'
            });
        }
        res.setHeader('X-Idempotent-Replay', 'true');
        return res.status(memoryRecord.statusCode).json(memoryRecord.body);
    }

    // 2. Persistent check in Supabase (if available)
    if (supabase) {
        try {
            const { data: existing, error } = await supabase
                .from('idempotency_keys')
                .select('*')
                .eq('key', key)
                .maybeSingle();

            if (!error && existing) {
                if (existing.status === 'PENDING') {
                    return res.status(409).json({
                        error: 'A request with this Idempotency-Key is currently being processed. Please retry shortly.',
                        idempotent: true,
                        status: 'PROCESSING'
                    });
                }
                // Cache into memory for fast subsequent hits
                memoryStore.set(key, {
                    status: existing.status,
                    statusCode: existing.response_code || 200,
                    body: existing.response_body,
                    createdAt: new Date(existing.created_at).getTime()
                });
                res.setHeader('X-Idempotent-Replay', 'true');
                return res.status(existing.response_code || 200).json(existing.response_body);
            }
        } catch (dbErr) {
            console.warn('[Idempotency] DB lookup fallback to memory:', dbErr.message);
        }
    }

    // 3. Mark key as PENDING in memory
    const pendingItem = {
        status: 'PENDING',
        createdAt: Date.now()
    };
    memoryStore.set(key, pendingItem);

    // Also persist PENDING state to DB asynchronously
    if (supabase) {
        supabase
            .from('idempotency_keys')
            .insert({
                key,
                user_id: userId,
                endpoint,
                status: 'PENDING'
            })
            .then(null, () => {});
    }

    // 4. Hook into res.json / res.send to capture completed response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        const statusCode = res.statusCode;

        // Record only successful or business-level handled results (do not cache server 5xx errors)
        if (statusCode < 500) {
            memoryStore.set(key, {
                status: 'COMPLETED',
                statusCode,
                body,
                createdAt: Date.now()
            });

            if (supabase) {
                supabase
                    .from('idempotency_keys')
                    .update({
                        status: 'COMPLETED',
                        response_code: statusCode,
                        response_body: body
                    })
                    .eq('key', key)
                    .then(null, () => {});
            }
        } else {
            // Delete pending key on 500 error so user can retry
            memoryStore.delete(key);
            if (supabase) {
                supabase
                    .from('idempotency_keys')
                    .delete()
                    .eq('key', key)
                    .then(null, () => {});
            }
        }

        return originalJson(body);
    };


    next();
};

export default idempotencyMiddleware;
