# 69 Club

A mobile-first color trading, lottery, and prediction gaming platform built with React 18, Express.js, and Supabase (PostgreSQL). Features real-time lottery rounds, crash games, in-house casino titles, third-party provider integration, dual-verification administrative dashboard with live risk distribution matrices, and a production-grade payment gateway supporting instant UPI QR payments, UTR verification, signed webhooks, automated refunds, and idempotent transaction processing.

---

## Features

- **In-House Casino & Mini Games**:
  - **Mines**: 5x5 tile grid with 1–24 configurable mines, multiplier ladder, and real-time cashout.
  - **Dragon vs Tiger**: 2-card table duel with an 8-deck shoe simulation, 10s countdown intervals, and bead plate roadmap history.
  - **In-House Slots**: Native slots including Crazy 777 (with 4th bonus reel), Fortune Gems (with 15x multiplier wheel), and Super Ace (243 ways).
- **Lottery Games**: Live period rounds across Win Go (30s, 1m, 3m, 5m) synchronized with official live draw streams with dual-provider failover, resilient caching, and circuit-breaker protection, K3 (3-dice sum matrix), 5D (5 animated reels), and TRX Win Go (Tron blockchain hash verification).
  - **Authentic Win Go Lottery Experience**: Win Go arena styled in a clean Orange & White theme with cinema ticket countdown card, side ticket cutout notches, vertical dashed divider, white countdown digit boxes, clean primary color buttons (Green, Violet, Red), 2x5 grid of authentic 3D 4-notch scalloped lottery balls (0–9), chunky Big/Small buttons, an authentic bottom-sheet betting drawer with dynamic target-themed chevron header, balance presets (1, 10, 100, 1000), quantity stepper, multiplier quick chips (X1–X100), pre-sale rules agreement, flush Cancel / Total amount buttons, and animated dual-ring loading spinner feedback during bet placement.
- **Real-Time Aviator Crash Arena**: Authentic Spribe mobile radar crash interface with 69 Club branding, dual independent betting decks (Panel 1 & Panel 2), 60 FPS HTML5 Canvas propeller flight curve, real-time multiplier counter, live cashouts, pre-flight cancellations, auto-cashout, and provably fair cryptographic SHA-256 verification.
- **Private Admin Management & Risk Matrix**:
  - **Server-Authoritative Admin Security**: The dedicated `/admin` route requires an authenticated bearer session and a live database `admin` role on every request. No admin secret is accepted from the browser.
  - **Live Bet Distribution Matrix**: Real-time aggregation of bet volumes across Color markets (Red, Green, Violet), Size markets (Big, Small), and individual Digits (0 to 9).
  - **Live-Data Integrity**: Game screens fail closed when a verified live provider is unavailable; no fabricated results, player activity, or local bet-success notices are shown.
  - **Game-Wise Exposure Detail**: Read-only per-game breakdown of every active market side and its pending stake.
  - **Users Management (CRUD)**: Search users, adjust balances (credit/debit with audit trail), switch roles (`user`/`admin`), freeze accounts, and safely delete accounts.
  - **Payments & Settlements Queue**: Review and verify deposits and payout withdrawals with inline confirmation panels, custom admin notes, automated balance reconciliation, registered user mobile display, prominent target destination UPI / bank account callouts, and 1-click copy buttons.
- **Production-Grade Payment Gateway & Withdrawal Locks**:
  - **Duplicate & Concurrent Withdrawal Prevention**: Strictly blocks double submissions; users with an existing `PENDING` withdrawal cannot initiate another until completed. Rejects duplicate destination UPI VPAs or Bank Account Numbers concurrently across requests.
  - **Idempotency Layer**: Duplicate request prevention via `Idempotency-Key` headers (fast-path in-memory LRU + persistent DB cache).
  - **Per-User Mutex**: Prevents race conditions and double-click deductions on concurrent withdrawals or deposits.
  - **Signed Webhooks**: Ingests provider notifications with HMAC-SHA256 signature verification (`x-webhook-signature`) and replay attack deduplication.
  - **Atomic Balance Operations**: PostgreSQL stored procedures using `SELECT ... FOR UPDATE` locks for zero-drift balance consistency.
  - **Refund Engine**: Atomic full or partial refunds for deposits and withdrawals with complete audit logs.
  - **Payment Events Ledger**: Immutable append-only audit trail for all financial operations.
