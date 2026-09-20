# Coding Rules & Conventions - 69 Club

## General Principles
- Non-blocking asynchronous I/O throughout: never use synchronous `fs` methods in request paths.
- Clean separation of concerns: routes declare middleware; controllers handle domain logic; services handle math/integrations.
- Production-ready code: strict error handling, sanitized client error messages, and structured internal logs.
- Zero-hardcoding: dynamic domain, ports, and credentials via environment variables.

## Security & Reliability
- Parameterized queries and stored procedures for all database operations.
- Per-user mutex locks on financial and betting operations to eliminate race conditions.
- Strict input validation on all boundaries via middleware.
- Constant-time string comparisons (`crypto.timingSafeEqual`) on signatures and hashes.
- Idempotent API endpoints for state-mutating requests (`Idempotency-Key`).
