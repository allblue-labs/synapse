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

## 2026-05-08 Platform Runtime Client Signer Update

- Changed: outbound Runtime calls now have a platform-side HMAC signing service.
- Completed: signatures cover method, path, Unix timestamp, and raw JSON body; runtime shared secret is required before signing; tests lock the canonical format.
- Pending: inbound callback signature validation, secret rotation, service actor permissions, replay/idempotency persistence, and signed e2e tests.
- Risks: shared secrets must be provisioned outside source control and never logged.
- Next recommended step: implement signed callback validation before accepting external runtime state transitions.

## 2026-05-08 Frontend Contract Pack Update

- Changed: frontend AppSec expectations are now documented in the contract pack.
- Completed: documented permission-gated UI, `401`/`403`/`404` handling, no direct Go Runtime calls, no raw provider payload rendering, no chain-of-thought exposure, and tenant cache-clearing expectations.
- Pending: route-level forbidden examples and generated error schemas.
- Risks: frontend must treat backend authorization as final even when UI hides actions.
- Next recommended step: add API error examples after HTTP role-matrix fixtures land.

## 2026-05-08 Admin Bootstrap Billing Plan Fix

- Changed: superseded by platform-admin bootstrap; `admin:create` no longer provisions tenant billing.
- Completed: retired billing plan keys remain removed from tenant/customer provisioning paths.
- Pending: smoke test with sanitized platform-admin env values.
- Risks: admin bootstrap remains a privileged operational command and must be run with controlled env secrets.
- Next recommended step: document and test the containerized platform-admin provisioning runbook.

## 2026-05-08 Platform Admin Bootstrap Foundation

- Changed: first-admin bootstrap now creates a tenantless platform administrator instead of a tenant customer owner.
- Completed: JWT validation accepts tenantless sessions only for `role: "platform_admin"`; non-platform sessions still require `tenantId`. Tenantless platform access requires explicit route metadata. Forbidden permission checks continue to audit denials.
- Pending: audited platform user-management endpoints, admin bootstrap smoke tests, and stronger production runbook requirements for rotating/removing bootstrap admins.
- Risks: platform-admin credentials are high privilege; secrets/passwords must never be logged, and frontend must not expose workspace-only assumptions for this role.
- Next recommended step: add platform-admin management endpoints with audit events for create/update/delete/deactivate operations.

## 2026-05-08 Granular Platform Administration Foundation

- Changed: high-privilege platform access is split between bootstrap-only `super_admin`, limited `admin`, and read-oriented `tester`.
- Completed: platform user create/update operations are permission-gated and audited; normal admins cannot grant admin access; sensitive admin-metric field masking helper is available for future metrics endpoints.
- Pending: password reset/invite flow, deactivation, MFA/session revocation, and mandatory use of metric masking in platform metrics APIs.
- Risks: direct password creation is acceptable for internal bootstrap/foundation only; production should move admin/tester creation to invitation or reset-token flows.
- Next recommended step: implement invite/password-reset lifecycle before production admin onboarding.

## 2026-05-08 Platform Governance Scope Enforcement

- Changed: platform governance reads now load scopes server-side and mask sensitive metric fields for non-super roles.
- Completed: added `maskSensitiveMetricFields` coverage and platform scope enforcement for usage metrics/modules/policies.
- Pending: e2e forbidden tests, sensitive-key inventory review, and ensuring future platform metrics use the masker by default.
- Risks: sensitive metric key coverage must evolve as new financial/provider fields are introduced.
- Next recommended step: centralize all future admin metric serializers behind the masker.

## 2026-05-08 Platform Governance Mutations

- Changed: platform module/policy writes are audited and scope-bound.
- Completed: mutations run behind permission guards, tenantless route metadata, server-side scope checks, DTO validation, and audit records.
- Pending: forbidden-action audit fixtures for scoped denials.
- Risks: policy metadata is accepted as JSON and should stay non-secret; secrets must never be stored in feature-flag metadata.
- Next recommended step: add metadata schema allowlists for policy domains before wider admin use.

## 2026-05-08 Platform Governance Test Fixtures

- Changed: security tests now include platform governance forbidden audit and sensitive metrics masking.
- Completed: `AUTH_FORBIDDEN` is asserted for route permission denials and service scope denials; sensitive metric fields are masked for granular admins.
- Pending: CI execution of persisted audit assertions.
- Risks: audit persistence failures remain best-effort by design and need operational monitoring.
- Next recommended step: add operational monitoring for audit persist failures.

