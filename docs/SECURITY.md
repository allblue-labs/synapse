# Security Policy

## Dependency Audit

Run `npm audit --workspaces` to classify findings. Do not run `npm audit fix --force` — it can introduce breaking changes.

Process:

1. Run `npm audit --workspaces`
2. Classify by severity, exploitability, and runtime exposure
3. Prefer direct dependency upgrades over force fixes
4. Record accepted temporary risk below

---

## Authentication

- Passwords hashed with **Argon2** (memory-hard, resistant to GPU attacks)
- JWT signed with `JWT_SECRET` (env var); default expiry 15m
- Auth endpoints throttled to 5 req/min per IP via `ThrottlerModule`
- Cookie: `SameSite=Lax`; `HttpOnly` hardening deferred (see DECISIONS.md)

## Tenant Isolation

- Every API request: `AuthGuard('jwt') → TenantGuard → RolesGuard`
- `TenantGuard` rejects `x-tenant-id` header if it mismatches JWT payload
- `TenantPrismaService` injects `tenantId` into all WHERE clauses
- All Prisma indexes include `tenantId` as the leading key

## Input Validation

- Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true`
- DTOs use `class-validator` decorators
- Environment validated with Zod at startup

## Rate Limiting

- Global: 120 req/min per IP
- Auth endpoints: 10 req/min per IP
- Implemented via `@nestjs/throttler` with `ThrottlerGuard` as a global guard

## Webhook Security

| Adapter   | Status |
|-----------|--------|
| Telegram  | Basic validation (TODO: HMAC with bot secret) |
| Discord   | Not implemented — throws `ServiceUnavailable` |
| WhatsApp  | Not implemented — throws `ServiceUnavailable` |

**Required before production:** Implement HMAC-SHA256 signature verification for all adapters using provider-specific header (`X-Hub-Signature-256` for WhatsApp, `X-Signature-Ed25519` for Discord).

## Secure Headers

Not yet configured. Required before production:

- `Helmet` for NestJS (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, CSP)
- Referrer-Policy: `strict-origin-when-cross-origin`
- Permissions-Policy: restrict camera/microphone

## Safe Logging

- `RequestLoggingInterceptor` logs method, path, status, duration, `requestId`
- Passwords and tokens are **not** logged (dto bodies excluded from request log)
- Action required: audit `json-logger.service.ts` calls that log raw payloads — mask `credentialsRef`, `passwordHash`, any token fields

## Known Accepted Risks (Temporary)

| Risk | Reason accepted | Target fix |
|------|-----------------|------------|
| Discord/WhatsApp webhook validation missing | Adapters throw 503 if called; not exposed in prod | Phase 3 |
| JWT stored in `Lax` cookie (not `HttpOnly`) | Required for client-side API auth header injection | Phase 5 BFF |
| No refresh token | 15m expiry; re-login required | Phase 5 |
