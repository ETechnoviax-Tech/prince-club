import { Router } from 'express'
import {
  createDeposit,
  getDeposit,
  listUserDeposits,
  submitUTR,
  verifyDeposit,
} from '../controllers/paymentController.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { paymentRateLimit } from '../middleware/rateLimit.js'
import { validateDepositRequest, validateUTRSubmission } from '../middleware/validate.js'

const router = Router()

// Deposit creation requires authenticated session and strict validation
router.post('/create-deposit', requireAuth, paymentRateLimit, validateDepositRequest, createDeposit)
router.post('/deposit', requireAuth, paymentRateLimit, validateDepositRequest, createDeposit)

// UTR submission requires authenticated session and format validation
router.post('/submit-utr', requireAuth, paymentRateLimit, validateUTRSubmission, submitUTR)
router.post('/deposit/utr', requireAuth, paymentRateLimit, validateUTRSubmission, submitUTR)

// Verification strictly requires admin credentials - cannot be bypassed by normal users
router.post('/verify', requireAdmin, verifyDeposit)

// User deposit tracking requires authentication
router.get('/deposit/:id', requireAuth, getDeposit)
router.get('/user/:userId', requireAuth, listUserDeposits)

export default router