## 2026-05-08 Platform Governance Database Fixtures

- Changed: persisted audit assertions now exist for platform governance scope denials and successful writes.
- Completed: DB fixture verifies forbidden audit records for out-of-scope module/policy attempts and success audit records for scoped writes.
- Pending: route-level e2e audit persistence through real HTTP + database.
- Risks: current DB fixture calls service methods directly, not full HTTP stack; dev reset flow is destructive.
- Next recommended step: add end-to-end HTTP + DB fixture after test app database wiring is standardized.

## 2026-05-09 Stage 1 — Module Context Ownership + DB Security Review

- Changed: reviewed Pulse context ownership, tenant isolation, RLS feasibility, and sensitive operational persistence rules.
- Completed: decision is to keep app-level tenant enforcement mandatory and defer RLS until a tested `app.current_tenant_id` session-variable strategy exists. Pulse must not persist chain-of-thought, provider secrets, or raw mirrored chats as durable primary data.
- Pending: Pulse Context Pack output validation, repository tenant-filter tests for every new context query, unsupported message-type event tests, and DB fixtures for cross-tenant context assembly rejection.
- Risks: enabling RLS blindly would likely break Prisma queries/migrations; leaving it disabled means guard/repository tenant filtering remains critical.
- Next recommended step: Stage 2 should add context assembler tests proving every query is tenant-scoped and output payloads are audit-safe.

## 2026-05-09 Stage 2 — Pulse Context Pack AppSec

- Changed: Pulse context assembly now redacts sensitive keys and masks participant/channel identifiers before producing a Context Pack.
- Completed: tests cover audit-safe redaction of prompts/tokens/api keys, cross-tenant/missing requested context rejection, and tenant filters on repository queries. Scheduling context exposes `credentialsConfigured` only, not provider credential references.
- Pending: DB-backed two-tenant fixture, output schema validation at runtime-governance boundary, and broader sensitive-key inventory review.
- Risks: redaction is defensive but not a substitute for strict DTOs and tenant guards; raw Context Packs must remain internal.
- Next recommended step: add a persisted fixture proving a context request using another tenant's conversation/ticket id returns not found.

## 2026-05-09 Stage 3 — Pulse Queue AppSec

- Changed: Pulse queue payloads now require tenant id, idempotency key, requested timestamp, and optional trace/source metadata.
- Completed: inbound entry jobs use tenant-scoped idempotency keys; retry jobs include retry count in the key. Failure jobs are isolated to `pulse.failed` and configured for a single capture attempt.
- Pending: payload validation pipes/classes for worker boundaries, forbidden/failure audit on worker-level denials, and dead-letter replay controls.
- Risks: queue payloads are contracts, not authorization. Workers must reload tenant-scoped state from Postgres and enforce governance before side effects.
- Next recommended step: validate `pulse.context` job payloads before assembly and never trust queued ids without tenant-scoped repository reads.

## 2026-05-09 Stage 3B — Pulse Context Worker AppSec

- Changed: `pulse.context` validates required job fields before persistence and reloads context through the tenant-scoped assembler.
- Completed: runtime request persistence uses existing runtime masking/audit behavior; failure jobs include only operational identifiers and reason, not raw context packs or provider payloads.
- Pending: governance validation for module enablement, plan/usage limits, and actor permissions before execution can move beyond `REQUESTED`.
- Risks: queued jobs currently do not carry actor identity; future execution governance should include actor/request metadata for accountable decisions.
- Next recommended step: extend context/execution job metadata with actor id and governance decision summaries.

## 2026-05-09 Stage 3C — Execution Governance + Store AppSec

- Changed: runtime execution requests now pass a governance service before reaching `QUEUED`.
- Completed: governance denies inactive/non-public/not-enabled modules and request types outside the module allowlist, recording approval/denial audit events. `storeVisible` changes are restricted to `super_admin`/legacy `platform_admin` and forbidden attempts are audited.
- Pending: actor-aware permission checks and usage-limit enforcement in async execution jobs.
- Risks: `storeVisible` is not an access-control boundary; tenant installation/module enablement remains the runtime boundary.
- Next recommended step: add actor metadata to Pulse queue payloads and test forbidden execution-governance denials with persisted audit records.

## 2026-05-09 Stage 3D — Pulse Execution Worker AppSec

