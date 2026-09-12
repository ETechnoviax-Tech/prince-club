# Prince Club - Color Trading Platform

A full-stack, mobile-first real-time color trading and prediction platform built with React 18, Vite, Express.js, and Supabase (PostgreSQL). Features live game sync with VeerGame Win Go rounds, authoritative settlement, signed HMAC sessions, and instant UPI QR payments with 12-digit UTR verification.

---

## Features

- **Live VeerGame Win Go Integration**:
  - Live round sync across 30s, 1Min, 3Min, and 5Min game modes.
  - MD5 request signing for upstream VeerGame API endpoints (`/GetGameIssue`, `/GetNoaverageEmerdList`).
  - Official draw results and automatic background settlement for Colors (Green 2x, Red 2x, Violet 4.5x), Numbers (0–9 at 9x), and Sizes (Big/Small at 2x).
  - Built-in resilient fallback engine if upstream is unreachable.
- **Security & Session Management**:
  - Signed HMAC-SHA256 session tokens.
  - Strict input validation and rate limiting on betting, auth, and payments.
  - Prevention of ID spoofing and atomic balance guards against concurrent balance deductions.
  - Admin-only financial verification endpoints.
- **Authentication & Multi-Channel OTP**:
  - Username & password authentication with referral bonuses.
  - Password recovery via WhatsApp (Cloud API / Twilio) and Email (Resend / SMTP) with local development previews.
- **Payment & Wallet System**:
  - Dynamic UPI QR codes compatible with PhonePe, Google Pay, and Paytm.
  - 12-digit UTR submission with deduplication and atomic PostgreSQL balance updates.
- **Mobile-First UI**:
  - Win Go layout with live countdown, recent draw outcome balls, split-gradient lottery balls (0 and 5), quick multipliers (X1–X100), and trend charts.
  - Zero-dependency Web Audio API sound effects.

---

## Architecture

```
├── frontend/                     # React 18 + Vite client
│   ├── src/
│   │   ├── api/client.js         # API client with token management
│   │   ├── components/           # Modals (Auth, UPI Deposit)
│   │   ├── utils/audio.js        # Web Audio synthesizer
│   │   ├── App.jsx               # Main application and state management
│   │   └── styles.css            # Responsive layout & theme styles
│   └── vite.config.js
├── server/                       # Node.js + Express backend
│   ├── config/supabase.js        # Database connection & client
│   ├── controllers/              # Game, Auth, Payment, Wallet handlers
│   ├── middleware/               # Auth, validation, and rate limiters
│   ├── routes/                   # API routes
│   └── services/
│       ├── veerGameService.js    # VeerGame API client & MD5 signature generator
│       └── notificationService.js# WhatsApp & Email OTP dispatchers
└── tests/                        # Integration and verification test suites
```

---

## Setup & Installation

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### 1. Clone & Install
```bash
git clone https://github.com/ETechnoviax-Tech/prince-club.git
cd prince-club
npm install
```

### 2. Environment Variables
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

And `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Database
Run the SQL schema in `server/db/schema.sql` inside your Supabase project SQL Editor to create the required tables and procedures.

---

## Usage

### Development Server
```bash
# Start backend API (Port 5000)
npm run server

# Start frontend (Port 5173)
npm run dev
```

### Running Tests
```bash
# Run real-time game tests
node tests/test_realtime_game.js

# Run VeerGame live sync and settlement tests
node tests/test_veer_bet_settlement.js

# Run security and validation tests
node tests/test_security_validation.js

# Run auth flows and OTP tests
node tests/test_auth_flows.js
node tests/test_whatsapp_email_otp.js
```

---

## Deployment

### Backend
Deploy `server/` to any Node.js hosting platform (e.g. Render, Railway, DigitalOcean, VPS):
```bash
node server/index.js
```

### Frontend
Build optimized production assets:
```bash
npm run build
```
Deploy the generated `frontend/dist/` folder to Vercel, Netlify, Cloudflare Pages, or serve via Nginx.

---

## License
MIT
