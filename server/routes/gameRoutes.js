import { Router } from 'express'
import {
  cancelAviatorBet,
  cashoutAviator,
  getAviatorHistory,
  getAviatorState,
  placeAviatorBet,
} from '../controllers/aviatorController.js'
import { getCurrentRound, getUserBets, getVeerHistory, getVeerIssue, placeBet } from '../controllers/gameController.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { betRateLimit } from '../middleware/rateLimit.js'
import { validateBetPlacement } from '../middleware/validate.js'

import {
  getGameCatalog,
  getProviders,
  launchGame,
  playGameRound,
} from '../controllers/thirdPartyGameController.js'

import {
  handleSlotSpin,
  getSlotConfig,
} from '../controllers/inHouseSlotController.js'

import {
  handleStartMines,
  handleRevealTile,
  handleCashoutMines,
} from '../controllers/minesController.js'

import {
  getDragonTigerStatus,
  placeDragonTigerBet,
} from '../controllers/dragonTigerController.js'

const router = Router()

// In-House Native Slot Engine (Crazy 777, Fortune Gems, Super Ace)
router.post('/slot/spin', requireAuth, betRateLimit, handleSlotSpin)
router.get('/slot/config/:gameId', getSlotConfig)

// In-House Mines Game (5x5 Grid)
router.post('/mines/start', requireAuth, betRateLimit, handleStartMines)
router.post('/mines/reveal', requireAuth, handleRevealTile)
router.post('/mines/cashout', requireAuth, handleCashoutMines)

// In-House Dragon vs Tiger (10s Live Duel)
router.get('/dragontiger/state', getDragonTigerStatus)
router.post('/dragontiger/bet', requireAuth, betRateLimit, placeDragonTigerBet)


// Win Go Round State (Public read)
router.get('/round/current', optionalAuth, getCurrentRound)

// Live VeerGame Proxy Endpoints (Public read)
router.get('/veer/issue', getVeerIssue)
router.get('/veer/history', getVeerHistory)

// Third-Party Game Providers (JILI, EVO, PG, SPRIBE, JDB, CQ9)
router.get('/providers', getProviders)
router.get('/third-party/catalog', getGameCatalog)
router.get('/third-party/launch', requireAuth, launchGame)
router.post('/third-party/play', requireAuth, betRateLimit, playGameRound)

// Win Go Betting
router.post('/bet', requireAuth, betRateLimit, validateBetPlacement, placeBet)
router.get('/bets/:userId', requireAuth, getUserBets)

// Aviator Crash Game Endpoints
router.get('/aviator/state', optionalAuth, getAviatorState)
router.get('/aviator/history', getAviatorHistory)
router.post('/aviator/bet', requireAuth, betRateLimit, placeAviatorBet)
router.post('/aviator/cashout', requireAuth, cashoutAviator)
router.post('/aviator/cancel', requireAuth, cancelAviatorBet)

export default router
