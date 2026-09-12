# Memory

## Project Overview
- **Repository**: Prince Club (`ETechnoviax-Tech/prince-club`)
- **Stack**: React 18, Vite, Express.js, Supabase (PostgreSQL), Lucide React, Vanilla CSS
- **Purpose**: Production-grade, mobile-first real-time color trading & prediction simulator with persistent Supabase DB and UPI/UTR payment verification.

## Architecture & Conventions
- `frontend/`: Dedicated client folder containing `index.html`, `vite.config.js`, `package.json`, and `src/`.
- `frontend/src/App.jsx`: Mobile-first client architecture with 4 concurrent game modes (Parity, Sapre, Bcone, Emerd), period timer sync, bottom-sheet betting drawer (Colors, Big/Small, Numbers), trend roadmaps, real-time bet settlement notifications, and auth integrations.
- `frontend/src/components/AuthModal.jsx`: Interactive mobile authentication dialog supporting Login, Signup, Forgot Password, and Reset Password with WhatsApp / Email OTP selectors.
- `frontend/src/components/DepositModal.jsx`: Client UPI payment modal with dynamic QR code, copy VPA, and 12-digit UTR input form.
- `frontend/src/components/WithdrawModal.jsx`: Client payout modal supporting instant UPI and IMPS Bank Account withdrawal requests with live balance and history tracking.
- `frontend/src/utils/audio.js`: Zero-dependency Web Audio API synthesizer for mobile ticks, bet placement, and win fanfares.
- `frontend/src/api/client.js`: Frontend API client for multi-mode game rounds, user bets, auth, wallet, UPI deposits, withdrawals, and VIP bonuses.
- `server/index.js`: Express backend server with CORS, health check, and route mounting on port 5000.
- `server/config/supabase.js`: Supabase client with support for `SUPABASE_URL`, `VITE_` env vars, and graceful local dev fallback.
- `server/controllers/authController.js`: Full authentication engine: Login, Signup with referral credits, OTP-based Forgot Password, and Reset Password.
- `server/controllers/gameController.js`: Multi-level authoritative engine running 4 parallel modes (Parity 30s, Sapre 1m, Bcone 3m, Emerd 5m) with lock window enforcement, Big (5-9)/Small (0-4) 2.0x payouts, color/digit payouts, and background settlement loop.
- `server/controllers/paymentController.js`: UPI dynamic QR generation, 12-digit UTR submission, deduplication, and atomic verification.
- `server/controllers/walletController.js`: Balance queries, transactions ledger, atomic withdrawal requests with admin verification & auto-refunds, and 24-hour VIP daily check-in bonus.
- `server/services/notificationService.js`: Multi-channel OTP dispatch engine supporting WhatsApp (Meta Cloud API, Twilio, console sandbox) and Email (Resend REST API, SMTP, console sandbox).
- `server/db/schema.sql`: PostgreSQL schema with stored procedure `approve_deposit_utr`, `withdrawal_requests`, and `password_resets`.
- `tests/test_auth_flows.js`: Automated test suite covering Signup, Login, Forgot OTP, and Password Reset.
- `tests/test_multi_game_modes.js`: Automated test suite verifying 4 game modes, Big/Small bets, lock windows, and mode validation.
- `tests/test_withdrawal_vip.js`: Automated test suite verifying UPI/Bank withdrawals, balance locks, admin rejection refund, and VIP daily bonus limits.
- `tests/test_whatsapp_email_otp.js`: Automated test suite verifying multi-channel OTP delivery, standalone verification, and password reset flows.

## Recent Actions
- Redesigned mobile interface matching authentic RAJALUCK layout: Gold crown header, hero purple wallet card with live balance & Withdraw/Deposit pill buttons, Win Go 4-mode tabs (30s, 1Min, 3Min, 5Min), split timer card with 3D recent outcome balls & digital timer boxes, glossy 3D lottery balls grid (0–9), quick multiplier chips (X1–X100), Random Bet picker, Big/Small split action buttons, and interactive How to play / Withdraw modals.
- Integrated VeerGame live APIs (`/GetGameIssue`, `/GetNoaverageEmerdList`) via `server/services/veerGameService.js` with client reverse-engineered MD5 request signing, in-memory caching, request coalescing, and resilient fallback.
- Added live proxy endpoints `GET /api/game/veer/issue` and `GET /api/game/veer/history` in `server/controllers/gameController.js` and `server/routes/gameRoutes.js`.
- Implemented automated background settlement loop resolving player bets against official VeerGame draw outcomes (Colors 2x/1.5x/4.5x, Digits 0-9 9x, Big/Small 2x).
- Integrated 4 parallel game levels: Parity (30s round, 5s lock), Sapre (1m round, 10s lock), Bcone (3m round, 30s lock), and Emerd (5m round, 45s lock) in backend engine and frontend mode tab switcher.
- Added Big (numbers 5–9, 2.0x payout) and Small (numbers 0–4, 2.0x payout) betting market with dedicated high-visibility action buttons and server validation.
- Implemented complete User Withdrawal Payout System with `WithdrawModal.jsx`, supporting UPI VPA and IMPS Bank Account requests, atomic balance deductions, withdrawal history tracker, and admin verification with automated refund on rejection.
- Implemented 24-hour VIP Daily Check-In Bonus system granting ₹15–₹50 credits with duplicate claim prevention.
- All automated test suites (`test_multi_game_modes.js`, `test_withdrawal_vip.js`, `test_whatsapp_email_otp.js`, `test_auth_flows.js`, `test_veer_bet_settlement.js`) verified and production bundle compiled with 0 errors.
