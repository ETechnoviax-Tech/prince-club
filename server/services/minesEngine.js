import { secureRandomInt } from '../utils/secureRandom.js'

/**
 * Mines Game Authoritative Math Engine
 * 5x5 Grid (25 tiles), configurable 1-24 mines, 97.0% RTP multiplier formula
 */

// Active sessions: sessionId -> { userId, betAmount, minesCount, mineIndices: Set, revealedIndices: Set, isOver, multiplier }
const activeSessions = new Map()

// Combinations nCr
function combinations(n, r) {
  if (r < 0 || r > n) return 0
  if (r === 0 || r === n) return 1
  let c = 1
  for (let i = 1; i <= r; i++) {
    c = (c * (n - (i - 1))) / i
  }
  return c
}

/**
 * Calculate fair payout multiplier for k revealed gems with m total mines
 * RTP = 0.97 (House edge 3%)
 */
export function getMinesMultiplier(minesCount, gemsRevealed) {
  if (gemsRevealed <= 0) return 1.0
  const totalTiles = 25
  const totalGems = totalTiles - minesCount
  if (gemsRevealed > totalGems) return 0

  // Probability of picking k consecutive gems without hitting a mine
  // P = nCr(totalGems, k) / nCr(25, k)
  const prob = combinations(totalGems, gemsRevealed) / combinations(totalTiles, gemsRevealed)
  const rtp = 0.97
  const rawMult = (1 / prob) * rtp
  return Math.round(rawMult * 100) / 100
}

/**
 * Start a new Mines round
 */
export function startMinesSession(userId, betAmount = 10, minesCount = 3) {
  const mCount = Math.min(24, Math.max(1, Number(minesCount) || 3))
  const bet = Math.max(1, Number(betAmount) || 10)

  // Seed designated number of unique random mine positions between 0 and 24
  const mineIndices = new Set()
  while (mineIndices.size < mCount) {
    mineIndices.add(secureRandomInt(0, 25))
  }

  const sessionId = `mines_${userId}_${Date.now()}`
  const session = {
    sessionId,
    userId,
    betAmount: bet,
    minesCount: mCount,
    mineIndices,
    revealedIndices: new Set(),
    isOver: false,
    multiplier: 1.0,
    startTime: Date.now(),
  }

  activeSessions.set(sessionId, session)
  return {
    sessionId,
    minesCount: mCount,
    betAmount: bet,
    nextMultiplier: getMinesMultiplier(mCount, 1),
  }
}

/**
 * Reveal a tile
 */
export function revealMinesTile(sessionId, tileIndex) {
  const session = activeSessions.get(sessionId)
  if (!session) throw new Error('Active game session not found')
  if (session.isOver) throw new Error('Game session already ended')

  const idx = Number(tileIndex)
  if (idx < 0 || idx > 24) throw new Error('Invalid tile index (0-24)')
  if (session.revealedIndices.has(idx)) throw new Error('Tile already revealed')

  // Hit a mine!
  if (session.mineIndices.has(idx)) {
    session.isOver = true
    const allMines = Array.from(session.mineIndices)
    activeSessions.delete(sessionId)
    return {
      isHit: true,
      tileIndex: idx,
      type: 'MINE',
      isOver: true,
      finalPayout: 0,
      multiplier: 0,
      allMines,
    }
  }

  // Safe gem!
  session.revealedIndices.add(idx)
  const gemsCount = session.revealedIndices.size
  const currentMultiplier = getMinesMultiplier(session.minesCount, gemsCount)
  session.multiplier = currentMultiplier

  const totalGems = 25 - session.minesCount
  const isMaxClear = gemsCount >= totalGems

  if (isMaxClear) {
    session.isOver = true
  }

  const nextMultiplier = isMaxClear
    ? currentMultiplier
    : getMinesMultiplier(session.minesCount, gemsCount + 1)

  return {
    isHit: false,
    tileIndex: idx,
    type: 'GEM',
    gemsRevealed: gemsCount,
    currentMultiplier,
    nextMultiplier,
    currentPayout: Math.round(session.betAmount * currentMultiplier * 100) / 100,
    isOver: isMaxClear,
    allMines: isMaxClear ? Array.from(session.mineIndices) : null,
  }
}

/**
 * Cash out active session
 */
export function cashoutMinesSession(sessionId) {
  const session = activeSessions.get(sessionId)
  if (!session) throw new Error('Active game session not found')
  if (session.isOver) throw new Error('Game session already ended')
  if (session.revealedIndices.size === 0) throw new Error('Must reveal at least one gem before cashout')

  session.isOver = true
  const finalPayout = Math.round(session.betAmount * session.multiplier * 100) / 100
  const allMines = Array.from(session.mineIndices)

  activeSessions.delete(sessionId)

  return {
    sessionId,
    betAmount: session.betAmount,
    multiplier: session.multiplier,
    finalPayout,
    gemsRevealed: session.revealedIndices.size,
    allMines,
  }
}
