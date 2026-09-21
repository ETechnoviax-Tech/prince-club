import { Router } from 'express'
import {
  getAnnouncements,
  submitFeedback,
  getUserFeedback,
  updateProfileSettings,
  changeSecurityPassword,
  bindBackupEmail,
} from '../controllers/serviceCenterController.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { idempotencyMiddleware } from '../middleware/idempotency.js'

const router = Router()

// Announcements
router.get('/announcements', optionalAuth, getAnnouncements)

// Feedback tickets
router.post('/feedback', optionalAuth, idempotencyMiddleware, submitFeedback)
router.get('/feedback', optionalAuth, getUserFeedback)

// Profile & Security Settings
router.post('/settings/profile', requireAuth, updateProfileSettings)
router.post('/settings/password', requireAuth, changeSecurityPassword)
router.post('/settings/bind-email', requireAuth, bindBackupEmail)

export default router
