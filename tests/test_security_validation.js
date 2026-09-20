import assert from 'assert'
import app from '../server/index.js'

async function runSecurityTests() {
  console.log('--- Starting Strict Security & Validation Test Suite ---')
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  try {
    // TEST 1: Unauthorized access protection (No Token)
    console.log('1. Testing Unauthenticated Request Rejection...')
    const noTokenBet = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'some-user', selection: 'green', amount: 50 }),
    })
    assert.strictEqual(noTokenBet.status, 401, 'Unauthenticated bet should be rejected with 401')
    console.log('✓ Bet placement without token rejected (401 Unauthorized)')

    const noTokenWallet = await fetch(`${baseUrl}/api/wallet/some-user`)
    assert.strictEqual(noTokenWallet.status, 401, 'Unauthenticated wallet read should be rejected with 401')
    console.log('✓ Wallet read without token rejected (401 Unauthorized)')

    // TEST 2: Admin Endpoint Protection
    console.log('2. Testing Admin Verification Route Protection...')
    const fakeAdminVerify = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId: 'fake-id', action: 'APPROVE' }),
    })
    assert.strictEqual(fakeAdminVerify.status, 403, 'Verify without admin key should be 403 Forbidden')
    console.log('✓ Self-approval of deposits blocked (403 Forbidden)')

    // TEST 3: Strict Validation on Registration
    console.log('3. Testing Input Sanitization & Validation on Registration...')
    // Bad username with special chars
    const badUserRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user<script>', password: 'password123' }),
    })
    assert.strictEqual(badUserRes.status, 400, 'XSS username should be rejected')
    console.log('✓ Script injection username rejected (400 Bad Request)')

    // Short password
    const shortPassRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'validuser', password: '123' }),
    })
    assert.strictEqual(shortPassRes.status, 400, 'Short password should be rejected')
    console.log('✓ Short password rejected (400 Bad Request)')

    // TEST 4: Register Two Real Users
    console.log('4. Registering Two Distinct Users...')
    const u1Name = 'player1_' + Math.random().toString(36).substring(2, 7)
    const u2Name = 'player2_' + Math.random().toString(36).substring(2, 7)

    const reg1Res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u1Name, password: 'password123' }),
    })
    const reg1 = await reg1Res.json()
    assert.strictEqual(reg1Res.status, 201)
    assert(reg1.token, 'Token must be issued upon registration')
    const token1 = reg1.token
    const user1Id = reg1.user.id

    const reg2Res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u2Name, password: 'password123' }),
    })
    const reg2 = await reg2Res.json()
    assert.strictEqual(reg2Res.status, 201)
    const token2 = reg2.token
    const user2Id = reg2.user.id
    console.log(`✓ Both users registered with signed tokens (${user1Id}, ${user2Id})`)

    // TEST 5: Anti-Spoofing / Bypass (User 1 cannot impersonate User 2)
    console.log('5. Testing Anti-Spoofing Protections...')
    // User 1 tries to bet with User 2's ID
    const spoofBetRes = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ userId: user2Id, selection: 'green', amount: 50 }),
    })
    assert.strictEqual(spoofBetRes.status, 403, 'Spoofing another user ID must be rejected with 403')
    console.log('✓ User ID impersonation in bet placement blocked (403 Forbidden)')

    // User 1 tries to read User 2's wallet
    const spoofWalRes = await fetch(`${baseUrl}/api/wallet/${user2Id}`, {
      headers: { Authorization: `Bearer ${token1}` },
    })
    assert.strictEqual(spoofWalRes.status, 403, 'Snooping on another user wallet must be 403')
    console.log('✓ Unauthorized wallet snooping blocked (403 Forbidden)')

    // TEST 6: Strict Bet Validation
    console.log('6. Testing Strict Bet Parameters...')
    // Invalid selection
    const badSelRes = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ userId: user1Id, selection: 'yellow', amount: 50 }),
    })
    assert.strictEqual(badSelRes.status, 400)
    console.log('✓ Invalid color/digit selection rejected (400 Bad Request)')

    // Fractional amount
    const badAmtRes = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ userId: user1Id, selection: 'green', amount: 15.5 }),
    })
    assert.strictEqual(badAmtRes.status, 400)
    console.log('✓ Fractional / Non-integer bet amount rejected (400 Bad Request)')

    // Below minimum bet (< 10)
    const minAmtRes = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ userId: user1Id, selection: 'green', amount: 5 }),
    })
    assert.strictEqual(minAmtRes.status, 400)
    console.log('✓ Below minimum bet (₹5 < ₹10) rejected (400 Bad Request)')

    // TEST 7: Valid Authorized Bet Placement & Balance Deduction
    console.log('7. Testing Valid Authorized Bet...')
    const validBetRes = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ userId: user1Id, selection: 'green', amount: 100 }),
    })
    const betJson = await validBetRes.json()
    assert.strictEqual(validBetRes.status, 201)
    assert.strictEqual(betJson.bet.amount, 100)
    assert.strictEqual(betJson.newBalance, 900)
    console.log(`✓ Bet successfully placed with signed token. New balance: ₹${betJson.newBalance}`)

    // TEST 8: UTR Validation
    console.log('8. Testing UTR Format Validation...')
    const badUTRRes = await fetch(`${baseUrl}/api/payments/deposit/utr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ depositId: '00000000-0000-0000-0000-000000000000', utrNumber: '123' }),
    })
    assert.strictEqual(badUTRRes.status, 400)
    console.log('✓ Non-12-digit UTR rejected (400 Bad Request)')

    console.log('\n--- ALL SECURITY & VALIDATION TESTS PASSED (8/8) ---')
  } finally {
    server.close()
  }
}

runSecurityTests().catch((err) => {
  console.error('Security test failed:', err)
  process.exit(1)
})
