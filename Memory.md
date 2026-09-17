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
- Redesigned Account Page (`AccountView.jsx`): Royal purple profile header with portrait avatar, username `MEMBERNNG5EZDK`, `VIP0` silver star badge, copyable `UID | 1015140` orange pill, Total Balance card with `Enter wallet` button, 4 action icons (ARWallet, Deposit, Withdraw, VIP), 2x2 Quick History cards (Game History, Transaction, Deposit, Withdraw), and vertical menu list with red notification badge.
- Redesigned Login Page (`AuthModal.jsx`): Authentic 55CLUB coral header with back button, 55CLUB crown brand logo, US flag EN language switcher, Phone Number / Email tab switcher, +91 country code dropdown, password visibility toggle, circular remember password checkbox, Log in primary button, and Register secondary button.
- Built authentic **55 CLUB Activity Page** (`frontend/src/components/ActivityView.jsx`):
  - Coral gradient header with 55CLUB crown brand logo, Today's bonus (`₹0.00`) and Total bonus (`₹177.68`) metrics, and center white pill `Bonus details` modal trigger.
  - 4-shortcut icon row: Betting rebate (orange badge + dot), Super Jackpot (teal trophy), First gift (purple present), and Invite Wheel (coral wheel + dot).
  - 2-column feature cards: Gifts (Hongbao red envelopes artwork + redemption code input modal) and Attendance bonus (3D calendar artwork + 7-day consecutive streak bonus claim modal).
  - Event promotional banners: ARBET Invite Friends (sports athletes visual + date pill `Sep 1 - Sep 30`) and 55CLUB Mega Spin Wheel.
  - 5 interactive modal dialogs: Bonus Details breakdown, Gift Code Redemption, 7-Day Attendance Streak, Real-Time Betting Rebate tiers, and Community Super Jackpot pool.
- Linked backend directly to official **55CLUB WebAPI** (`https://api.api55clubapi.com/api/webapi`):
  - Reverse-engineered MD5 payload cryptographic signing (`language=en`, sorted payload, hex digest).
  - Synchronized real-time round issues across 4 time periods: Win Go 30s (30), 1Min (1), 3Min (2), and 5Min (3) with matching official round issue numbers (`202609131000...`).
  - Real-time draw history sync via `/GetNoaverageEmerdList` with dual high-availability failover.
  - Updated HomeLobby lottery section to full 55CLUB lineup (WIN GO, K3 LOTTERY, 5D LOTTERY, TRX WIN GO, AVIATOR).
- Verified with `tests/test_55club_live_api.js` (7/7 passing) and Vite production build (0 errors).
- Diagnosed root cause of "kuch bhi apply nhi hua":
  - K3, 5D, and TRX games were previously unrouted in `HomeLobby.jsx` (clicked handlers defaulted back to Win Go), `K3Game` was unmounted, and `FiveDGame`/`TrxGame` components did not exist yet.
- Built and integrated full multi-game arena suite:
  - `frontend/src/components/K3Game.jsx`: K3 Lottery with 1m/3m/5m/10m tabs, animated 3-dice cup, Sum 3-18 odds table, 2 Same, 3 Same, Consecutive Straight, and bottom sheet bet drawer.
  - `frontend/src/components/FiveDGame.jsx`: 5D Lottery with 1m/3m/5m/10m tabs, 5 animated spinning reels (A, B, C, D, E), position tabs, 0-9 number grid, Sum Big/Small/Odd/Even, and draw history.
  - `frontend/src/components/TrxGame.jsx`: TRX Win Go with 1m/3m/5m tabs, live Tron block height & hash display, last-digit color/size highlights, color & number betting, and draw history.
- Mounted `k3`, `5d`, and `trx` directly in `App.jsx` main viewport and updated `HomeLobby.jsx` click routing.
- Added complete mobile UI styling for K3, 5D, and TRX in `frontend/src/styles.css`.
- Built third-party game integration (`ThirdPartyGameModal.jsx`, `server/controllers/thirdPartyGameController.js`, `server/services/thirdPartyGameService.js`) for catalog and provider game launching.
- Humanized `README.md` to public professional GitHub standard (setup, features, architecture, deployment, usage).
- Updated `styles.css` `.mobile-app-wrapper` and `.mobile-app-container` with desktop-centered 430px smartphone canvas and launched standalone window.
- Built 100% self-hosted in-house slot game engine:
  - `server/services/inHouseSlotEngine.js`: Authoritative RNG math for Crazy 777 (3 reels + 1 bonus reel), Fortune Gems (3x3 grid + 15x multiplier wheel), and Super Ace (5x4 card matrix + 243 ways).
  - `server/controllers/inHouseSlotController.js` + `server/routes/gameRoutes.js`: Mounted `POST /api/game/slot/spin` with atomic wallet deductions and payout credits.
  - `frontend/src/utils/slotAudio.js`: Web Audio API sound synthesizer for reel clicks, stops, win chimes, and mega win fanfares.
  - `frontend/src/components/InHouseSlotArena.jsx`: Golden arcade slot cabinet with payline visualizer, bet stepper, quick chips, Auto-spin, Turbo spin, and celebration popups.
  - Embedded into `ThirdPartyGameModal.jsx` and added 3 lobby showcase cards in `HomeLobby.jsx`.
