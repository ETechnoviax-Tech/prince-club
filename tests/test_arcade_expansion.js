import assert from 'assert'

const BASE_URL = 'http://localhost:5000/api'
const TEST_USER = 'test-arcade-' + Math.random().toString(36).substring(2, 7)

async function runArcadeTests() {
  console.log('--- Starting Arcade Expansion & New Games Test Suite ---')

  // 1. Check Health
  const healthRes = await fetch(`${BASE_URL}/health`).then((r) => r.json())
  assert.strictEqual(healthRes.status, 'ok', 'API health check should return ok')
  console.log('✅ 1. Backend health check passed.')

  // 2. Test Spin Status
  const spinStatus = await fetch(`${BASE_URL}/game/spin/status?userId=${TEST_USER}`).then((r) => r.json())
  assert.strictEqual(typeof spinStatus.canFreeSpin, 'boolean', 'canFreeSpin should be boolean')
  assert.strictEqual(spinStatus.maxReward, 500, 'Max reward should be 500')
  console.log('✅ 2. Fortune Spin status endpoint passed. Max reward:', spinStatus.maxReward)

  // 3. Test Fortune Spin Claim
  const spinClaim = await fetch(`${BASE_URL}/game/spin/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: TEST_USER }),
  }).then((r) => r.json())
  assert.strictEqual(spinClaim.success, true, 'Spin claim should succeed')
  assert.ok(spinClaim.wonAmount >= 10, 'Won amount should be at least 10')
  assert.ok(spinClaim.balance >= 1000, 'Balance should reflect win')
  console.log(`✅ 3. Fortune Spin claim passed. Won: ₹${spinClaim.wonAmount}, New Balance: ₹${spinClaim.balance}`)

  // 4. Test Vortex Game
  const vortexPlay = await fetch(`${BASE_URL}/game/vortex/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: TEST_USER, ring: 'INNER', amount: 50 }),
  }).then((r) => r.json())
  assert.strictEqual(vortexPlay.success, true, 'Vortex play should succeed')
  assert.ok(vortexPlay.multiplier !== undefined, 'Vortex multiplier should be returned')
  console.log(`✅ 4. Vortex play passed. Ring: ${vortexPlay.ring}, Multiplier: ${vortexPlay.multiplier}x, Won: ${vortexPlay.won}`)

  const vortexHistory = await fetch(`${BASE_URL}/game/vortex/history`).then((r) => r.json())
  assert.ok(Array.isArray(vortexHistory.history), 'Vortex history should be array')
  console.log(`✅ 5. Vortex history passed. Records: ${vortexHistory.history.length}`)

  // 5. Test Cricket Game
  const cricketPlay = await fetch(`${BASE_URL}/game/cricket/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: TEST_USER, prediction: 'FOUR', amount: 50 }),
  }).then((r) => r.json())
  assert.strictEqual(cricketPlay.success, true, 'Cricket play should succeed')
  assert.ok(cricketPlay.outcome !== undefined, 'Cricket outcome should be returned')
  console.log(`✅ 6. Cricket play passed. Predicted: ${cricketPlay.predicted}, Outcome: ${cricketPlay.outcome}, Won: ${cricketPlay.won}`)

  const cricketHistory = await fetch(`${BASE_URL}/game/cricket/history`).then((r) => r.json())
  assert.ok(Array.isArray(cricketHistory.history), 'Cricket history should be array')
  console.log(`✅ 7. Cricket history passed. Records: ${cricketHistory.history.length}`)

  // 6. Test PUBG 1Min Game
  const pubgPlay = await fetch(`${BASE_URL}/game/pubg/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: TEST_USER, zone: 'POCHINKI', amount: 50 }),
  }).then((r) => r.json())
  assert.strictEqual(pubgPlay.success, true, 'PUBG play should succeed')
  assert.ok(pubgPlay.safeZone !== undefined, 'Safe zone should be returned')
  console.log(`✅ 8. PUBG 1Min play passed. Chosen: ${pubgPlay.chosenZone}, Safe: ${pubgPlay.safeZone}, Loot: ${pubgPlay.loot}`)

  const pubgHistory = await fetch(`${BASE_URL}/game/pubg/history`).then((r) => r.json())
  assert.ok(Array.isArray(pubgHistory.history), 'PUBG history should be array')
  console.log(`✅ 9. PUBG history passed. Records: ${pubgHistory.history.length}`)

  console.log('--- ALL ARCADE TESTS PASSED SUCCESSFULLY (9/9) ---')
}

runArcadeTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
