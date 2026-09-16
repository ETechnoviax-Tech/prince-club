/**
 * Dragon vs Tiger Authoritative Game Engine
 * 8-Deck standard shoe, 10s betting loop, High-Card comparison, and Roadmaps
 */

const SUITS = ['♠', '♥', '♣', '♦']
const RANKS = [
  { val: 1, name: 'A' },
  { val: 2, name: '2' },
  { val: 3, name: '3' },
  { val: 4, name: '4' },
  { val: 5, name: '5' },
  { val: 6, name: '6' },
  { val: 7, name: '7' },
  { val: 8, name: '8' },
  { val: 9, name: '9' },
  { val: 10, name: '10' },
  { val: 11, name: 'J' },
  { val: 12, name: 'Q' },
  { val: 13, name: 'K' },
]

// Generate 8-Deck Shoe (416 cards)
function createShoe() {
  const shoe = []
  for (let d = 0; d < 8; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({
          suit,
          rank: rank.val,
          name: rank.name,
          color: suit === '♥' || suit === '♦' ? 'red' : 'black',
        })
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shoe[i], shoe[j]] = [shoe[j], shoe[i]]
  }
  return shoe
}

let currentShoe = createShoe()
let roundNumber = 1001
let roundTimeLeft = 10
let roundStatus = 'BETTING' // 'BETTING' | 'SHOWDOWN'
let lastRoundResult = null

// Initial seed history (Bead Plate)
const recentHistory = [
  { round: 991, winner: 'DRAGON', dragonCard: { rank: 11, name: 'J', suit: '♠' }, tigerCard: { rank: 4, name: '4', suit: '♦' } },
  { round: 992, winner: 'TIGER', dragonCard: { rank: 3, name: '3', suit: '♥' }, tigerCard: { rank: 13, name: 'K', suit: '♣' } },
  { round: 993, winner: 'DRAGON', dragonCard: { rank: 9, name: '9', suit: '♦' }, tigerCard: { rank: 7, name: '7', suit: '♠' } },
  { round: 994, winner: 'TIE', dragonCard: { rank: 8, name: '8', suit: '♣' }, tigerCard: { rank: 8, name: '8', suit: '♥' } },
  { round: 995, winner: 'TIGER', dragonCard: { rank: 2, name: '2', suit: '♠' }, tigerCard: { rank: 10, name: '10', suit: '♦' } },
  { round: 996, winner: 'DRAGON', dragonCard: { rank: 12, name: 'Q', suit: '♥' }, tigerCard: { rank: 6, name: '6', suit: '♣' } },
  { round: 997, winner: 'DRAGON', dragonCard: { rank: 10, name: '10', suit: '♠' }, tigerCard: { rank: 5, name: '5', suit: '♦' } },
  { round: 998, winner: 'TIGER', dragonCard: { rank: 4, name: '4', suit: '♣' }, tigerCard: { rank: 9, name: '9', suit: '♥' } },
  { round: 999, winner: 'TIGER', dragonCard: { rank: 7, name: '7', suit: '♦' }, tigerCard: { rank: 11, name: 'J', suit: '♠' } },
  { round: 1000, winner: 'DRAGON', dragonCard: { rank: 13, name: 'K', suit: '♠' }, tigerCard: { rank: 1, name: 'A', suit: '♦' } },
]

// Current active round bets: userId -> [{ market: 'DRAGON'|'TIGER'|'TIE', amount }]
const currentRoundBets = new Map()

// Background 10-second Game Loop
const loopTimer = setInterval(() => {
  roundTimeLeft--

  if (roundTimeLeft <= 0) {
    if (roundStatus === 'BETTING') {
      // Transition to SHOWDOWN: Deal cards
      roundStatus = 'SHOWDOWN'
      roundTimeLeft = 4

      // Reshuffle shoe if low
      if (currentShoe.length < 20) currentShoe = createShoe()

      const dragonCard = currentShoe.pop()
      const tigerCard = currentShoe.pop()

      let winner = 'TIE'
      let multiplier = 8
      if (dragonCard.rank > tigerCard.rank) {
        winner = 'DRAGON'
        multiplier = 2.0
      } else if (tigerCard.rank > dragonCard.rank) {
        winner = 'TIGER'
        multiplier = 2.0
      } else if (dragonCard.suit === tigerCard.suit) {
        winner = 'SUITED_TIE'
        multiplier = 50.0
      }

      lastRoundResult = {
        round: roundNumber,
        winner,
        multiplier,
        dragonCard,
        tigerCard,
        timestamp: Date.now(),
      }

      recentHistory.unshift(lastRoundResult)
      if (recentHistory.length > 30) recentHistory.pop()

      // Increment round
      roundNumber++
    } else {
      // Transition back to BETTING
      roundStatus = 'BETTING'
      roundTimeLeft = 10
      currentRoundBets.clear()
    }
  }
}, 1000)

if (loopTimer && typeof loopTimer.unref === 'function') {
  loopTimer.unref()
}


/**
 * Get current table state
 */
export function getDragonTigerState() {
  return {
    roundNumber,
    roundTimeLeft,
    roundStatus,
    lastRoundResult,
    recentHistory: recentHistory.slice(0, 20),
    shoeCardsRemaining: currentShoe.length,
  }
}

/**
 * Deal instant round for single-player simulation or fast play
 */
export function dealInstantRound(market = 'DRAGON', betAmount = 10) {
  const bet = Math.max(1, Number(betAmount) || 10)
  const selMarket = String(market).toUpperCase()

  if (currentShoe.length < 20) currentShoe = createShoe()
  const dragonCard = currentShoe.pop()
  const tigerCard = currentShoe.pop()

  let winner = 'TIE'
  if (dragonCard.rank > tigerCard.rank) {
    winner = 'DRAGON'
  } else if (tigerCard.rank > dragonCard.rank) {
    winner = 'TIGER'
  } else if (dragonCard.suit === tigerCard.suit) {
    winner = 'SUITED_TIE'
  }

  let isWin = false
  let payout = 0
  let multiplier = 0

  if (selMarket === winner) {
    isWin = true
    multiplier = winner === 'SUITED_TIE' ? 50 : winner === 'TIE' ? 8 : 2.0
    payout = Math.round(bet * multiplier * 100) / 100
  }

  const result = {
    round: roundNumber++,
    dragonCard,
    tigerCard,
    winner,
    market: selMarket,
    betAmount: bet,
    isWin,
    multiplier,
    payout,
  }

  recentHistory.unshift({
    round: result.round,
    winner: result.winner,
    dragonCard: result.dragonCard,
    tigerCard: result.tigerCard,
  })
  if (recentHistory.length > 30) recentHistory.pop()

  return result
}