- Enhanced slot visual graphics & animation suite:
  - `frontend/src/components/SlotSymbol.jsx`: High-definition vector SVG casino symbols with metallic gradients, 3D specular bevels, and drop shadows (Golden 777, Crimson 77, Electric Blue 7, 3x Gold BAR, Bell, Ruby Cherries, Garuda Wild, Gems, Joker).
  - 60FPS HTML5 Canvas Coin Shower: Dynamic physics-based coin fountain with gravity, rotation, bouncing, and sparkle bursts on wins.
  - 3D cylindrical glass glare shaders on reels with elastic overshoot bounce landings.
  - Animated counting win ticker, rotating sunburst victory rays, and blinking marquee bulb sequences.
- Verified with `npm run build` (clean exit 0) and automated test suite.
- Converted entire application UI to 100% clean white light theme: updated `:root` color tokens, desktop `.mobile-app-wrapper` backdrop (`#f1f3f7`), crisp white stage cards (`#ffffff`), `AccountView` profile header, balance card, 2x2 history grid, menu items, high-contrast readable toast notifications (`.mobile-toast`), and clean form input styles across all game modes.
- Built production-grade payment gateway architecture:
  - `server/db/payment.sql`: Dedicated SQL script containing schema extensions, `idempotency_keys`, `payment_locks`, `webhook_events`, `payment_events`, `refund_requests`, and atomic stored procedures (`request_withdrawal_atomic`, `process_refund`, `acquire_payment_lock`, `release_payment_lock`).
  - `server/middleware/idempotency.js`: Fast-path memory cache + Supabase persistence preventing duplicate charges and double-click submissions via `Idempotency-Key` header.
  - `server/middleware/paymentLock.js`: Per-user mutex with TTL preventing concurrent race conditions on withdrawals and deposits (409 Conflict rejection).
  - `server/middleware/rateLimit.js`: Stricter `withdrawalRateLimit` (5/min) and `webhookRateLimit` (120/min).
  - `server/controllers/webhookController.js`: HMAC-SHA256 signature verification with constant-time equality check, replay protection, and automated deposit/payout routing with refund failover.
  - `server/controllers/refundController.js`: Atomic refund engine for deposits and withdrawals, refund history, and audit ledger.
  - `tests/test_payment_gateway.js`: Comprehensive 7-point integration test suite covering idempotency replays, concurrent mutex locks, signed webhooks, replay attack prevention, and auto-refunds (7/7 passing).
- Upgraded Login, Signup, Forgot Password, and Reset Password views:
  - `frontend/src/components/AuthModal.jsx`: Synchronized state with `initialMode` and `isOpen`, removed hardcoded mock phone numbers, added India country selector (`🇮🇳 +91`), visual 6-digit OTP code inputs, and customer support quick link.
  - Upgraded all buttons across AccountView, DepositModal, and WithdrawModal to authentic 55 CLUB production standards: coral-to-red gradients (`linear-gradient(90deg, #ff6054 0%, #f2413b 50%, #e62c25 100%)`), 25px pill border radius, 3D specular highlights, tactile click physics (`active:scale(0.97)`), and eliminated mismatched purple styles.
  - Fixed syntax error in `frontend/src/styles.css` (unclosed brace on `.menu-row-title` at line 11549) and verified bracket balance (depth 0).
- Built full Transaction History feature:
  - `frontend/src/components/TransactionModal.jsx`: Dedicated modal for wallet ledger history with filter tabs (All, Deposit, Withdraw, Bets, Bonus/Refund), live balance after, copyable reference IDs, and pull-to-refresh.
  - `frontend/src/api/client.js`: Added `fetchWalletTransactions(userId)`.
  - `server/controllers/walletController.js`: Fixed `getTransactions` to validate UUID before querying Supabase and gracefully fall back to in-memory store for guest/demo IDs (`usr_...`).
