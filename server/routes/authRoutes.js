import { Router } from 'express'
import {
  forgotPassword,
  loginOrRegister,
  register,
  resetPassword,
  sendOTP,
  verifyOTP,
} from '../controllers/authController.js'
import {
  authRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
  sendOtpRateLimit,
  verifyOtpRateLimit,
} from '../middleware/rateLimit.js'
import { captchaRateLimit } from '../middleware/captchaRateLimit.js'
import { issueCaptcha, verifyCaptcha } from '../controllers/captchaController.js'
import {
  validateForgotPassword,
  validateLogin,
  validateResetPassword,
  validateSignup,
} from '../middleware/validate.js'

const router = Router()

router.get('/captcha', captchaRateLimit, issueCaptcha)

// All auth endpoints protected by database-backed real IP rate limits and strict validation
router.post('/login', authRateLimit, verifyCaptcha, validateLogin, loginOrRegister)
router.post('/signup', authRateLimit, verifyCaptcha, validateSignup, register)
router.post('/register', authRateLimit, verifyCaptcha, validateSignup, register)
router.post('/forgot-password', forgotPasswordRateLimit, validateForgotPassword, forgotPassword)
router.post('/reset-password', resetPasswordRateLimit, validateResetPassword, resetPassword)

// Multi-Channel (WhatsApp & Email) OTP Verification with real IP protection
router.post('/send-otp', sendOtpRateLimit, sendOTP)
router.post('/verify-otp', verifyOtpRateLimit, verifyOTP)

export default router