- Changed: `pulse.execution` validates required payload fields and reloads execution state through the runtime lifecycle service.
- Completed: non-queued execution requests are skipped rather than force-transitioned. Failures publish to `pulse.failed` and record dispatch-failed operational events.
- Pending: provider-secret isolation and signed runtime callbacks before real runtime integration.
- Risks: no provider payloads exist yet; future provider handoff must preserve this no-secret/no-chain-of-thought persistence rule.
- Next recommended step: add signed callback validation before accepting external runtime results.

## 2026-05-09 Stage 3E — Timeline Projection AppSec

- Changed: timeline projection now validates tenant id, idempotency key, and event type before persistence.
- Completed: timeline metadata includes source queue and idempotency key; projection failures go to `pulse.failed` without raw provider payloads.
- Pending: schema allowlists for event payloads before broad migration of all event writers.
- Risks: timeline payloads remain flexible JSON and must continue using audit-safe payload builders.
- Next recommended step: introduce per-event payload schemas for high-risk timeline events.

## 2026-05-09 Stage 3F — Actions Worker AppSec

- Changed: `pulse.actions` validates required payload shape and enforces an action allowlist before projection.
- Completed: unsupported actions are skipped rather than executed. Failures are captured without provider secrets or raw integration payloads.
- Pending: per-action DTO validation, actor permission checks, tenant-scoped resource validation, and idempotent side-effect handlers.
- Risks: current JSON payload validation is intentionally shallow while side effects are disabled.
- Next recommended step: define strict DTOs before enabling any real action side effect.

## 2026-05-09 Stage 3G — Real Action AppSec

- Changed: `ticket.advance_flow` now requires actor metadata and validates supported flow state before mutation.
- Completed: handler delegates to existing lifecycle use case, preserving tenant-scoped lookup, flow transition validation, audit event creation, operational event creation, and usage metering.
- Pending: explicit permission snapshot validation inside queued action governance.
- Risks: queued action payloads must not be accepted from untrusted runtime output without schema/governance checks.
- Next recommended step: add an action job factory that verifies actor permissions and runtime output schema before enqueueing.

## 2026-05-09 Stage 3H — Action Enqueue AppSec

- Changed: governed action enqueue validates actor metadata and permission snapshot.
- Completed: `ticket.advance_flow` cannot be enqueued through governance without `tickets:write`.
- Pending: runtime output schema validation and signed/attributed runtime recommendation checks.
- Risks: governance is only effective when callers use the governance service rather than raw queue publication.
- Next recommended step: hide raw action enqueue behind module-internal APIs and add lint/review rule for real action paths.

## 2026-05-09 Stage 3I — Runtime Output Action Planning Security

- Changed: future runtime output is treated as untrusted input before action enqueue.
- Completed: planner rejects malformed output, avoids raw payload persistence, requires audit-safe decision summaries, enforces allowed-action scope, validates supported flow states, and propagates permission denials from action governance.
- Pending: signed/authorized runtime result ingestion, service actor scoping, DB-backed cross-tenant rejection fixtures, and sensitive-output masking at the callback boundary.
- Risks: if future integrations enqueue actions directly instead of using the planner, runtime suggestions could bypass confidence and RBAC checks.
- Next recommended step: make execution-result ingestion call the planner as the only production path from runtime output to Pulse action jobs.

## 2026-05-09 Stage 3J — Runtime Result Ingestion Security

- Changed: runtime result ingestion now validates the target execution is tenant-scoped and belongs to Pulse before lifecycle transition or action planning.
- Completed: non-Pulse execution requests are rejected; non-success statuses do not plan actions; timeline payloads record status/action summary without raw provider payloads.
- Pending: signed callback validation, runtime service actor permissions, replay/idempotency fixtures, and provider output masking at the ingress adapter.
- Risks: the use case must remain behind a trusted adapter; exposing it directly would allow unsafe lifecycle transitions.
- Next recommended step: require `RuntimeSignatureService` validation before any external result can call this path.

## 2026-05-09 Stage 3K — Signed Runtime Callback Security

- Changed: Pulse runtime result callback now validates HMAC signatures before ingestion.
- Completed: `RuntimeSignatureService` verifies required headers, allowed key id, timestamp tolerance, canonical request body, and uses constant-time signature comparison. Missing shared secret fails closed.
- Pending: replay nonce/idempotency persistence, key rotation, per-runtime key scoping, server-side actor snapshot resolution, and callback e2e coverage with raw body.
- Risks: timestamp tolerance reduces replay risk but does not replace a durable replay store.
- Next recommended step: add callback replay tracking keyed by signature/idempotency before provider callbacks are enabled.

