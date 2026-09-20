# Product Requirements Document (PRD) - 69 Club

## 1. Overview & Goals
- **Product Name**: 69 Club (55 Club Edition)
- **Goal**: High-concurrency, mobile-first real-time color trading, crash (Aviator), lottery (Win Go, K3, 5D, TRX), slots, and table games simulation platform with automated UPI/UTR payments and admin risk management.
- **Target Audience**: Mobile users, color prediction players, arcade gamers.

## 2. Core Features & Scope
- **Authentication**: Strict phone/username and email registration with WhatsApp & Email OTP verification, session JWT tokens, anti-bot CAPTCHA, and zero-bypass password recovery.
- **Gaming Arena**:
  - Win Go (Parity 30s, Sapre 1m, Bcone 3m, Emerd 5m) with synchronized round periods and live API failover.
  - Aviator Crash Game with real-time flight multiplier curve, canvas radar, and server-authoritative auto-cashout.
  - K3, 5D, and TRX Win Go lottery systems with real Tron block height hashes.
  - In-house native arcade slots (Crazy 777, Fortune Gems, Super Ace) and Mines / Dragon vs Tiger.
- **Financial Architecture**:
  - Dynamic UPI Intent QR generation and 12-digit UTR submission.
  - Per-user mutex payment locks preventing double-spend and concurrent mutations.
  - Idempotency middleware with TTL caching.
  - Signed webhooks with constant-time HMAC verification.
  - Atomic refunds and balance operations via PostgreSQL stored procedures.
- **Admin Control Matrix**:
  - Live risk ledger ("kispar kitna paisa laga kon kitna jeeta").
  - Role management, user status suspension, and manual balance credit/debit.

## 3. Non-Functional Requirements
- **Throughput & Concurrency**: 100% async, non-blocking I/O across all API endpoints.
- **Security**: Parameterized queries, CORS protection, rate limiting, and strict input validation.
- **Zero-Downtime Resilience**: Local in-memory and disk fallback stores when Supabase is unavailable.
