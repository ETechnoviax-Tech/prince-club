import { Router } from 'express'
import {
  forgotPassword,
  loginOrRegister,
  register,
  resetPassword,
  sendOTP,
  verifyOTP,
} from '../controllers/authController.js'
import { authRateLimit } from '../middleware/rateLimit.js'
import {
  validateForgotPassword,
  validateLogin,
  validateResetPassword,
  validateSignup,
} from '../middleware/validate.js'

const router = Router()

// All auth endpoints have rate limiting and strict validation applied
router.post('/login', authRateLimit, validateLogin, loginOrRegister)
router.post('/signup', authRateLimit, validateSignup, register)
router.post('/register', authRateLimit, validateSignup, register)
router.post('/forgot-password', authRateLimit, validateForgotPassword, forgotPassword)
router.post('/reset-password', authRateLimit, validateResetPassword, resetPassword)

// Multi-Channel (WhatsApp & Email) OTP Verification
router.post('/send-otp', authRateLimit, sendOTP)
router.post('/verify-otp', authRateLimit, verifyOTP)

export default router
