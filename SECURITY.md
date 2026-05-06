# Security Policy

Thanks for taking the time to look at Synapse's security posture. This
document is the authoritative reference for how we handle vulnerability
reports, what the in-scope surface looks like, and what protections are
already in place.

## Reporting a vulnerability

**Email:** `security@synapse.ai`
**Encryption:** PGP key on request.

Please include:

- a clear description of the issue and impact
- minimal reproduction steps (PoC, request/response samples, or a script)
- the affected version (commit SHA or release tag), environment, and any
  configuration knobs that matter
- your name + handle (or "anonymous") for the post-fix advisory

We commit to:

| Step                           | Target |
|--------------------------------|--------|
| Acknowledge receipt            | 24 h   |
| Initial triage / severity      | 72 h   |
| Fix or mitigation in `main`    | 14 d for high/critical, 30 d for medium, 90 d for low |
| Public advisory + credit       | After fix is rolled out and downstream tenants notified |

We will not pursue legal action for good-faith research that:

- doesn't pivot beyond your own tenant or test data,
- doesn't degrade availability for other users,
- doesn't access, alter, or exfiltrate data you're not authorised to read,
- gives us a reasonable window to fix before public disclosure.

## Supported versions

The `main` branch is the only supported tag while we are pre-1.0. Once 1.0
ships we will publish an LTS schedule here.

## In-scope

- The Synapse API (`apps/api`) — including authentication, tenant isolation,
  audit log, and the module/event runtime.
- The Synapse Web app (`apps/web`) — XSS, CSP regressions, auth flow gaps,
  open-redirects.
- The shared contracts package (`packages/contracts`) — type drift that
  would weaken authorisation guarantees.
- The Docker images and the migration pipeline.

## Out of scope

- Third-party services (OpenAI, Stripe, Telegram). Report those upstream.
- Issues that require a malicious admin (OWNER-or-ADMIN) — by design, those
  roles can mutate their own tenant. File a usability bug instead.
- Self-XSS or social engineering against staff.
- Volumetric DoS without a logic vector — handled at the LB / WAF layer
  in production deployments.
- Vulnerabilities in `node:20-alpine` upstream that are mitigated by our
  `apk upgrade --no-cache` baseline (see `apps/api/Dockerfile`).

## Threat model summary

The platform is multi-tenant. The non-negotiable invariants are:

1. **Tenant isolation.** No row, queue job, file, log line, or audit event
   from tenant A may reach tenant B's session, code path, or metric.
2. **Permission integrity.** Authorization decisions go through the
   `@Permissions(...)` decorator in NestJS guards — never role string
   comparisons in controllers, never client-side gating as a
   security boundary.
3. **Append-only audit.** Every authentication and high-privilege action
   produces an `AuditEvent` row. The model has no UPDATE or DELETE entry
   point in `AuditService`.
4. **Secret hygiene.** No log line, response, or stack trace ever contains
   a password, token, cookie, or API key in clear text. Enforced centrally
   via `apps/api/src/common/logging/redact.ts`.

## Active controls (as of latest commit)

### HTTP / transport
- `helmet` middleware on the API (HSTS in production, X-Content-Type-Options,
  Referrer-Policy, X-Frame-Options, COOP, no `X-Powered-By`).
- Strict CSP on Next.js (`apps/web/next.config.ts`), HSTS, Permissions-Policy
  denying camera/microphone/geolocation/etc. by default.
- CORS allowlist is explicit; empty/unset is "deny" in production, "reflect"
  in development.
- `app.set('trust proxy', 1)` to honour `X-Forwarded-For` from the LB.

### Authentication
- Passwords hashed with argon2 (default `argon2.hash` parameters; revisit
  before going to GA).
- JWTs bound to `iss=synapse-api` + `aud=synapse-web`. Rotating either env
  var invalidates every existing session.
- Per-IP throttling on `/auth/*` (`@Throttle({auth: 5/min})`) plus a
  Redis-backed per-(IP, email) lockout (10 failures → 15 min lock).
- Login responses use a generic message — never leak whether the email
  exists.
- All authentication outcomes (success / failure / lockout) hit the audit
  log.

### Authorization
- RBAC: 4 roles (OWNER / ADMIN / OPERATOR / VIEWER) → permission map in
  `@synapse/contracts`. Backend is the only authority; UI gating via
  `<Can>` is for usability, not security.
- Global `JwtAuthGuard` + `TenantGuard` + `PermissionsGuard` registered
  via `APP_GUARD` — every route is protected by default; opt-out requires
  `@Public()`.
- Tenant context cross-checked between JWT and `X-Tenant-Id` header.

### Logging
- `redact()` walks every log payload — sensitive keys (password, token,
  authorization, cookie, secret, …) and Bearer-pattern strings are scrubbed.
- Request IDs propagate from incoming `X-Request-Id` (or a generated UUID)
  into every log line and the response header for debugging.

### Process
- Container images run as a non-root user (`nestjs` / `nextjs`).
- Postgres / Redis volumes are named so backups can be wired without hitting
  ephemeral mounts.
- Migrations are immutable on `main` (see `apps/api/prisma/MIGRATIONS.md`).

## Things explicitly *not* yet done (P1 backlog)

- HttpOnly + double-submit-token CSRF flow on the web app — currently the
  bearer token is JS-readable.
- Refresh-token rotation. The 15-minute access token is not yet paired
  with a refresh token.
- Dependency-scan gate in CI (`npm audit --omit=dev` on every PR).
- Per-tenant rate-limit overrides for the throttler.
- Audit-event UI / export.

If your finding overlaps with this list, please still report it — knowing
the impact you have in mind helps us prioritise.
