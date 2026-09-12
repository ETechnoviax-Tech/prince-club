# Prince Club

Prince Club is a full-stack, mobile-first real-time color trading and prediction platform built with React 18, Vite, Express.js, and Supabase (PostgreSQL). Designed for production environments with real users, it features an authoritative 45-second round engine, tamper-proof HMAC session tokens, atomic balance deduction, strict input sanitization, rate limiting, and dynamic UPI QR deposit processing with 12-digit UTR verification.

---

## Features

- **Tamper-Proof Authentication & Sessions**:
  - Cryptographically signed HMAC-SHA256 session tokens preventing user identity spoofing and unauthorized actions.
  - User registration with optional referral bonus (₹1,200 initial balance vs. ₹1,000 standard).
  - Secure login with PBKDF2/SHA-256 salted hashing and instant 1-click Guest Trader mode.
  - 6-digit OTP password recovery with 15-minute expiration windows.
- **Multi-Channel OTP Verification (WhatsApp & Email)**:
  - Deliver 6-digit verification codes directly to player WhatsApp numbers (via Meta WhatsApp Cloud API or Twilio) or Email inboxes (via Resend REST API or SMTP).
  - Built-in development sandbox simulator that logs formatted message previews when API credentials are not yet configured.
  - Interactive channel switcher in the frontend modal allowing players to choose between WhatsApp and Email verification.
- **Strict Zero-Bypass Security Architecture**:
  - **Identity Verification**: Protected routes verify caller identity against the bearer token to prevent users from placing bets, checking balances, or submitting UTRs on behalf of other accounts.
  - **Admin Gatekeeper**: Financial approval endpoints (`/api/payments/verify`) are strictly locked behind admin authentication, preventing unauthorized self-approval of balances.
  - **Anti-Race Condition**: Atomic balance deduction guards (`gte('balance', amount)`) prevent concurrent double-spending attacks.
  - **Input Sanitization**: Alphanumeric-only username validation, length constraints, bet selection whitelists, and 12-digit numeric UTR enforcement.
  - **Sliding Window Rate Limiting**: Zero-dependency memory rate limiters for authentication (15 req/min), betting (60 req/min), and deposits (20 req/min).
- **Authoritative Real-Time Game Engine**:
  - Synchronized 45-second round cycles with an 8-second countdown lock window enforced both on client and server.
  - Server-side background loop that automatically settles pending bets, resolves winning multipliers (Green 2.0x, Red 2.0x, Violet 4.5x, Single Digits 9.0x), and credits wallet payouts directly.
- **Mobile-First User Experience**:
  - Fluid mobile layout (360px–480px responsive view) with safe-area insets, sticky bottom navigation, bottom-sheet betting drawer, and sound feedback via the Web Audio API.
- **UPI QR Recharge & UTR Settlement**:
  - Dynamic QR generation compatible with PhonePe, Google Pay, Paytm, and BHIM.
  - Server-side deduplication preventing re-submission of previously used UTR numbers.
  - Atomic PostgreSQL stored procedures for wallet credits upon verification.

---

## Project Structure

```
├── frontend/                     # Dedicated React frontend application
│   ├── index.html                # Mobile entry layout with PWA meta tags
│   ├── vite.config.js            # Vite build and dev server configuration
│   ├── package.json              # Frontend dependencies and scripts
│   ├── .env.example              # Frontend environment template
│   └── src/
│       ├── api/client.js         # Unified API client with automatic bearer token attachment
│       ├── components/
│       │   ├── AuthModal.jsx     # Login, Register, Forgot, and Reset password dialog
│       │   └── DepositModal.jsx  # Dynamic UPI QR payment and UTR submission dialog
│       ├── utils/audio.js        # Web Audio API sound synthesizer
│       ├── App.jsx               # Mobile application shell and real-time state machine
│       └── styles.css            # Dark theme, glassmorphism, and responsive layout
├── server/                       # Node.js / Express backend service
│   ├── index.js                  # Express server entry point (port 5000)
│   ├── config/supabase.js        # Supabase database connection and status
│   ├── controllers/              # Auth, game, wallet, and payment logic
│   ├── middleware/
│   │   ├── auth.js               # Token generation, verification, and admin guards
│   │   ├── validate.js           # Strict request payload validators
│   │   └── rateLimit.js          # Sliding-window rate limiters
│   ├── services/
│   │   └── notificationService.js # Multi-channel WhatsApp & Email OTP dispatcher
│   └── routes/                   # Express route declarations
└── tests/
    ├── clean_db.js               # Script to wipe database records for fresh deployment
    ├── test_auth_flows.js        # Verification of signup, login, OTP, and reset
    ├── test_realtime_game.js     # Live round sync & authoritative payout loop tests
    └── test_whatsapp_email_otp.js # Multi-channel OTP verification suite
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
Copy `.env.example` to `.env` in the root and `frontend/.env.example` to `frontend/.env`:
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

### 4. Database Setup
Execute the SQL script in `server/db/schema.sql` inside your Supabase SQL editor to create all required tables, foreign keys, indexes, and atomic stored procedures.

To wipe test data and prepare the database for real users:
```bash
node tests/clean_db.js
```

### 5. Running the Application

**Start the API Server:**
```bash
npm run server
# Express API runs on http://localhost:5000
```

**Start the Frontend:**
```bash
npm run dev
# Frontend runs on http://localhost:5173
```
Alternatively, navigate to `frontend` and run directly:
```bash
cd frontend
npm run dev
```

---

## Testing & Quality Assurance

Run the test suites to verify system integrity:

```bash
# Verify authentication flows (Signup, Login, OTP, Reset)
node tests/test_auth_flows.js

# Verify WhatsApp and Email OTP delivery
node tests/test_whatsapp_email_otp.js

# Verify real-time 45s round engine and background settlement
node tests/test_realtime_game.js

# Run full backend suite
npm test
```

---

## Production Build

Compile optimized production client assets:
```bash
npm run build
```
The output will be placed in `frontend/dist/`, ready to be served by any static host (Vercel, Netlify, Cloudflare Pages, or Nginx) while the Express API runs on your backend server.

---

## License
MIT
