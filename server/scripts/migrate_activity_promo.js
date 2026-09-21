import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

async function runMigration() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Connected to PostgreSQL database.')

    // 1. Add columns to profiles
    await client.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_streak INT NOT NULL DEFAULT 0;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_streak_date DATE;

      CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
      CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
    `)
    console.log('Added referral and streak columns to profiles.')

    // 2. Create gift_codes and gift_redemptions tables
    await client.query(`
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
    `)
    console.log('Created gift_codes and gift_redemptions tables.')

    // Enable RLS and Service Role Policy for gift tables
    await client.query(`
      ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.gift_redemptions ENABLE ROW LEVEL SECURITY;

      CREATE TABLE IF NOT EXISTS public.rebate_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        category TEXT NOT NULL DEFAULT 'Lottery',
        turnover NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        rebate_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0050,
        rebate_amount NUMERIC(12, 2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'Completed',
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
      );

      CREATE INDEX IF NOT EXISTS idx_rebate_records_user ON public.rebate_records(user_id);
      ALTER TABLE public.rebate_records ENABLE ROW LEVEL SECURITY;

      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gift_codes' AND policyname = 'service_role_gift_codes') THEN
          CREATE POLICY "service_role_gift_codes" ON public.gift_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gift_redemptions' AND policyname = 'service_role_gift_redemptions') THEN
          CREATE POLICY "service_role_gift_redemptions" ON public.gift_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rebate_records' AND policyname = 'service_role_rebate_records') THEN
          CREATE POLICY "service_role_rebate_records" ON public.rebate_records FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `)
    console.log('Configured RLS policies for gift tables and created rebate_records.')

    // 3. Seed active gift codes
    await client.query(`
      INSERT INTO public.gift_codes (code, amount, max_uses, is_active)
      VALUES 
        ('WELCOME69', 50.00, 50000, TRUE),
        ('69CLUB', 100.00, 50000, TRUE),
        ('BONUS100', 100.00, 20000, TRUE),
        ('SUPER69', 200.00, 10000, TRUE),
        ('VIPREWARD', 75.00, 10000, TRUE)
      ON CONFLICT (code) DO UPDATE 
      SET amount = EXCLUDED.amount, is_active = TRUE;
    `)
    console.log('Seeded gift codes.')

    // 4. Backfill referral_code for all existing profiles that lack one
    const profiles = await client.query(`SELECT id, username FROM public.profiles WHERE referral_code IS NULL`)
    console.log(`Found ${profiles.rows.length} profiles without referral_code.`)

    for (const row of profiles.rows) {
      const cleanId = row.id.replace(/-/g, '').slice(0, 6).toUpperCase()
      const rawCode = `PC${cleanId}`
      await client.query(`UPDATE public.profiles SET referral_code = $1 WHERE id = $2`, [rawCode, row.id])
    }
    console.log('Referral codes successfully backfilled.')

    // 5. Verify sample
    const sample = await client.query(`SELECT id, username, referral_code, daily_streak FROM public.profiles LIMIT 3`)
    console.log('Sample profiles:', sample.rows)

    const codes = await client.query(`SELECT code, amount, is_active FROM public.gift_codes`)
    console.log('Gift codes:', codes.rows)
  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await client.end()
  }
}

runMigration()
