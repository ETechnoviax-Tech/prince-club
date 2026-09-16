import { Router } from 'express'
import {
  adminVerifyWithdrawal,
  claimDailyVIPBonus,
  getTransactions,
  getUserWithdrawals,
  getWallet,
  requestWithdrawal,
  resetWallet,
} from '../controllers/walletController.js'
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.js'
import { withdrawalRateLimit } from '../middleware/rateLimit.js'
import { validateWithdrawalRequest } from '../middleware/validate.js'
import { idempotencyMiddleware } from '../middleware/idempotency.js'
import { paymentLockMiddleware } from '../middleware/paymentLock.js'

const router = Router()

// Wallet queries require verified user sessions with HMAC token
router.get('/:userId', requireAuth, getWallet)
router.get('/:userId/transactions', requireAuth, getTransactions)
router.post('/reset', requireAuth, resetWallet)

// Financial Payouts & Withdrawals protected with Mutex Lock and Idempotency
router.post(
  '/withdraw',
  optionalAuth,
  withdrawalRateLimit,
  paymentLockMiddleware,
  idempotencyMiddleware,
  validateWithdrawalRequest,
  requestWithdrawal
)
router.get('/withdrawals/:userId', optionalAuth, getUserWithdrawals)
router.post('/withdraw/verify', requireAdmin, adminVerifyWithdrawal)

// VIP Daily Bonus
router.post('/vip/claim', optionalAuth, claimDailyVIPBonus)

export default router
