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
- `frontend/src/components/GameLobby.jsx`: Unified arcade hub with hero banner, live winners ticker, category filters (All, Trending, Crash, Color, Cards), and premium game cards with RTP%, player counts, and launch buttons.
- `frontend/src/components/AviatorGame.jsx`: Aviator crash game with real-time canvas flight trajectory, live multiplier display, crash history pills, auto-cashout toggle, and bet/cashout control deck.
- `frontend/src/components/CoinFlipGame.jsx`: 3D CSS coin flip game with Heads/Tails selection, 1.96x payout, spin animation, streak tracking, and win/loss feedback.
- `frontend/src/components/AndarBaharGame.jsx`: Indian card game with dealer Joker reveal, step-by-step card deal animation, Andar (1.95x) / Bahar (2.0x) betting zones, and A/B roadmap history.
- `server/controllers/aviatorController.js`: Global synchronized flight engine with WAITING/FLYING/CRASHED phases, exponential growth multiplier (1.00x→200x+), provably fair crash points (97% RTP), auto-cashout processing, and atomic wallet settlements.
- `server/controllers/coinFlipController.js`: Instant provably-fair coin toss engine with HEADS/TAILS outcome generation, 1.96x payout, atomic balance deduction/credit, streak tracking, and global history.
- `server/controllers/andarBaharController.js`: 52-card deck deal engine with shuffled Joker reveal, alternating Andar/Bahar dealing, rank-matching win resolution, 1.95x/2.0x payouts, and full deal sequence return.

- `frontend/src/components/VortexGame.jsx`: Cosmic vortex multiplier wheel with Inner/Middle/Outer ring tiers and provably fair resolution.
- `frontend/src/components/CricketGame.jsx`: Live 6-ball over prediction game (Dot, 1-2 Runs, 4 Boundary, 6 Maximum, Wicket) with stadium turf animation.
- `frontend/src/components/PubgGame.jsx`: 1-minute battle royale drop zone survival game with Spetsnaz L3 helmet theme and loot drops.
- `frontend/src/components/SpinWheelModal.jsx`: Interactive "Get ₹500" Lucky Fortune Wheel modal with physics spin and daily free reward.
- `server/controllers/vortexController.js`: Ring-tier multiplier calculations and atomic settlements.
- `server/controllers/cricketController.js`: Cricket market odds, outcomes, and ball commentary.
- `server/controllers/pubgController.js`: 1-minute battle drop zones and survival payouts.
- `server/controllers/spinWheelController.js`: Daily cooldown and weighted fortune spin payouts (up to ₹500).

## Recent Actions
- Refactored arcade lobby to match 3-column mobile layout with Recommended Games & Top Games sections and purple RTP% pills.
- Implemented new games: Vortex, Cricket Live, PUBG 1Min, and Fortune Spin Wheel ("Get ₹500").
- Replaced bottom navigation with Home, Activity (badge), Center Floating Wheel ("Get ₹500"), Promotion, and Account tabs.
- Added comprehensive test suite `tests/test_arcade_expansion.js` (9/9 passing).
- Production build verified (`npm run build` exited with code 0).

