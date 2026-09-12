import { Router } from 'express'
import { getTransactions, getWallet, resetWallet } from '../controllers/walletController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Wallet queries require verified user sessions with HMAC token
router.get('/:userId', requireAuth, getWallet)
router.get('/:userId/transactions', requireAuth, getTransactions)
router.post('/reset', requireAuth, resetWallet)

export default router
