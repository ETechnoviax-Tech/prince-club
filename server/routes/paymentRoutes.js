import { Router } from 'express'
import {
  createDeposit,
  getDeposit,
  listUserDeposits,
  submitUTR,
  verifyDeposit,
} from '../controllers/paymentController.js'
import { validateDepositRequest, validateUTRSubmission } from '../middleware/validate.js'

const router = Router()

// Deposit flow
router.post('/deposit', validateDepositRequest, createDeposit)
router.post('/deposit/utr', validateUTRSubmission, submitUTR)
router.get('/deposit/:id', getDeposit)
router.get('/deposits/user/:userId', listUserDeposits)

// Admin/System verification
router.post('/admin/verify', verifyDeposit)

export default router
