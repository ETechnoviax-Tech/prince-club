-- 69 Club dedicated game tables
-- Run after schema.sql. Every statement is idempotent.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shared catalog for first-party and provider games.
CREATE TABLE IF NOT EXISTS public.game_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_code TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    game_family TEXT NOT NULL CHECK (game_family IN (
        'WINGO', 'AVIATOR', 'MINES', 'DRAGON_TIGER', 'SLOT', 'THIRD_PARTY'
    )),
    provider_code TEXT,
    provider_game_id TEXT,
    is_in_house BOOLEAN NOT NULL DEFAULT TRUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    min_bet NUMERIC(12, 2) NOT NULL DEFAULT 10 CHECK (min_bet >= 0),
    max_bet NUMERIC(12, 2) NOT NULL DEFAULT 50000 CHECK (max_bet >= min_bet),
    default_rtp NUMERIC(5, 2),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_game_catalog_family ON public.game_catalog(game_family);
CREATE INDEX IF NOT EXISTS idx_game_catalog_enabled ON public.game_catalog(is_enabled);

-- Win Go / Parity, Sapre, Bcone and Emerd rounds.
CREATE TABLE IF NOT EXISTS public.wingo_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_code TEXT NOT NULL DEFAULT 'WINGO',
    mode TEXT NOT NULL CHECK (mode IN ('PARITY', 'SAPRE', 'BCONE', 'EMERD')),
    round_number BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'SETTLED', 'CANCELLED')),
    start_time TIMESTAMPTZ NOT NULL,
    lock_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    winning_digit SMALLINT CHECK (winning_digit BETWEEN 0 AND 9),
    winning_color TEXT CHECK (winning_color IN ('green', 'red', 'violet')),
    winning_size TEXT CHECK (winning_size IN ('big', 'small')),
    outcome_hash TEXT,
    outcome_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (mode, round_number)
);

CREATE INDEX IF NOT EXISTS idx_wingo_rounds_status ON public.wingo_rounds(status);
CREATE INDEX IF NOT EXISTS idx_wingo_rounds_mode_time ON public.wingo_rounds(mode, start_time DESC);

CREATE TABLE IF NOT EXISTS public.wingo_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.wingo_rounds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    selection TEXT NOT NULL,
    selection_type TEXT NOT NULL CHECK (selection_type IN ('COLOR', 'SIZE', 'DIGIT')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    multiplier NUMERIC(8, 2) NOT NULL CHECK (multiplier >= 0),
    payout NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (payout >= 0),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'WON', 'LOST', 'REFUNDED', 'CANCELLED')),
    idempotency_key TEXT,
    wallet_transaction_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    settled_at TIMESTAMPTZ,
    UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_wingo_bets_round ON public.wingo_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_wingo_bets_user ON public.wingo_bets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wingo_bets_status ON public.wingo_bets(status);

-- Native Aviator crash rounds and bets.
CREATE TABLE IF NOT EXISTS public.aviator_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_number BIGINT NOT NULL UNIQUE,
    phase TEXT NOT NULL DEFAULT 'WAITING' CHECK (phase IN ('WAITING', 'FLYING', 'CRASHED', 'SETTLED')),
    waiting_started_at TIMESTAMPTZ NOT NULL,
    flying_started_at TIMESTAMPTZ,
    crashed_at TIMESTAMPTZ,
    waiting_duration_ms INTEGER NOT NULL,
    cooldown_duration_ms INTEGER NOT NULL,
    server_seed_commitment TEXT NOT NULL,
    server_seed_reveal TEXT,
    crash_point NUMERIC(10, 2) CHECK (crash_point >= 1.00),
    flight_duration_ms INTEGER,
    total_bet_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_payout NUMERIC(14, 2) NOT NULL DEFAULT 0,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_aviator_rounds_phase ON public.aviator_rounds(phase);
CREATE INDEX IF NOT EXISTS idx_aviator_rounds_created ON public.aviator_rounds(created_at DESC);

CREATE TABLE IF NOT EXISTS public.aviator_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.aviator_rounds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    auto_cashout NUMERIC(10, 2) CHECK (auto_cashout IS NULL OR auto_cashout >= 1.05),
    cashout_multiplier NUMERIC(10, 2),
    payout NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (payout >= 0),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PLACED', 'ACTIVE', 'CASHED_OUT', 'LOST', 'REFUNDED')),
    placed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    cashed_out_at TIMESTAMPTZ,
    wallet_debit_id UUID,
    wallet_payout_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_aviator_bets_round ON public.aviator_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_aviator_bets_user ON public.aviator_bets(user_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_aviator_bets_status ON public.aviator_bets(status);

-- Native Mines sessions and each reveal action.
CREATE TABLE IF NOT EXISTS public.mines_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    board_size SMALLINT NOT NULL DEFAULT 25 CHECK (board_size IN (25, 36, 49)),
    mines_count SMALLINT NOT NULL CHECK (mines_count BETWEEN 1 AND 48),
    bet_amount NUMERIC(12, 2) NOT NULL CHECK (bet_amount > 0),
    current_multiplier NUMERIC(10, 4) NOT NULL DEFAULT 1,
    current_payout NUMERIC(12, 2) NOT NULL DEFAULT 0,
    mine_positions JSONB NOT NULL,
    revealed_positions JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'WON', 'LOST', 'CASHED_OUT', 'ABANDONED')),
    wallet_debit_id UUID,
    wallet_payout_id UUID,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mines_sessions_user ON public.mines_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_mines_sessions_status ON public.mines_sessions(status);

