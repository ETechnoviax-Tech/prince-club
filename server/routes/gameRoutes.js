import { Router } from 'express'
import { getCurrentRound, getUserBets, getVeerHistory, getVeerIssue, placeBet } from '../controllers/gameController.js'
import { getAviatorState, placeAviatorBet, cashOutAviatorBet } from '../controllers/aviatorController.js'
import { playCoinFlip, getCoinFlipHistory } from '../controllers/coinFlipController.js'
import { playAndarBahar, getAndarBaharHistory } from '../controllers/andarBaharController.js'
import { playVortex, getVortexHistory } from '../controllers/vortexController.js'
import { playCricket, getCricketHistory } from '../controllers/cricketController.js'
import { playPubg, getPubgHistory } from '../controllers/pubgController.js'
import { spinWheel, getSpinStatus } from '../controllers/spinWheelController.js'
import { optionalAuth } from '../middleware/auth.js'
import { betRateLimit } from '../middleware/rateLimit.js'
import { validateBetPlacement } from '../middleware/validate.js'

const router = Router()

// Public or session-aware round state (Win Go)
router.get('/round/current', optionalAuth, getCurrentRound)

// Live VeerGame Proxy Endpoints
router.get('/veer/issue', getVeerIssue)
router.get('/veer/history', getVeerHistory)

// Betting supports verified sessions with anti-spoofing or guest play
router.post('/bet', optionalAuth, betRateLimit, validateBetPlacement, placeBet)

// User bet history supports verified sessions with anti-spoofing or guest play
router.get('/bets/:userId', optionalAuth, getUserBets)

// Aviator Crash Game Endpoints
router.get('/aviator/state', optionalAuth, getAviatorState)
router.post('/aviator/bet', optionalAuth, betRateLimit, placeAviatorBet)
router.post('/aviator/cashout', optionalAuth, cashOutAviatorBet)

// Coin Flip Endpoints
router.post('/coinflip/play', optionalAuth, betRateLimit, playCoinFlip)
router.get('/coinflip/history', getCoinFlipHistory)

// Andar Bahar Endpoints
router.post('/andarbahar/play', optionalAuth, betRateLimit, playAndarBahar)
router.get('/andarbahar/history', getAndarBaharHistory)

// Vortex Endpoints
router.post('/vortex/play', optionalAuth, betRateLimit, playVortex)
router.get('/vortex/history', getVortexHistory)

// Cricket Endpoints
router.post('/cricket/play', optionalAuth, betRateLimit, playCricket)
router.get('/cricket/history', getCricketHistory)

// PUBG 1Min Endpoints
router.post('/pubg/play', optionalAuth, betRateLimit, playPubg)
router.get('/pubg/history', getPubgHistory)

// Fortune Spin Wheel ("Get ₹500") Endpoints
router.post('/spin/claim', optionalAuth, spinWheel)
router.get('/spin/status', optionalAuth, getSpinStatus)

export default router

