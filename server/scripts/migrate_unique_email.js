import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

async function runUniqueEmailMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found')
    process.exit(1)
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('Connected to PostgreSQL for unique backup email migration.')

    // Add unique index on profiles.email (case-insensitive, ignoring nulls/empty)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_email 
      ON public.profiles(LOWER(TRIM(email))) 
      WHERE email IS NOT NULL AND email <> '';
    `)
    console.log('Created unique index uq_profiles_email on profiles table.')

  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await client.end()
    console.log('Migration finished.')
  }
}

runUniqueEmailMigration()
