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
  promoteOrSeedAdmin,
} from '../controllers/adminController.js'
import { adminVerifyWithdrawal, listAdminWithdrawals } from '../controllers/walletController.js'
import { listAdminDeposits, verifyDeposit } from '../controllers/paymentController.js'

const router = express.Router()

// Master Key Bootstrap / Promotion Guard
const requireMasterAdminSecret = (req, res, next) => {
  const secretKey = req.headers['x-admin-key']
  const expected = process.env.ADMIN_SECRET_KEY || 'club69_admin_master_secret_2026'
  if (!secretKey || secretKey !== expected) {
    return res.status(403).json({ error: 'Invalid or missing master admin key', stage: 'backend_verification' })
  }
  next()
}

// Public with master secret key (for bootstrapping or automated promotion)
router.post('/promote', requireMasterAdminSecret, promoteOrSeedAdmin)

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
