# Memory

## Feature Index
- [Live Win Go Provider Synchronization](#feature-live-win-go-provider-synchronization) - done
- [Authentication & Session Security](#feature-authentication--session-security) - done
- [Wallet & Payment Gateway](#feature-wallet--payment-gateway) - done
- [In-House Casino & Crash Games](#feature-in-house-casino--crash-games) - done
- [Administrative Risk & User Management](#feature-administrative-risk--user-management) - done
- [Mobile Screen Responsiveness & Desktop Centering](#feature-mobile-screen-responsiveness--desktop-centering) - done
- [Win Go UI Color Harmonization & Real-Time Bets](#feature-win-go-ui-color-harmonization--real-time-bets) - done

---

## Feature: Win Go UI Color Harmonization & Real-Time Bets
- Status: done
- Purpose: Win Go arena with authentic Orange & White palette, cinema ticket countdown stage, clean lottery ball betting controls, and animated loading spinner during bet placement.
- Files: `frontend/src/styles.css`, `frontend/src/components/WingoGame.jsx`, `frontend/src/App.jsx`
- Behavior / key decisions:
  - Arena Palette: Entire Win Go arena themed in clean Orange & White (`#ff5200`, `#ff7a18`, `#ffffff`, `#f8fafc`). Overhauled header to vibrant orange gradient, white wallet card with orange balance highlights, and white record tables with orange accents.
  - Mode selector bar: White rounded card with active tab orange gradient (`linear-gradient(90deg, #ff7a18, #ff5200)`) and clock icon.
  - Stage countdown card: Cinema ticket countdown card with digit countdown boxes and period number.
  - Betting controls: Direct color buttons (`Green`, `Violet`, `Red`), 2x5 grid of 3D number lottery balls (0–9), and `Big`/`Small` buttons in orange/blue tones.
  - Betting Bottom-Sheet Drawer: Clean white card with dynamic theme header matching target selection (`#ff6b35` orange for Big/Small, `#22c55e` Green, `#ef4444` Red, `#a855f7` Violet), balance chips (`1, 10, 100, 1000`), rapid pointer-based quantity stepper (`[-] [1] [+]`) with zero-latency tap and continuous auto-repeat on hold, multiplier quick chips (`X1, X5, X10, X20, X50, X100`), terms agreement, and action buttons.
  - 5-Second Countdown Stage Overlay: Frosted white card (`rgba(255, 255, 255, 0.94)`) with dashed/solid orange rotating radar rings, white digit cards with orange borders (`#ff7a18`), and fiery orange digits (`#ff5200`) harmonized with the arena.
  - Bet Loading Animation: Dual-ring animated loading spinner overlay (`.wingo-bet-loading-overlay`) with rotating orange gradient border and glowing center dot, plus synchronized spinner animation inside the confirm button during `isPlacingBet`.
  - Idempotency & Concurrency: All bets pass through `apiPlaceBet` with per-user mutex and client-side lockouts.
- Config / env: none
- Known issues / TODO: none
- Last changed: 2026-09-20 - Added high-speed pointer hold stepper for instant quantity adjustment and matched 5s countdown overlay to orange/white theme.

## Feature: Mobile Screen Responsiveness & Desktop Centering
- Status: done
- Purpose: Fullscreen edge-to-edge responsiveness on mobile smartphone screens, persistent visible bottom navigation bar across Android/iOS browser address bars, and centered luxury casino frame on desktop.
- Files: `frontend/src/styles.css`, `frontend/src/App.jsx`, `frontend/index.html`, `frontend/src/components/WingoGame.jsx`
- Behavior / key decisions:
  - Synchronized CSS dynamic viewport height (`--app-height: window.innerHeight`) on resize/orientationchange to prevent Chrome Android URL bar from pushing `.home-55-bottom-nav` below the visible screen.
  - Constrained `.app-main-viewport` with `flex: 1 1 0% !important; min-height: 0 !important; height: 0 !important;` so internal content scrolls without expanding parent flex container.
  - Made `.home-55-bottom-nav` rigid (`flex: 0 0 auto; z-index: 99; box-sizing: border-box;`) with `env(safe-area-inset-bottom)` support.
  - Global scrollbar suppression (`scrollbar-width: none` and `::-webkit-scrollbar { display: none; }`) eliminates desktop scrollbars.
  - Symmetrical card centering on mobile and centered 450px canvas on desktop.
- Config / env: none
- Known issues / TODO: none
- Last changed: 2026-09-20 - Fixed submerged bottom navigation bar by binding viewport height to `--app-height` and isolating flex scroll container.

## Feature: Live Win Go Provider Synchronization
- Status: done
- Purpose: Fetches authoritative live draw issues and history from upstream 55Club / VeerGame endpoints for Win Go rounds.
- Files: `server/services/veerGameService.js`, `server/controllers/gameController.js`, `server/routes/gameRoutes.js`, `frontend/src/App.jsx`
- Behavior / key decisions:
  - 6000ms per-server timeout with dual-endpoint failover (55club -> veergame).
  - Circuit breaker trips after 6 consecutive failures with a 20s recovery window.
  - Stale-while-revalidate fallback serves last-known draw history and calculated countdowns during transient upstream network lag.
  - Background poller staggers queries by cycle (30s every interval, 1m every 2nd, 3m every 4th, 5m every 6th) to avoid rate limits.
  - Controller returns HTTP 503 on provider downtime without flooding server logs with multi-line stack traces.
- Config / env: none (uses official upstream WebAPIs)
- Known issues / TODO: none
- Last changed: 2026-09-20 - Increased timeout to 6s, added stale cache fallback, and staggered poller cadence.

## Feature: Authentication & Session Security
- Status: done
- Purpose: Multi-method player authentication (phone/email) with captcha verification and JWT enforcement.
- Files: `frontend/src/components/pages/LoginPage.jsx`, `frontend/src/components/pages/RegisterPage.jsx`, `server/middleware/auth.js`, `server/controllers/userController.js`
- Behavior / key decisions:
  - Interactive slide-to-verify jigsaw captcha before credential validation.
  - Password hashing via bcrypt and role-based access control (`admin`, `user`).
- Config / env: `JWT_SECRET`
- Known issues / TODO: none
- Last changed: 2026-09-19 - Modularized dedicated auth views and added slide captcha.

## Feature: Wallet & Payment Gateway
- Status: done
- Purpose: Production-grade financial transactions supporting UPI QR deposits, manual/automated withdrawal queues, and ledger tracking.
- Files: `server/controllers/paymentController.js`, `server/config/upiConfig.js`, `server/middleware/idempotency.js`, `frontend/src/components/pages/DepositPage.jsx`, `frontend/src/components/pages/WithdrawPage.jsx`
- Behavior / key decisions:
  - Dynamically loads merchant UPI VPAs from environment (`MERCHANT_UPI_VPA`, `MERCHANT_UPI_VPA_1..15`, or `MERCHANT_UPI_POOL`), eliminating all hardcoded UPI addresses.
  - Round-robin / random distribution across active UPI accounts for deposit QR generation.
  - Active credentials configured to `abhimanyu.maurya@pingpay` with template pool variables ready for multi-account load balancing.
  - Idempotency middleware preventing duplicate operations.
  - Per-user mutex lock preventing concurrent balance mutations.
  - Atomic database transactions with stored procedures.
- Config / env: `MERCHANT_UPI_VPA`, `MERCHANT_NAME`, `MERCHANT_UPI_VPA_1..15`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Known issues / TODO: none
- Last changed: 2026-09-20 - Eliminated hardcoded UPI addresses and bound deposit QR generation to dynamic environment-managed UPI pool.

## Feature: In-House Casino & Crash Games
- Status: done
- Purpose: Houses native mini-games including Aviator crash, Mines, Dragon vs Tiger, and in-house slots.
- Files: `frontend/src/components/games/*`, `server/controllers/*`
- Behavior / key decisions:
  - Aviator uses HTML5 Canvas 60 FPS animation with provably fair SHA-256 crash points.
  - Native slots (Crazy 777, Fortune Gems, Super Ace) calculate outcomes server-authoritatively.
- Config / env: none
- Known issues / TODO: none
- Last changed: 2026-09-19 - Added full-screen immersive view and sound controls.

## Feature: Administrative Risk & User Management
- Status: done
- Purpose: Back-office portal for platform operators to monitor risk distributions, manage user accounts, and verify/approve deposits and payouts.
- Files: `frontend/src/components/admin/AdminPaymentsView.jsx`, `frontend/src/components/admin/admin.css`, `server/controllers/paymentController.js`, `server/controllers/walletController.js`
- Behavior / key decisions:
  - Enriched admin deposit & withdrawal endpoints with user profile data (`user_phone`, `username`, `email`).
  - Withdrawals prominently highlight the destination target UPI ID (`target_upi` / `payout_details.upiId`) or bank credentials with a 1-click copy button and feedback indicator.
  - Deposits display registered user mobile, deposit gateway UPI VPA, and submitted UTR with 1-click copy buttons.
  - Strict bearer JWT authentication validating active `admin` role directly against the database.
- Config / env: `ADMIN_SECRET`
- Known issues / TODO: none
- Last changed: 2026-09-20 - Added prominent target UPI payout destination, user mobile, and deposit VPA/UTR display in Admin Payments.