CREATE TABLE IF NOT EXISTS public.mines_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.mines_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tile_index SMALLINT NOT NULL CHECK (tile_index >= 0),
    is_mine BOOLEAN NOT NULL,
    multiplier_after NUMERIC(10, 4) NOT NULL,
    payout_after NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (session_id, tile_index)
);

CREATE INDEX IF NOT EXISTS idx_mines_moves_session ON public.mines_moves(session_id, created_at);

-- Native Dragon vs Tiger rounds, cards and wagers.
CREATE TABLE IF NOT EXISTS public.dragon_tiger_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_number BIGINT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'DEALT', 'SETTLED', 'CANCELLED')),
    dragon_card JSONB,
    tiger_card JSONB,
    winner TEXT CHECK (winner IN ('DRAGON', 'TIGER', 'TIE')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    dealt_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.dragon_tiger_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES public.dragon_tiger_rounds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    market TEXT NOT NULL CHECK (market IN ('DRAGON', 'TIGER', 'TIE')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    multiplier NUMERIC(8, 2) NOT NULL,
    payout NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'WON', 'LOST', 'REFUNDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dragon_tiger_bets_round ON public.dragon_tiger_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_dragon_tiger_bets_user ON public.dragon_tiger_bets(user_id, created_at DESC);

-- Native slot spins with reels, symbols and payout details.
CREATE TABLE IF NOT EXISTS public.slot_spins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_code TEXT NOT NULL,
    bet_amount NUMERIC(12, 2) NOT NULL CHECK (bet_amount > 0),
    reels JSONB NOT NULL,
    winning_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_multiplier NUMERIC(10, 4) NOT NULL DEFAULT 0,
    payout NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'SETTLED' CHECK (status IN ('PENDING', 'SETTLED', 'REFUNDED')),
    wallet_debit_id UUID,
    wallet_payout_id UUID,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_slot_spins_game ON public.slot_spins(game_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slot_spins_user ON public.slot_spins(user_id, created_at DESC);

-- Provider and third-party game play records, kept separate from native games.
CREATE TABLE IF NOT EXISTS public.third_party_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code TEXT NOT NULL,
    provider_game_id TEXT NOT NULL,
    external_round_id TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'SETTLED', 'CANCELLED')),
    request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    settled_at TIMESTAMPTZ,
    UNIQUE (provider_code, provider_game_id, external_round_id)
);

CREATE TABLE IF NOT EXISTS public.third_party_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID REFERENCES public.third_party_rounds(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_code TEXT NOT NULL,
    provider_game_id TEXT NOT NULL,
    external_bet_id TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payout NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'WON', 'LOST', 'REFUNDED', 'CANCELLED')),
    request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_third_party_bets_user ON public.third_party_bets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_third_party_bets_provider ON public.third_party_bets(provider_code, provider_game_id);

-- Immutable audit trail for every game and wallet lifecycle event.
CREATE TABLE IF NOT EXISTS public.game_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    game_family TEXT NOT NULL,
    game_code TEXT,
    round_id UUID,
    bet_id UUID,
    event_type TEXT NOT NULL,
    request_id TEXT,
    amount NUMERIC(12, 2),
    payout NUMERIC(12, 2),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_game_events_user_time ON public.game_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_events_game_time ON public.game_events(game_family, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_events_request ON public.game_events(request_id);

-- Seed the native games. ON CONFLICT keeps this safe to re-run.
INSERT INTO public.game_catalog (game_code, display_name, game_family, is_in_house, min_bet, max_bet)
VALUES
    ('WINGO', 'Win Go', 'WINGO', TRUE, 10, 50000),
    ('AVIATOR', 'Aviator', 'AVIATOR', TRUE, 10, 50000),
    ('MINES', 'Mines', 'MINES', TRUE, 10, 50000),
    ('DRAGON_TIGER', 'Dragon Tiger', 'DRAGON_TIGER', TRUE, 10, 50000),
    ('CRAZY777', 'Crazy 777', 'SLOT', TRUE, 10, 50000),
    ('FORTUNE_GEMS', 'Fortune Gems', 'SLOT', TRUE, 10, 50000),
    ('SUPER_ACE', 'Super Ace', 'SLOT', TRUE, 10, 50000)
ON CONFLICT (game_code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    game_family = EXCLUDED.game_family,
    is_in_house = EXCLUDED.is_in_house,
    updated_at = timezone('utc'::text, now());
