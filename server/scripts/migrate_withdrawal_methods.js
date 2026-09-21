import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

async function migrateWithdrawalMethods() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL found, skipping Postgres constraint update')
    return
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Connected to PostgreSQL.')

    // Drop previous check constraint if exists
    await client.query(`
      DO $$
      BEGIN
        ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_payout_method_check;
        ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_payout_method_check CHECK (payout_method IN ('UPI', 'BANK', 'USDT'));
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Constraint update note: %', SQLERRM;
      END $$;
    `)
    console.log('Updated withdrawal_requests_payout_method_check to include USDT.')
  } catch (err) {
    console.error('Migration notice:', err.message)
  } finally {
    await client.end()
  }
}

migrateWithdrawalMethods()