## 2026-05-09 Stage 3L — Stored Actor Snapshot Security

- Changed: callback-provided actor authorization was removed from Pulse runtime result ingestion.
- Completed: successful runtime result ingestion requires a stored actor snapshot on the execution request; missing snapshots reject before lifecycle transition/action planning.
- Pending: DB fixtures proving snapshot persistence and callback rejection; replay tracking; key rotation.
- Risks: actor snapshots can become stale if long-running executions outlive permission changes. This is acceptable for V1 auditability but should be governed by execution TTLs.
- Next recommended step: define execution TTL and snapshot freshness policy before real provider callbacks.

## 2026-05-09 Stage 3M — Runtime Result Fixture Security

- Changed: persisted tests now cover critical runtime-result security assumptions.
- Completed: fixtures assert cross-tenant ingestion is denied and missing actor snapshots do not transition successful results into action planning.
- Pending: signed HTTP callback fixture, replay store fixture, and key rotation tests.
- Risks: unit and skipped DB fixtures do not replace production monitoring for callback abuse.
- Next recommended step: implement replay protection keyed by callback signature/timestamp/execution id.

## 2026-05-09 Stage 3N — Action Worker Permission Revalidation

- Changed: real action side effects now have worker-side RBAC defense-in-depth.
- Completed: `PulseActionsProcessor` rejects real handler execution when actor metadata is missing or required permissions are absent.
- Pending: persisted worker-side rejection fixture and handler registry.
- Risks: prepared-only action lifecycle events are still allowed without handler permissions because no side effects occur.
- Next recommended step: require every future side-effect handler to declare a rule before registration.

## 2026-05-09 Stage 3O — Terminal Action Governance Failures

- Changed: worker-side RBAC failures are now terminal queue failures.
- Completed: failed action timeline/failure payloads mark governance denials as non-retryable, reducing repeated processing of known-invalid jobs.
- Pending: validation-error classification and alerting policy for repeated unauthorized queue publication.
- Risks: malicious or buggy publishers can still create failed jobs; monitoring must watch non-retryable governance failures.
- Next recommended step: add operational metric/alert for `non_retryable_governance` action failures.

## 2026-05-09 Stage 3P — Strict Action Payload AppSec

- Changed: `ticket.advance_flow` rejects unexpected payload fields and invalid typed fields before any ticket mutation.
- Completed: raw provider payload-like fields are blocked as unsupported fields in this action payload.
- Pending: reusable action schema validation and observability for `non_retryable_validation`.
- Risks: future handlers must not accept unrestricted JSON payloads.
- Next recommended step: require every real action handler to declare strict payload schema before registration.

## 2026-05-09 Stage 3Q — Action Registry Security Note

- Changed: real handler resolution is centralized in a Pulse-owned registry.
- Completed: only registered handlers can apply side effects; unknown allowed actions remain prepared-only.
- Pending: require permissions and schema metadata during handler registration.
- Risks: registry without metadata still relies on separate shared rule tables.
- Next recommended step: reject registration for real handlers missing schema/permission metadata.

## 2026-05-09 Stage 3R — Action Metadata Security

- Changed: real action permission metadata now lives on handler definitions.
- Completed: enqueue and worker permission checks use the same registry definition, reducing rule drift.
- Pending: schema metadata still needs to move from handler code into definitions.
- Risks: usage candidate metadata is advisory only and must not trigger billing until billing mapper exists.
- Next recommended step: add schema references to action definitions.

## 2026-05-09 Stage 3S — Context Pack Action Security

- Changed: runtime action suggestions are constrained by an enum derived from allowed actions.
- Completed: registered real actions and prepared-only actions are exposed through the Context Pack; runtime output cannot claim arbitrary recommended action names under the declared schema.
- Pending: full payload schema derivation for action arguments.
- Risks: schema is advisory until runtime result validation enforces it completely.
- Next recommended step: validate runtime output against `requiredOutputSchema` before planner execution.

## 2026-05-09 Stage 3T — Runtime Output Contract Security

- Changed: signed Pulse runtime results are now contract-validated before success transition or action planning.
- Completed: invalid fields, over-broad actions, bad confidence values, and mismatched execution type hints are rejected server-side.
- Pending: reusable schema validation for nested/action-specific payloads.
- Risks: current validation protects the V1 output envelope, not future arbitrary JSON schemas.
- Next recommended step: declare action output/payload schema metadata on Pulse action definitions.
