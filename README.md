# Prince Club

Prince Club is a full-stack, mobile-first real-time color trading and prediction platform built with React 18, Vite, Express.js, and Supabase (PostgreSQL). Designed for production environments with real users, it features a multi-level synchronized round engine (Parity 30s, Sapre 1m, Bcone 3m, Emerd 5m), Big/Small prediction markets, tamper-proof HMAC session tokens, atomic wallet deductions, sliding-window rate limiting, UPI QR deposits with 12-digit UTR verification, instant UPI/Bank withdrawals, and VIP daily check-in rewards.

---

## Key Features

- **Multi-Level Real-Time Game Engine**:
  - Four parallel game intervals running synchronously:
    - **Parity**: 30s round cycle (5s lock window) for high-frequency trading.
    - **Sapre**: 60s (1m) round cycle (10s lock window) for standard parity analysis.
    - **Bcone**: 180s (3m) round cycle (30s lock window) for mid-paced predictions.
    - **Emerd**: 300s (5m) round cycle (45s lock window) for high-volume signals.
  - Independent history roadmaps, period numbers, and server-side background settlement loops for each game mode.

- **Expanded Betting Markets**:
  - **Colors**: Green (2.0x), Red (2.0x), Violet (4.5x with 1.5x half-payouts on 0 and 5).
  - **Big / Small**: Big (numbers 5–9, 2.0x payout) and Small (numbers 0–4, 2.0x payout).
  - **Exact Numbers**: Direct digit predictions from 0 to 9 (9.0x payout).

- **User Wallet, Deposits & Withdrawals**:
  - **Dynamic UPI QR Deposits**: Real-time QR generation with 12-digit UTR deduplication and atomic wallet crediting.
  - **Payout Withdrawals**: Instant UPI VPA and IMPS Bank Account withdrawal requests with atomic balance locking to prevent double-spending.
  - **Admin Financial Controls**: Secure review endpoints allowing administrators to approve or reject withdrawals (with automatic refunds on rejection).

- **VIP Check-In & Rewards**:
  - 24-hour streak bonus granting ₹15–₹50 daily rewards to active players.
  - Automated duplicate claim prevention enforced both in-memory and database level.

- **Tamper-Proof Authentication & OTP**:
  - Cryptographically signed HMAC-SHA256 bearer tokens preventing account spoofing.
  - Multi-channel OTP verification supporting WhatsApp (Meta Cloud API, Twilio) and Email (Resend REST API, SMTP) with interactive channel switching.

- **Strict Zero-Bypass Security**:
  - Caller identity validation on all financial, betting, and wallet actions.
  - Atomic database deduction guards (`gte('balance', amount)`) preventing concurrent race-condition exploits.
  - Sliding-window rate limiters for authentication, betting, and payments.

---

## Project Structure

```
├── frontend/                     # React 18 / Vite client application
│   ├── index.html                # Mobile-first viewport layout with PWA meta tags
│   ├── vite.config.js            # Vite bundler and dev server configuration
│   ├── package.json              # Frontend dependencies and build scripts
│   ├── .env.example              # Frontend environment variables template
│   └── src/
│       ├── api/client.js         # Unified API client with automatic bearer tokens
│       ├── components/
│       │   ├── AuthModal.jsx     # Login, Signup, and multi-channel OTP dialog
│       │   ├── DepositModal.jsx  # Dynamic UPI QR payment and UTR submission dialog
│       │   └── WithdrawModal.jsx # UPI & Bank withdrawal payout dialog
│       ├── utils/audio.js        # Zero-dependency Web Audio API synthesizer
│       ├── App.jsx               # Mobile shell, multi-game engine tabs, and betting sheet
│       └── styles.css            # Dark theme, glassmorphism, and responsive layout
├── server/                       # Express.js REST API service
│   ├── index.js                  # Server entry point (port 5000)
│   ├── config/supabase.js        # Supabase database client and connectivity
│   ├── controllers/              # Game engine, auth, wallet, and payment logic
│   ├── middleware/
│   │   ├── auth.js               # HMAC token generation, verification, and admin guards
│   │   ├── validate.js           # Request payload sanitization and validators
│   │   └── rateLimit.js          # Sliding-window rate limiters
│   ├── services/
│   │   └── notificationService.js # WhatsApp and Email OTP dispatch engine
│   └── routes/                   # Route declarations
└── tests/
    ├── test_multi_game_modes.js  # Parity, Sapre, Bcone, Emerd, and Big/Small tests
    ├── test_withdrawal_vip.js    # Withdrawal requests, refunds, and VIP bonus tests
    ├── test_whatsapp_email_otp.js # WhatsApp and Email OTP delivery tests
    ├── test_auth_flows.js        # Authentication lifecycle tests
    └── clean_db.js               # Database cleanup utility
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### 2. Installation
```bash
git clone https://github.com/ETechnoviax-Tech/prince-club.git
cd prince-club
npm install
```

### 3. Environment Configuration
Create `.env` in the root and `frontend/.env`:
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Ensure your credentials are set:
```env
PORT=5000
VITE_API_BASE_URL=http://localhost:5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MERCHANT_UPI_VPA=princeclub@upi
MERCHANT_NAME=Prince Club
AUTO_APPROVE_UTR=false
```

### 4. Database Schema
Execute `server/db/schema.sql` in your Supabase SQL editor to create all required tables (`profiles`, `wallets`, `bets`, `deposit_requests`, `withdrawal_requests`, `password_resets`) and atomic stored procedures.

### 5. Running the Application

**Run Express API Server:**
```bash
npm run server
# API runs on http://localhost:5000
```

**Run Frontend:**
```bash
npm run dev
# Vite client runs on http://localhost:5173
```

---

## Automated Test Suites

Verify all system components before deployment:

```bash
# Verify 4 game modes (Parity, Sapre, Bcone, Emerd) and Big/Small bets
node tests/test_multi_game_modes.js

# Verify UPI/Bank withdrawals, refunds, and 24h VIP bonus
node tests/test_withdrawal_vip.js

# Verify multi-channel WhatsApp and Email OTP dispatch
node tests/test_whatsapp_email_otp.js

# Verify authentication lifecycle
node tests/test_auth_flows.js
```

---

## Production Build

Compile optimized production client assets:
```bash
npm run build
```
The output is written to `frontend/dist/`, ready for hosting on Vercel, Netlify, Cloudflare Pages, or Nginx.

---

## License
MIT
