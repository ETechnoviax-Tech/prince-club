import { Router } from 'express'
import { getCurrentRound, getUserBets, getVeerHistory, getVeerIssue, placeBet } from '../controllers/gameController.js'
import { optionalAuth } from '../middleware/auth.js'
import { betRateLimit } from '../middleware/rateLimit.js'
import { validateBetPlacement } from '../middleware/validate.js'

const router = Router()

// Public or session-aware round state
router.get('/round/current', optionalAuth, getCurrentRound)

// Live VeerGame Proxy Endpoints
router.get('/veer/issue', getVeerIssue)
router.get('/veer/history', getVeerHistory)

// Betting supports verified sessions with anti-spoofing or guest play
router.post('/bet', optionalAuth, betRateLimit, validateBetPlacement, placeBet)

// User bet history supports verified sessions with anti-spoofing or guest play
router.get('/bets/:userId', optionalAuth, getUserBets)

export default router
