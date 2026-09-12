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
import { optionalAuth, requireAdmin } from '../middleware/auth.js'
import { paymentRateLimit } from '../middleware/rateLimit.js'
import { validateWithdrawalRequest } from '../middleware/validate.js'

const router = Router()

// Wallet queries support verified user sessions or fallback guest access
router.get('/:userId', optionalAuth, getWallet)
router.get('/:userId/transactions', optionalAuth, getTransactions)
router.post('/reset', optionalAuth, resetWallet)

// Financial Payouts & Withdrawals
router.post('/withdraw', optionalAuth, paymentRateLimit, validateWithdrawalRequest, requestWithdrawal)
router.get('/withdrawals/:userId', optionalAuth, getUserWithdrawals)
router.post('/withdraw/verify', requireAdmin, adminVerifyWithdrawal)

// VIP Daily Bonus
router.post('/vip/claim', optionalAuth, claimDailyVIPBonus)

export default router
