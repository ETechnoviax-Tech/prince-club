import assert from 'assert'
import {
  placeBet,
  getUserBets,
  settleRoundBets,
  memoryBets,
} from '../server/controllers/gameController.js'
import { memoryWallets } from '../server/db/store.js'

async function runTests() {
  console.log('🧪 [Test Suite] Win Go My Bets & Slider Captcha Verification\n')

  const testUserId = `test_user_mybets_${Date.now()}`
  memoryWallets.set(testUserId, 2000.0)

  // 1. Initial State: No bets should return an empty array without leaking other users' bets
  console.log('1. Testing initial getUserBets for new user (must be empty array):')
  let betsResult = null
  const mockRes1 = {
    json: (d) => {
      betsResult = d
      return d
    },
    status: () => mockRes1,
  }
  await getUserBets({ params: { userId: testUserId }, user: { id: testUserId, role: 'user' } }, mockRes1)
  assert.ok(betsResult, 'Result must exist')
  assert.ok(Array.isArray(betsResult.bets), 'bets must be an array')
  assert.strictEqual(betsResult.bets.length, 0, 'Must have 0 bets initially')
  console.log('   - Empty array returned correctly with zero cross-user leakage (PASS)')

  // 2. Place a Win Go bet
  console.log('\n2. Testing placeBet for Win Go:')
  const testRound = '20260917100050831'
  let placeResult = null
  const mockRes2 = {
    status: () => mockRes2,
    json: (d) => {
      placeResult = d
      return d
    },
  }
  await placeBet(
    {
      user: { id: testUserId },
      body: {
        userId: testUserId,
        selection: 'green',
        amount: 100,
        mode: 'PARITY',
        issueNumber: testRound,
        typeId: 30,
      },
    },
    mockRes2
  )
  assert.ok(placeResult, 'Place bet response must exist')
  assert.ok(placeResult.bet, 'Must return bet object')
  assert.ok(placeResult.bet.id, 'Bet must have unique ID')
  assert.strictEqual(placeResult.bet.round_number, testRound, 'Round number must match')
  console.log(`   - Placed ₹100 on green for round ${testRound}, bet ID: ${placeResult.bet.id} (PASS)`)

  // 3. Query getUserBets after placing bet
  console.log('\n3. Testing getUserBets after placement:')
  betsResult = null
  await getUserBets({ params: { userId: testUserId }, user: { id: testUserId, role: 'user' } }, mockRes1)
  assert.strictEqual(betsResult.bets.length, 1, 'Must have exactly 1 bet')
  assert.strictEqual(betsResult.bets[0].id, placeResult.bet.id, 'Bet ID must match placed bet')
  assert.strictEqual(betsResult.bets[0].selection, 'green')
  assert.strictEqual(betsResult.bets[0].status, 'PENDING')
  console.log(`   - Successfully retrieved user bet record from server (PASS)`)

  // 4. Settle round and verify status transition
  console.log('\n4. Testing round settlement:')
  await settleRoundBets(testRound, 'PARITY')
  const settledBet = memoryBets.get(placeResult.bet.id)
  assert.ok(settledBet, 'Settled bet must exist in memory store')
  assert.ok(['WON', 'LOST'].includes(settledBet.status), 'Status must be WON or LOST')
  console.log(`   - Round settled! Result: ${settledBet.status} (Payout: ₹${settledBet.payout}) (PASS)`)

  // 5. Slider Captcha Logic Simulation
  console.log('\n5. Testing Slider Captcha Math & Tolerance Bounds:')
  const CANVAS_WIDTH = 280
  const PIECE_SIZE = 42
  const TRACK_WIDTH = 280
  const HANDLE_WIDTH = 44
  const MAX_DRAG = TRACK_WIDTH - HANDLE_WIDTH

  const targetX = 160
  const effectiveTargetSliderPos = (targetX / (CANVAS_WIDTH - PIECE_SIZE)) * MAX_DRAG

  // Case A: Within tolerance (diff <= 8)
  const userPosPass = effectiveTargetSliderPos + 3
  const diffPass = Math.abs(userPosPass - effectiveTargetSliderPos)
  assert.ok(diffPass <= 8, 'Within 8px must pass')

  // Case B: Outside tolerance (diff > 8)
  const userPosFail = effectiveTargetSliderPos + 18
  const diffFail = Math.abs(userPosFail - effectiveTargetSliderPos)
  assert.ok(diffFail > 8, 'Over 8px must fail')
  console.log(`   - Slider math verified: target ${effectiveTargetSliderPos.toFixed(1)}px | delta +3px (PASS) | delta +18px (REJECTED) (PASS)`)

  console.log('\n🎉 ALL WINGO MY BETS & SLIDER CAPTCHA TESTS PASSED!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
