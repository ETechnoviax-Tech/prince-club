# Memory

## Project Overview
- **Repository**: Prince Club (`ETechnoviax-Tech/prince-club`)
- **Stack**: React 18, Vite, Express.js, Supabase (PostgreSQL), Lucide React, Vanilla CSS
- **Purpose**: Production-grade, mobile-first real-time color trading & prediction simulator with persistent Supabase DB and UPI/UTR payment verification.

## Architecture & Conventions
- `server/index.js`: Express backend server with CORS, health check, and route mounting on port 5000.
- `server/config/supabase.js`: Supabase client with support for `SUPABASE_URL`, `VITE_` env vars, and graceful local dev fallback.
- `server/controllers/authController.js`: Full authentication engine: Login, Signup with referral credits, OTP-based Forgot Password, and Reset Password.
- `server/controllers/gameController.js`: Real-time authoritative 45s rounds engine, 8s lock window, bet validation, and automatic background settlement loop with wallet payouts.
- `server/controllers/paymentController.js`: UPI dynamic QR generation, 12-digit UTR submission, deduplication, and atomic verification.
- `server/controllers/walletController.js`: Balance queries, transactions ledger, wallet management.
- `server/db/schema.sql`: PostgreSQL schema with stored procedure `approve_deposit_utr` for atomic wallet credits.
- `src/App.jsx`: Mobile-first client architecture with period timer sync, bottom-sheet betting drawer, trend roadmaps, real-time bet settlement notifications, and auth integrations.
- `src/components/AuthModal.jsx`: Interactive mobile authentication dialog supporting Login, Signup, Forgot Password, and Reset Password with 1-click Demo Trader login.
- `src/components/DepositModal.jsx`: Client UPI payment modal with QR code, copy VPA, and 12-digit UTR input form.
- `src/utils/audio.js`: Zero-dependency Web Audio API synthesizer for mobile ticks, bet placement, and win fanfares.
- `src/api/client.js`: Frontend API client for game rounds, user bets, auth (login, signup, forgot, reset), wallet, and UPI deposits defaulting to port 5000.
- `tests/test_auth_flows.js`: Automated test suite covering Signup, Login, Forgot OTP, and Password Reset.
- `tests/test_realtime_game.js`: Automated test suite verifying live round sync, bet placement, and authoritative settlement.

- `server/middleware/auth.js`: Tamper-proof HMAC session tokens (`generateToken`, `verifyToken`, `requireAuth`, `requireAdmin`) preventing user ID spoofing and unauthorized actions.
- `server/middleware/validate.js`: Zero-bypass strict input validation and sanitization for usernames, passwords, bet amounts/selections, deposits, and 12-digit UTRs.
- `server/middleware/rateLimit.js`: Zero-dependency sliding window rate limiters for auth (15 req/min), betting (60 req/min), and payments (20 req/min).
- `tests/clean_db.js`: Automated database sanitization utility clearing all test data from Supabase tables (`profiles`, `wallets`, `bets`, `deposit_requests`, `wallet_transactions`).
- `tests/test_security_validation.js`: 8-point security and validation verification suite.

- `server/services/notificationService.js`: Multi-channel OTP dispatch engine supporting WhatsApp (Meta Cloud API, Twilio, console sandbox) and Email (Resend REST API, SMTP, console sandbox).
- `tests/test_whatsapp_email_otp.js`: Automated test suite verifying multi-channel OTP delivery, standalone verification, and password reset flows.

## Recent Actions
- Cleaned the entire database (Supabase PostgreSQL tables wiped to 0 records) ready for real users.
- Implemented tamper-proof HMAC session authentication, preventing user ID impersonation, wallet snooping, and unauthorized betting.
- Secured `/api/payments/verify` with admin credentials (`requireAdmin`) preventing client self-approval of deposits.
- Added strict server validation and sanitization across auth, betting (min ₹10, integer only, valid selections, lock enforcement), and UPI deposits.
- Implemented atomic wallet deduction guards (`gte('balance', amount)`) preventing concurrent double-spending race conditions.
- Added sliding-window rate limiting on auth, betting, and payment routes to prevent brute-force attacks.
- Passed 8/8 automated security & anti-spoofing tests in `test_security_validation.js` and confirmed production build integrity (`npm run build`).
- Added `password_resets` table definition to `server/db/schema.sql` and integrated OTP database persistence and invalidation in `server/controllers/authController.js`.
- Implemented multi-channel OTP verification for both WhatsApp and Email via `server/services/notificationService.js`, with frontend channel selector in `AuthModal.jsx` and client helpers in `src/api/client.js`. Verified with `tests/test_whatsapp_email_otp.js` (6/6 tests passed).
- Debugged and hardened `src/api/client.js` with safe environment variable detection (`import.meta.env` and `process.env`) and safe storage access (`window.localStorage` and in-memory fallback), resolving module rejection in Node/test environments.
- Updated wallet and game routes to use `optionalAuth` to ensure guest players can play and sync without 401 unauthenticated errors.
