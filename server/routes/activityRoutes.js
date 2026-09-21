import { Router } from 'express'
import { getActivityStats, redeemGiftCode } from '../controllers/activityController.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { idempotencyMiddleware } from '../middleware/idempotency.js'

const router = Router()

// Public or session-aware activity stats
router.get('/stats', optionalAuth, getActivityStats)

// Gift code redemption protected by authentication and idempotency
router.post('/redeem-gift', requireAuth, idempotencyMiddleware, redeemGiftCode)

export default router
