# Prince Club

A full-stack, mobile-first real-time color trading and prediction platform built with React 18, Vite, Express.js, and Supabase (PostgreSQL). The application features live game sync with VeerGame Win Go rounds, multi-game parity modes (30s, 1Min, 3Min, 5Min), Big/Small betting markets, cryptographically signed HMAC sessions, instant UPI QR payments with 12-digit UTR verification, and automated UPI/Bank withdrawals.

---

## Features

- **Live Win Go & Multi-Game Engine**
  - Real-time round synchronization across four modes: Win Go 30s, 1Min, 3Min, and 5Min.
  - Live draw result sync with upstream VeerGame APIs (`/GetGameIssue`, `/GetNoaverageEmerdList`) via MD5 request signing.
  - Resilient local fallback engine maintaining continuous rounds if upstream is unreachable.
  - Automatic settlement for Colors (Green 2x, Red 2x, Violet 4.5x), Numbers (0–9 at 9x), and Sizes (Big/Small at 2x).

- **Betting Markets**
  - **Colors**: Green (digits 1, 3, 7, 9 at 2.0x; digit 5 at 1.5x), Red (digits 2, 4, 6, 8 at 2.0x; digit 0 at 1.5x), Violet (digits 0 and 5 at 4.5x).
  - **Sizes**: Big (numbers 5–9, 2.0x payout) and Small (numbers 0–4, 2.0x payout).
  - **Direct Numbers**: 0 through 9 with 9.0x payout multiplier.

- **Wallet, Deposits & Withdrawals**
  - **Dynamic UPI QR Deposits**: Instant payment QR compatible with PhonePe, Google Pay, and Paytm, with 12-digit UTR deduplication.
  - **Withdrawals**: Payout requests via UPI VPA or IMPS Bank Account with atomic balance deduction to eliminate double-spending.
  - **Admin Financial Controls**: Protected endpoints for reviewing and approving or rejecting payout requests (with automatic wallet refunds on rejection).
  - **VIP Daily Check-In**: 24-hour streak bonus granting ₹15–₹50 daily rewards to active players.

- **Security & Session Management**
  - HMAC-SHA256 signed bearer tokens preventing user spoofing.
  - Atomic database deduction guards (`gte('balance', amount)`) preventing concurrent race conditions.
  - Sliding-window rate limiters across auth, betting, and payment routes.
  - Strict input validation and sanitization on all endpoints.

- **Multi-Channel OTP**
  - Account recovery via WhatsApp (Meta Cloud API / Twilio) and Email (Resend / SMTP) with interactive channel switching and dev previews.

- **Mobile-First Interface**
  - Authentic Win Go layout with live countdown, recent draw outcome balls, dual split balls for 0 and 5, quick multipliers (X1–X100), and trend charts.
  - Zero-dependency Web Audio API synthesizer for sound effects.

- **Multi-Game Arcade Hub**
  - **Arcade Lobby**: 3-column mobile layout with Recommended Games, Top Games, and live RTP% pills.
  - **Aviator (Crash Game)**: Real-time flight canvas animation with exponential multiplier (1.00x → 200x+) and auto-cashout.
  - **Vortex**: Cosmic multi-ring multiplier wheel (Inner, Middle, Outer) with up to 50x payouts.
  - **Cricket Live**: Interactive 6-ball over prediction (Dot, 1-2 Runs, 4 Boundary, 6 Maximum, Wicket) with stadium turf visuals.
  - **PUBG 1MIN**: 1-minute battle royale survival zone predictions with weapon and helmet loot.
  - **3D Coin Flip**: Physics-based 3D spinning coin with Heads/Tails selection and 1.96x payout.
  - **Andar Bahar**: Traditional 52-card table game with dealer Joker card and step-by-step deal sequence.
  - **Fortune Spin Wheel ("Get ₹500")**: Floating center navigation wheel granting daily cash bonuses up to ₹500.
  - **Bottom Navigation**: 5-tab bar (Home, Activity, Center Wheel, Promotion, Account).

---

## Project Structure

