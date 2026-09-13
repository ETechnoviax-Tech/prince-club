import assert from 'assert'
import http from 'http'
import app from '../server/index.js'

let server
let baseUrl

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app)
    server.listen(0, () => {
      const port = server.address().port
      baseUrl = `http://localhost:${port}`
      resolve()
    })
  })
}

async function stopServer() {
  return new Promise((resolve) => {
    server.close(resolve)
  })
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const body = options.body ? JSON.stringify(options.body) : undefined

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  })

  const json = await res.json().catch(() => ({}))
  return { status: res.status, data: json }
}

async function runTests() {
  console.log('=== STARTING ARCADE GAMES TEST SUITE ===')
  await startServer()

  try {
    // 1. AVIATOR TESTS
    console.log('\n--- 1. Testing Aviator Crash Game ---')
    const stateRes = await request('/api/game/aviator/state?userId=test_user_aviator')
    assert.strictEqual(stateRes.status, 200, 'Aviator state status should be 200')
    assert.ok(['WAITING', 'FLYING', 'CRASHED'].includes(stateRes.data.phase), 'Phase should be valid')
    assert.ok(Array.isArray(stateRes.data.history), 'History array should be returned')
    console.log(`[PASS] Aviator state fetched (Phase: ${stateRes.data.phase}, Round #${stateRes.data.roundId})`)

    const aviatorBetRes = await request('/api/game/aviator/bet', {
      method: 'POST',
      body: {
        userId: 'test_user_aviator',
        amount: 50,
        autoCashOut: 2.5,
      },
    })
    assert.strictEqual(aviatorBetRes.status, 201, 'Aviator bet placement should return 201')
    assert.strictEqual(aviatorBetRes.data.bet.amount, 50, 'Bet amount must match')
    assert.strictEqual(aviatorBetRes.data.bet.autoCashOut, 2.5, 'AutoCashOut target must match')
    console.log('[PASS] Aviator bet placed successfully')

    // 2. COIN FLIP TESTS
    console.log('\n--- 2. Testing Coin Flip 3D Game ---')
    const coinFlipRes = await request('/api/game/coinflip/play', {
      method: 'POST',
      body: {
        userId: 'test_user_coinflip',
        side: 'HEADS',
        amount: 100,
      },
    })
    assert.strictEqual(coinFlipRes.status, 200, 'Coin flip play should return 200')
    assert.ok(['HEADS', 'TAILS'].includes(coinFlipRes.data.resultSide), 'Result side must be HEADS or TAILS')
    assert.strictEqual(typeof coinFlipRes.data.won, 'boolean', 'Won flag must be boolean')
    assert.strictEqual(coinFlipRes.data.multiplier, 1.96, 'Multiplier should be 1.96x')
    if (coinFlipRes.data.won) {
      assert.strictEqual(coinFlipRes.data.payout, 196, 'Payout should be ₹196 on ₹100 bet')
    } else {
      assert.strictEqual(coinFlipRes.data.payout, 0, 'Payout should be 0 on loss')
    }
    console.log(`[PASS] Coin flip result: Chosen=${coinFlipRes.data.chosenSide}, Result=${coinFlipRes.data.resultSide}, Won=${coinFlipRes.data.won}, Payout=₹${coinFlipRes.data.payout}`)

    const coinHistoryRes = await request('/api/game/coinflip/history')
    assert.strictEqual(coinHistoryRes.status, 200, 'Coin flip history status should be 200')
    assert.ok(Array.isArray(coinHistoryRes.data.history), 'History array must exist')
    assert.ok(coinHistoryRes.data.stats, 'Stats object must exist')
    console.log(`[PASS] Coin flip history and stats verified (Total: ${coinHistoryRes.data.stats.totalFlips})`)

    // 3. ANDAR BAHAR TESTS
    console.log('\n--- 3. Testing Andar Bahar Card Game ---')
    const abRes = await request('/api/game/andarbahar/play', {
      method: 'POST',
      body: {
        userId: 'test_user_ab',
        side: 'ANDAR',
        amount: 100,
      },
    })
    assert.strictEqual(abRes.status, 200, 'Andar Bahar play should return 200')
    assert.ok(abRes.data.jokerCard, 'Joker card must be drawn')
    assert.ok(Array.isArray(abRes.data.dealtCards), 'Dealt cards array must be returned')
    assert.ok(abRes.data.dealtCards.length > 0, 'Dealt cards must have at least 1 card')
    assert.ok(['ANDAR', 'BAHAR'].includes(abRes.data.winningSide), 'Winning side must be ANDAR or BAHAR')
    assert.strictEqual(abRes.data.winningCard.rank, abRes.data.jokerCard.rank, 'Winning card rank must match Joker rank')
    console.log(`[PASS] Andar Bahar round verified (Joker: ${abRes.data.jokerCard.name}, Winning Side: ${abRes.data.winningSide}, Dealt: ${abRes.data.totalCardsDealt} cards, Won: ${abRes.data.won})`)

    const abHistoryRes = await request('/api/game/andarbahar/history')
    assert.strictEqual(abHistoryRes.status, 200, 'Andar Bahar history status should be 200')
    assert.ok(Array.isArray(abHistoryRes.data.history), 'History array must exist')
    assert.ok(abHistoryRes.data.stats, 'Stats object must exist')
    console.log(`[PASS] Andar Bahar history and stats verified (Andar: ${abHistoryRes.data.stats.andarPercent}%, Bahar: ${abHistoryRes.data.stats.baharPercent}%)`)

    // 4. VALIDATION & SECURITY TESTS
    console.log('\n--- 4. Testing Input Validation ---')
    const invalidCoinBet = await request('/api/game/coinflip/play', {
      method: 'POST',
      body: {
        userId: 'test_user_val',
        side: 'INVALID_SIDE',
        amount: 100,
      },
    })
    assert.strictEqual(invalidCoinBet.status, 400, 'Invalid side should be rejected with 400')

    const smallBet = await request('/api/game/andarbahar/play', {
      method: 'POST',
      body: {
        userId: 'test_user_val',
        side: 'ANDAR',
        amount: 2, // Below min ₹10
      },
    })
    assert.strictEqual(smallBet.status, 400, 'Below min bet amount should be rejected with 400')
    console.log('[PASS] Input validation and min bet restrictions enforced')

    console.log('\n🎉 ALL ARCADE GAMES TESTS PASSED CLEANLY!')
  } finally {
    await stopServer()
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
