import { Router } from 'express'
import {
  createDeposit,
  getDeposit,
  listUserDeposits,
  submitUTR,
  verifyDeposit,
} from '../controllers/paymentController.js'
import { handlePaymentWebhook } from '../controllers/webhookController.js'
import { initiateRefund, listRefunds, listPaymentEvents } from '../controllers/refundController.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { paymentRateLimit, webhookRateLimit } from '../middleware/rateLimit.js'
import { validateDepositRequest, validateUTRSubmission } from '../middleware/validate.js'
import { idempotencyMiddleware } from '../middleware/idempotency.js'
import { paymentLockMiddleware } from '../middleware/paymentLock.js'

const router = Router()

// 1. Webhook Ingestion Endpoint (Public signed endpoint with rate limiting)
router.post('/webhook', webhookRateLimit, handlePaymentWebhook)

// 2. Deposit creation requires authenticated session, rate limit, idempotency & user lock
router.post(
  '/create-deposit',
  requireAuth,
  paymentRateLimit,
  paymentLockMiddleware,
  idempotencyMiddleware,
  validateDepositRequest,
  createDeposit
)
router.post(
  '/deposit',
  requireAuth,
  paymentRateLimit,
  paymentLockMiddleware,
  idempotencyMiddleware,
  validateDepositRequest,
  createDeposit
)

// 3. UTR submission requires authenticated session, format validation & idempotency
router.post(
  '/submit-utr',
  requireAuth,
  paymentRateLimit,
  paymentLockMiddleware,
  idempotencyMiddleware,
  validateUTRSubmission,
  submitUTR
)
router.post(
  '/deposit/utr',
  requireAuth,
  paymentRateLimit,
  paymentLockMiddleware,
  idempotencyMiddleware,
  validateUTRSubmission,
  submitUTR
)

// 4. Admin Verification
router.post('/verify', requireAdmin, verifyDeposit)

// 5. Refund Operations
router.post('/refund', requireAdmin, idempotencyMiddleware, initiateRefund)
router.get('/refunds/:userId', requireAuth, listRefunds)

// 6. Payment Events Audit Trail
router.get('/events/:userId', requireAdmin, listPaymentEvents)

// 7. User deposit tracking
router.get('/deposit/:id', requireAuth, getDeposit)
router.get('/user/:userId', requireAuth, listUserDeposits)

export default router
