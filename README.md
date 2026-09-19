# 69 Club

A mobile-first color trading, lottery, and prediction gaming platform built with React 18, Express.js, and Supabase (PostgreSQL). Features real-time lottery rounds, crash games, in-house casino titles, third-party provider integration, dual-verification administrative dashboard with live risk distribution matrices, and a production-grade payment gateway supporting instant UPI QR payments, UTR verification, signed webhooks, automated refunds, and idempotent transaction processing.

---

## Features

- **In-House Casino & Mini Games**:
  - **Mines**: 5x5 tile grid with 1–24 configurable mines, multiplier ladder, and real-time cashout.
  - **Dragon vs Tiger**: 2-card table duel with an 8-deck shoe simulation, 10s countdown intervals, and bead plate roadmap history.
  - **In-House Slots**: Native slots including Crazy 777 (with 4th bonus reel), Fortune Gems (with 15x multiplier wheel), and Super Ace (243 ways).
- **Lottery Games**: Live period rounds across Win Go (30s, 1m, 3m, 5m) synchronized with official live draw streams, K3 (3-dice sum matrix), 5D (5 animated reels), and TRX Win Go (Tron blockchain hash verification).
  - **Simplified Win Go Betting**: Clear stake → market → confirmation flow with visible payout and number-range labels.
- **Real-Time Aviator Crash Game**: Authoritative Spribe-style multiplayer crash game with per-user concurrency mutex locks, 1-bet-per-round anti-double-click protection, 60 FPS interpolated flight curves, pre-flight bet cancellations, server-reconciled auto-cashouts, and high-contrast dark cockpit styling.
- **Private Admin Management & Risk Matrix**:
  - **Server-Authoritative Admin Security**: The dedicated `/admin` route requires an authenticated bearer session and a live database `admin` role on every request. No admin secret is accepted from the browser.
  - **Live Bet Distribution Matrix**: Real-time aggregation of bet volumes across Color markets (Red, Green, Violet), Size markets (Big, Small), and individual Digits (0 to 9).
  - **Live-Data Integrity**: Game screens fail closed when a verified live provider is unavailable; no fabricated results, player activity, or local bet-success notices are shown.
  - **Game-Wise Exposure Detail**: Read-only per-game breakdown of every active market side and its pending stake.
  - **Bets & Winners Ledger**: Detailed tracking of all placed bets, targets, wager amounts, winning outcomes, and exact payouts.
  - **Users Management (CRUD)**: Search users, adjust balances (credit/debit with audit trail), switch roles (`user`/`admin`), freeze accounts, and safely delete accounts.
  - **Payments & Settlements Queue**: Review and verify deposits and payout withdrawals with inline confirmation panels, custom admin notes, and automated balance reconciliation.
- **Production-Grade Payment Gateway**:
  - **Idempotency Layer**: Duplicate request prevention via `Idempotency-Key` headers (fast-path in-memory LRU + persistent DB cache).
  - **Per-User Mutex**: Prevents race conditions and double-click deductions on concurrent withdrawals or deposits.
  - **Signed Webhooks**: Ingests provider notifications with HMAC-SHA256 signature verification (`x-webhook-signature`) and replay attack deduplication.
  - **Atomic Balance Operations**: PostgreSQL stored procedures using `SELECT ... FOR UPDATE` locks for zero-drift balance consistency.
  - **Refund Engine**: Atomic full or partial refunds for deposits and withdrawals with complete audit logs.
  - **Payment Events Ledger**: Immutable append-only audit trail for all financial operations.
- **Authentication Gate & Session Security**:
  - **Modular Production Auth Architecture**: Dedicated, standalone components for Login (`LoginPage.jsx`), Registration (`RegisterPage.jsx`), Forgot Password (`ForgotPasswordPage.jsx`), and Password Reset (`ResetPasswordPage.jsx`) supporting phone (+91) and email authentication.
  - **Slide-to-Verify Jigsaw Captcha**: Interactive human verification modal with high-res scenic canvas, custom jigsaw path cutouts, smooth touch/mouse slide drag, and ±8px alignment validation protecting login and registration endpoints.
  - **Zero-Bypass Credential Verification**: Strict password verification rejecting unauthenticated requests and non-existent accounts with 401 Unauthorized; dual persistence across Supabase DB and local JSON stores.
  - **Protected Backend API**: Strict JWT `requireAuth` enforcement across all financial endpoints (`/withdraw`, `/vip/claim`, `/deposit`) and betting endpoints (`/bet`, `/slot/spin`, `/mines/*`, `/dragontiger/bet`, `/aviator/*`).
- **Standalone Subpages Architecture**:
  - Dedicated full-screen subpages with seamless back-navigation: Wallet Center (`WalletPage.jsx`), Fast Deposit (`DepositPage.jsx`), Instant Withdrawal (`WithdrawPage.jsx`), Deposit History (`DepositHistoryPage.jsx`), Withdrawal Status (`WithdrawalHistoryPage.jsx`), VIP Club (`VIPPage.jsx`), Notification Center (`NotificationPage.jsx`), Gifts & Hongbao Rewards (`GiftsPage.jsx`), Top-Up Coupons (`CouponsPage.jsx`), Security Center (`SecurityPage.jsx`), and 24/7 Customer Service (`CustomerServicePage.jsx`). Dynamic event-driven notifications with clean zero-states, native device session detection, and persistent gift redemptions.
- **Anti-Inspect & Client Security Shield**:
  - Global protection engine (`antiInspect.js`) blocking right-click context menu, DevTools inspection shortcuts (`F12`, `Ctrl+Shift+I/J/C`), and source view (`Ctrl+U`), paired with CSS text-selection lockout and console sanitization.
- **Universal Site Loading Spinner & Top Progress Bar**: Automated API interceptor driving a sleek neon gradient top progress bar during network operations and a branded double-ring spinner overlay for high-friction workflows.
- **Audio Isolation & Sound Shield**: Zero background sounds or countdown ticks for unauthenticated visitors, authentication modals, or non-active game viewports; game audio only initializes for logged-in players inside active game arenas.
- **Bonus & Activity System**: Daily attendance streak rewards, gift redemption codes, betting rebates, and daily fortune wheel spins.
- **Mobile-First UI**: 100% responsive fluid mobile layout optimized for all smartphone aspect ratios, iOS Safe Area insets, touch targets, and desktop-centered canvas.

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
| `POST` | `/api/wallet/withdraw` | Requests payout (UPI or Bank) | `Authorization`, `Idempotency-Key` |

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
MERCHANT_UPI_VPA=merchant@upi
MERCHANT_NAME=69 Club
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
3. Build Settings are automatically picked up from [`vercel.json`](file:///c:/Users/deepe/Desktop/prince-club/vercel.json):
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
