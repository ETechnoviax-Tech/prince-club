-- ============================================================================
-- Prince Club: Production-Grade Payment Gateway Database Extensions
-- File: server/db/payment.sql
-- ============================================================================

-- 1. Extend wallet_transactions CHECK constraint to support 'REFUND'
DO $$ 
BEGIN
    ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
    ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
        CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'BET_PLACED', 'BET_PAYOUT', 'BONUS', 'REFUND'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Ensure withdrawal_requests table exists before adding columns
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 100),
    payout_method VARCHAR(20) NOT NULL CHECK (payout_method IN ('UPI', 'BANK')),
    payout_details JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON public.withdrawal_requests(status);

-- 3. Extend withdrawal_requests with tracking metadata
ALTER TABLE public.withdrawal_requests 
    ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS payment_ref TEXT,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT;


-- 3. Idempotency Keys Table
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    request_hash TEXT,
    response_code INT,
    response_body JSONB,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key ON public.idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_keys(expires_at);

-- 4. Payment Locks Table (Distributed DB Mutex for Multi-Instance Safety)
CREATE TABLE IF NOT EXISTS public.payment_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    lock_token TEXT NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_locks_user ON public.payment_locks(user_id);

-- 5. Webhook Events Ingestion & Replay Guard Table
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    signature TEXT,
    status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'PROCESSED', 'FAILED', 'DUPLICATE')),
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_webhook_provider_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_provider_event ON public.webhook_events(provider, event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON public.webhook_events(status);

-- 6. Payment Events Audit Ledger (Immutable)
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    idempotency_key TEXT,
    reference_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_events_user ON public.payment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_ref ON public.payment_events(reference_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON public.payment_events(event_type);

-- 7. Refund Requests Table
CREATE TABLE IF NOT EXISTS public.refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('DEPOSIT', 'WITHDRAWAL')),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
    admin_id UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_refund_target ON public.refund_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_refund_user ON public.refund_requests(user_id);

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- 8. Atomic Withdrawal Request (Replaces optimistic balance read-then-write)
CREATE OR REPLACE FUNCTION public.request_withdrawal_atomic(
    p_user_id UUID,
    p_amount NUMERIC,
    p_method TEXT,
    p_details JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet public.wallets%ROWTYPE;
    v_new_balance NUMERIC(12, 2);
    v_withdrawal_id UUID;
BEGIN
    -- Validate minimum withdrawal amount
    IF p_amount < 100 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Minimum withdrawal amount is ₹100');
    END IF;

    -- Select and lock wallet row for this user
    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    IF v_wallet.balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Deduct balance atomically
    UPDATE public.wallets
    SET balance = balance - p_amount,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;

    -- Create withdrawal request
    INSERT INTO public.withdrawal_requests (
        user_id,
        amount,
        payout_method,
        payout_details,
        status
    ) VALUES (
        p_user_id,
        p_amount,
        p_method,
        p_details,
        'PENDING'
    ) RETURNING id INTO v_withdrawal_id;

    -- Record transaction in ledger
    INSERT INTO public.wallet_transactions (
        user_id,
        type,
        amount,
        balance_after,
        reference_id,
        description
    ) VALUES (
        p_user_id,
        'WITHDRAWAL',
        p_amount,
        v_new_balance,
        v_withdrawal_id::text,
        'Withdrawal request initiated (' || p_method || ')'
    );

    -- Log payment event
    INSERT INTO public.payment_events (
        user_id,
        event_type,
        reference_id,
        payload
    ) VALUES (
        p_user_id,
        'WITHDRAWAL_REQUESTED',
        v_withdrawal_id::text,
        jsonb_build_object('amount', p_amount, 'payout_method', p_method, 'balance_after', v_new_balance)
    );

    RETURN jsonb_build_object(
        'success', true,
        'withdrawal_id', v_withdrawal_id,
        'amount', p_amount,
        'new_balance', v_new_balance
    );
END;
$$;

-- 9. Atomic Refund Processing (Supports both Deposits & Withdrawals)
CREATE OR REPLACE FUNCTION public.process_refund(
    p_target_id UUID,
    p_refund_type TEXT,
    p_amount NUMERIC,
    p_reason TEXT,
    p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_new_balance NUMERIC(12, 2);
    v_refund_id UUID;
    v_deposit public.deposit_requests%ROWTYPE;
    v_withdrawal public.withdrawal_requests%ROWTYPE;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Refund amount must be greater than 0');
    END IF;

    IF p_refund_type = 'DEPOSIT' THEN
        -- Select and lock deposit
        SELECT * INTO v_deposit
        FROM public.deposit_requests
        WHERE id = p_target_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Deposit not found');
        END IF;

        IF v_deposit.status = 'REJECTED' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Cannot refund a rejected deposit');
        END IF;

        v_user_id := v_deposit.user_id;

        -- Create refund request
        INSERT INTO public.refund_requests (
            target_id, target_type, user_id, amount, reason, status, admin_id, processed_at
        ) VALUES (
            p_target_id, 'DEPOSIT', v_user_id, p_amount, p_reason, 'PROCESSED', p_admin_id, timezone('utc'::text, now())
        ) RETURNING id INTO v_refund_id;

        -- Deduct or adjust wallet balance if refunding a deposit that was previously approved
        IF v_deposit.status = 'APPROVED' THEN
            UPDATE public.wallets
            SET balance = GREATEST(0, balance - p_amount),
                updated_at = timezone('utc'::text, now())
            WHERE user_id = v_user_id
            RETURNING balance INTO v_new_balance;

            INSERT INTO public.wallet_transactions (
                user_id, type, amount, balance_after, reference_id, description
            ) VALUES (
                v_user_id, 'REFUND', p_amount, v_new_balance, v_refund_id::text, 'Deposit clawback/refund: ' || p_reason
            );
        ELSE
            -- Deposit was still pending, just mark deposit rejected
            UPDATE public.deposit_requests
            SET status = 'REJECTED', admin_notes = 'Refunded: ' || p_reason, verified_by = p_admin_id, verified_at = timezone('utc'::text, now())
            WHERE id = p_target_id;

            SELECT balance INTO v_new_balance FROM public.wallets WHERE user_id = v_user_id;
        END IF;

    ELSIF p_refund_type = 'WITHDRAWAL' THEN
        -- Select and lock withdrawal
        SELECT * INTO v_withdrawal
        FROM public.withdrawal_requests
        WHERE id = p_target_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Withdrawal request not found');
        END IF;

        IF v_withdrawal.status <> 'PENDING' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Withdrawal is already ' || v_withdrawal.status);
        END IF;

        v_user_id := v_withdrawal.user_id;

        -- Create refund request record
        INSERT INTO public.refund_requests (
            target_id, target_type, user_id, amount, reason, status, admin_id, processed_at
        ) VALUES (
            p_target_id, 'WITHDRAWAL', v_user_id, p_amount, p_reason, 'PROCESSED', p_admin_id, timezone('utc'::text, now())
        ) RETURNING id INTO v_refund_id;

        -- Mark withdrawal as REJECTED
        UPDATE public.withdrawal_requests
        SET status = 'REJECTED',
            admin_notes = p_reason,
            processed_by = p_admin_id,
            failure_reason = p_reason,
            processed_at = timezone('utc'::text, now())
        WHERE id = p_target_id;

        -- Credit back to wallet balance
        UPDATE public.wallets
        SET balance = balance + p_amount,
            updated_at = timezone('utc'::text, now())
        WHERE user_id = v_user_id
        RETURNING balance INTO v_new_balance;

        -- Record transaction in ledger
        INSERT INTO public.wallet_transactions (
            user_id, type, amount, balance_after, reference_id, description
        ) VALUES (
            v_user_id, 'REFUND', p_amount, v_new_balance, v_refund_id::text, 'Withdrawal rejected & refunded: ' || p_reason
        );

    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid refund type: must be DEPOSIT or WITHDRAWAL');
    END IF;

    -- Audit log event
    INSERT INTO public.payment_events (
        user_id, event_type, reference_id, payload
    ) VALUES (
        v_user_id,
        'REFUND_PROCESSED',
        v_refund_id::text,
        jsonb_build_object('target_id', p_target_id, 'target_type', p_refund_type, 'amount', p_amount, 'reason', p_reason, 'new_balance', v_new_balance)
    );

    RETURN jsonb_build_object(
        'success', true,
        'refund_id', v_refund_id,
        'amount', p_amount,
        'new_balance', v_new_balance
    );
END;
$$;

-- 10. Advisory Lock Acquisition (Per-user Mutex)
CREATE OR REPLACE FUNCTION public.acquire_payment_lock(
    p_user_id UUID,
    p_token TEXT,
    p_ttl_seconds INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing public.payment_locks%ROWTYPE;
BEGIN
    -- Purge expired locks first
    DELETE FROM public.payment_locks WHERE expires_at < timezone('utc'::text, now());

    -- Attempt to insert lock
    BEGIN
        INSERT INTO public.payment_locks (
            user_id,
            lock_token,
            acquired_at,
            expires_at
        ) VALUES (
            p_user_id,
            p_token,
            timezone('utc'::text, now()),
            timezone('utc'::text, now()) + (p_ttl_seconds || ' seconds')::interval
        );
        RETURN jsonb_build_object('acquired', true);
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object('acquired', false, 'error', 'Payment operation in progress for user');
    END;
END;
$$;

-- 11. Advisory Lock Release
CREATE OR REPLACE FUNCTION public.release_payment_lock(
    p_user_id UUID,
    p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted INT;
BEGIN
    DELETE FROM public.payment_locks
    WHERE user_id = p_user_id AND lock_token = p_token;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN jsonb_build_object('released', v_deleted > 0);
END;
$$;
