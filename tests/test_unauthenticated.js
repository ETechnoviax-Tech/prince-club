import assert from 'assert'
import app from '../server/index.js'

async function runUnauthTests() {
  console.log('--- Testing Strict Unauthenticated Rejection ---')
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  try {
    // 1. Unauthenticated Withdrawal
    const withdrawRes = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'fake_user', amount: 500, payoutMethod: 'UPI' }),
    })
    assert.strictEqual(withdrawRes.status, 401, 'Unauthenticated withdrawal must return 401')
    console.log('✓ Unauthenticated withdrawal rejected with 401')

    // 2. Unauthenticated Bet
    const betRes = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'fake_user', selection: 'green', amount: 50, mode: 'PARITY' }),
    })
    assert.strictEqual(betRes.status, 401, 'Unauthenticated bet must return 401')
    console.log('✓ Unauthenticated bet rejected with 401')

    // 3. Unauthenticated Slot Spin
    const slotRes = await fetch(`${baseUrl}/api/game/slot/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: 'crazy777', betAmount: 20 }),
    })
    assert.strictEqual(slotRes.status, 401, 'Unauthenticated slot spin must return 401')
    console.log('✓ Unauthenticated slot spin rejected with 401')

    // 4. Unauthenticated VIP Claim
    const vipRes = await fetch(`${baseUrl}/api/wallet/vip/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'fake_user' }),
    })
    assert.strictEqual(vipRes.status, 401, 'Unauthenticated VIP claim must return 401')
    console.log('✓ Unauthenticated VIP claim rejected with 401')

    // 5. Unauthenticated Aviator Bet
    const aviatorRes = await fetch(`${baseUrl}/api/game/aviator/bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50 }),
    })
    assert.strictEqual(aviatorRes.status, 401, 'Unauthenticated aviator bet must return 401')
    console.log('✓ Unauthenticated aviator bet rejected with 401')

    // 6. Unauthenticated Mines Start
    const minesRes = await fetch(`${baseUrl}/api/game/mines/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betAmount: 50, minesCount: 3 }),
    })
    assert.strictEqual(minesRes.status, 401, 'Unauthenticated mines start must return 401')
    console.log('✓ Unauthenticated mines start rejected with 401')

    // 7. Unauthenticated Dragon Tiger Bet
    const dtRes = await fetch(`${baseUrl}/api/game/dragontiger/bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market: 'DRAGON', betAmount: 50 }),
    })
    assert.strictEqual(dtRes.status, 401, 'Unauthenticated dragon tiger bet must return 401')
    console.log('✓ Unauthenticated dragon tiger bet rejected with 401')

    console.log('--- ALL UNAUTHENTICATED REJECTION TESTS PASSED! ---')
  } finally {
    server.close()
  }
}

runUnauthTests().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
