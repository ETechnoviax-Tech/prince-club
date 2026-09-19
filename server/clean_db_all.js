import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../server/.env') })

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL/Key missing!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

const TABLES = [
  'payment_events',
  'webhook_events',
  'refund_requests',
  'payment_locks',
  'idempotency_keys',
  'bets',
  'wallet_transactions',
  'withdrawal_requests',
  'deposit_requests',
  'game_rounds',
  'password_resets',
  'wallets',
  'profiles',
]

async function truncateAllDatabase() {
  console.log('🚨 ========================================')
  console.log('🚨 PURGING ALL DATABASE TABLES (TRUNCATE)')
  console.log('🚨 Supabase Host:', supabaseUrl)
  console.log('🚨 ========================================')

  // 1. Clean Supabase Tables via Service Role
  for (const table of TABLES) {
    process.stdout.write(`   Cleaning table [${table}]... `)
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        // Some tables might have different primary key column (e.g. user_id or key)
        const { error: err2 } = await supabase
          .from(table)
          .delete()
          .not('created_at', 'is', null)

        if (err2) {
          console.log(`⚠️ (skipped or not present: ${error.message})`)
        } else {
          console.log('✅ OK (cleared via created_at)')
        }
      } else {
        console.log('✅ OK')
      }
    } catch (e) {
      console.log('⚠️ Exception:', e.message)
    }
  }

  // 2. Reset local credentials.json
  const credPath = path.resolve(__dirname, '../server/db/credentials.json')
  if (fs.existsSync(credPath)) {
    fs.writeFileSync(credPath, '{}\n', 'utf-8')
    console.log('\n✅ Reset local credentials cache server/db/credentials.json to empty object {}')
  }

  // 3. Verification Report
  console.log('\n📊 --- Verification of Record Counts ---')
  let totalRemaining = 0
  for (const table of TABLES) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      if (error) {
        console.log(`   ${table.padEnd(22)}: [Table not in schema or restricted]`)
      } else {
        console.log(`   ${table.padEnd(22)}: ${count} rows`)
        totalRemaining += (count || 0)
      }
    } catch {
      console.log(`   ${table.padEnd(22)}: [Error querying count]`)
    }
  }

  console.log('----------------------------------------')
  console.log(`TOTAL REMAINING ROWS: ${totalRemaining}`)
  if (totalRemaining === 0) {
    console.log('🎉 SUCCESS: Database is 100% clean and empty! Ready for fresh production launch.')
  } else {
    console.log(`⚠️ Warning: ${totalRemaining} rows remaining.`)
  }
}

truncateAllDatabase().catch(err => {
  console.error('Fatal cleaner error:', err)
  process.exit(1)
})
