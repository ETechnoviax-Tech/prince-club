# Prince Club

A mobile-first color trading, lottery, and prediction gaming platform built with React 18, Express.js, and Supabase (PostgreSQL). Features real-time lottery rounds, crash games, third-party provider integration, instant UPI QR payments with UTR verification, and automated wallet balance handling.

---

## Features

- **In-House Casino & Mini Games**:
  - **Mines**: 5x5 tile grid with 1–24 configurable mines, combination-based multiplier ladder, and real-time cashout.
  - **Dragon vs Tiger**: Fast-paced 2-card table duel with an 8-deck shoe simulation, 10s countdown intervals, and bead plate roadmap history.
  - **In-House Slots**: Zero-fee native slots including Crazy 777 (with 4th bonus reel), Fortune Gems (with 15x multiplier wheel), and Super Ace (243 ways).
- **Lottery Games**: Live period rounds across Win Go (30s, 1m, 3m, 5m), K3 (3-dice sum matrix), 5D (5 animated reels), and TRX Win Go (Tron blockchain hash verification).
- **Aviator Crash Game**: Real-time multiplier curve rendered on HTML5 canvas with manual and auto cashout.
- **Wallet & Transactions**: Instant UPI QR generation, 12-digit UTR verification with duplicate checking, and IMPS/UPI withdrawal requests.
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
│   ├── controllers/              # Request handlers (auth, games, wallet, payments)
│   ├── middleware/               # Auth guards and validation
│   ├── routes/                   # Express route declarations
│   └── services/                 # Game settlement and external API sync
└── tests/                        # Integration and unit test scripts
```

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
MERCHANT_UPI_VPA=merchant@upi
MERCHANT_NAME=Prince Club
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Database Migration
Execute `server/db/schema.sql` in your Supabase SQL editor to create the required tables and stored procedures.

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

### Run Tests
```bash
node tests/test_all_games.js
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
