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
| Stripe    | HMAC-SHA256 signature verification with raw body and timestamp tolerance |
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

## 2026-05-07 Backend Update

- Changed: Pulse routes now require `pulse:*` permissions and the Pulse repository writes through tenant-scoped update/readback boundaries.
- Completed: retired old backend permission/resource names from active code and shared permission contracts.
- Pending: add automated negative tests for cross-tenant Pulse read/write attempts and forbidden roles.
- Risks: Prisma delegates can still be called directly in future code; tenant-owned writes must keep repository boundaries.
- Next recommended step: add AppSec tests for `/v1/pulse/queue`, `/v1/pulse/entries`, validation, reject, and retry paths.

## 2026-05-07 Naming Update

- Changed: security contracts now use `pulse:*` permissions.
- Completed: guard behavior and tenant-scoped write protections are unchanged.
- Pending: forbidden-role and cross-tenant negative tests for Pulse.
- Risks: stale client permissions will produce 403s.
- Next recommended step: test every Pulse endpoint against `OWNER`, `ADMIN`, `OPERATOR`, and `VIEWER`.

## 2026-05-07 RBAC + Route Protection Update

- Changed: added security tests for `PermissionsGuard`, `TenantGuard`, and Pulse route permission metadata.
- Completed: public-route bypass, auth-only route allow, Pulse operator allow, viewer mutation reject, missing-role reject, tenant context requirement, and `x-tenant-id` mismatch rejection are covered.
- Pending: authenticated HTTP e2e tests with real JWTs and database users.
- Risks: guard unit tests can miss global app guard ordering or strategy configuration regressions.
- Next recommended step: add e2e tests for Pulse endpoints after test database wiring is standardized.

## 2026-05-07 Pulse Tenant Isolation Test Update

- Changed: added tests that assert Pulse repository updates include both `id` and `tenantId`, and tenant misses throw `NotFoundException`.
- Completed: query-shape coverage now guards against obvious cross-tenant persistence regressions.
- Pending: end-to-end cross-tenant attack tests with real persisted data.
- Risks: direct `PrismaService` usage outside repositories could bypass these protections.
- Next recommended step: add a static check or lint rule for direct tenant-owned Prisma delegate access.

## 2026-05-07 Module Registry Store Update

- Changed: module enable/disable now persists tenant-scoped state and records audit events.
- Completed: `modules.enabled` and `modules.disabled` audit actions were added; module enablement is no longer only in memory.
- Completed: tenant-facing registry operations are restricted to `PUBLIC` catalog items.
- Pending: authorization e2e tests for module registry endpoints and entitlement checks before enabling paid modules.
- Risks: admins can enable Pulse without billing entitlement enforcement until billing core lands.
- Next recommended step: require entitlement checks in `ModuleRegistryService.enable` once billing models exist.

## 2026-05-07 Billing Core Update

- Changed: module enablement now calls billing entitlement checks before tenant installation state is written.
- Completed: billing admin route metadata requires `billing:manage`; billing read routes require `billing:read`; feature flag updates write audit events.
- Pending: HTTP e2e authorization tests for billing routes and Stripe webhook signature validation.
- Risks: feature flag mutation is powerful and must remain limited to `OWNER` because `ADMIN` intentionally lacks `billing:manage`.
- Next recommended step: add signed Stripe webhook handling and e2e tests for billing route roles.

## 2026-05-07 Operational Usage Metering Update

- Changed: usage summary route is protected by `billing:read`; usage writes are server-side only through `UsageMeteringService`.
- Completed: usage events are tenant-scoped and idempotency keys are unique per tenant.
- Pending: e2e tests for usage summary authorization and abuse-resistant rate/volume limits.
- Risks: incorrect instrumentation can overcount or undercount billable events.
- Next recommended step: add reconciliation checks before Stripe usage reporting.

## 2026-05-07 Usage Rating Update

- Changed: usage rate management is restricted to `billing:manage`; rated summaries require `billing:read`.
- Completed: missing/inactive rates do not fabricate billable prices.
- Pending: audit events for rate changes and e2e role tests for usage rating endpoints.
- Risks: rate changes affect future rating calculations and should be reviewed/audited before production billing.
- Next recommended step: add audit recording for usage rate changes before Stripe reporting.

