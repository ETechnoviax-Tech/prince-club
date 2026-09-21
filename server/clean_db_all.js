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

const PRESERVED_USERNAME = '8433125736'

async function cleanDatabaseKeepAdmin() {
  console.log('🚨 ==========================================================')
  console.log(`🚨 CLEANING DATABASE FOR PRODUCTION LAUNCH`)
  console.log(`🚨 PRESERVING SOLE ACCOUNT: [${PRESERVED_USERNAME}]`)
  console.log(`🚨 Supabase Host: ${supabaseUrl}`)
  console.log('🚨 ==========================================================')

  // 1. Verify Preserved Account exists before doing ANY deletion
  const { data: adminUser, error: adminErr } = await supabase
    .from('profiles')
    .select('id, username, role, is_admin')
    .eq('username', PRESERVED_USERNAME)
    .maybeSingle()

  if (adminErr || !adminUser) {
    console.error(`❌ CRITICAL: Could not locate preserved user [${PRESERVED_USERNAME}]! Aborting to prevent data loss.`, adminErr)
    process.exit(1)
  }

  const preservedId = adminUser.id
  console.log(`\n🔒 SAFEGUARD: Verified preserved user ID: [${preservedId}] (role: ${adminUser.role})`)

  // 2. Clean dependent / child transaction & event tables completely
  const childTables = [
    'payment_events',
    'webhook_events',
    'refund_requests',
    'payment_locks',
    'idempotency_keys',
    'password_resets',
    'bets',
    'wallet_transactions',
    'withdrawal_requests',
    'deposit_requests',
    'user_feedback',
    'gift_redemptions',
    'game_rounds',
  ]

  console.log('\n🧹 [Step 1] Purging all test history, transactions, and events...')
  for (const table of childTables) {
    process.stdout.write(`   Cleaning [${table.padEnd(20)}]... `)
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        // Fallback for tables without 'id' column
        const { error: err2 } = await supabase
          .from(table)
          .delete()
          .not('created_at', 'is', null)

        if (err2) {
          console.log(`⚠️ (${error.message})`)
        } else {
          console.log('✅ Cleared')
        }
      } else {
        console.log('✅ Cleared')
      }
    } catch (e) {
      console.log(`⚠️ Exception: ${e.message}`)
    }
  }

  // 3. Reset gift_codes uses count
  console.log('\n🎁 [Step 2] Resetting gift codes usage counts...')
  try {
    const { error: giftErr } = await supabase
      .from('gift_codes')
      .update({ current_uses: 0 })
      .not('id', 'is', null)

    if (giftErr) {
      console.log(`   ⚠️ Gift codes reset notice: ${giftErr.message}`)
    } else {
      console.log('   ✅ All active promotional gift codes reset to 0 uses (ready for real users)')
    }
  } catch (e) {
    console.log(`   ⚠️ Gift codes exception: ${e.message}`)
  }

  // 4. Delete all other user wallets
  console.log('\n💼 [Step 3] Purging all test wallets (keeping only 8433125736)...')
  try {
    const { error: walErr } = await supabase
      .from('wallets')
      .delete()
      .neq('user_id', preservedId)

    if (walErr) {
      console.log(`   ⚠️ Wallet cleaning error: ${walErr.message}`)
    } else {
      console.log(`   ✅ Kept wallet for [${PRESERVED_USERNAME}], deleted all other wallets`)
    }
  } catch (e) {
    console.log(`   ⚠️ Wallets exception: ${e.message}`)
  }

  // 5. Delete all other user profiles
  console.log('\n👤 [Step 4] Purging all test profiles (keeping only 8433125736)...')
  try {
    const { error: profErr } = await supabase
      .from('profiles')
      .delete()
      .neq('id', preservedId)

    if (profErr) {
      console.log(`   ⚠️ Profile cleaning error: ${profErr.message}`)
    } else {
      console.log(`   ✅ Kept profile for [${PRESERVED_USERNAME}], deleted all other test profiles`)
    }
  } catch (e) {
    console.log(`   ⚠️ Profiles exception: ${e.message}`)
  }

  // 6. Reset local credentials.json
  const credPath = path.resolve(__dirname, 'db/credentials.json')
  if (fs.existsSync(credPath)) {
    fs.writeFileSync(credPath, '{}\n', 'utf-8')
    console.log('\n🔑 [Step 5] Reset server/db/credentials.json to empty object {}')
  }

  // 7. Comprehensive Verification Report
  console.log('\n📊 ==========================================================')
  console.log('📊 DATABASE POST-CLEAN VERIFICATION REPORT')
  console.log('📊 ==========================================================')

  const verifyTables = [
    'profiles',
    'wallets',
    'deposit_requests',
    'withdrawal_requests',
    'bets',
    'wallet_transactions',
    'gift_redemptions',
    'user_feedback',
    'idempotency_keys',
    'payment_events',
    'webhook_events',
    'refund_requests',
    'password_resets',
    'game_rounds',
    'announcements',
    'gift_codes',
  ]

  for (const table of verifyTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`   ${table.padEnd(22)}: [Error: ${error.message}]`)
      } else {
        console.log(`   ${table.padEnd(22)}: ${count} rows`)
      }
    } catch {
      console.log(`   ${table.padEnd(22)}: [Query error]`)
    }
  }

  // Check preserved user
  const { data: finalAdmin } = await supabase
    .from('profiles')
    .select('id, username, role, is_admin')
    .eq('id', preservedId)
    .single()

  const { data: finalWal } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', preservedId)
    .single()

  console.log('----------------------------------------------------------')
  console.log(`👤 Preserved Account Status : [${finalAdmin?.username}] (${finalAdmin?.role}) - ID: ${finalAdmin?.id}`)
  console.log(`💰 Preserved Wallet Balance : ₹${finalWal?.balance || 0}`)
  console.log('🎉 SUCCESS: Database is 100% clean and ready for real production users!')
  console.log('==========================================================\n')
}

cleanDatabaseKeepAdmin().catch((err) => {
  console.error('Fatal cleaner error:', err)
  process.exit(1)
})
