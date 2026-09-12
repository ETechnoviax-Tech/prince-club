import assert from 'assert'
import app from '../server/index.js'
import { settleRoundBets } from '../server/controllers/gameController.js'

async function runRealtimeGameTests() {
  console.log('--- Starting Real-Time Game & Production Settlement Tests ---')
  const server = app.listen(0)
  const port = server.address().port
  const baseUrl = `http://localhost:${port}`

  try {
    // 1. Authenticate user
    const username = 'realtime_trader_' + Math.random().toString(36).substring(2, 6)
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    const loginData = await loginRes.json()
    const userId = loginData.user.id
    const token = loginData.token
    console.log(`✓ User logged in: ${userId}`)

    // 2. Fetch current round
    const roundRes = await fetch(`${baseUrl}/api/game/round/current`)
    const roundData = await roundRes.json()
    assert.strictEqual(roundRes.status, 200)
    assert(roundData.roundNumber > 0)
    console.log(`✓ Authoritative round synced: #${roundData.roundNumber}, ${roundData.secondsRemaining}s remaining`)

    // 3. If round is locked, wait or test lock rejection
    if (roundData.isLocked) {
      console.log('Round currently in 8s lock window. Testing lock enforcement...')
      const betRes = await fetch(`${baseUrl}/api/game/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, selection: 'green', amount: 100 }),
      })
      assert.strictEqual(betRes.status, 400)
      console.log('✓ Bet properly rejected during lock phase')
    } else {
      // 4. Place bet during open window
      console.log('Placing bet on Green for ₹100...')
      const betRes = await fetch(`${baseUrl}/api/game/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, selection: 'green', amount: 100 }),
      })
      const betData = await betRes.json()
      assert.strictEqual(betRes.status, 201)
      assert.strictEqual(betData.bet.selection, 'green')
      console.log(`✓ Bet placed successfully: ID ${betData.bet.id}`)

      // 5. Test Authoritative Settle of that round
      console.log(`Executing authoritative settlement for round #${roundData.roundNumber}...`)
      await settleRoundBets(roundData.roundNumber)

      // 6. Query user bets from API
      const userBetsRes = await fetch(`${baseUrl}/api/game/bets/${userId}`)
      const userBetsData = await userBetsRes.json()
      assert.strictEqual(userBetsRes.status, 200)
      const foundBet = userBetsData.bets.find((b) => b.id === betData.bet.id)
      assert(foundBet, 'Placed bet should exist in user bets')
      assert(['WON', 'LOST'].includes(foundBet.status), `Bet should be settled: status=${foundBet.status}`)
      console.log(`✓ Bet authoritatively settled! Status: ${foundBet.status}, Payout: ₹${foundBet.payout}`)
    }

    console.log('\n--- REAL-TIME GAME ENGINE VERIFIED SUCCESSFULLY! ---')
  } finally {
    server.close()
    process.exit(0)
  }
}

runRealtimeGameTests().catch((err) => {
  console.error('Realtime Test Failed:', err)
  process.exit(1)
})
