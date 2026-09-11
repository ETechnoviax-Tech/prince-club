# Memory

## Project Overview
- **Repository**: Prince Club (`ETechnoviax-Tech/prince-club`)
- **Stack**: React 18, Vite, Express.js, Supabase (PostgreSQL), Lucide React, Vanilla CSS
- **Purpose**: Real-time color trading & prediction simulator with persistent Supabase DB and UPI/UTR payment verification.

## Architecture & Conventions
- `server/index.js`: Express.js backend server with CORS, health check, and route mounting.
- `server/config/supabase.js`: Supabase client with graceful local dev fallback.
- `server/controllers/paymentController.js`: UPI dynamic QR generation, 12-digit UTR submission, deduplication, and atomic verification.
- `server/controllers/walletController.js`: Balance queries, transactions ledger, wallet management.
- `server/controllers/gameController.js`: Server-synchronized 45s rounds, 8s lock window, bet validation.
- `server/db/schema.sql`: Complete PostgreSQL schema with stored procedure `approve_deposit_utr` for atomic wallet credits.
- `src/components/DepositModal.jsx`: Client UPI payment modal with QR code, copy VPA, and 12-digit UTR input form.
- `src/api/client.js`: Frontend HTTP API client.
- `tests/test_backend.js`: End-to-end automated test suite covering all 9 API flows.

## Recent Actions
- Added Express.js backend with modular architecture (`config`, `controllers`, `routes`, `middleware`, `db`).
- Designed and authored `server/db/schema.sql` for Supabase with UTR unique constraints and stored procedures.
- Created UPI deposit flow generating dynamic UPI QR codes and 12-digit UTR verification.
- Integrated `DepositModal` into the React wallet interface.
- Verified all 9 automated backend tests and production build.
