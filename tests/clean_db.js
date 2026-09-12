import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../server/.env') })

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL/Key missing!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

async function cleanDatabase() {
  console.log('--- Cleaning Full Database for Real Users ---')
  console.log('Connecting to:', supabaseUrl)

  // 1. Delete bets
  const { error: betsErr } = await supabase.from('bets').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Bets delete status:', betsErr ? betsErr.message : 'OK')

  // 2. Delete wallet_transactions
  const { error: txErr } = await supabase.from('wallet_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Wallet Transactions delete status:', txErr ? txErr.message : 'OK')

  // 3. Delete deposit_requests
  const { error: depErr } = await supabase.from('deposit_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Deposit Requests delete status:', depErr ? depErr.message : 'OK')

  // 4. Delete game_rounds (if any were persisted)
  const { error: grErr } = await supabase.from('game_rounds').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Game Rounds delete status:', grErr ? grErr.message : 'OK')

  // 5. Delete wallets
  const { error: walErr } = await supabase.from('wallets').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
  console.log('Wallets delete status:', walErr ? walErr.message : 'OK')

  // 6. Delete password_resets
  const { error: prErr } = await supabase.from('password_resets').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Password Resets delete status:', prErr ? prErr.message : 'OK')

  // 7. Delete profiles
  const { error: profErr } = await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Profiles delete status:', profErr ? profErr.message : 'OK')

  // Verify counts
  const { count: profCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  const { count: walCount } = await supabase.from('wallets').select('*', { count: 'exact', head: true })
  const { count: betCount } = await supabase.from('bets').select('*', { count: 'exact', head: true })
  const { count: depCount } = await supabase.from('deposit_requests').select('*', { count: 'exact', head: true })
  const { count: prCount } = await supabase.from('password_resets').select('*', { count: 'exact', head: true })

  console.log('\n--- Verification ---')
  console.log('Profiles remaining:', profCount)
  console.log('Wallets remaining:', walCount)
  console.log('Bets remaining:', betCount)
  console.log('Deposits remaining:', depCount)
  console.log('Password Resets remaining:', prCount || 0)
  console.log('Database clean complete!')
}

cleanDatabase().catch(console.error)
