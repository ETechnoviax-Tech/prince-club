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

const router = Router()

// Win Go Round State
router.get('/round/current', optionalAuth, getCurrentRound)

// Live VeerGame Proxy Endpoints
router.get('/veer/issue', getVeerIssue)
router.get('/veer/history', getVeerHistory)

// Win Go Betting
router.post('/bet', optionalAuth, betRateLimit, validateBetPlacement, placeBet)
router.get('/bets/:userId', optionalAuth, getUserBets)

// Aviator Crash Game Endpoints
router.get('/aviator/state', getAviatorState)
router.get('/aviator/history', getAviatorHistory)
router.post('/aviator/bet', optionalAuth, betRateLimit, placeAviatorBet)
router.post('/aviator/cashout', optionalAuth, cashoutAviator)

export default router
