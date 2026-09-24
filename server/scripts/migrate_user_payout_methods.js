import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

async function migrateUserPayoutMethods() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL found, skipping Postgres payout methods migration')
    return
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('[Migration] Connected to PostgreSQL.')

    // 1. Create user_payout_methods table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_payout_methods (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          method VARCHAR(20) NOT NULL CHECK (method IN ('BANK', 'UPI', 'USDT')),
          details JSONB NOT NULL,
          is_locked BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
          CONSTRAINT uq_user_payout_method UNIQUE (user_id, method)
      );

      CREATE INDEX IF NOT EXISTS idx_user_payout_methods_user ON public.user_payout_methods(user_id);
    `)
    console.log('[Migration] Created or verified public.user_payout_methods table.')

    // 2. Ensure withdrawal_requests allows USDT, UPI, BANK
    await client.query(`
      DO $$
      BEGIN
        ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_payout_method_check;
        ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_payout_method_check CHECK (payout_method IN ('UPI', 'BANK', 'USDT'));
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Constraint notice: %', SQLERRM;
      END $$;
    `)
    console.log('[Migration] Ensured withdrawal_requests_payout_method_check supports UPI, BANK, USDT.')
  } catch (err) {
    console.error('[Migration Error]:', err.message)
  } finally {
    await client.end()
  }
}

migrateUserPayoutMethods()
