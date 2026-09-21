-- 69 Club Database Schema for Supabase (PostgreSQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    last_daily_bonus TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Defensive migrations for existing databases
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Fast lookup index on is_admin and unique backup email index
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_email ON public.profiles(LOWER(TRIM(email))) WHERE email IS NOT NULL AND email <> '';

-- Optional convenience view so queries to public.users map to public.profiles
-- Defined with security_invoker = true so it inherits RLS security
DROP VIEW IF EXISTS public.users CASCADE;
CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
    SELECT id, username, email, password_hash, role, is_admin, last_daily_bonus, created_at
    FROM public.profiles;

-- 2. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Deposit Requests (UPI & UTR Tracking)
CREATE TABLE IF NOT EXISTS public.deposit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    order_ref TEXT NOT NULL UNIQUE,
    upi_vpa TEXT NOT NULL,
    utr_number VARCHAR(12) UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    proof_note TEXT,
    admin_notes TEXT,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast UTR uniqueness checks and lookups
CREATE INDEX IF NOT EXISTS idx_deposit_requests_utr ON public.deposit_requests(utr_number);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user ON public.deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON public.deposit_requests(status);

-- 4. Wallet Transactions Ledger
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'BET_PLACED', 'BET_PAYOUT', 'BONUS')),
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions(user_id);

-- 5. Game Rounds
CREATE TABLE IF NOT EXISTS public.game_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_number BIGINT NOT NULL UNIQUE,
    start_time TIMESTAMPTZ NOT NULL,
    lock_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    winning_digit SMALLINT CHECK (winning_digit BETWEEN 0 AND 9),
    winning_color TEXT CHECK (winning_color IN ('green', 'red', 'violet')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'SETTLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_game_rounds_number ON public.game_rounds(round_number);

-- 6. Bets Table
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.game_rounds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    selection TEXT NOT NULL,
    game_mode VARCHAR(20) NOT NULL DEFAULT 'PARITY',
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    multiplier NUMERIC(4, 2) NOT NULL,
    payout NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'WON', 'LOST')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bets_round ON public.bets(round_id);
CREATE INDEX IF NOT EXISTS idx_bets_user ON public.bets(user_id);

-- 7. Atomic Stored Procedure to Approve Deposit and Credit Wallet Balance
CREATE OR REPLACE FUNCTION public.approve_deposit_utr(
    p_deposit_id UUID,
    p_admin_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deposit public.deposit_requests%ROWTYPE;
    v_new_balance NUMERIC(12, 2);
BEGIN
    -- Select and lock deposit request
    SELECT * INTO v_deposit
    FROM public.deposit_requests
    WHERE id = p_deposit_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deposit request not found');
    END IF;

    IF v_deposit.status <> 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deposit is already ' || v_deposit.status);
    END IF;

    IF v_deposit.utr_number IS NULL OR length(v_deposit.utr_number) <> 12 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Valid 12-digit UTR is required for approval');
    END IF;

    -- Update deposit status
    UPDATE public.deposit_requests
    SET status = 'APPROVED',
        verified_by = p_admin_id,
        admin_notes = COALESCE(p_notes, admin_notes),
        verified_at = timezone('utc'::text, now())
    WHERE id = p_deposit_id;

    -- Lock and update wallet balance atomically
    UPDATE public.wallets
    SET balance = balance + v_deposit.amount,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = v_deposit.user_id
    RETURNING balance INTO v_new_balance;

    -- Create transaction ledger entry
    INSERT INTO public.wallet_transactions (
        user_id,
        type,
        amount,
        balance_after,
        reference_id,
        description
    ) VALUES (
        v_deposit.user_id,
        'DEPOSIT',
        v_deposit.amount,
        v_new_balance,
        v_deposit.order_ref,
        'UPI deposit approved. UTR: ' || v_deposit.utr_number
    );

    RETURN jsonb_build_object(
        'success', true,
        'deposit_id', p_deposit_id,
        'credited_amount', v_deposit.amount,
        'new_balance', v_new_balance
    );
END;
$$;

-- 8. Password Resets (Forgot & Reset Verification OTP Persistence for Email & WhatsApp)
CREATE TABLE IF NOT EXISTS public.password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    identity TEXT NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'EMAIL' CHECK (channel IN ('EMAIL', 'WHATSAPP', 'SMS', 'AUTO')),
    destination TEXT,
    ip_address TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Defensive migration if password_resets existed previously without channel or ip_address
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'EMAIL';
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS destination TEXT;
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_password_resets_identity ON public.password_resets(identity);
CREATE INDEX IF NOT EXISTS idx_password_resets_code ON public.password_resets(otp_code);
CREATE INDEX IF NOT EXISTS idx_password_resets_status ON public.password_resets(is_used, expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_channel ON public.password_resets(channel);
CREATE INDEX IF NOT EXISTS idx_password_resets_ip ON public.password_resets(ip_address);

-- 8b. Real IP Database Rate Limiter (Distributed & Multi-Instance Safe)
CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip TEXT NOT NULL,
    action TEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL,
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_ip_rate_limits_ip_action UNIQUE (ip, action)
);

CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_lookup ON public.ip_rate_limits(ip, action);
CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_expires ON public.ip_rate_limits(expires_at);

ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;

-- 9. Withdrawal Requests (UPI / Bank Account Payouts)
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

-- ============================================================================
-- 10. Row Level Security (RLS) & Protection Policies
-- Fixes Supabase "Unrestricted" warning on tables and views.
-- ============================================================================

-- 10.1 Enable Row Level Security on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- If a physical users table exists (rather than view), enable RLS on it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users' AND table_type = 'BASE TABLE'
    ) THEN
        EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- 10.2 Service Role Full Access Policies (Bypasses for Express Backend API)
DO $$ 
BEGIN
    -- profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'service_role_profiles') THEN
        CREATE POLICY "service_role_profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- wallets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallets' AND policyname = 'service_role_wallets') THEN
        CREATE POLICY "service_role_wallets" ON public.wallets FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- deposit_requests
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deposit_requests' AND policyname = 'service_role_deposit_requests') THEN
        CREATE POLICY "service_role_deposit_requests" ON public.deposit_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- wallet_transactions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallet_transactions' AND policyname = 'service_role_wallet_transactions') THEN
        CREATE POLICY "service_role_wallet_transactions" ON public.wallet_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- game_rounds
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_rounds' AND policyname = 'service_role_game_rounds') THEN
        CREATE POLICY "service_role_game_rounds" ON public.game_rounds FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- bets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bets' AND policyname = 'service_role_bets') THEN
        CREATE POLICY "service_role_bets" ON public.bets FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- password_resets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'password_resets' AND policyname = 'service_role_password_resets') THEN
        CREATE POLICY "service_role_password_resets" ON public.password_resets FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- withdrawal_requests
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawal_requests' AND policyname = 'service_role_withdrawal_requests') THEN
        CREATE POLICY "service_role_withdrawal_requests" ON public.withdrawal_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- users (if base table)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users' AND table_type = 'BASE TABLE'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'service_role_users') THEN
            EXECUTE 'CREATE POLICY "service_role_users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true)';
        END IF;
    END IF;
END $$;

-- 10.3 Public Read Policies (for non-sensitive data like settled game rounds)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_rounds' AND policyname = 'public_read_game_rounds') THEN
        CREATE POLICY "public_read_game_rounds" ON public.game_rounds FOR SELECT USING (true);
    END IF;
END $$;



