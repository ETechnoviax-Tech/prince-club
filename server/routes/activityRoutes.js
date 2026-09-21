import { Router } from 'express'
import {
  getActivityStats,
  redeemGiftCode,
  getRebateStats,
  claimOneClickRebate,
  getFirstGiftStatus,
  claimFirstGift,
  getAttendanceStats,
  claimAttendanceBonus,
} from '../controllers/activityController.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { idempotencyMiddleware } from '../middleware/idempotency.js'

const router = Router()

// Public or session-aware activity stats
router.get('/stats', optionalAuth, getActivityStats)

// Gift code redemption protected by authentication and idempotency
router.post('/redeem-gift', requireAuth, idempotencyMiddleware, redeemGiftCode)

// Real-time betting rebate routes
router.get('/rebate/stats', requireAuth, getRebateStats)
router.post('/rebate/claim', requireAuth, idempotencyMiddleware, claimOneClickRebate)

// First gift activity routes
router.get('/first-gift/status', optionalAuth, getFirstGiftStatus)
router.post('/first-gift/claim', requireAuth, idempotencyMiddleware, claimFirstGift)

// Daily attendance streak bonus routes
router.get('/attendance/stats', optionalAuth, getAttendanceStats)
router.post('/attendance/claim', requireAuth, idempotencyMiddleware, claimAttendanceBonus)

export default router