- **Authentication Gate & Session Security**:
  - **Modular Auth Architecture**: Standalone components for Login (`LoginPage.jsx`), Registration (`RegisterPage.jsx`), Forgot Password (`ForgotPasswordPage.jsx`), OTP Verification (`VerifyOtpPage.jsx`), and Password Reset (`ResetPasswordPage.jsx`) supporting phone (+91) and email authentication.
  - **Email Registration with Mandatory OTP Verification**: Dedicated 6-digit email OTP verification during registration with real-time Resend dispatch (`otp@game.69club1.site`), 60-second cooldown timer, duplicate email prevention (HTTP 409), and atomic single-use OTP consumption upon profile creation.
  - **3-Step Secure Password Recovery**: Zero-leak OTP delivery via WhatsApp or official Resend Email API, dedicated 6-digit OTP verification screen with 60s resend cooldown, and atomic single-use OTP validation upon setting new password.
  - **Real IP Database Rate Limiting**: Distributed rate limiter backed by PostgreSQL `public.ip_rate_limits` table and stored procedures. Resolves real client IP across Cloudflare, reverse proxies, and load balancers to enforce strict abuse prevention across authentication and financial endpoints.
  - **Slide-to-Verify Jigsaw Captcha**: Interactive human verification modal with high-res scenic canvas, custom jigsaw path cutouts, smooth touch/mouse slide drag, and ±8px alignment validation protecting login and registration endpoints.
  - **Protected Backend API**: Strict JWT `requireAuth` enforcement across all financial endpoints (`/withdraw`, `/vip/claim`, `/deposit`) and betting endpoints (`/bet`, `/slot/spin`, `/mines/*`, `/dragontiger/bet`, `/aviator/*`).
