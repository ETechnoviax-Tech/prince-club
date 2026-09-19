import { rateLimit } from './rateLimit.js'

export const captchaRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: 'Too many CAPTCHA requests. Please try again shortly.',
})
