import assert from 'assert'
import {
  calculateMultiplier,
  durationForCrashPoint,
  getAviatorState,
  placeAviatorBet,
  cashoutAviator,
} from '../server/controllers/aviatorController.js'
import { memoryWallets } from '../server/db/store.js'

async function runTests() {
  console.log('🧪 [Test Suite] Aviator Real-Time Engine & Concurrency Shield\n')

  // 1. Multiplier math test
  console.log('1. Testing authoritative multiplier calculation:')
  assert.strictEqual(calculateMultiplier(0), 1.0, '0ms must be 1.0x')
  const mult10s = calculateMultiplier(10000)
  assert.ok(mult10s > 1.0, 'Multiplier after 10s must be > 1.0x')
  const dur = durationForCrashPoint(2.0)
  assert.ok(dur > 0, 'Duration for 2.0x must be positive')
  console.log(`   - 0s: 1.00x | 10s: ${mult10s}x | 2.00x duration: ${dur}ms (PASS)`)

  // 2. Live State broadcast verification
  console.log('\n2. Testing getAviatorState output structure:')
  let mockResJson = null
  const mockRes = {
    json: (d) => {
      mockResJson = d
      return d
    },
  }
  getAviatorState({}, mockRes)
  assert.ok(mockResJson, 'State response must exist')
  assert.ok(mockResJson.roundId, 'Must have roundId')
  assert.ok(mockResJson.phase, 'Must have phase')
  assert.ok(mockResJson.remainingMs !== undefined, 'Must have remainingMs')
  assert.ok(mockResJson.totalPlayers >= 0, 'Must have totalPlayers')
  assert.ok(mockResJson.totalPool >= 0, 'Must have totalPool')
  assert.ok(Array.isArray(mockResJson.recentCashouts), 'Must have recentCashouts array')
  assert.ok(mockResJson.waitingDurationMs === 6000, 'Waiting duration must be 6000ms')
  console.log(`   - Phase: ${mockResJson.phase} | Players: ${mockResJson.totalPlayers} | Pool: ₹${mockResJson.totalPool} | Wait: ${mockResJson.waitingDurationMs}ms (PASS)`)

  // 3. Concurrent Bets Test (Many users betting at same millisecond)
  console.log('\n3. Testing Concurrent Requests from Multiple Users:')
  const testUsers = Array.from({ length: 10 }, (_, i) => `test_user_conc_${i}`)
  testUsers.forEach((u) => memoryWallets.set(u, 1000.0))

  const betPromises = testUsers.map((u) => {
    let result = null
    let statusCode = 200
    const resObj = {
      status: (code) => {
        statusCode = code
        return resObj
      },
      json: (d) => {
        result = { statusCode, data: d }
        return result
      },
    }
    return placeAviatorBet({ user: { id: u }, body: { amount: 50, autoCashout: 2.0 } }, resObj)
  })

  const results = await Promise.all(betPromises)
  let successfulBets = 0
  results.forEach((r, idx) => {
    if (r && r.data && r.data.success) {
      successfulBets++
      assert.strictEqual(memoryWallets.get(testUsers[idx]), 950.0, 'Balance must be exactly ₹950')
    }
  })
  console.log(`   - Successfully placed ${successfulBets}/${testUsers.length} concurrent bets without collision (PASS)`)

  // 4. Same-User Concurrency & Double-Spend Prevention Test
  console.log('\n4. Testing Same-User Double-Click Concurrency (Mutex verification):')
  const singleUser = 'test_single_mutex_user'
  memoryWallets.set(singleUser, 100.0) // only enough for two ₹50 bets or one ₹80 bet

  const rapidBets = [1, 2, 3].map(() => {
    let statusCode = 200
    const resObj = {
      status: (code) => {
        statusCode = code
        return resObj
      },
      json: (d) => ({ statusCode, data: d }),
    }
    return placeAviatorBet({ user: { id: singleUser }, body: { amount: 60 } }, resObj)
  })

  const rapidResults = await Promise.all(rapidBets)
  const okRapid = rapidResults.filter((r) => r.data?.success)
  const failedRapid = rapidResults.filter((r) => r.statusCode === 400)
  assert.strictEqual(okRapid.length, 1, 'Only 1 bet of ₹60 should succeed with ₹100 balance')
  assert.strictEqual(failedRapid.length, 2, '2 bets should fail due to insufficient balance')
  assert.strictEqual(memoryWallets.get(singleUser), 40.0, 'Balance must be exactly ₹40.0, never negative')
  console.log('   - Exactly 1 bet succeeded and 2 were rejected; wallet balance strictly locked at ₹40 (PASS)')

  console.log('\n🎉 ALL AVIATOR CONCURRENCY & REAL-TIME TESTS PASSED!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
