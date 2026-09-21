import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

async function runRateLimitMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Connected to PostgreSQL for Rate Limit & OTP migration.')

    // 1. Create ip_rate_limits table for real IP rate limiting
    await client.query(`
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

      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ip_rate_limits' AND policyname = 'service_role_ip_rate_limits') THEN
          CREATE POLICY "service_role_ip_rate_limits" ON public.ip_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `)
    console.log('Created public.ip_rate_limits table with indexes and RLS.')

    // 2. Extend password_resets to record client real IP
    await client.query(`
      ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS ip_address TEXT;
      CREATE INDEX IF NOT EXISTS idx_password_resets_ip ON public.password_resets(ip_address);
    `)
    console.log('Added ip_address column and index to password_resets.')

    // 3. Stored function for atomic DB rate limiting
    await client.query(`
      CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(
        p_ip TEXT,
        p_action TEXT,
        p_max_attempts INT,
        p_window_seconds INT,
        p_block_seconds INT DEFAULT 0
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        v_rec public.ip_rate_limits%ROWTYPE;
        v_now TIMESTAMPTZ := timezone('utc'::text, now());
        v_blocked_until TIMESTAMPTZ;
        v_attempts INT := 1;
        v_retry_after INT := 0;
      BEGIN
        SELECT * INTO v_rec
        FROM public.ip_rate_limits
        WHERE ip = p_ip AND action = p_action
        FOR UPDATE;

        IF NOT FOUND THEN
          -- First request in window
          INSERT INTO public.ip_rate_limits (ip, action, attempts, window_start, expires_at, blocked_until, updated_at)
          VALUES (p_ip, p_action, 1, v_now, v_now + (p_window_seconds || ' seconds')::INTERVAL, NULL, v_now);

          RETURN jsonb_build_object(
            'allowed', true,
            'attempts', 1,
            'remaining', p_max_attempts - 1,
            'retryAfterSeconds', 0
          );
        END IF;

        -- Check if currently blocked
        IF v_rec.blocked_until IS NOT NULL AND v_rec.blocked_until > v_now THEN
          v_retry_after := CEIL(EXTRACT(EPOCH FROM (v_rec.blocked_until - v_now)))::INT;
          RETURN jsonb_build_object(
            'allowed', false,
            'attempts', v_rec.attempts,
            'remaining', 0,
            'retryAfterSeconds', GREATEST(v_retry_after, 1),
            'reason', 'BLOCKED'
          );
        END IF;

        -- Check if window has expired; if so, reset window
        IF v_rec.expires_at <= v_now THEN
          UPDATE public.ip_rate_limits
          SET attempts = 1,
              window_start = v_now,
              expires_at = v_now + (p_window_seconds || ' seconds')::INTERVAL,
              blocked_until = NULL,
              updated_at = v_now
          WHERE id = v_rec.id;

          RETURN jsonb_build_object(
            'allowed', true,
            'attempts', 1,
            'remaining', p_max_attempts - 1,
            'retryAfterSeconds', 0
          );
        END IF;

        -- Window is still active: increment attempts
        v_attempts := v_rec.attempts + 1;

        IF v_attempts > p_max_attempts THEN
          IF p_block_seconds > 0 THEN
            v_blocked_until := v_now + (p_block_seconds || ' seconds')::INTERVAL;
            v_retry_after := p_block_seconds;
          ELSE
            v_blocked_until := NULL;
            v_retry_after := CEIL(EXTRACT(EPOCH FROM (v_rec.expires_at - v_now)))::INT;
          END IF;

          UPDATE public.ip_rate_limits
          SET attempts = v_attempts,
              blocked_until = COALESCE(v_blocked_until, blocked_until),
              updated_at = v_now
          WHERE id = v_rec.id;

          RETURN jsonb_build_object(
            'allowed', false,
            'attempts', v_attempts,
            'remaining', 0,
            'retryAfterSeconds', GREATEST(v_retry_after, 1),
            'reason', 'EXCEEDED'
          );
        END IF;

        -- Within limit
        UPDATE public.ip_rate_limits
        SET attempts = v_attempts,
            updated_at = v_now
        WHERE id = v_rec.id;

        RETURN jsonb_build_object(
          'allowed', true,
          'attempts', v_attempts,
          'remaining', p_max_attempts - v_attempts,
          'retryAfterSeconds', 0
        );
      END;
      $$;
    `)
    console.log('Created check_ip_rate_limit stored function in PostgreSQL.')

  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await client.end()
    console.log('Database migration connection closed.')
  }
}

runRateLimitMigration()
