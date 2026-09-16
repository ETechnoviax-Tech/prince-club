/**
 * In-House Slot Game Engine
 * Authoritative RNG math models, reel strips, paylines, and payout logic
 * for JILI flagship replicas: Crazy 777, Fortune Gems, and Super Ace.
 */

// ==========================================
// 1. CRAZY 777 (3 Standard Reels + 1 Bonus Reel)
// ==========================================
export const CRAZY777_SYMBOLS = {
  S777:  { id: 'S777',  name: 'Triple 7',  icon: '7️⃣7️⃣7️⃣', weight: 4,  payout3: 100 },
  S77:   { id: 'S77',   name: 'Double 7',  icon: '7️⃣7️⃣',   weight: 8,  payout3: 40 },
  S7:    { id: 'S7',    name: 'Single 7',  icon: '7️⃣',     weight: 14, payout3: 20 },
  BAR3:  { id: 'BAR3',  name: '3x BAR',    icon: '🎰',     weight: 16, payout3: 10 },
  BAR2:  { id: 'BAR2',  name: '2x BAR',    icon: '🍫',     weight: 20, payout3: 5 },
  BAR1:  { id: 'BAR1',  name: '1x BAR',    icon: '➖',     weight: 24, payout3: 2 },
  BELL:  { id: 'BELL',  name: 'Bell',      icon: '🔔',     weight: 30, payout3: 1.5 },
  CHERRY:{ id: 'CHERRY',name: 'Cherry',    icon: '🍒',     weight: 36, payout3: 1 },
}

export const CRAZY777_BONUS_REEL = [
  { type: 'MULT', val: 10,   label: '10X',    weight: 1 },
  { type: 'MULT', val: 5,    label: '5X',     weight: 4 },
  { type: 'MULT', val: 2,    label: '2X',     weight: 16 },
  { type: 'CASH', valMult: 5,label: '+5X',    weight: 3 },
  { type: 'CASH', valMult: 2,label: '+2X',    weight: 6 },
  { type: 'RESPIN',val: 1,   label: 'RESPIN', weight: 4 },
  { type: 'BLANK',val: 1,    label: '--',     weight: 120 },
]


// ==========================================
// 2. FORTUNE GEMS (3x3 Grid + 4th Multiplier Reel)
// ==========================================
export const FORTUNE_GEMS_SYMBOLS = {
  GARUDA: { id: 'GARUDA', name: 'Garuda Wild', icon: '🦅', weight: 3,  payout3: 25 },
  RUBY:   { id: 'RUBY',   name: 'Red Ruby',    icon: '💎', weight: 6,  payout3: 15 },
  SAPPHIRE:{id: 'SAPPHIRE',name:'Blue Gem',    icon: '🔷', weight: 10, payout3: 10 },
  EMERALD:{ id: 'EMERALD',name: 'Green Gem',   icon: '🟢', weight: 14, payout3: 8 },
  A:      { id: 'A',      name: 'Ace',         icon: '🅰️', weight: 22, payout3: 5 },
  K:      { id: 'K',      name: 'King',        icon: '👑', weight: 26, payout3: 3 },
  Q:      { id: 'Q',      name: 'Queen',       icon: '👸', weight: 30, payout3: 2 },
  J:      { id: 'J',      name: 'Jack',        icon: '🃏', weight: 35, payout3: 1.2 },
}

export const FORTUNE_GEMS_MULTIPLIER_REEL = [
  { val: 15, label: '15X', weight: 2 },
  { val: 10, label: '10X', weight: 4 },
  { val: 5,  label: '5X',  weight: 8 },
  { val: 3,  label: '3X',  weight: 16 },
  { val: 2,  label: '2X',  weight: 28 },
  { val: 1,  label: '1X',  weight: 42 },
]

// Fortune gems 8 standard paylines across 3x3:
// 3 horizontal, 3 vertical, 2 diagonals
export const FORTUNE_GEMS_PAYLINES = [
  [[0,0], [0,1], [0,2]], // Row 0
  [[1,0], [1,1], [1,2]], // Row 1 (Center)
  [[2,0], [2,1], [2,2]], // Row 2
  [[0,0], [1,0], [2,0]], // Col 0
  [[0,1], [1,1], [2,1]], // Col 1
  [[0,2], [1,2], [2,2]], // Col 2
  [[0,0], [1,1], [2,2]], // Main Diagonal
  [[0,2], [1,1], [2,0]], // Anti Diagonal
]

