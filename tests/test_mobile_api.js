import assert from 'assert'
import app from '../server/index.js'

async function verifyMobileEndpoints() {
  console.log('Testing Mobile First & Production Endpoints...')
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  try {
    // 1. Auth Login (create user and wallet)
    const resAuth = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'mobile_tester' }),
    })
    assert.strictEqual(resAuth.status, 200)
    const authData = await resAuth.json()
    const userId = authData.user.id
    console.log(`✓ User created for test: ${userId}`)

    // 2. Current Round Sync
    const resRound = await fetch(`${baseUrl}/api/game/round/current`)
    assert.strictEqual(resRound.status, 200)
    const roundData = await resRound.json()
    assert(roundData.roundNumber > 0)
    assert(roundData.secondsRemaining >= 0)
    console.log(`✓ Game round synced: #${roundData.roundNumber}, ${roundData.secondsRemaining}s remaining (isLocked: ${roundData.isLocked})`)

    // 3. Place Bet API (Respecting lock state)
    const resBet = await fetch(`${baseUrl}/api/game/bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, selection: 'green', amount: 50 }),
    })
    
    if (roundData.isLocked) {
      assert.strictEqual(resBet.status, 400, 'Locked round should reject bets')
      console.log('✓ Bet properly rejected during 8s lock window (Lock enforcement verified)')
    } else {
      assert.strictEqual(resBet.status, 201, 'Open round should accept bets')
      const betData = await resBet.json()
      assert.strictEqual(betData.bet.selection, 'green')
      assert.strictEqual(betData.bet.amount, 50)
      console.log('✓ Bet placed successfully during open round window')
    }

    console.log('\n✓ Mobile Endpoints Verified Successfully!')
  } finally {
    server.close()
  }
}

verifyMobileEndpoints().catch((err) => {
  console.error(err)
  process.exit(1)
})
