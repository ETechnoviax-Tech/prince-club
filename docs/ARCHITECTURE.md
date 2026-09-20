# Architecture & System Design - 69 Club [PROD]

## System Stack
- **Frontend**: React 18, Vite, Lucide React, Web Audio API, Vanilla CSS (Mobile-first 430px container).
- **Backend**: Node.js (>=22.0.0), Express.js (v5.x), ES Modules.
- **Database**: Supabase (PostgreSQL) with local in-memory fallback maps and async file-backed cache.
- **Real-Time Services**: In-house interval loops, cryptographic seeds (HMAC-SHA256), and external 55CLUB / VeerGame APIs.

## Architecture & Data Flow
1. **Client Tier**: React SPA communicating with backend Express API via `frontend/src/api/client.js`.
2. **Gateway & Middleware Tier**:
   - Dynamic CORS (`config/domain.js`).
   - Rate limiting per endpoint group (auth, bets, payments, withdrawals, webhooks, captchas).
   - Anti-bot interactive CAPTCHA verification (`middleware/captchaRateLimit.js`).
   - Per-user concurrency mutex lock (`middleware/paymentLock.js`).
   - Strict idempotency filter (`middleware/idempotency.js`).
   - Dual admin verification (`middleware/adminGuard.js`).
3. **Controller & Domain Tier**:
   - `authController.js`: Session tokens, registration, OTP flows, password recovery.
   - `gameController.js`: Authoritative Win Go rounds, lock windows, bet settlements.
   - `aviatorController.js`: Flight loops, crash RNG derivations, cashout settlements.
   - `paymentController.js` & `walletController.js`: UPI QR deposits, UTR submission, withdrawals, daily VIP bonus.
   - `adminController.js`: Exposure matrix, user CRUD, transaction ledger.
4. **Data Tier**:
   - Supabase tables: `profiles`, `wallets`, `wallet_transactions`, `bets`, `wingo_rounds`, `aviator_bets`, `deposit_requests`, `withdrawal_requests`, `payment_events`, `refund_requests`.
   - Stored procedures: `approve_deposit_utr`, `request_withdrawal_atomic`, `process_refund`, `acquire_payment_lock`.
