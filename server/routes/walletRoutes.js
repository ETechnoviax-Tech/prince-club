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
import { paymentRateLimit } from '../middleware/rateLimit.js'
import { validateWithdrawalRequest } from '../middleware/validate.js'

const router = Router()

// Wallet queries require verified user sessions with HMAC token
router.get('/:userId', requireAuth, getWallet)
router.get('/:userId/transactions', requireAuth, getTransactions)
router.post('/reset', requireAuth, resetWallet)

// Financial Payouts & Withdrawals
router.post('/withdraw', optionalAuth, paymentRateLimit, validateWithdrawalRequest, requestWithdrawal)
router.get('/withdrawals/:userId', optionalAuth, getUserWithdrawals)
router.post('/withdraw/verify', requireAdmin, adminVerifyWithdrawal)

// VIP Daily Bonus
router.post('/vip/claim', optionalAuth, claimDailyVIPBonus)

export default router
