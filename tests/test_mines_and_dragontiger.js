import {
  startMinesSession,
  revealMinesTile,
  cashoutMinesSession,
  getMinesMultiplier,
} from '../server/services/minesEngine.js'

import {
  dealInstantRound,
  getDragonTigerState,
} from '../server/services/dragonTigerEngine.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`✅ PASS: ${message}`)
}

console.log('🎮 Testing In-House Mines & Dragon vs Tiger Engines...\n')

// 1. MINES ENGINE TESTS
console.log('--- Testing Mines Math & Session Engine ---')
const mult1 = getMinesMultiplier(3, 1)
const mult2 = getMinesMultiplier(3, 2)
const mult3 = getMinesMultiplier(3, 3)
assert(mult1 > 1.0, `1 gem multiplier (${mult1}x) > 1.0`)
assert(mult2 > mult1, `2 gems (${mult2}x) > 1 gem (${mult1}x)`)
assert(mult3 > mult2, `3 gems (${mult3}x) > 2 gems (${mult2}x)`)

const session = startMinesSession('test_user', 50, 5)
assert(session.sessionId && session.sessionId.startsWith('mines_'), 'Valid sessionId created')
assert(session.minesCount === 5, 'Mines count set to 5')
assert(session.nextMultiplier > 1.0, 'Next multiplier calculated')

// Reveal a tile until either gem or mine
let firstReveal = null
for (let i = 0; i < 25; i++) {
  try {
    firstReveal = revealMinesTile(session.sessionId, i)
    break
  } catch {}
}
assert(firstReveal !== null, 'Successfully revealed a tile')
assert(firstReveal.type === 'GEM' || firstReveal.type === 'MINE', 'Tile reveals either GEM or MINE')
console.log(`First tile reveal result: ${firstReveal.type}`)

// 2. DRAGON VS TIGER TESTS
console.log('\n--- Testing Dragon vs Tiger Table Engine ---')
const tableState = getDragonTigerState()
assert(typeof tableState.roundNumber === 'number', 'Table has numeric roundNumber')
assert(Array.isArray(tableState.recentHistory), 'Table has recent history array')
assert(tableState.shoeCardsRemaining > 100, `Shoe has cards (${tableState.shoeCardsRemaining})`)

const dtBet = dealInstantRound('DRAGON', 100)
assert(dtBet.round && dtBet.dragonCard && dtBet.tigerCard, 'Deals both Dragon and Tiger cards')
assert(['DRAGON', 'TIGER', 'TIE', 'SUITED_TIE'].includes(dtBet.winner), `Valid winner: ${dtBet.winner}`)
console.log(`Dragon [${dtBet.dragonCard.name}${dtBet.dragonCard.suit}] vs Tiger [${dtBet.tigerCard.name}${dtBet.tigerCard.suit}] -> Winner: ${dtBet.winner} (Payout: ₹${dtBet.payout})`)

console.log('\n🎉 ALL MINES & DRAGON VS TIGER TESTS PASSED!')