// ==========================================
// 3. SUPER ACE (5x4 Card Cascading Slot)
// ==========================================
export const SUPER_ACE_SYMBOLS = {
  WILD:     { id: 'WILD',     name: 'Golden Joker', icon: '🃏', weight: 4,  payout: [0, 0, 10, 25, 100] },
  ACE:      { id: 'ACE',      name: 'Ace of Spades',icon: '♠️', weight: 8,  payout: [0, 0, 5,  15, 50]  },
  KING:     { id: 'KING',     name: 'King of Hearts',icon:'♥️', weight: 12, payout: [0, 0, 3,  10, 30]  },
  QUEEN:    { id: 'QUEEN',    name: 'Queen of Clubs',icon:'♣️', weight: 16, payout: [0, 0, 2,  6,  20]  },
  JACK:     { id: 'JACK',     name: 'Jack Diamonds',icon: '♦️', weight: 20, payout: [0, 0, 1.5,4,  15]  },
  TEN:      { id: 'TEN',      name: 'Card 10',      icon: '🔟', weight: 25, payout: [0, 0, 1,  2.5, 8]   },
  NINE:     { id: 'NINE',     name: 'Card 9',       icon: '9️⃣', weight: 30, payout: [0, 0, 0.5,1.5, 5]   },
}

// Utility weighted random selection
function pickWeighted(items, weightKey = 'weight') {
  const total = items.reduce((acc, it) => acc + (it[weightKey] || 1), 0)
  let rand = Math.random() * total
  for (const item of items) {
    rand -= (item[weightKey] || 1)
    if (rand <= 0) return item
  }
  return items[items.length - 1]
}

/**
 * 1. Spin Crazy 777
 */
export function spinCrazy777(betAmount = 10) {
  const symbolList = Object.values(CRAZY777_SYMBOLS)
  
  // Pick 3 main reel symbols
  const r1 = pickWeighted(symbolList)
  const r2 = pickWeighted(symbolList)
  const r3 = pickWeighted(symbolList)

  // Pick 4th special reel
  const bonus = pickWeighted(CRAZY777_BONUS_REEL)

  const reels = [r1, r2, r3]
  let baseWin = 0
  let isWin = false
  let winType = 'NONE'

  // Win condition: 3 identical symbols
  if (r1.id === r2.id && r2.id === r3.id) {
    baseWin = betAmount * r1.payout3
    isWin = true
    winType = r1.name + ' TRIPLE'
  } 
  // Any 7s mixed combo
  else if (r1.id.startsWith('S7') && r2.id.startsWith('S7') && r3.id.startsWith('S7')) {
    baseWin = betAmount * 5
    isWin = true
    winType = 'ANY 7S MIXED'
  }
  // Any BARs mixed combo
  else if (r1.id.startsWith('BAR') && r2.id.startsWith('BAR') && r3.id.startsWith('BAR')) {
    baseWin = betAmount * 3
    isWin = true
    winType = 'ANY BARS MIXED'
  }
  // 2 Cherries anywhere
  else {
    const cherryCount = [r1, r2, r3].filter(r => r.id === 'CHERRY').length
    if (cherryCount === 2) {
      baseWin = betAmount * 0.8
      isWin = true
      winType = '2 CHERRIES'
    } else if (cherryCount === 1) {
      baseWin = betAmount * 0.3
      isWin = true
      winType = '1 CHERRY'
    }
  }

  // Apply 4th bonus reel
  let finalWin = baseWin
  let bonusApplied = bonus.label

  if (isWin && bonus.type === 'MULT') {
    finalWin = baseWin * bonus.val
  } else if (bonus.type === 'CASH') {
    finalWin += betAmount * (bonus.valMult || 2)
    isWin = true
  }

  return {
    game: 'crazy777',
    reels: [r1.icon, r2.icon, r3.icon],
    symbols: [r1.id, r2.id, r3.id],
    bonusReel: bonus,
    betAmount,
    baseWin: Math.round(baseWin * 100) / 100,
    finalWin: Math.round(finalWin * 100) / 100,
    multiplier: Math.round((finalWin / (betAmount || 1)) * 100) / 100,
    isWin,
    winType,
    isRespin: bonus.type === 'RESPIN',
  }
}

/**
 * 2. Spin Fortune Gems
 */
