import { Router } from 'express'
import {
  cashoutAviator,
  getAviatorHistory,
  getAviatorState,
  placeAviatorBet,
} from '../controllers/aviatorController.js'
import { getCurrentRound, getUserBets, getVeerHistory, getVeerIssue, placeBet } from '../controllers/gameController.js'
import { optionalAuth } from '../middleware/auth.js'
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
router.post('/slot/spin', optionalAuth, betRateLimit, handleSlotSpin)
router.get('/slot/config/:gameId', getSlotConfig)

// In-House Mines Game (5x5 Grid)
router.post('/mines/start', optionalAuth, betRateLimit, handleStartMines)
router.post('/mines/reveal', optionalAuth, handleRevealTile)
router.post('/mines/cashout', optionalAuth, handleCashoutMines)

// In-House Dragon vs Tiger (10s Live Duel)
router.get('/dragontiger/state', getDragonTigerStatus)
router.post('/dragontiger/bet', optionalAuth, betRateLimit, placeDragonTigerBet)


// Win Go Round State
router.get('/round/current', optionalAuth, getCurrentRound)

// Live VeerGame Proxy Endpoints
router.get('/veer/issue', getVeerIssue)
router.get('/veer/history', getVeerHistory)

// Third-Party Game Providers (JILI, EVO, PG, SPRIBE, JDB, CQ9)
router.get('/providers', getProviders)
router.get('/third-party/catalog', getGameCatalog)
router.get('/third-party/launch', optionalAuth, launchGame)
router.post('/third-party/play', optionalAuth, betRateLimit, playGameRound)

// Win Go Betting
router.post('/bet', optionalAuth, betRateLimit, validateBetPlacement, placeBet)
router.get('/bets/:userId', optionalAuth, getUserBets)

// Aviator Crash Game Endpoints
router.get('/aviator/state', getAviatorState)
router.get('/aviator/history', getAviatorHistory)
router.post('/aviator/bet', optionalAuth, betRateLimit, placeAviatorBet)
router.post('/aviator/cashout', optionalAuth, cashoutAviator)

export default router
