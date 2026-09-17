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
import { adminVerifyWithdrawal } from '../controllers/walletController.js'
import { verifyDeposit } from '../controllers/paymentController.js'

const router = express.Router()

// Bootstrap / Promotion route: requires Backend Master Secret Key
router.post('/promote', (req, res, next) => {
  const adminSecret = process.env.ADMIN_SECRET_KEY || 'club69_admin_master_secret_2026'
  const key = req.headers['x-admin-key'] || req.query.adminKey || req.body?.adminKey
  if (!key || String(key).trim() !== adminSecret) {
    return res.status(403).json({ error: 'Backend Master Secret Key required for admin promotion' })
  }
  next()
}, promoteOrSeedAdmin)

// Dual-Verified Routes (DB Role === 'admin' AND Backend Secret Key verified)
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
router.post('/withdrawals/:id/verify', adminVerifyWithdrawal)
router.post('/deposits/:id/verify', verifyDeposit)

export default router