- **Service Center & Account Hub**:
  - Dedicated real-time Service Center subpages backed by PostgreSQL schemas: Profile & Password Settings (`SettingsPage.jsx` with unique backup recovery email binding), User Feedback & Issue Ticketing (`FeedbackPage.jsx`), System & Activity Announcements (`AnnouncementPage.jsx`), Interactive Beginner's Guide (`BeginnersGuidePage.jsx`), Platform Licensing & Security (`AboutUsPage.jsx`), and 24/7 Live Support (`CustomerServicePage.jsx`).
  - **Authoritative Profile Synchronization**: Client automatically revalidates live profile state from `GET /api/service/settings/profile` on initial load and hard browser refreshes, guaranteeing bound recovery emails and account settings persist seamlessly.
  - **Unique Backup Recovery Email**: Mobile-registered players can bind a verified recovery email in Settings. Enforced with a unique database index to ensure each email belongs to a single user, enabling instant OTP account recovery via email if phone access is lost.
  - Dedicated full-screen subpages with seamless back-navigation: Wallet Center (`WalletPage.jsx`), Fast Deposit (`DepositPage.jsx` with casino coral gradient balance card, 6-method payment selector, Phonepe channel, 3x3 preset chips `100–5K`, recharge guidelines, and persistent deposit history), Instant Withdrawal (`WithdrawPage.jsx` with live balance card, ARPay notice, 3-method selector for Bank Card, USDT, and UPI, bound bank card setup modal, ₹ amount input with All button, diamond rule disclaimers, and withdrawal history), Service Center subpages (Settings, Feedback, Announcements, Beginner's Guide, About Us, Customer Service), Deposit History (`DepositHistoryPage.jsx`), Withdrawal Status (`WithdrawalHistoryPage.jsx`), Game History & Settlement Ledger (`GameHistoryPage.jsx`), VIP Club (`VIPPage.jsx`), Notification Center (`NotificationPage.jsx`), Gifts & Hongbao Rewards (`GiftsPage.jsx`), Top-Up Coupons (`CouponsPage.jsx`), Security Center (`SecurityPage.jsx`), and 24/7 Customer Service (`CustomerServicePage.jsx`).
- **Anti-Inspect & Client Security Shield**:
  - Global protection engine (`antiInspect.js`) blocking right-click context menu, DevTools inspection shortcuts (`F12`, `Ctrl+Shift+I/J/C`), and source view (`Ctrl+U`), paired with CSS text-selection lockout and console sanitization.
- **Universal Site Loading Spinner & Top Progress Bar**: Automated API interceptor driving a sleek neon gradient top progress bar during network operations and a branded double-ring spinner overlay for high-friction workflows.
- **Audio Isolation & Sound Shield**: Zero background sounds or countdown ticks for unauthenticated visitors, authentication modals, or non-active game viewports; game audio only initializes for logged-in players inside active game arenas.
- **Activity & Multi-Tier Agent Promotion Engine**:
  - **Agency Promotion Hub**: Dedicated mobile Agency view (`PromotionView.jsx`) matching casino reference layouts: sunset hero card featuring yesterday's total commission, 2-column subordinate breakdown (`Direct subordinates` vs `Team subordinates` tracking registrations, deposit counts, deposit volume, and first depositors), prominent `INVITATION LINK` copy button, 7 structured feature cards (Partner rewards, Copy invitation code, Subordinate data, Commission detail, Invitation rules, Agent line customer service, Rebate ratio), and 4-quadrant `Promotion data` grid (This Week, Total commission, Direct Subordinate, Team members).
  - **Partner Rewards Subpage**: Dedicated referral partner interface (`PartnerRewardsPage.jsx`) featuring a golden trophy hero banner, live invitation metrics, full 3-tier deposit reward matrix (1st deposit bonuses ₹28–₹1,888, 2nd deposit bonuses ₹48–₹4,888, 3rd deposit bonuses ₹88–₹5,888), quick link copy, and invitation records modal.
  - **Extra First Deposit Bonus Modal**: App-themed popup (`FirstDepositBonusModal.jsx`) presenting 5% boosted bonus incentives on first recharges (₹500 -> ₹114, ₹1,000 -> ₹166, ₹5,000 -> ₹481) with 1-click deposit prefill and daily suppression controls.
  - **Live Bonus Accounting**: Real-time aggregation of daily accumulated and cumulative bonus earnings directly from the wallet transaction ledger.
  - **7-Day Attendance Bonus System**: Dedicated attendance subpage with consecutive login ribbon, dynamic accumulated bonus display, 7-tier progression (Day 1 ₹5.00 up to Day 7 ₹7,000.00), in-app Game Rules qualification matrix, and claim history.
  - **First Gift Activity Rewards**: Production-ready 30% first deposit compensation promotion page matching 69 Club mobile design, displaying event start timestamps, participation conditions table, and reactive server-backed bonus claims up to ₹200.00.
  - **Idempotent Gift Code Redemption**: Server-authoritative validation for promotional codes (`gift_codes` / `gift_redemptions`), preventing double-claims and crediting balances atomically.
  - **Multi-Tier Referral Tracking**: Real-time team subordinate hierarchy (Tier 1 Direct & Tier 2 Indirect), live bet turnover calculation across team members, automated tiered commissions (0.60% Tier 1, 0.18% Tier 2), and masked subordinate roster.
  - **Real-Time Turnover Rebate & Jackpot**: Automated cashback turnover tracking across game categories and a progressive community jackpot pool.
- **100% Asynchronous & Non-Blocking Architecture**: All HTTP controllers, background routines, and disk persistence use `async/await` and `fs.promises` with zero synchronous event-loop blocking, instrumented with high-precision response timing headers (`X-Response-Time`).
- **Zero-Leak Production Logging**: Automated build-time stripping of all `console` and `debugger` calls via Vite 8 and Oxc minifier; sandbox verification codes and internal debug routines are strictly isolated behind non-production environment checks.
- **Mobile-First UI**: 100% responsive fluid mobile layout optimized for all smartphone aspect ratios, dynamic viewport height (`--app-height`) auto-resizing across mobile browser URL bars, iOS Safe Area insets, touch targets, zero desktop scrollbar gutter, and symmetrically centered desktop luxury canvas.
- **Full-Screen Subpages & Game View**: Bottom navigation automatically unmounts when entering any game or inner subpage (Deposit, Withdraw, Wallet, VIP, History, etc.) to maximize vertical view area and eliminate navigation overlap; players seamlessly navigate back using the in-page header back button or native device system back navigation.

---

## Architecture

```
prince-club/
├── frontend/                     # React 18 SPA (Vite)
│   ├── public/                   # Static assets
│   └── src/
│       ├── api/                  # Axios HTTP client & API endpoints
│       ├── components/           # Game views, modals, and lobby layouts
│       ├── utils/                # Audio synthesizer & utility functions
│       ├── App.jsx               # Root navigation and view switcher
│       └── styles.css            # Responsive mobile styling
├── server/                       # Node.js / Express backend
│   ├── config/                   # Supabase database configuration
│   ├── controllers/              # Request handlers (auth, games, wallet, payments, webhooks, refunds)
│   ├── db/                       # SQL migrations: schema.sql, payment.sql
│   ├── middleware/               # Auth guards, validation, idempotency, payment mutex locks, rate limiters
│   ├── routes/                   # Express route declarations
│   └── services/                 # Game settlement and external API sync
└── tests/                        # Integration and unit test scripts
```

---

## Payment Gateway Endpoints

| Method | Endpoint | Description | Headers / Auth |
|---|---|---|---|
| `POST` | `/api/payments/create-deposit` | Initiates UPI QR deposit | `Authorization`, `Idempotency-Key` (optional) |
| `POST` | `/api/payments/submit-utr` | Submits 12-digit UTR with dedup check | `Authorization`, `Idempotency-Key` (optional) |
| `POST` | `/api/payments/webhook` | Ingests signed provider events | `x-webhook-signature` |
| `POST` | `/api/payments/refund` | Admin-initiated atomic refund | Admin `Authorization`, `Idempotency-Key` |
| `GET` | `/api/payments/refunds/:userId` | Retrieves refund history | `Authorization` |
| `GET` | `/api/payments/events/:userId` | Audit log of payment events | Admin `Authorization` |
| `POST` | `/api/wallet/withdraw` | Requests payout (BANK CARD, USDT TRC20/BEP20, or UPI) | `Authorization`, `Idempotency-Key` |

---

## Setup & Installation

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- PostgreSQL or a Supabase project

### 1. Clone & Install
```bash
git clone https://github.com/ETechnoviax-Tech/prince-club.git
cd prince-club
npm install
cd frontend && npm install && cd ..
```

### 2. Environment Setup
Create a `.env` file in the project root (see `.env.example` for full reference):
```env
PORT=5000
NODE_ENV=development

# Domain & API Routing Configuration (Change here to switch domains without touching code)
APP_DOMAIN=69club1.site
API_DOMAIN=api.69club1.site
FRONTEND_URL=https://69club1.site
API_URL=https://api.69club1.site

# Frontend Vite Environment
VITE_APP_DOMAIN=69club1.site
VITE_API_DOMAIN=api.69club1.site
VITE_API_BASE_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000/api

# Database & Security
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-key
ADMIN_IDENTIFIER=your-admin-phone-or-email
PAYMENT_WEBHOOK_SECRET=your-webhook-hmac-secret
MERCHANT_UPI_VPA=abhimanyu.maurya@pingpay
MERCHANT_NAME=abhimanyu maurya
# Rotational UPI Pool (10 - 15 Accounts)
# MERCHANT_UPI_VPA_1=vpa1@upi
# MERCHANT_UPI_VPA_2=vpa2@upi
# ...
# MERCHANT_UPI_VPA_15=vpa15@upi
```

Create `frontend/.env`:
```env
VITE_APP_DOMAIN=69club1.site
VITE_API_DOMAIN=api.69club1.site
VITE_API_BASE_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000/api
```

> **Note on Zero-Hardcoding**: When you change domains in production, simply update `APP_DOMAIN` and `API_DOMAIN` in `.env`. The backend dynamically updates CORS, origin filters, and health checks, and the frontend automatically resolves to `api.<domain>` in production while seamlessly using `localhost:5000` in local development.

### 3. Database Migration
1. Run `server/db/schema.sql` in your Supabase SQL editor to create the core tables and game schemas.
2. Run `server/db/payment.sql` to apply the payment gateway extensions (idempotency, payment locks, webhook events, refund requests, and atomic stored procedures).
3. Run `server/db/activity_promotion.sql` to apply the Activity and Multi-Tier Agent Promotion schemas (gift codes, single-use redemption constraints, attendance streaks, and referral hierarchy columns).

---

## Usage

### Start Server
```bash
npm run server
```
Server runs on `http://localhost:5000`.

### Start Frontend
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`.

### Run Test Suites
```bash
# Run payment gateway tests (idempotency, mutex locks, webhooks, refunds)
node tests/test_payment_gateway.js

# Run withdrawal & VIP bonus tests
node tests/test_withdrawal_vip.js

# Run full game modes test
node tests/test_multi_game_modes.js
```

---

## Deployment

### 1. Temporary Testing Deployment on Vercel (Frontend + Server Together)

Both the Express backend and React Vite frontend can be deployed together in a single Vercel project with zero extra configuration:

1. Import the repository into [Vercel](https://vercel.com/new).
2. Framework Preset: **Other** (Root directory: `./`).
3. Build Settings are automatically picked up from `vercel.json`:
   - **Build Command**: `vite build frontend`
   - **Output Directory**: `frontend/dist`
   - **API Routes**: Handled serverless via `api/index.js`
4. Add Environment Variables in Vercel project settings:
   - `SUPABASE_URL`: `https://your-project.supabase.co`
   - `SUPABASE_ANON_KEY`: `your-anon-key`
   - `SUPABASE_SERVICE_ROLE_KEY`: `your-service-role-key`
   - `ADMIN_IDENTIFIER`: `your-admin-phone`
5. Click **Deploy**. Both the client and API will be live on your `*.vercel.app` URL immediately.

---

### 2. Backend on Render (`api.69club1.site`)

You can deploy the backend to Render either using the native Node environment or Docker:

#### Method A: Docker Deployment (Recommended)
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository: `ETechnoviax-Tech/prince-club`.
3. Set the following settings:
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile.server` (or set Root Directory to `server` and use `server/Dockerfile`)
   - **Health Check Path**: `/api/health`
4. Add Environment Variables in Render:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `APP_DOMAIN`: `69club1.site`
   - `API_DOMAIN`: `api.69club1.site`
   - `FRONTEND_URL`: `https://69club1.site`
   - `API_URL`: `https://api.69club1.site`
   - `SUPABASE_URL`: `https://your-project.supabase.co`
   - `SUPABASE_ANON_KEY`: `your-anon-key`
   - `SUPABASE_SERVICE_ROLE_KEY`: `your-service-role-key`
   - `ADMIN_IDENTIFIER`: `your-admin-phone`
5. In Render **Settings** -> **Custom Domains**, add `api.69club1.site`. Add the CNAME record indicated by Render to your DNS provider.

#### Method B: AWS EC2 / Ubuntu VPS Deployment
1. Connect to your EC2 instance via SSH:
   ```bash
   ssh -i your-key.pem ubuntu@YOUR_EC2_IP
   ```
2. Install Node.js 20, Git, and PM2:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   sudo npm install -g pm2
   ```
3. Clone repository and install dependencies:
   ```bash
   git clone https://github.com/ETechnoviax-Tech/prince-club.git
   cd prince-club
   npm install --omit=dev
   ```
4. Copy production environment file:
   ```bash
   cp .env.production.example .env.production
   nano .env.production  # input your Supabase keys
   ```
5. Launch backend with PM2 cluster:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```
6. In Cloudflare DNS, add an **A record** for `api` pointing to your EC2 Public IP (`api.69club1.site` -> `YOUR_EC2_IP`).

---

### 2. Frontend on Cloudflare Pages (`69club1.site`)

1. In Cloudflare Dashboard, navigate to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
2. Select your repository `prince-club`.
3. Configure Build Settings:
   - **Framework preset**: `Vite`
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add Environment Variables:
   - `NODE_VERSION`: `20`
   - `VITE_APP_DOMAIN`: `69club1.site`
   - `VITE_API_DOMAIN`: `api.69club1.site`
   - `VITE_SUPABASE_URL`: `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `your-anon-key`
5. Click **Save and Deploy**.
6. In Cloudflare Pages project settings -> **Custom domains**, add `69club1.site` (and `www.69club1.site`). Cloudflare will automatically provision SSL certificates and routing.
7. *Note*: SPA route fallback is preconfigured via `frontend/public/_redirects` (`/* /index.html 200`).

---

### 3. Full-Stack Docker Deployment (Local or VPS)

To run both frontend (Nginx) and backend (Node.js) in containers:
```bash
# Build and start services in background
docker compose up -d --build

# View container logs
docker compose logs -f
```

---

## License
MIT
