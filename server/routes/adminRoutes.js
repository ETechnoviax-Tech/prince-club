import express from 'express'
import { requireDualAdminAuth } from '../middleware/adminGuard.js'
import {
  verifyAdminSession,
  getAdminMatrix,
  getBetsLedger,
  listUsers,
  updateUserBalance,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from '../controllers/adminController.js'
import { adminVerifyWithdrawal, listAdminWithdrawals } from '../controllers/walletController.js'
import { listAdminDeposits, verifyDeposit } from '../controllers/paymentController.js'

const router = express.Router()

// Authenticated, database-backed admin routes.
router.use(requireDualAdminAuth)

// 1. Session Verification Check
router.post('/verify', verifyAdminSession)

// 2. Metrics & Risk Matrix
router.get('/matrix', getAdminMatrix)

// 3. Bets Ledger ("kispar kitna pasia laga kon kitna jeeta")
router.get('/bets', getBetsLedger)

// 4. Users Management (CRUD)
router.get('/users', listUsers)
router.post('/users/:id/balance', updateUserBalance)
router.patch('/users/:id/role', updateUserRole)
router.patch('/users/:id/status', updateUserStatus)
router.delete('/users/:id', deleteUser)

// 5. Payment & Withdrawal Management
router.get('/deposits', listAdminDeposits)
router.get('/withdrawals', listAdminWithdrawals)
router.post('/withdrawals/:id/verify', adminVerifyWithdrawal)
router.post('/deposits/:id/verify', verifyDeposit)

export default router