export function spinFortuneGems(betAmount = 10) {
  const symbolList = Object.values(FORTUNE_GEMS_SYMBOLS)

  // Generate 3x3 grid
  const grid = [
    [pickWeighted(symbolList), pickWeighted(symbolList), pickWeighted(symbolList)],
    [pickWeighted(symbolList), pickWeighted(symbolList), pickWeighted(symbolList)],
    [pickWeighted(symbolList), pickWeighted(symbolList), pickWeighted(symbolList)],
  ]

  // Pick 4th multiplier wheel
  const multItem = pickWeighted(FORTUNE_GEMS_MULTIPLIER_REEL)
  const multiplier = multItem.val

  // Evaluate 8 paylines
  let totalLinePayout = 0
  const winningLines = []

  FORTUNE_GEMS_PAYLINES.forEach((line, idx) => {
    const s1 = grid[line[0][0]][line[0][1]]
    const s2 = grid[line[1][0]][line[1][1]]
    const s3 = grid[line[2][0]][line[2][1]]

    // Check with Garuda Wild substitution
    const nonWild = [s1, s2, s3].find(s => s.id !== 'GARUDA') || s1

    const match = [s1, s2, s3].every(s => s.id === nonWild.id || s.id === 'GARUDA')
    if (match) {
      const lineWin = (betAmount / 8) * nonWild.payout3
      totalLinePayout += lineWin
      winningLines.push({
        lineIndex: idx,
        coords: line,
        symbol: nonWild.name,
        icon: nonWild.icon,
        payout: Math.round(lineWin * 100) / 100,
      })
    }
  })

  const finalWin = Math.round(totalLinePayout * multiplier * 100) / 100

  return {
    game: 'fortunegems',
    grid: grid.map(row => row.map(s => s.icon)),
    gridIds: grid.map(row => row.map(s => s.id)),
    multiplierWheel: multItem,
    winningLines,
    betAmount,
    baseWin: Math.round(totalLinePayout * 100) / 100,
    finalWin,
    multiplier: Math.round((finalWin / (betAmount || 1)) * 100) / 100,
    isWin: finalWin > 0,
  }
}

/**
 * 3. Spin Super Ace
 */
export function spinSuperAce(betAmount = 10) {
  const symbolList = Object.values(SUPER_ACE_SYMBOLS)

  // Generate 5x4 matrix
  const matrix = Array.from({ length: 4 }, () =>
    Array.from({ length: 5 }, () => pickWeighted(symbolList))
  )

  // Count symbols appearing on consecutive reels left to right (243 Ways to Win)
  let totalWaysPayout = 0
  const hitSymbols = []

  symbolList.forEach(sym => {
    // Count occurrences per column
    const colCounts = []
    for (let c = 0; c < 5; c++) {
      let count = 0
      for (let r = 0; r < 4; r++) {
        if (matrix[r][c].id === sym.id || matrix[r][c].id === 'WILD') {
          count++
        }
      }
      colCounts.push(count)
    }

    // Must hit at least reels 1, 2, 3 consecutively
    let consecutiveReels = 0
    let ways = 1
    for (const count of colCounts) {
      if (count > 0) {
        consecutiveReels++
        ways *= count
      } else {
        break
      }
    }

    if (consecutiveReels >= 3) {
      const mult = sym.payout[consecutiveReels - 1] || 1
      const win = (betAmount / 20) * mult * ways
      totalWaysPayout += win
      hitSymbols.push({
        symbol: sym.name,
        icon: sym.icon,
        consecutiveReels,
        ways,
        win: Math.round(win * 100) / 100,
      })
    }
  })

  // Combo multiplier (simulate cascade combo x1 -> x2)
  const comboMult = hitSymbols.length >= 3 ? 3 : hitSymbols.length >= 2 ? 2 : 1
  const finalWin = Math.round(totalWaysPayout * comboMult * 100) / 100

  return {
    game: 'superace',
    matrix: matrix.map(row => row.map(s => s.icon)),
    matrixIds: matrix.map(row => row.map(s => s.id)),
    hitSymbols,
    comboMultiplier: comboMult,
    betAmount,
    baseWin: Math.round(totalWaysPayout * 100) / 100,
    finalWin,
    multiplier: Math.round((finalWin / (betAmount || 1)) * 100) / 100,
    isWin: finalWin > 0,
  }
}

/**
 * Unified Spin Dispatcher
 */
export function executeInHouseSpin(gameId = 'crazy777', betAmount = 10) {
  const norm = String(gameId).toLowerCase()
  if (norm.includes('crazy') || norm.includes('777')) {
    return spinCrazy777(betAmount)
  }
  if (norm.includes('gem') || norm.includes('fortune')) {
    return spinFortuneGems(betAmount)
  }
  if (norm.includes('ace') || norm.includes('super')) {
    return spinSuperAce(betAmount)
  }
  // Default to Crazy 777
  return spinCrazy777(betAmount)
}