```
├── frontend/                     # React 18 / Vite client application
│   ├── index.html                # Mobile-first viewport layout with PWA meta tags
│   ├── vite.config.js            # Vite bundler and dev server configuration
│   ├── package.json              # Frontend dependencies and build scripts
│   ├── .env.example              # Frontend environment template
│   └── src/
│       ├── api/client.js         # Unified API client with automatic bearer tokens
│       ├── components/
│       │   ├── AuthModal.jsx     # Login, Signup, and multi-channel OTP dialog
│       │   ├── DepositModal.jsx  # Dynamic UPI QR payment and UTR submission dialog
│       │   ├── WithdrawModal.jsx # UPI & Bank withdrawal payout dialog
│       │   ├── GameLobby.jsx     # 3-column arcade hub with Recommended & Top Games
│       │   ├── AviatorGame.jsx   # Crash game with canvas trajectory and live multiplier
│       │   ├── VortexGame.jsx    # Cosmic multiplier wheel with risk ring tiers
│       │   ├── CricketGame.jsx   # Live ball prediction game with stadium pitch
│       │   ├── PubgGame.jsx      # 1-minute battle royale drop zone survival game
│       │   ├── CoinFlipGame.jsx  # 3D spinning coin flip with streak tracking
│       │   ├── AndarBaharGame.jsx# Indian card game with step-by-step deal animation
│       │   └── SpinWheelModal.jsx# "Get ₹500" Fortune Spin Wheel modal
│       ├── utils/audio.js        # Web Audio API synthesizer
│       ├── App.jsx               # Main application shell and tab routing
│       └── styles.css            # Responsive layout and theme styling
├── server/                       # Express.js backend
│   ├── index.js                  # Server entry point (port 5000)
│   ├── config/supabase.js        # Supabase database client
│   ├── controllers/
│   │   ├── gameController.js     # Win Go multi-mode game engine
│   │   ├── aviatorController.js  # Aviator crash flight engine
│   │   ├── vortexController.js   # Vortex ring multiplier engine
│   │   ├── cricketController.js  # Cricket live ball outcome engine
│   │   ├── pubgController.js     # PUBG 1Min battle drop engine
│   │   ├── spinWheelController.js# Daily Fortune Wheel reward engine
│   │   ├── coinFlipController.js # Provably-fair instant coin toss engine
│   │   ├── andarBaharController.js # 52-card Andar Bahar deal engine
│   │   ├── authController.js     # Authentication and OTP flows
│   │   ├── paymentController.js  # UPI deposit and UTR verification
│   │   └── walletController.js   # Balance, withdrawals, and VIP bonuses
│   ├── middleware/               # Auth, validation, and rate limiting
│   ├── routes/                   # Express route declarations
│   └── services/
│       ├── veerGameService.js    # VeerGame API client & MD5 signature generator
│       └── notificationService.js# WhatsApp and Email OTP dispatchers
├── tests/                        # Integration and verification test suites
└── package.json                  # Root package scripts
```

---

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ETechnoviax-Tech/prince-club.git
   cd prince-club
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create `.env` in the root directory:
   ```env
   PORT=5000
   VITE_API_BASE_URL=http://localhost:5000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   JWT_SECRET=your-secure-secret-key
   ADMIN_SECRET_KEY=your-admin-secret-key
   MERCHANT_UPI_VPA=yourvpa@upi
   MERCHANT_NAME=Prince Club
   ```

   And create `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   ```

4. Database Setup:
   Execute `server/db/schema.sql` in your Supabase SQL editor to create all required tables (`profiles`, `wallets`, `bets`, `deposit_requests`, `withdrawal_requests`, `password_resets`) and stored procedures.

---

## Running the Application

### Development

Start the backend API server:
```bash
npm run server
# API runs on http://localhost:5000
```

In a separate terminal, start the Vite client:
```bash
npm run dev
# Client runs on http://localhost:5173
```

### Running Test Suites

```bash
# Multi-game modes & Big/Small market tests
node tests/test_multi_game_modes.js

# UPI/Bank withdrawals & VIP daily bonus tests
node tests/test_withdrawal_vip.js

# VeerGame live sync and settlement tests
node tests/test_veer_bet_settlement.js

# Authentication & OTP verification tests
node tests/test_auth_flows.js
node tests/test_whatsapp_email_otp.js

# Security and validation tests
node tests/test_security_validation.js
```

---

## Production Build & Deployment

### Backend
Deploy `server/` to any Node.js hosting platform (Render, Railway, DigitalOcean, AWS, VPS):
```bash
node server/index.js
```

### Frontend
Build optimized production assets:
```bash
npm run build
```
The output will be generated in `frontend/dist/`, ready to deploy to Vercel, Netlify, Cloudflare Pages, or serve via Nginx.

---

## License
MIT
