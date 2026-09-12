import assert from 'assert'
import app from '../server/index.js'
import { settleVeerRound } from '../server/controllers/gameController.js'

async function run() {
  console.log('--- Testing VeerGame Direct Bet & Settlement Integration ---')
  const server = app.listen(0)
  const port = server.address().port
  const base = `http://localhost:${port}/api`

  try {
    // 1. Create & login test user
    const username = 'veer_tester_' + Math.random().toString(36).substring(2, 6)
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    const loginData = await loginRes.json()
    const userId = loginData.user.id
    const token = loginData.token
    console.log(`✓ Test user created: ${userId}`)

    // 2. Fetch live VeerGame issue
    const issueRes = await fetch(`${base}/game/veer/issue?typeId=30`)
    const issueData = await issueRes.json()
    console.log(`✓ Live VeerGame issue: ${issueData.issueNumber}, remaining: ${issueData.secondsRemaining}s`)

    // 3. Place bet targeting specific VeerGame round
    const targetIssue = '9999999999999'
    const betRes = await fetch(`${base}/game/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        selection: 'green',
        amount: 50,
        issueNumber: targetIssue,
        typeId: 30,
      }),
    })
    assert.strictEqual(betRes.status, 201)
    const betData = await betRes.json()
    console.log(`✓ Bet placed successfully on Green for ₹50: ID ${betData.bet.id}`)

    // 4. Also place Big and Number 7 bets
    const betBigRes = await fetch(`${base}/game/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        selection: 'big',
        amount: 50,
        issueNumber: targetIssue,
        typeId: 30,
      }),
    })
    assert.strictEqual(betBigRes.status, 201)
    console.log(`✓ Bet placed successfully on Big for ₹50`)

    // 5. Trigger official VeerGame settlement for target issue with winning digit 7 (Green, Big)
    console.log(`Simulating official VeerGame draw result for ${targetIssue}: Digit 7 (Green, Big)...`)
    await settleVeerRound({
      issueNumber: targetIssue,
      digit: 7,
      color: 'green',
      rawColour: 'green',
      size: 'Big',
    })

    // 6. Inspect user bets
    const historyRes = await fetch(`${base}/game/bets/${userId}`)
    const historyData = await historyRes.json()
    const greenBet = historyData.bets.find((b) => b.selection === 'green' && b.round_number === targetIssue)
    const bigBet = historyData.bets.find((b) => b.selection === 'big' && b.round_number === targetIssue)

    assert(greenBet, 'Green bet should exist')
    assert.strictEqual(greenBet.status, 'WON')
    assert.strictEqual(greenBet.payout, 100)
    console.log(`✓ Green bet settled as WON with ₹${greenBet.payout} payout`)

    assert(bigBet, 'Big bet should exist')
    assert.strictEqual(bigBet.status, 'WON')
    assert.strictEqual(bigBet.payout, 100)
    console.log(`✓ Big bet settled as WON with ₹${bigBet.payout} payout`)

    console.log('--- ALL VEER INTEGRATION BET & SETTLEMENT TESTS PASSED! ---')
  } finally {
    server.close()
    process.exit(0)
  }
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