## Authentication & Access Gate
- Status: done
- Purpose: Production-grade auth system with strict login verification, separate pages, and zero-bypass security.
- Key logic: Strict login verification rejects unregistered users with 401; disk persistence for profiles and credentials; dedicated modular pages for Login, Register, Forgot Password, and Reset Password.
- Files: `frontend/src/components/auth/LoginPage.jsx`, `frontend/src/components/auth/RegisterPage.jsx`, `frontend/src/components/auth/ForgotPasswordPage.jsx`, `frontend/src/components/auth/ResetPasswordPage.jsx`, `frontend/src/components/AuthModal.jsx`, `server/controllers/authController.js`
- Dependencies: Express, Supabase, crypto, JWT
- Last change: 2026-09-17 — Built separate auth pages, eliminated auto-creation login bypass, and enforced strict credential validation.

## Mobile Toast Notification UI
- Status: done
- Purpose: High-contrast, top-floating notification toast with zero navigation obstruction.
- Key logic: Fixed top positioning (`max(20px, env(safe-area-inset-top))`), obsidian dark card (`#111827`), vivid gradients for success/error/neutral badges, and readable pure white title and slate text; suppressed when unauthenticated or during login.
- Files: `frontend/src/styles.css`, `frontend/src/App.jsx`
- Dependencies: Lucide React, Vanilla CSS
- Last change: 2026-09-17 — Overhauled toast contrast and suppressed background settlement toasts during login.

## Dual-Verification Admin Management & Live Risk Matrix
- Status: done
- Purpose: Production-grade modular admin dashboard with separate mobile-responsive sub-components and live risk matrix.
- Key logic: Split monolithic dashboard into 5 dedicated components: `AdminGate.jsx` (security barrier), `AdminMatrixView.jsx` (live pool risk & financials), `AdminBetsView.jsx` (bets & winners ledger), `AdminUsersView.jsx` (user CRUD & status management), and `AdminBalanceModal.jsx` (audit balance adjustments); styled via dedicated mobile-responsive `admin.css`.
- Files: `frontend/src/components/admin/AdminDashboard.jsx`, `frontend/src/components/admin/AdminGate.jsx`, `frontend/src/components/admin/AdminMatrixView.jsx`, `frontend/src/components/admin/AdminBetsView.jsx`, `frontend/src/components/admin/AdminUsersView.jsx`, `frontend/src/components/admin/AdminBalanceModal.jsx`, `frontend/src/components/admin/admin.css`
- Dependencies: Express, Supabase, React 18, Lucide React
- Last change: 2026-09-17 — Fixed DB bets query in getAdminMatrix/getBetsLedger, removed round_id NOT NULL constraint, and backfilled real bet transactions.

## 55CLUB Live WebAPI Sync & Failover Engine
- Status: done
- Purpose: Synchronize live Win Go issues and draw history directly with official 55CLUB WebAPI endpoints.
- Key logic: MD5 payload signing, dual-server failover (`api55clubapi.com`, `veergameapi.com`), 8s startup network grace window, delayed background poller, and auto fallback cache.
- Files: `server/services/veerGameService.js`, `server/controllers/gameController.js`
- Dependencies: Node crypto, fetch, Express
- Last change: 2026-09-17 — Removed dead mirror domain, added startup network warmup grace period, and verified 20-round official history sync.

## Admin Security & Access Control
- Status: done
- Purpose: Triple-verified admin gate — Backend Secret + DB role + optional ADMIN_IDENTIFIER env whitelist.
- Key logic: `adminGuard.js` enforces 3 sequential checks: (1) `x-admin-key` == `ADMIN_SECRET_KEY`, (2) JWT user role == 'admin' in DB, (3) if `ADMIN_IDENTIFIER` is set in env, account username/email must match it. Admin UI visible only to verified admin accounts (`role === 'admin' || is_admin === true`) in AccountView menu list; also accessible via `Ctrl+Shift+A` or version footer 5-tap.
- Files: `server/middleware/adminGuard.js`, `frontend/src/components/AccountView.jsx`, `frontend/src/App.jsx`, `server/controllers/authController.js`
- Dependencies: Express, JWT, Supabase
- Last change: 2026-09-17 — Populated is_admin in login payload, mounted admin menu card in AccountView, and added Ctrl+Shift+A global shortcut.

