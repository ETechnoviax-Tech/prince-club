import { Router } from 'express'
import {
  createDeposit,
  getDeposit,
  listUserDeposits,
  submitUTR,
  verifyDeposit,
  getFirstDepositEligibility,
} from '../controllers/paymentController.js'
import {
  bindPayoutMethod,
  getUserPayoutMethods,
  adminResetPayoutMethod,
} from '../controllers/walletController.js'
import { handlePaymentWebhook } from '../controllers/webhookController.js'
import { initiateRefund, listRefunds, listPaymentEvents } from '../controllers/refundController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireDualAdminAuth } from '../middleware/adminGuard.js'
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
  idempotencyMiddleware,
  paymentLockMiddleware,
  validateDepositRequest,
  createDeposit
)
router.post(
  '/deposit',
  requireAuth,
  paymentRateLimit,
  idempotencyMiddleware,
  paymentLockMiddleware,
  validateDepositRequest,
  createDeposit
)

// 3. UTR submission requires authenticated session, format validation & idempotency
router.post(
  '/submit-utr',
  requireAuth,
  paymentRateLimit,
  idempotencyMiddleware,
  paymentLockMiddleware,
  validateUTRSubmission,
  submitUTR
)
router.post(
  '/deposit/utr',
  requireAuth,
  paymentRateLimit,
  idempotencyMiddleware,
  paymentLockMiddleware,
  validateUTRSubmission,
  submitUTR
)

// 4. Admin Verification
router.post('/verify', requireDualAdminAuth, verifyDeposit)

// 5. Refund Operations
router.post('/refund', requireDualAdminAuth, idempotencyMiddleware, initiateRefund)
router.get('/refunds/:userId', requireAuth, listRefunds)

// 6. Payment Events Audit Trail
router.get('/events/:userId', requireDualAdminAuth, listPaymentEvents)

// 7. User deposit tracking
router.get('/deposit/:id', requireAuth, getDeposit)
router.get('/user/:userId', requireAuth, listUserDeposits)
router.get('/first-deposit-eligibility/:userId', requireAuth, getFirstDepositEligibility)

// 8. Payout Methods Route Aliases (Under /api/payments)
router.get('/payout-methods/:userId', requireAuth, getUserPayoutMethods)
router.post('/payout-methods/bind', requireAuth, bindPayoutMethod)
router.post('/payout-methods/admin-reset', requireDualAdminAuth, adminResetPayoutMethod)

export default router