## 2026-05-07 Stripe Usage Reporting Update

- Changed: Stripe meter event calls use server-side `STRIPE_SECRET_KEY` only; no Stripe write API is exposed directly to clients.
- Completed: Stripe reporting endpoints require `billing:manage`; failed/skipped sends are persisted for review.
- Pending: signed Stripe webhook endpoint and replay protection.
- Risks: outbound Stripe reporting without webhook reconciliation can drift from Stripe invoice state.
- Next recommended step: implement webhook signature validation using `STRIPE_WEBHOOK_SECRET`.

## 2026-05-07 Stripe Webhook Reconciliation Update

- Changed: `POST /v1/billing/stripe/webhook` is explicitly public for Stripe delivery but protected with raw-body signature verification, five-minute timestamp tolerance, and event-id idempotency.
- Completed: duplicate Stripe events cannot reapply lifecycle changes; processed/ignored/failed webhook state is persisted; successful processing records audit.
- Pending: HTTP e2e tests with raw signed payloads, retry controls for failed reconciliation, and secret rotation procedure.
- Risks: the endpoint is unauthenticated by design, so `STRIPE_WEBHOOK_SECRET` configuration and raw-body preservation are mandatory in every environment.
- Next recommended step: add e2e webhook tests and deployment checks that fail startup when production Stripe webhook secrets are absent.

## 2026-05-07 Stripe Checkout Provisioning Update

- Changed: subscription checkout creation is restricted to `billing:manage` and uses server-side Stripe credentials only.
- Completed: customer creation and checkout creation record audit events; tenant/plan metadata is generated by the backend, not accepted from clients.
- Pending: e2e authorization tests, customer portal authorization tests, and production secret/price configuration checks.
- Risks: success/cancel URLs are accepted as backend contract inputs and must remain allowlisted before public production rollout.
- Next recommended step: add URL allowlisting for checkout redirects and customer portal return URLs.

## 2026-05-07 Stripe Portal + Redirect Allowlist Update

- Changed: billing redirect URLs are now origin-checked for checkout and portal session creation.
- Completed: portal session creation is restricted to `billing:manage`, requires a tenant-owned Stripe customer id, and records audit events.
- Pending: e2e tests for rejected origins and role matrix coverage for portal creation.
- Risks: allowlist fallback to CORS origins is convenient for development but production should set `BILLING_REDIRECT_ALLOWED_ORIGINS` explicitly.
- Next recommended step: enforce explicit billing redirect origins in production startup validation.

## 2026-05-07 Stage 1 Backend Refinement + Pulse Foundation Update

- Changed: permission denials now record forbidden audit events; Pulse operational events redact sensitive metadata keys before persistence.
- Completed: new Pulse operational tables are tenant-scoped; integration settings store `credentialsRef` only, not provider secrets.
- Pending: e2e forbidden-action audit tests, production secret-reference backend, and payload size/schema limits for operational events.
- Risks: operational event payloads are flexible JSON and need strict DTO/use-case validation before broad APIs are exposed.
- Next recommended step: add DTO schemas and e2e tests for Pulse operational event writes.

## 2026-05-07 Pulse Operational Lifecycle Wiring Update

- Changed: Pulse create/validate/reject/retry actions now generate operational events from server-side use cases.
- Completed: event payloads avoid raw message/provider payload persistence and include operational ids/status only.
- Pending: payload schema enforcement for every event type and e2e forbidden-action audit tests.
- Risks: event metadata must remain audit-safe as more transport/integration data is added.
- Next recommended step: add event payload schema helpers before exposing timeline APIs.

## 2026-05-07 Pulse Channel + Conversation Ingestion Update

- Changed: provider/channel/participant context is resolved server-side into tenant-owned records.
- Completed: repository tests assert tenant-leading unique keys for channel and conversation upserts.
- Pending: direct `conversationId` ownership validation and DTO schemas for provider webhook ingestion.
- Risks: accepting direct ids before ownership validation can become a cross-tenant risk if exposed outside trusted backend flows.
- Next recommended step: validate direct `conversationId` by tenant or remove it from public ingestion contracts.

## 2026-05-07 Pulse Direct Conversation Validation Update

