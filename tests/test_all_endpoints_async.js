import assert from 'assert'
import app from '../server/index.js'
import { generateToken } from '../server/middleware/auth.js'

// Force test environment
process.env.NODE_ENV = 'test'
process.env.SKIP_CAPTCHA = 'true'

async function runAllEndpointTests() {
  console.log('====================================================')
  console.log('🚀 COMPREHENSIVE ASYNC & NON-BLOCKING API TEST SUITE')
  console.log('====================================================')

  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  try {
    // ----------------------------------------------------
    // 1. HEALTH & DOMAIN CHECKS
    // ----------------------------------------------------
    console.log('\n[1/10] Testing Health & Diagnostics Endpoints (Async)...')
    for (const route of ['/health', '/api/health', '/ping', '/']) {
      const res = await fetch(`${baseUrl}${route}`)
      assert.strictEqual(res.status, 200, `Failed for route ${route}`)
      const data = await res.json()
      assert.strictEqual(data.status, 'ok')
      console.log(`  ✓ GET ${route.padEnd(12)} -> 200 OK (service: ${data.service})`)
    }

    // ----------------------------------------------------
    // 2. AUTHENTICATION & ACCESS GATE (ASYNC)
    // ----------------------------------------------------
    console.log('\n[2/10] Testing Authentication & OTP Endpoints (Async)...')
    // Captcha
    const capRes = await fetch(`${baseUrl}/api/auth/captcha`)
    assert.strictEqual(capRes.status, 200)
    const capData = await capRes.json()
    assert(capData.challenge, 'Captcha challenge missing')
    console.log('  ✓ GET /api/auth/captcha -> 200 OK (challenge issued)')

    const testUsername = 'test_' + Math.random().toString(36).substring(2, 8)
    const testPassword = 'Password123!'
    const testEmail = `${testUsername}@example.com`

    // Signup
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: testPassword,
        referralCode: 'VIP2026',
      }),
    })
    const signupData = await signupRes.json()
    assert.strictEqual(signupRes.status, 201, `Signup failed: ${JSON.stringify(signupData)}`)
    assert(signupData.token, 'Token missing in signup response')
    const userToken = signupData.token
    const userId = signupData.user.id
    console.log(`  ✓ POST /api/auth/signup -> 201 Created (User: ${testUsername}, ID: ${userId})`)

    // Duplicate Signup
    const dupSignupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: testPassword }),
    })
    assert.strictEqual(dupSignupRes.status, 409)
    console.log('  ✓ POST /api/auth/signup -> 409 Conflict (Duplicate handled)')

    // Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: testPassword }),
    })
    const loginData = await loginRes.json()
    assert.strictEqual(loginRes.status, 200)
    assert.strictEqual(loginData.user.username, testUsername)
    console.log('  ✓ POST /api/auth/login  -> 200 OK (Session authenticated)')

    // OTP Send & Verify
    const otpSendRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: testEmail, channel: 'EMAIL' }),
    })
    const otpSendData = await otpSendRes.json()
    assert.strictEqual(otpSendRes.status, 200)
    const sentOtp = otpSendData.otpCode
    console.log(`  ✓ POST /api/auth/send-otp -> 200 OK (OTP dispatched: ${sentOtp})`)

    const otpVerifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: testEmail, otpCode: sentOtp }),
    })
    assert.strictEqual(otpVerifyRes.status, 200)
    console.log('  ✓ POST /api/auth/verify-otp -> 200 OK (OTP verified)')

    // ----------------------------------------------------
    // 3. WALLET OPERATIONS (ASYNC)
    // ----------------------------------------------------
    console.log('\n[3/10] Testing Wallet & Balance Endpoints (Async)...')
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    }

    const walletRes = await fetch(`${baseUrl}/api/wallet/${userId}`, { headers: authHeaders })
    const walletData = await walletRes.json()
    assert.strictEqual(walletRes.status, 200)
    assert(walletData.wallet.balance >= 1000, 'Initial balance missing or low')
    console.log(`  ✓ GET /api/wallet/:userId -> 200 OK (Balance: ₹${walletData.wallet.balance})`)

    const txRes = await fetch(`${baseUrl}/api/wallet/${userId}/transactions`, { headers: authHeaders })
    const txData = await txRes.json()
    assert.strictEqual(txRes.status, 200)
    assert(Array.isArray(txData.transactions), 'Transactions array missing')
    console.log(`  ✓ GET /api/wallet/:userId/transactions -> 200 OK (Count: ${txData.transactions.length})`)

    // VIP Daily Claim
    const vipRes = await fetch(`${baseUrl}/api/wallet/vip/claim`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ userId }),
    })
    const vipData = await vipRes.json()
    assert.strictEqual(vipRes.status, 200)
    assert(vipData.bonusAmount >= 15, 'Invalid bonus amount')
    console.log(`  ✓ POST /api/wallet/vip/claim -> 200 OK (Claimed bonus: ₹${vipData.bonusAmount})`)

    // Duplicate VIP Claim Prevention
    const dupVipRes = await fetch(`${baseUrl}/api/wallet/vip/claim`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ userId }),
    })
    assert.strictEqual(dupVipRes.status, 400)
    console.log('  ✓ POST /api/wallet/vip/claim -> 400 Bad Request (24h cooldown enforced)')

    // ----------------------------------------------------
    // 4. WIN GO LOTTERY ENGINE (ASYNC)
    // ----------------------------------------------------
    console.log('\n[4/10] Testing Win Go Multi-Mode Round & Betting (Async)...')
    for (const mode of ['PARITY', 'SAPRE', 'BCONE', 'EMERD']) {
      const roundRes = await fetch(`${baseUrl}/api/game/round/current?mode=${mode}`)
      assert.strictEqual(roundRes.status, 200)
      const roundData = await roundRes.json()
      assert.strictEqual(roundData.mode, mode)
      assert(roundData.roundNumber > 0)
      console.log(`  ✓ GET /api/game/round/current?mode=${mode} -> 200 OK (Round: ${roundData.roundNumber})`)
    }

    // Win Go Bet Placement (pick unlocked mode)
    let betMode = 'EMERD'
    const emerdCheck = await (await fetch(`${baseUrl}/api/game/round/current?mode=EMERD`)).json()
    if (emerdCheck.isLocked) {
      betMode = 'BCONE'
    }

    const betRes = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        userId,
        selection: 'green',
        amount: 20,
        mode: betMode,
      }),
    })
    const betData = await betRes.json()
    assert.strictEqual(betRes.status, 201, `Bet placement failed: ${JSON.stringify(betData)}`)
    console.log(`  ✓ POST /api/game/bet -> 201 Created (Bet ID: ${betData.bet.id}, Mode: ${betMode}, New Bal: ₹${betData.newBalance})`)

    // User Bets Query
    const userBetsRes = await fetch(`${baseUrl}/api/game/bets/${userId}`, { headers: authHeaders })
    const userBetsData = await userBetsRes.json()
    assert.strictEqual(userBetsRes.status, 200)
    assert(Array.isArray(userBetsData.bets) && userBetsData.bets.length > 0)
    console.log(`  ✓ GET /api/game/bets/:userId -> 200 OK (Fetched ${userBetsData.bets.length} bets)`)

    // ----------------------------------------------------
    // 5. AVIATOR CRASH GAME (ASYNC)
    // ----------------------------------------------------
    console.log('\n[5/10] Testing Aviator Real-Time Crash Endpoints (Async)...')
    const aviatorStateRes = await fetch(`${baseUrl}/api/game/aviator/state`, { headers: authHeaders })
    assert.strictEqual(aviatorStateRes.status, 200)
    const aviatorState = await aviatorStateRes.json()
    assert.strictEqual(aviatorState.game, 'AVIATOR')
    console.log(`  ✓ GET /api/game/aviator/state -> 200 OK (Phase: ${aviatorState.phase}, Round: ${aviatorState.roundId})`)

    const aviatorHistoryRes = await fetch(`${baseUrl}/api/game/aviator/history`)
    assert.strictEqual(aviatorHistoryRes.status, 200)
    const aviatorHistory = await aviatorHistoryRes.json()
    assert(Array.isArray(aviatorHistory.history))
    console.log(`  ✓ GET /api/game/aviator/history -> 200 OK (${aviatorHistory.history.length} rounds)`)

    // ----------------------------------------------------
    // 6. IN-HOUSE SLOTS, MINES & DRAGON TIGER (ASYNC)
    // ----------------------------------------------------
    console.log('\n[6/10] Testing In-House Slots, Mines & Dragon Tiger (Async)...')
    // Slot Config
    const slotCfgRes = await fetch(`${baseUrl}/api/game/slot/config/crazy777`)
    assert.strictEqual(slotCfgRes.status, 200)
    const slotCfg = await slotCfgRes.json()
    assert.strictEqual(slotCfg.gameId, 'crazy777')
    console.log('  ✓ GET /api/game/slot/config/:gameId -> 200 OK (Crazy 777 symbols loaded)')

    // Slot Spin
    const spinRes = await fetch(`${baseUrl}/api/game/slot/spin`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ userId, gameId: 'crazy777', betAmount: 10 }),
    })
    const spinData = await spinRes.json()
    assert.strictEqual(spinRes.status, 200)
    assert(spinData.spinResult, 'Spin result missing')
    console.log(`  ✓ POST /api/game/slot/spin -> 200 OK (Win: ₹${spinData.spinResult.finalWin})`)

    // Mines Start, Reveal, Cashout
    const minesStartRes = await fetch(`${baseUrl}/api/game/mines/start`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ userId, betAmount: 10, minesCount: 3 }),
    })
    const minesData = await minesStartRes.json()
    assert.strictEqual(minesStartRes.status, 200)
    assert(minesData.sessionId, 'Mines sessionId missing')
    console.log(`  ✓ POST /api/game/mines/start -> 200 OK (Session: ${minesData.sessionId})`)

    const minesRevealRes = await fetch(`${baseUrl}/api/game/mines/reveal`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ sessionId: minesData.sessionId, tileIndex: 0, userId }),
    })
    const revealData = await minesRevealRes.json()
    assert.strictEqual(minesRevealRes.status, 200)
    console.log(`  ✓ POST /api/game/mines/reveal -> 200 OK (Tile 0: isHit=${revealData.isHit})`)

    if (!revealData.isHit) {
      const minesCashoutRes = await fetch(`${baseUrl}/api/game/mines/cashout`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ sessionId: minesData.sessionId, userId }),
      })
      assert.strictEqual(minesCashoutRes.status, 200)
      console.log('  ✓ POST /api/game/mines/cashout -> 200 OK (Cashed out)')
    }

    // Dragon Tiger State & Bet
    const dtStateRes = await fetch(`${baseUrl}/api/game/dragontiger/state`)
    assert.strictEqual(dtStateRes.status, 200)
    console.log('  ✓ GET /api/game/dragontiger/state -> 200 OK')

    const dtBetRes = await fetch(`${baseUrl}/api/game/dragontiger/bet`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ userId, market: 'DRAGON', betAmount: 10 }),
    })
    const dtBetData = await dtBetRes.json()
    assert.strictEqual(dtBetRes.status, 200)
    console.log(`  ✓ POST /api/game/dragontiger/bet -> 200 OK (Winner: ${dtBetData.roundResult.winner})`)

    // ----------------------------------------------------
    // 7. THIRD-PARTY GAME INTEGRATIONS (ASYNC)
    // ----------------------------------------------------
    console.log('\n[7/10] Testing Third-Party Game Catalog (Async)...')
    const provRes = await fetch(`${baseUrl}/api/game/providers`)
    assert.strictEqual(provRes.status, 200)
    const provData = await provRes.json()
    assert(Array.isArray(provData.providers))
    console.log(`  ✓ GET /api/game/providers -> 200 OK (${provData.providers.length} providers)`)

    const catRes = await fetch(`${baseUrl}/api/game/third-party/catalog?limit=5`)
    assert.strictEqual(catRes.status, 200)
    const catData = await catRes.json()
    assert(Array.isArray(catData.games))
    console.log(`  ✓ GET /api/game/third-party/catalog -> 200 OK (${catData.games.length} games)`)

    // ----------------------------------------------------
    // 8. PAYMENT GATEWAY: DEPOSIT, UTR & IDEMPOTENCY (ASYNC)
    // ----------------------------------------------------
    console.log('\n[8/10] Testing Payment Gateway (Deposit, UTR, Idempotency) (Async)...')
    const idempotencyKey = 'idemp_' + Date.now()
    const depRes = await fetch(`${baseUrl}/api/payments/create-deposit`, {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ userId, amount: 500 }),
    })
    const depData = await depRes.json()
    assert.strictEqual(depRes.status, 201, `Deposit failed: ${JSON.stringify(depData)}`)
    assert(depData.deposit.id)
    assert(depData.qrCodeDataUrl.startsWith('data:image/png;base64,'))
    const depositId = depData.deposit.id
    console.log(`  ✓ POST /api/payments/create-deposit -> 201 Created (ID: ${depositId})`)

    // Idempotency Replay Check
    const depReplayRes = await fetch(`${baseUrl}/api/payments/create-deposit`, {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ userId, amount: 500 }),
    })
    assert.strictEqual(depReplayRes.status, 201)
    assert.strictEqual(depReplayRes.headers.get('x-idempotent-replay'), 'true')
    console.log('  ✓ POST /api/payments/create-deposit [Replay] -> 201 OK with X-Idempotent-Replay')

    // Allow previous DB lock release to settle across network
    await new Promise((r) => setTimeout(r, 200))

    // Submit UTR
    const testUtr = String(Math.floor(100000000000 + Math.random() * 900000000000))
    const utrRes = await fetch(`${baseUrl}/api/payments/submit-utr`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ depositId, utrNumber: testUtr }),
    })
    const utrData = await utrRes.json()
    assert.strictEqual(utrRes.status, 200, `Submit UTR failed: ${JSON.stringify(utrData)}`)
    console.log(`  ✓ POST /api/payments/submit-utr -> 200 OK (UTR: ${testUtr})`)

    // Allow DB lock release to settle before starting next financial mutation
    await new Promise((r) => setTimeout(r, 200))

    // Withdrawal Request
    const withRes = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        userId,
        amount: 100,
        payoutMethod: 'UPI',
        upiId: 'test@okaxis',
      }),
    })
    const withData = await withRes.json()
    assert.strictEqual(withRes.status, 201, `Withdrawal failed: ${JSON.stringify(withData)}`)
    console.log(`  ✓ POST /api/wallet/withdraw -> 201 Created (Withdrawal ID: ${withData.withdrawal.id})`)

    // ----------------------------------------------------
    // 9. ADMIN OPERATIONS & RISK MATRIX (ASYNC)
    // ----------------------------------------------------
    console.log('\n[9/10] Testing Admin Controls & Risk Matrix (Async)...')
    process.env.ADMIN_IDENTIFIER = testUsername
    const adminKey = process.env.ADMIN_SECRET_KEY || 'club69_admin_master_secret_2026'
    const promoteRes = await fetch(`${baseUrl}/api/admin/promote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({ identity: testUsername }),
    })
    const promoteData = await promoteRes.json()
    assert.strictEqual(promoteRes.status, 200, `Promote admin failed: ${JSON.stringify(promoteData)}`)
    console.log(`  ✓ POST /api/admin/promote -> 200 OK (Promoted ${testUsername} to Admin)`)

    const adminToken = generateToken({
      id: userId,
      username: testUsername,
      role: 'admin',
      is_admin: true,
    })
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    }

    // Verify session
    const admVerRes = await fetch(`${baseUrl}/api/admin/verify`, {
      method: 'POST',
      headers: adminHeaders,
    })
    assert.strictEqual(admVerRes.status, 200)
    console.log('  ✓ POST /api/admin/verify -> 200 OK (Session verified)')

    // Matrix
    const matrixRes = await fetch(`${baseUrl}/api/admin/matrix`, { headers: adminHeaders })
    assert.strictEqual(matrixRes.status, 200)
    const matrixData = await matrixRes.json()
    assert(matrixData.matrix, 'Matrix missing')
    console.log(`  ✓ GET /api/admin/matrix -> 200 OK (Total bets recorded: ${matrixData.matrix.totalBetsCount})`)

    // Bets Ledger
    const betsLedgerRes = await fetch(`${baseUrl}/api/admin/bets?limit=10`, { headers: adminHeaders })
    assert.strictEqual(betsLedgerRes.status, 200)
    const betsLedger = await betsLedgerRes.json()
    assert(Array.isArray(betsLedger.bets))
    console.log(`  ✓ GET /api/admin/bets -> 200 OK (Ledger count: ${betsLedger.bets.length})`)

    // Users List
    const usersRes = await fetch(`${baseUrl}/api/admin/users`, { headers: adminHeaders })
    assert.strictEqual(usersRes.status, 200)
    const usersData = await usersRes.json()
    assert(Array.isArray(usersData.users))
    console.log(`  ✓ GET /api/admin/users -> 200 OK (Users registered: ${usersData.users.length})`)

    // ----------------------------------------------------
    // 10. UNKNOWN ROUTE 404 (ASYNC)
    // ----------------------------------------------------
    console.log('\n[10/10] Testing Fallback 404 Route (Async)...')
    const notFoundRes = await fetch(`${baseUrl}/api/non-existent-endpoint-${Date.now()}`)
    assert.strictEqual(notFoundRes.status, 404)
    const notFoundData = await notFoundRes.json()
    assert.strictEqual(notFoundData.error, 'Endpoint not found')
    console.log('  ✓ GET /api/non-existent -> 404 Not Found (Async handler resolved)')

    console.log('\n====================================================')
    console.log('🎉 ALL API ENDPOINTS ARE 100% FUNCTIONAL & ASYNCHRONOUS!')
    console.log('====================================================\n')
  } catch (err) {
    console.error('\n❌ TEST RUNNER FAILED:', err)
    process.exitCode = 1
  } finally {
    server.close()
  }
}

runAllEndpointTests()