## My Bets Live Sync
- Status: done
- Purpose: Show all real user bets accurately in "My Bets" tab, synced from server every 2.5s.
- Key logic: No fake seed bets for logged-in users; always sync from server (even empty array replaces local); optimistic pending bets merged until confirmed by server; bets cleared on login/logout preventing cross-session leakage.
- Files: `frontend/src/App.jsx`
- Dependencies: React state, `/api/game/bets/:userId` endpoint
- Last change: 2026-09-17 — Fixed always-sync, optimistic merge, cleared seed bets, clear on auth events.


## Database Schema & Row Level Security (RLS)
- Status: done
- Purpose: PostgreSQL schema for Supabase with is_admin column, defensive migrations, and RLS protection.
- Key logic: Added `is_admin BOOLEAN NOT NULL DEFAULT FALSE` to `profiles` (and `users` view with `security_invoker = true`); enabled RLS across all 8 tables (`profiles`, `wallets`, `deposit_requests`, `wallet_transactions`, `game_rounds`, `bets`, `password_resets`, `withdrawal_requests`) with `service_role` full bypass policies to remove Supabase "Unrestricted" warning.
- Files: `server/db/schema.sql`, `server/middleware/adminGuard.js`, `server/controllers/adminController.js`
- Dependencies: PostgreSQL, Supabase PostgREST
- Last change: 2026-09-17 — Added is_admin column and enabled RLS + service_role policies to eliminate Unrestricted warning.

## Standalone Subpages Architecture
- Status: done
- Purpose: Dedicated modular pages for all account operations and portal views.
- Key logic: Individual full-screen views with back-navigation for Wallet, Deposit, Withdraw, VIP, Notifications, Gifts, Coupons, Security, and Customer Service.
- Files: `frontend/src/components/pages/*.jsx`, `frontend/src/App.jsx`, `frontend/src/components/AccountView.jsx`
- Dependencies: React 18, Lucide React, Vanilla CSS
- Last change: 2026-09-17 — Built dedicated standalone pages for Notifications, Gifts, Coupons, Security, and Customer Service.

## Anti-Inspect & Client Security Shield
- Status: done
- Purpose: Prevent unauthorized DevTools inspection, right-click menu, and source code extraction.
- Key logic: Global listeners trap `contextmenu`, F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S with warning toasts, console clearing, and CSS user-select lockout.
- Files: `frontend/src/utils/antiInspect.js`, `frontend/index.html`, `frontend/src/styles.css`, `frontend/src/App.jsx`
- Dependencies: Vanilla JS DOM events
- Last change: 2026-09-17 — Deployed Anti-Inspect protection engine blocking contextmenu and inspection shortcuts.

## Win Go Color UI & Contrast Engine
- Status: done
- Purpose: High-contrast, crystal-clear typography and color rendering across all Win Go components.
- Key logic: Obsidian dark text on white header, rich amber marquee ticker, 55 CLUB signature red active tab gradient, high-contrast timer boxes, and bet edge guards.
- Files: `frontend/src/styles.css`, `frontend/src/App.jsx`
- Dependencies: React 18, Lucide React
- Last change: 2026-09-17 — Fixed text visibility in header, ticker, mode tabs, multiplier chips, and bottom sheet drawer.

## Dynamic Domain & API Routing
- Status: done
- Purpose: Zero-hardcoding domain architecture driven entirely by environment variables for local and production.
- Key logic: Server matches dynamic subdomains (*.APP_DOMAIN) & localhost; client resolves via env or runtime window.location extraction to api.<domain>/api.
- Files: `server/config/domain.js`, `server/index.js`, `frontend/src/api/client.js`, `frontend/src/components/PromotionView.jsx`
- Dependencies: Express, CORS, Vite
- Last change: 2026-09-17 — Implemented zero-hardcoded dynamic domain routing with env configuration and runtime fallback.

## Containerization & Cloud Deployment (Docker, EC2, Render, Cloudflare)
- Status: done
- Purpose: Multi-target deployment setup for AWS EC2/PM2 or Render (backend) and Cloudflare Pages (frontend).
- Key logic: Root ecosystem.config.cjs for EC2 cluster, render.yaml & Dockerfiles for containerized API, SPA _redirects for Cloudflare Pages.
- Files: `ecosystem.config.cjs`, `render.yaml`, `Dockerfile.server`, `server/Dockerfile`, `frontend/public/_redirects`, `frontend/.env.production`
- Dependencies: Docker, PM2, Render, Cloudflare Pages
- Last change: 2026-09-17 — Added PM2 cluster configuration for EC2 and configured production Cloudflare Pages API routing.