- Changed: direct `conversationId` is now looked up with tenant scope before use.
- Completed: no entry, queue job, usage record, or operational event is created when the id is missing or belongs elsewhere.
- Pending: e2e cross-tenant ingestion tests with persisted conversations.
- Risks: repository-level tests still need database-backed confirmation.
- Next recommended step: add HTTP e2e coverage for direct-id rejection.

## 2026-05-07 Pulse Channel + Conversation Read API Update

- Changed: read-only channel/conversation routes are protected by `pulse:read`.
- Completed: detail lookups use `{ tenantId, id }`; list queries filter by tenant.
- Pending: e2e tests with persisted cross-tenant data and pagination limits.
- Risks: unbounded list endpoints can become noisy at scale.
- Next recommended step: add pagination DTOs and e2e tenant leak tests.

## 2026-05-07 Pulse Ticket + Timeline Read API Update

- Changed: ticket reads are protected by `tickets:read`; conversation event reads are protected by `pulse:read`.
- Completed: repositories filter by tenant for ticket and event reads.
- Pending: e2e role/tenant tests and pagination limits.
- Risks: event timelines must not expose raw provider payloads or secrets as richer payloads are added.
- Next recommended step: add response shaping that returns audit-safe event summaries only.

## 2026-05-07 Pulse Read Pagination Update

- Changed: Pulse read endpoints now cap `pageSize` at 100 through DTO validation.
- Completed: list/count queries remain tenant-scoped.
- Pending: e2e validation tests for invalid query params and filter-specific leak tests.
- Risks: validated pagination reduces blast radius but does not replace authorization/e2e tests.
- Next recommended step: add e2e tests for pagination limits and cross-tenant reads.

## 2026-05-07 Pulse Read Filtering Update

- Changed: read filters use enum/date/string DTO validation before repository access.
- Completed: repository tests assert tenant filters are preserved alongside resource filters.
- Pending: HTTP e2e tests for invalid filter values and cross-tenant reads.
- Risks: event type is a string filter and should remain constrained by known event types once event schemas are centralized.
- Next recommended step: introduce a central Pulse event type catalog.

## 2026-05-07 Pulse Read Contract Test Update

- Changed: added AppSec-focused contract tests for Pulse read filters.
- Completed: DTO tests reject invalid enum/date filters and controller tests verify tenant context comes from the server-side request path, not client query payloads.
- Pending: HTTP e2e tests for global validation behavior and tenant isolation.
- Risks: event-type strings remain flexible until a central catalog is added.
- Next recommended step: add HTTP e2e coverage for invalid filters and cross-tenant read attempts.

## 2026-05-07 Pulse HTTP Read E2E Harness Update

- Changed: added request-level AppSec tests for filtered Pulse reads.
- Completed: invalid query filters return 400 before use cases run; mismatched tenant headers return 401 before reads run; forbidden ticket reads return 403 and emit `auth.forbidden`.
- Pending: database-backed cross-tenant leak tests.
- Risks: local test auth is intentionally synthetic and only exists inside the spec.
- Next recommended step: add two-tenant database fixtures for filtered read paths.

## 2026-05-08 Pulse Ticket Lifecycle Mutation Update

- Changed: ticket lifecycle commands now validate DTOs, enforce tenant-scoped ticket lookup before writes, and emit audit-safe operational payloads.
- Completed: sensitive keys in lifecycle event payload data are masked; forbidden route behavior remains under `tickets:*` permissions; terminal ticket mutations reject invalid operations.
- Pending: rate limiting for high-risk mutation routes and database-backed cross-tenant mutation tests.
- Risks: audit/event writes are sequential best-effort after the ticket update; a future transactional outbox should be considered before high-scale execution.
- Next recommended step: add event type catalog validation and two-tenant mutation fixtures.

## 2026-05-08 Pulse Event Catalog + Timeline Aggregation Update

- Changed: event type query filters now validate against the Pulse event catalog.
- Completed: unsupported event type/category query values are rejected before repository access; timeline routes remain protected by `pulse:read` or `tickets:read`.
- Pending: database-backed cross-tenant timeline tests and event payload response-shaping review.
- Risks: timeline payloads are audit-safe by convention today; future event writers must keep masking before persistence.
- Next recommended step: add response-shaping tests before exposing broader payload details.

## 2026-05-08 Pulse Guided Flow State Machine Update

