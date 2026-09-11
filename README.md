# Prince Club

Real-time color prediction and trading platform built with React, Vite, Express.js, and Supabase. Features live rounds, wallet ledger tracking, and UPI payment integration with 12-digit UTR verification.

## Features

- **Authoritative Game Engine**: 45-second round cycles with automatic 8-second betting locks and deterministic outcomes.
- **Color & Number Predictions**: Supports Red, Green, Violet, and individual digits (0–9) with standard payout multipliers.
- **Supabase Persistence**: Relational PostgreSQL schema tracking profiles, balances, round results, bets, and transaction ledgers.
- **UPI Payments & UTR Verification**:
  - Dynamic QR code generation for PhonePe, Google Pay, Paytm, and BHIM.
  - 12-digit UTR submission with deduplication checks to prevent duplicate claims.
  - Atomic database stored procedures to credit balances safely upon verification.
- **Responsive Interface**: Mobile-first dark UI built with vanilla CSS.

## Architecture

```
├── index.html                  # Entry template
├── package.json                # Dependencies and run scripts
├── server/
│   ├── config/supabase.js      # Supabase database client
│   ├── controllers/            # Auth, wallet, game, and payment controllers
│   ├── db/
│   │   ├── schema.sql          # Supabase PostgreSQL schema and stored procedures
│   │   └── store.js            # Development in-memory fallback store
│   ├── middleware/             # Validation for payloads and 12-digit UTRs
│   ├── routes/                 # Express API endpoints
│   └── index.js                # Express app entrypoint
├── src/
│   ├── api/client.js           # Frontend API consumer
│   ├── components/DepositModal # UPI payment & UTR verification UI
│   ├── App.jsx                 # Application layout and state
│   ├── main.jsx                # React root
│   └── styles.css              # Styling rules
└── tests/
    └── test_backend.js         # Automated backend test suite
```

## Setup & Installation

### Prerequisites

- Node.js 18+
- Supabase account (free tier supported)

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
   Copy `.env.example` to `.env` and configure your credentials:
   ```bash
   cp .env.example .env
   ```
   Provide your `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `MERCHANT_UPI_VPA`.

4. Set up the database:
   Run the contents of `server/db/schema.sql` in your **Supabase SQL Editor** to create tables and atomic procedures.

## Usage

### Run Backend API
```bash
npm run server
```
Server runs at `http://localhost:5000`.

### Run Frontend Development Server
```bash
npm run dev
```
Client runs at `http://localhost:5173`.

### Run Automated Tests
```bash
npm test
```

## Deployment

### Frontend
Build optimized static assets:
```bash
npm run build
```
Deploy the generated `dist/` directory to Vercel, Netlify, or any static host.

### Backend
Deploy the Express server to platforms like Railway, Render, Fly.io, or VPS:
```bash
node server/index.js
```
Ensure all environment variables from `.env.example` are set on the hosting provider.
