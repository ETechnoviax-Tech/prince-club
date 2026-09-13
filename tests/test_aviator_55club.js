import http from 'http'
import app from '../server/index.js'

let server
const PORT = 5003

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      resolve()
    })
  })
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) server.close(resolve)
    else resolve()
  })
}

async function api(path, options = {}) {
  const res = await fetch(`http://localhost:${PORT}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, ok: res.ok, data: json }
}

async function runTests() {
  console.log('--- Testing 55 Club Aviator & Features Engine ---')
  await startServer()

  try {
    // 1. Aviator State
    console.log('1. Testing GET /api/game/aviator/state...')
    const stateRes = await api('/game/aviator/state')
    if (!stateRes.ok || !stateRes.data.roundId) {
      throw new Error(`Failed to get Aviator state: ${JSON.stringify(stateRes.data)}`)
    }
    console.log(`✓ Aviator State retrieved: Round #${stateRes.data.roundId}, Phase: ${stateRes.data.phase}, Mult: ${stateRes.data.multiplier}x`)

    // 2. Aviator History
    console.log('2. Testing GET /api/game/aviator/history...')
    const histRes = await api('/game/aviator/history')
    if (!histRes.ok || !Array.isArray(histRes.data.history)) {
      throw new Error(`Failed to get Aviator history: ${JSON.stringify(histRes.data)}`)
    }
    console.log(`✓ Aviator History retrieved: ${histRes.data.history.length} rounds logged`)

    // 3. Aviator Bet validation
    console.log('3. Testing POST /api/game/aviator/bet validation...')
    const betInvalid = await api('/game/aviator/bet', {
      method: 'POST',
      body: JSON.stringify({ userId: 'test_usr', amount: 5 }), // < 10
    })
    if (betInvalid.status !== 400) {
      throw new Error(`Expected 400 for sub-10 bet amount, got ${betInvalid.status}`)
    }
    console.log('✓ Sub-10 bet amount properly rejected (400)')

    // 4. Fortune Wheel / VIP Check-in
    console.log('4. Testing VIP Daily Bonus for Fortune Wheel...')
    const vipRes = await api('/wallet/vip/claim', {
      method: 'POST',
      body: JSON.stringify({ userId: 'test_wheel_user_' + Date.now() }),
    })
    if (!vipRes.ok || typeof vipRes.data.bonusAmount !== 'number') {
      throw new Error(`VIP bonus failed: ${JSON.stringify(vipRes.data)}`)
    }
    console.log(`✓ Fortune Wheel bonus awarded: ₹${vipRes.data.bonusAmount}`)

    console.log('\n--- ALL 55 CLUB & AVIATOR TESTS PASSED SUCCESSFULLY! ---')
  } catch (err) {
    console.error('❌ Test failed:', err)
    process.exitCode = 1
  } finally {
    await stopServer()
  }
}

runTests()
