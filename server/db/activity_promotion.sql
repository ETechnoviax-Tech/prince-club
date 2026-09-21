-- ============================================================================
-- 69 Club: Activity & Multi-Tier Promotion Engine Database Schema
-- File: server/db/activity_promotion.sql
-- ============================================================================

-- 1. Profiles Table Extensions (Referrals & Attendance Streak)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_streak INT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_streak_date DATE;

-- Fast index lookups for referral trees and codes
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- 2. Promotional Gift Codes Table
CREATE TABLE IF NOT EXISTS public.gift_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    max_uses INT NOT NULL DEFAULT 10000,
    current_uses INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Gift Redemptions Ledger (Enforces 1 redemption per user per code)
CREATE TABLE IF NOT EXISTS public.gift_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_gift_code UNIQUE (user_id, code)
);

CREATE INDEX IF NOT EXISTS idx_gift_redemptions_user ON public.gift_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_redemptions_code ON public.gift_redemptions(code);

-- 4. Enable Row Level Security (RLS) & Service Role Policies
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_redemptions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- gift_codes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gift_codes' AND policyname = 'service_role_gift_codes') THEN
        CREATE POLICY "service_role_gift_codes" ON public.gift_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    -- gift_redemptions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gift_redemptions' AND policyname = 'service_role_gift_redemptions') THEN
        CREATE POLICY "service_role_gift_redemptions" ON public.gift_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Seed Official Active Promotional Gift Codes
INSERT INTO public.gift_codes (code, amount, max_uses, is_active)
VALUES 
    ('WELCOME69', 50.00, 50000, TRUE),
    ('69CLUB', 100.00, 50000, TRUE),
    ('BONUS100', 100.00, 20000, TRUE),
    ('SUPER69', 200.00, 10000, TRUE),
    ('VIPREWARD', 75.00, 10000, TRUE)
ON CONFLICT (code) DO UPDATE 
SET amount = EXCLUDED.amount, is_active = TRUE;

-- 6. Backfill Unique Referral Codes for Existing Accounts
UPDATE public.profiles
SET referral_code = 'PC' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 6))
WHERE referral_code IS NULL;
