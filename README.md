# Prince Club

A mobile-first color trading, lottery, and prediction gaming platform built with React 18, Express.js, and Supabase (PostgreSQL). Features real-time lottery rounds, crash games, in-house casino titles, third-party provider integration, and a production-grade payment gateway supporting instant UPI QR payments, UTR verification, signed webhooks, automated refunds, and idempotent transaction processing.

---

## Features

- **In-House Casino & Mini Games**:
  - **Mines**: 5x5 tile grid with 1–24 configurable mines, multiplier ladder, and real-time cashout.
  - **Dragon vs Tiger**: 2-card table duel with an 8-deck shoe simulation, 10s countdown intervals, and bead plate roadmap history.
  - **In-House Slots**: Native slots including Crazy 777 (with 4th bonus reel), Fortune Gems (with 15x multiplier wheel), and Super Ace (243 ways).
- **Lottery Games**: Live period rounds across Win Go (30s, 1m, 3m, 5m), K3 (3-dice sum matrix), 5D (5 animated reels), and TRX Win Go (Tron blockchain hash verification).
- **Aviator Crash Game**: Multiplier curve rendered on HTML5 canvas with manual and auto cashout.
- **Production-Grade Payment Gateway**:
  - **Idempotency Layer**: Duplicate request prevention via `Idempotency-Key` headers (fast-path in-memory LRU + persistent DB cache).
  - **Per-User Mutex**: Prevents race conditions and double-click deductions on concurrent withdrawals or deposits.
  - **Signed Webhooks**: Ingests provider notifications with HMAC-SHA256 signature verification (`x-webhook-signature`) and replay attack deduplication.
  - **Atomic Balance Operations**: PostgreSQL stored procedures using `SELECT ... FOR UPDATE` locks for zero-drift balance consistency.
  - **Refund Engine**: Atomic full or partial refunds for deposits and withdrawals with complete audit logs.
  - **Payment Events Ledger**: Immutable append-only audit trail for all financial operations.
- **Bonus & Activity System**: Daily attendance streak rewards, gift redemption codes, betting rebates, and daily fortune wheel spins.
- **Authentication**: Phone and email login/signup with OTP recovery support.

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
Create a `.env` file in the project root:
```env
PORT=5000
VITE_API_BASE_URL=http://localhost:5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-key
ADMIN_SECRET_KEY=your-admin-secret-key
PAYMENT_WEBHOOK_SECRET=your-webhook-hmac-secret
MERCHANT_UPI_VPA=merchant@upi
MERCHANT_NAME=Prince Club
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

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

### Frontend (Static SPA)
```bash
cd frontend
npm run build
```
Deploy the generated `frontend/dist` directory to Vercel, Netlify, Cloudflare Pages, or an Nginx web root.

### Backend (Node.js)
Deploy `server/` to any Node.js host (Render, Railway, VPS, or Docker container):
```bash
node server/index.js
```

---

## License
MIT
