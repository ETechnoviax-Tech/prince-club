# Memory

## Project Overview
- **Repository**: Prince Club (`ETechnoviax-Tech/prince-club`)
- **Stack**: React 18, Vite, Express.js, Supabase (PostgreSQL), Lucide React, Vanilla CSS
- **Purpose**: Production-grade, mobile-first real-time color trading & prediction simulator with persistent Supabase DB and UPI/UTR payment verification.

## Architecture & Conventions
- `frontend/`: Dedicated client folder containing `index.html`, `vite.config.js`, `package.json`, and `src/`.
- `frontend/src/App.jsx`: Mobile-first client architecture with period timer sync, bottom-sheet betting drawer, trend roadmaps, real-time bet settlement notifications, and auth integrations.
- `frontend/src/components/AuthModal.jsx`: Interactive mobile authentication dialog supporting Login, Signup, Forgot Password, and Reset Password with WhatsApp / Email OTP selectors.
- `frontend/src/components/DepositModal.jsx`: Client UPI payment modal with QR code, copy VPA, and 12-digit UTR input form.
- `frontend/src/utils/audio.js`: Zero-dependency Web Audio API synthesizer for mobile ticks, bet placement, and win fanfares.
- `frontend/src/api/client.js`: Frontend API client for game rounds, user bets, auth, wallet, and UPI deposits.
- `server/index.js`: Express backend server with CORS, health check, and route mounting on port 5000.
- `server/config/supabase.js`: Supabase client with support for `SUPABASE_URL`, `VITE_` env vars, and graceful local dev fallback.
- `server/controllers/authController.js`: Full authentication engine: Login, Signup with referral credits, OTP-based Forgot Password, and Reset Password.
- `server/controllers/gameController.js`: Real-time authoritative 45s rounds engine, 8s lock window, bet validation, and automatic background settlement loop with wallet payouts.
- `server/controllers/paymentController.js`: UPI dynamic QR generation, 12-digit UTR submission, deduplication, and atomic verification.
- `server/controllers/walletController.js`: Balance queries, transactions ledger, wallet management.
- `server/services/notificationService.js`: Multi-channel OTP dispatch engine supporting WhatsApp (Meta Cloud API, Twilio, console sandbox) and Email (Resend REST API, SMTP, console sandbox).
- `server/db/schema.sql`: PostgreSQL schema with stored procedure `approve_deposit_utr` for atomic wallet credits.
- `tests/test_auth_flows.js`: Automated test suite covering Signup, Login, Forgot OTP, and Password Reset.
- `tests/test_realtime_game.js`: Automated test suite verifying live round sync, bet placement, and authoritative settlement.
- `tests/test_whatsapp_email_otp.js`: Automated test suite verifying multi-channel OTP delivery, standalone verification, and password reset flows.

## Recent Actions
- Migrated all frontend assets and code into a dedicated `frontend/` directory (`frontend/src/`, `frontend/index.html`, `frontend/vite.config.js`, `frontend/package.json`, `frontend/.env.example`).
- Configured root `package.json` to delegate `npm run dev` and `npm run build` to `frontend/` seamlessly (`vite frontend` and `vite build frontend`).
- Cleaned the entire database (Supabase PostgreSQL tables wiped to 0 records) ready for real users.
- Implemented tamper-proof HMAC session authentication, preventing user ID impersonation, wallet snooping, and unauthorized betting.
- Secured `/api/payments/verify` with admin credentials (`requireAdmin`) preventing client self-approval of deposits.
- Added strict server validation and sanitization across auth, betting (min ₹10, integer only, valid selections, lock enforcement), and UPI deposits.
- Implemented atomic wallet deduction guards (`gte('balance', amount)`) preventing concurrent double-spending race conditions.
- Added sliding-window rate limiting on auth, betting, and payment routes to prevent brute-force attacks.
- Implemented multi-channel OTP verification for both WhatsApp and Email via `server/services/notificationService.js`, with frontend channel selector in `AuthModal.jsx` and client helpers in `src/api/client.js`. Verified with `tests/test_whatsapp_email_otp.js` (6/6 tests passed).
- Debugged and hardened `src/api/client.js` with safe environment variable detection (`import.meta.env` and `process.env`) and safe storage access (`window.localStorage` and in-memory fallback), resolving module rejection in Node/test environments.
