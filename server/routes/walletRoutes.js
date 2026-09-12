import { Router } from 'express'
import { getTransactions, getWallet, resetWallet } from '../controllers/walletController.js'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()

// Wallet queries support verified user sessions or fallback guest access
router.get('/:userId', optionalAuth, getWallet)
router.get('/:userId/transactions', optionalAuth, getTransactions)
router.post('/reset', optionalAuth, resetWallet)

export default router
