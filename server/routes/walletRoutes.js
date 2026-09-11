import { Router } from 'express'
import { getTransactions, getWallet, resetWallet } from '../controllers/walletController.js'

const router = Router()

router.get('/:userId', getWallet)
router.get('/:userId/transactions', getTransactions)
router.post('/reset', resetWallet)

export default router
