import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

async function runServiceCenterMigration() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Connected to PostgreSQL database for Service Center migration.')

    // 1. User feedback table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        contact_info TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED')),
        admin_reply TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
      );

      CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON public.user_feedback(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback(status);
      ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
    `)
    console.log('Created user_feedback table.')

    // 2. Announcements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Activity' CHECK (category IN ('All', 'Important', 'Activity', 'System')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
      );

      CREATE INDEX IF NOT EXISTS idx_announcements_cat ON public.announcements(category);
      ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
    `)
    console.log('Created announcements table.')

    // 3. Profiles extensions
    await client.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '/avatar.jpg';
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
    `)
    console.log('Profiles table extended with avatar_url, nickname, phone.')

    // 4. RLS policies
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_feedback' AND policyname = 'service_role_user_feedback') THEN
          CREATE POLICY "service_role_user_feedback" ON public.user_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'service_role_announcements') THEN
          CREATE POLICY "service_role_announcements" ON public.announcements FOR ALL TO service_role USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `)
    console.log('Configured RLS policies.')

    // 5. Seed official announcements if empty
    const existingAnn = await client.query(`SELECT count(*) as count FROM public.announcements`)
    if (Number(existingAnn.rows[0]?.count || 0) === 0) {
      await client.query(`
        INSERT INTO public.announcements (title, content, category, is_active)
        VALUES 
          ('Welcome to 69 Club Official Platform', 'Welcome to 69 Club, the premier prediction and gaming arena. Experience real-time Win Go lottery, 60 FPS Aviator crash, and instant UPI automated withdrawals.', 'Important', TRUE),
          ('Daily Attendance Bonus Festival', 'Log in consecutively every 24 hours to claim increasing daily rewards from ₹5.00 up to ₹7,000.00! Check in at the Activity Center now.', 'Activity', TRUE),
          ('UPI Fast Recharge Guidelines', 'When depositing via UPI QR, always submit your accurate 12-digit UTR transaction number to ensure instant automated credit to your account within 10-60 seconds.', 'System', TRUE),
          ('Agent Promotion Lifetime Rebate', 'Invite friends and earn lifetime multi-tier commissions: 0.60% for Tier 1 direct invites and 0.18% for Tier 2 team members. Commissions credit directly to your wallet daily.', 'Activity', TRUE),
          ('Platform Security & Fair Play Notice', 'All lottery draws utilize certified cryptographic random generators synchronized with verified provider seeds. Protect your password and never share verification codes with anyone.', 'System', TRUE)
      `)
      console.log('Seeded official announcements.')
    }
  } catch (err) {
    console.error('Service Center migration error:', err)
  } finally {
    await client.end()
  }
}

runServiceCenterMigration()
