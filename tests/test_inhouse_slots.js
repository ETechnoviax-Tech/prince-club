import {
  spinCrazy777,
  spinFortuneGems,
  spinSuperAce,
  executeInHouseSpin,
  CRAZY777_SYMBOLS,
  FORTUNE_GEMS_SYMBOLS,
  SUPER_ACE_SYMBOLS,
} from '../server/services/inHouseSlotEngine.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`✅ PASS: ${message}`)
}

console.log('🎰 Running Comprehensive In-House Slot Engine Verification...\n')

// 1. Verify Crazy 777
console.log('--- Testing Crazy 777 (3 Reels + 1 Bonus Reel) ---')
assert(Object.keys(CRAZY777_SYMBOLS).length >= 8, 'Crazy 777 has 8+ symbols defined')
const c777Result = spinCrazy777(50)
assert(c777Result.reels.length === 3, 'Crazy 777 returns 3 main reels')
assert(c777Result.bonusReel && c777Result.bonusReel.label, 'Crazy 777 returns 4th bonus reel')
assert(typeof c777Result.finalWin === 'number', 'Crazy 777 returns numeric finalWin')
console.log(`Crazy 777 sample spin: [${c777Result.reels.join(' | ')}] + Bonus [${c777Result.bonusReel.label}] -> Win: ₹${c777Result.finalWin} (${c777Result.winType})`)

// 2. Verify Fortune Gems
console.log('\n--- Testing Fortune Gems (3x3 Grid + Multiplier Wheel) ---')
assert(Object.keys(FORTUNE_GEMS_SYMBOLS).length >= 8, 'Fortune Gems has 8+ symbols')
const fgResult = spinFortuneGems(80)
assert(fgResult.grid.length === 3 && fgResult.grid[0].length === 3, 'Fortune Gems returns 3x3 grid')
assert(fgResult.multiplierWheel && fgResult.multiplierWheel.val >= 1, 'Fortune Gems returns multiplier wheel (>= 1X)')
assert(Array.isArray(fgResult.winningLines), 'Fortune Gems returns winningLines array')
console.log(`Fortune Gems sample spin: Mult [${fgResult.multiplierWheel.label}] -> Lines won: ${fgResult.winningLines.length}, Win: ₹${fgResult.finalWin}`)

// 3. Verify Super Ace
console.log('\n--- Testing Super Ace (5x4 Matrix + 243 Ways) ---')
assert(Object.keys(SUPER_ACE_SYMBOLS).length >= 7, 'Super Ace has 7+ card symbols')
const saResult = spinSuperAce(100)
assert(saResult.matrix.length === 4 && saResult.matrix[0].length === 5, 'Super Ace returns 5x4 matrix')
assert(typeof saResult.comboMultiplier === 'number', 'Super Ace returns combo multiplier')
console.log(`Super Ace sample spin: Hits: ${saResult.hitSymbols.length} symbols, Combo: ${saResult.comboMultiplier}X -> Win: ₹${saResult.finalWin}`)

// 4. Verify Dispatcher
console.log('\n--- Testing Unified Dispatcher ---')
const d1 = executeInHouseSpin('crazy777', 20)
const d2 = executeInHouseSpin('fortunegems', 20)
const d3 = executeInHouseSpin('superace', 20)
assert(d1.game === 'crazy777', 'Dispatcher resolves crazy777')
assert(d2.game === 'fortunegems', 'Dispatcher resolves fortunegems')
assert(d3.game === 'superace', 'Dispatcher resolves superace')

// 5. Statistical RTP & Math Stability Simulation (1,000 spins)
console.log('\n--- Testing 1,000 Automated Spins Math & Payout Stability ---')
let totalBet = 0
let totalWon = 0
let maxWin = 0
const SPINS = 1000

for (let i = 0; i < SPINS; i++) {
  const bet = 10
  totalBet += bet
  const res = spinCrazy777(bet)
  totalWon += res.finalWin
  if (res.finalWin > maxWin) maxWin = res.finalWin
}

const simulatedRTP = ((totalWon / totalBet) * 100).toFixed(2)
console.log(`Simulated ${SPINS} spins: Total Bet: ₹${totalBet}, Total Won: ₹${totalWon.toFixed(2)}, Max Single Win: ₹${maxWin.toFixed(2)}, Measured RTP: ${simulatedRTP}%`)
assert(Number(simulatedRTP) >= 60 && Number(simulatedRTP) <= 150, `Measured RTP ${simulatedRTP}% is within mathematical variance bounds`)

console.log('\n🎉 ALL IN-HOUSE SLOT ENGINE VERIFICATIONS PASSED!')
