import assert from 'assert'
import app from '../server/index.js'

async function runMultiGameTests() {
  console.log('--- Starting Multi-Game Modes & Big/Small Betting Tests ---')
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  try {
    // 1. Verify all 4 Game Modes
    const modes = ['PARITY', 'SAPRE', 'BCONE', 'EMERD']
    const expectedDurations = { PARITY: 30, SAPRE: 60, BCONE: 180, EMERD: 300 }
    const expectedLocks = { PARITY: 5, SAPRE: 10, BCONE: 30, EMERD: 45 }

    for (const m of modes) {
      const res = await fetch(`${baseUrl}/api/game/round/current?mode=${m}`)
      assert.strictEqual(res.status, 200, `Fetch mode ${m} should return 200`)
      const data = await res.json()
      assert.strictEqual(data.mode, m, `Expected mode ${m}`)
      assert.strictEqual(data.roundDurationSeconds, expectedDurations[m], `Expected duration ${expectedDurations[m]}s`)
      assert.strictEqual(data.lockDurationSeconds, expectedLocks[m], `Expected lock ${expectedLocks[m]}s`)
      assert.ok(Array.isArray(data.history), 'History should be an array')
      assert.ok(data.history.length > 0, 'History should contain records')
      assert.ok(['big', 'small'].includes(data.history[0].size), 'Outcome should specify big/small size')
      console.log(`✓ Mode ${m} verified: ${data.roundDurationSeconds}s cycle, ${data.lockDurationSeconds}s lock window`)
    }

    // 2. Setup user session with verified wallet
    const testUsername = 'mguser_' + Math.random().toString(36).substring(2, 7)
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: `${testUsername}@example.com`,
        password: 'password123',
      }),
    })
    const signupJson = await signupRes.json()
    assert.strictEqual(signupRes.status, 201, 'Signup failed')
    const testUserId = signupJson.user.id
    const token = signupJson.token

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }

    // 3. Test Big bet on PARITY
    console.log('2. Testing Big (2.0x) Bet Placement...')
    const bigBetRes = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: testUserId,
        selection: 'big',
        amount: 50,
        mode: 'PARITY',
      }),
    })

    const bigBetJson = await bigBetRes.json()
    if (bigBetRes.status === 201) {
      assert.strictEqual(bigBetJson.bet.selection, 'big')
      assert.strictEqual(bigBetJson.bet.multiplier, 2.0)
      assert.strictEqual(bigBetJson.bet.game_mode, 'PARITY')
      console.log('✓ Big (2.0x) bet successfully placed on PARITY')
    } else {
      assert.ok(bigBetJson.error.includes('locked'), 'Expected locked notice if round in lock window')
      console.log('✓ Big bet rejected appropriately (lock window active)')
    }

    // 4. Test Small bet on SAPRE
    console.log('3. Testing Small (2.0x) Bet Placement on SAPRE...')
    const smallBetRes = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: testUserId,
        selection: 'small',
        amount: 30,
        mode: 'SAPRE',
      }),
    })

    const smallBetJson = await smallBetRes.json()
    if (smallBetRes.status === 201) {
      assert.strictEqual(smallBetJson.bet.selection, 'small')
      assert.strictEqual(smallBetJson.bet.multiplier, 2.0)
      assert.strictEqual(smallBetJson.bet.game_mode, 'SAPRE')
      console.log('✓ Small (2.0x) bet successfully placed on SAPRE')
    } else {
      assert.ok(smallBetJson.error.includes('locked'))
      console.log('✓ Small bet lock window active')
    }

    // 5. Test Invalid Selection rejection
    console.log('4. Testing Invalid Selection Rejection...')
    const badSelRes = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: testUserId,
        selection: 'invalid_color',
        amount: 50,
      }),
    })
    assert.strictEqual(badSelRes.status, 400, 'Invalid selection must return 400')
    console.log('✓ Invalid bet selection rejected (400)')

    // 6. Test Invalid Game Mode rejection
    console.log('5. Testing Invalid Mode Rejection...')
    const badModeRes = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: testUserId,
        selection: 'green',
        amount: 50,
        mode: 'FAKE_MODE',
      }),
    })
    assert.strictEqual(badModeRes.status, 400, 'Invalid mode must return 400')
    console.log('✓ Invalid game mode rejected (400)')

    console.log('\n--- ALL MULTI-GAME MODE TESTS PASSED SUCCESSFULLY! ---')
  } finally {
    server.close()
  }
}

runMultiGameTests().catch((err) => {
  console.error('Multi-Game test failed:', err)
  process.exit(1)
})
