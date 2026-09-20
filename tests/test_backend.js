import assert from 'assert'
import app from '../server/index.js'

async function runTests() {
  console.log('--- Starting Backend Verification Tests ---')

  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  try {
    // 1. Health Check
    console.log('Test 1: Health Check')
    const healthRes = await fetch(`${baseUrl}/api/health`)
    const healthJson = await healthRes.json()
    assert.strictEqual(healthRes.status, 200)
    assert.strictEqual(healthJson.status, 'ok')
    console.log('✓ Health check passed')

    // 2. Auth Login / Profile Creation
    console.log('Test 2: Auth Login')
    const authRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'trader101' }),
    })
    const authJson = await authRes.json()
    assert.strictEqual(authRes.status, 200)
    assert(authJson.user.id, 'User ID missing')
    const userId = authJson.user.id
    console.log(`✓ Auth passed (User ID: ${userId})`)

    // 3. Wallet Retrieval
    console.log('Test 3: Wallet Retrieval')
    const walletRes = await fetch(`${baseUrl}/api/wallet/${userId}`)
    const walletJson = await walletRes.json()
    assert.strictEqual(walletRes.status, 200)
    assert(walletJson.wallet.balance >= 0, 'Invalid balance')
    console.log(`✓ Wallet verified (Initial Balance: ₹${walletJson.wallet.balance})`)

    // 4. Create UPI Deposit Request
    console.log('Test 4: Create UPI Deposit Request')
    const depRes = await fetch(`${baseUrl}/api/payments/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount: 500 }),
    })
    const depJson = await depRes.json()
    assert.strictEqual(depRes.status, 201)
    assert(depJson.deposit.id, 'Missing deposit ID')
    assert(depJson.qrCodeDataUrl.startsWith('data:image/png;base64,'), 'Invalid QR Code')
    assert(depJson.upiUri.startsWith('upi://pay'), 'Invalid UPI URI')
    const depositId = depJson.deposit.id
    console.log(`✓ Deposit created (Deposit ID: ${depositId}, Order: ${depJson.deposit.order_ref})`)

    // 5. Test Invalid UTR rejection
    console.log('Test 5: Invalid UTR format rejection')
    const badUtrRes = await fetch(`${baseUrl}/api/payments/deposit/utr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId, utrNumber: '123' }), // only 3 digits
    })
    assert.strictEqual(badUtrRes.status, 400)
    console.log('✓ Invalid UTR properly rejected')

    // 6. Submit Valid 12-digit UTR
    console.log('Test 6: Submit Valid 12-digit UTR')
    const testUTR = '428901234567'
    const utrRes = await fetch(`${baseUrl}/api/payments/deposit/utr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId, utrNumber: testUTR }),
    })
    const utrJson = await utrRes.json()
    assert.strictEqual(utrRes.status, 200)
    console.log(`✓ UTR submitted successfully: ${testUTR}`)

    // 7. Duplicate UTR check
    console.log('Test 7: Duplicate UTR Prevention')
    const depRes2 = await fetch(`${baseUrl}/api/payments/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount: 1000 }),
    })
    const depJson2 = await depRes2.json()
    const dupRes = await fetch(`${baseUrl}/api/payments/deposit/utr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId: depJson2.deposit.id, utrNumber: testUTR }),
    })
    assert.strictEqual(dupRes.status, 409)
    console.log('✓ Duplicate UTR successfully prevented')

    // 8. Admin Verification & Balance Credit
    console.log('Test 8: Admin Verification & Balance Credit')
    const verifyRes = await fetch(`${baseUrl}/api/payments/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId, action: 'APPROVE', notes: 'Verified in bank statement' }),
    })
    const verifyJson = await verifyRes.json()
    assert.strictEqual(verifyRes.status, 200)
    assert.strictEqual(verifyJson.newBalance, 1500)
    console.log(`✓ Deposit approved, new balance credited: ₹${verifyJson.newBalance}`)

    // 9. Game Round State
    console.log('Test 9: Game Round State')
    const roundRes = await fetch(`${baseUrl}/api/game/round/current`)
    const roundJson = await roundRes.json()
    assert.strictEqual(roundRes.status, 200)
    assert(roundJson.roundNumber > 0, 'Invalid round number')
    assert(roundJson.secondsRemaining >= 0, 'Invalid seconds remaining')
    assert(Array.isArray(roundJson.history), 'Invalid history')
    console.log(`✓ Game round synced (Round #${roundJson.roundNumber}, ${roundJson.secondsRemaining}s remaining)`)

    console.log('\n--- ALL 9 BACKEND TESTS PASSED SUCCESSFULLY ---')
  } finally {
    server.close()
    process.exit(0)
  }
}

runTests().catch((err) => {
  console.error('Test Failed:', err)
  process.exit(1)
})