- Changed: flow advancement no longer accepts arbitrary next-state values.
- Completed: DTO validation rejects unsupported states; lifecycle logic rejects invalid transitions before ticket writes, events, or audit records.
- Pending: role-matrix tests for flow advancement and database-backed transition isolation tests.
- Risks: automated confidence-triggered transitions must remain audit-safe and must not persist chain-of-thought or provider secrets.
- Next recommended step: add confidence summary schemas and review-trigger tests.

## 2026-05-08 Pulse Confidence + Human Review Layer Update

- Changed: automated confidence decisions are summarized and masked before event persistence.
- Completed: sensitive keys in `aiDecisionSummary` are redacted by the existing event payload masker; low-confidence automation is prevented from bypassing review/escalation.
- Pending: stricter DTO schema for AI decision summaries and role-matrix tests for operator review actions.
- Risks: do not persist chain-of-thought or raw provider payloads in decision summaries.
- Next recommended step: define a strict AI decision summary schema before runtime integration.

## 2026-05-08 Pulse Knowledge Context Foundation Update

- Changed: knowledge context reads/writes are tenant-scoped and validation-gated.
- Completed: publish/archive writes emit audit records and operational events; repository tests verify tenant filters and cross-tenant archive rejection.
- Pending: stricter metadata schema and database-backed tenant isolation fixtures.
- Risks: content may contain sensitive business instructions; future response shaping must avoid exposing archived/internal context to unauthorized roles.
- Next recommended step: add metadata/content classification before runtime retrieval.

## 2026-05-08 Pulse Scheduling Integration Contracts Update

- Changed: scheduling integration reads avoid exposing provider credential references.
- Completed: repository maps `credentialsRef` to `credentialsConfigured`; prepare use cases require tenant-owned active integrations with configured credentials.
- Pending: secret vault integration, provider adapter threat model, and booking webhook signature validation.
- Risks: provider secrets must never be returned or persisted in operational payloads.
- Next recommended step: design secure provider adapter boundaries before execution endpoints.

## 2026-05-08 Pulse Usage Metering Foundation Update

- Changed: usage writes are server-side and tenant-scoped from trusted use cases.
- Completed: usage metadata avoids provider secrets and uses resource ids plus idempotency keys.
- Pending: abuse/rate-limit tests around high-volume metered operations.
- Risks: usage metadata must remain audit-safe as future provider adapters add richer context.
- Next recommended step: add usage metadata schema helpers before runtime/provider execution writes.

## 2026-05-08 Runtime Execution Lifecycle Contract Update

- Changed: runtime execution routes are permission-protected and tenant-contextual.
- Completed: request uses server-provided tenant/user context; get/transition require tenant id and execution id.
- Pending: service actor auth, forbidden audit tests, and cross-tenant database fixtures.
- Risks: `runtime:executions:create` currently covers both request and transition; production runtime transitions need narrower service-only authorization.
- Next recommended step: define service actor RBAC and add route-level AppSec tests.

## 2026-05-08 Runtime AppSec Hardening Update

- Changed: runtime transition routes no longer reuse create permission and lifecycle payload persistence now masks sensitive keys.
- Completed: added `runtime:executions:transition`, dedicated cancellation, audit events for runtime actions, invalid transition rejection, and masking for keys such as secrets, tokens, credentials, raw provider payloads, reasoning, and chain-of-thought.
- Pending: service actor auth, forbidden audit tests, callback signature/auth policy, and database-backed tenant isolation tests.
- Risks: masking is a defense-in-depth layer, not permission to send unrestricted provider payloads into Synapse.
- Next recommended step: define service actor credentials and callback authorization before queue/gRPC runtime integration.

## 2026-05-08 Database Fixture Foundation Update

- Changed: AppSec validation now has opt-in real database fixtures for tenant isolation and side-effect segregation.
- Completed: fixtures cover cross-tenant runtime transition rejection, tenant-scoped runtime audit records, Pulse mutation cross-tenant rejection, and no event/audit/usage writes for rejected terminal mutations.
- Pending: forbidden route audit fixtures, service actor auth fixtures, and HTTP role-matrix database fixtures.
- Risks: unit-mode skips these specs; AppSec signoff must include `RUN_DATABASE_TESTS=1`.
- Next recommended step: add forbidden-action audit fixtures once service-actor authorization is defined.
