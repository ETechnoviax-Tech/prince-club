import { Router } from 'express'
import { getPromotionStats } from '../controllers/promotionController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Agent Promotion statistics requires verified authentication
router.get('/stats', requireAuth, getPromotionStats)

export default router
