import { Router } from 'express'
import {
  adminResetPayoutMethod,
  adminVerifyWithdrawal,
  bindPayoutMethod,
  claimDailyVIPBonus,
  getTransactions,
  getUserPayoutMethods,
  getUserWithdrawals,
  getVIPStatus,
  getWallet,
  requestWithdrawal,
  resetWallet,
} from '../controllers/walletController.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { requireDualAdminAuth } from '../middleware/adminGuard.js'
import { withdrawalRateLimit } from '../middleware/rateLimit.js'
import { validateWithdrawalRequest } from '../middleware/validate.js'
import { idempotencyMiddleware } from '../middleware/idempotency.js'
import { paymentLockMiddleware } from '../middleware/paymentLock.js'

const router = Router()

// Bound Payout Methods (Bank Card, UPI ID, USDT) - Locked upon binding
router.get('/payout-methods/:userId', requireAuth, getUserPayoutMethods)
router.post('/payout-methods/bind', requireAuth, bindPayoutMethod)
router.post('/payout-methods/admin-reset', requireDualAdminAuth, adminResetPayoutMethod)

// Financial Payouts & Withdrawals protected with Mutex Lock, Idempotency & Strict Auth
router.post(
  '/withdraw',
  requireAuth,
  withdrawalRateLimit,
  idempotencyMiddleware,
  paymentLockMiddleware,
  validateWithdrawalRequest,
  requestWithdrawal
)
router.get('/withdrawals/:userId', requireAuth, getUserWithdrawals)
router.post('/withdraw/verify', requireDualAdminAuth, adminVerifyWithdrawal)

// VIP Daily Bonus & Real-Time Status
router.post('/vip/claim', requireAuth, claimDailyVIPBonus)
router.get('/vip/status/:userId', requireAuth, getVIPStatus)

// Wallet queries require verified user sessions with HMAC token
router.post('/reset', requireAuth, resetWallet)
router.get('/:userId/transactions', requireAuth, getTransactions)
router.get('/:userId', requireAuth, getWallet)

export default router


