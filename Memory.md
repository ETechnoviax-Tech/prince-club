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
- Re-architected home interface into authentic **55 CLUB** layout: 55 circular badge logo, app download cloud button, scrolling marquee announcement bar with message alerts, pink hero promotional banner with mobile mockups, wallet balance row with orange Withdraw and coral Deposit gradient buttons, Wheel of Fortune and VIP Privileges cards.
- Implemented category tabs bar (Lobby, Mini game, Slots, Card, Fishing, Original) with custom scrollbar and active red pill indicator.
- Created ⭐ Recommended Games section with interactive Aviator (Dark Neon), Aviator (+500% 10 SEC), and WIN GO cards.
- Created Lottery section (2x2 grid: WIN GO, K3, 5D, Moto Racing), Mini game section (Goal Wave, Rocket, Hilo Wave), Slots section (Pharaoh), and floating "Add to Desktop" badge.
- Replaced bottom navigation with authentic 55 CLUB 5-tab bar featuring elevated center spinning wheel button (`Get ₹500`).
- Implemented full **Aviator** real-time crash game (`frontend/src/components/AviatorGame.jsx`, `server/controllers/aviatorController.js`) with radar canvas flight curve, live multiplier badge, top crash history pills, dual betting deck, auto cashout, and authoritative server cashout loop.
- Built interactive **Fortune Wheel** modal (`frontend/src/components/FortuneWheelModal.jsx`) for daily luck spin rewards up to ₹500.
- Verified all components with `tests/test_aviator_55club.js`, `tests/test_veer_bet_settlement.js`, and Vite production build (0 errors).
