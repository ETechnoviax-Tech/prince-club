import assert from 'assert'
import { supabase, isSupabaseConfigured } from '../server/config/supabase.js'
import { settleVeerRound } from '../server/controllers/gameController.js'
import { generateToken } from '../server/middleware/auth.js'
import app from '../server/index.js'

async function run() {
  console.log('--- Testing WinGo Settlement Payout Fix ---')
  process.env.NODE_ENV = 'test'
  const server = app.listen(0)
  const port = server.address().port
  const base = `http://localhost:${port}/api`
  let testUserId = null

  try {
    const testPhone = '99' + Math.floor(10000000 + Math.random() * 90000000)
    const testPass = 'Test@123456'

    // Register test user
    const regRes = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testPhone,
        password: testPass,
      }),
    })

    const regData = await regRes.json()
    assert.strictEqual(regRes.status, 201, `Registration failed: ${JSON.stringify(regData)}`)
    testUserId = regData.user.id
    const token = regData.token
    console.log(`✓ Test user registered: ${testUserId} (${testPhone})`)

    // Set a known initial wallet balance of ₹500
    if (isSupabaseConfigured) {
      await supabase.from('wallets').update({ balance: 500 }).eq('user_id', testUserId)
    }

    const initWalRes = await fetch(`${base}/wallet/${testUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const initialBal = Number((await initWalRes.json()).wallet.balance)
    assert.strictEqual(initialBal, 500, `Initial balance should be 500, got ${initialBal}`)
    console.log(`✓ Initial balance confirmed: ₹${initialBal}`)

    // Place a ₹100 bet on 'green' for round '7777777777777'
    const targetRound = '7777777777777'
    const betRes = await fetch(`${base}/game/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: testUserId,
        selection: 'green',
        amount: 100,
        issueNumber: targetRound,
        typeId: 30,
      }),
    })

    assert.strictEqual(betRes.status, 201, `Bet placement failed`)
    const betData = await betRes.json()
    const betId = betData.bet.id
    console.log(`✓ Placed ₹100 bet on Green. Bet ID: ${betId}`)

    // Check balance after bet placement (500 - 100 = 400)
    const postBetWalRes = await fetch(`${base}/wallet/${testUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const postBetBal = Number((await postBetWalRes.json()).wallet.balance)
    assert.strictEqual(postBetBal, 400, `Balance after ₹100 bet should be 400, got ${postBetBal}`)
    console.log(`✓ Balance after bet deduction: ₹${postBetBal}`)

    // Settle round 7777777777777 with winning digit 7 (Green, multiplier 2.0x -> payout should be exactly ₹200)
    console.log(`Settling round ${targetRound} with digit 7 (Green)...`)
    await settleVeerRound({
      issueNumber: targetRound,
      digit: 7,
      color: 'green',
      rawColour: 'green',
      size: 'Big',
    }, 30)

    // Check balance after settlement
    const postSettleWalRes = await fetch(`${base}/wallet/${testUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const finalBal = Number((await postSettleWalRes.json()).wallet.balance)
    console.log(`✓ Balance after settlement: ₹${finalBal}`)

    // Before tax: 400 + 200 = 600
    // With 0.4% tax on ₹100 bet: effective stake = ₹99.60. Payout = 99.60 * 2.0 = ₹199.20. Balance = 400 + 199.20 = 599.20
    assert.strictEqual(finalBal, 599.20, `Expected balance 599.20 with 0.4% tax, got ${finalBal}`)
    console.log(`✓ EXACT PAYOUT WITH 0.4% TAX CONFIRMED: ₹${finalBal - postBetBal} was added to wallet (₹99.60 x 2.0)`)

    // Check transaction ledger
    if (isSupabaseConfigured) {
      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('reference_id', betId)
        .eq('type', 'BET_PAYOUT')

      assert.strictEqual(txs.length, 1, `Expected exactly 1 BET_PAYOUT transaction, found ${txs.length}`)
      assert.strictEqual(Number(txs[0].amount), 199.20, `Transaction amount should be 199.20, got ${txs[0].amount}`)
      console.log(`✓ Exactly 1 payout transaction exists in ledger: ₹${txs[0].amount}`)
    }

    console.log('--- ALL TESTS PASSED! 0.4% COMMISSION TAX IS FULLY ACTIVE ---')
  } finally {
    // Clean up test account and data immediately per Memory.md rules
    if (testUserId && isSupabaseConfigured) {
      console.log(`Cleaning up test user ${testUserId} from DB...`)
      try {
        await supabase.from('wallet_transactions').delete().eq('user_id', testUserId)
        await supabase.from('bets').delete().eq('user_id', testUserId)
        await supabase.from('wallets').delete().eq('user_id', testUserId)
        await supabase.from('profiles').delete().eq('id', testUserId)
        console.log('✓ Test user cleaned up completely from DB.')
      } catch (err) {
        console.warn('Cleanup error:', err.message)
      }
    }
    server.close()
    process.exit(0)
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
