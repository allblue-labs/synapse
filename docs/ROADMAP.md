# Synapse Roadmap

Last updated: 2026-05-07

## Phase 1 — Foundation (Done)

- [x] Monorepo (npm workspaces: `apps/api`, `apps/web`, `packages/contracts`)
- [x] NestJS API with JWT auth, multi-tenancy, rate limiting, structured logging
- [x] Prisma schema: Tenant, User, Agent, Conversation, Message, Channel, KnowledgeItem, BillingAccount
- [x] Multi-tenancy guard pipeline: `AuthGuard → TenantGuard → RolesGuard`
- [x] BullMQ queue infrastructure (3 queues: message-processing, ai-response, outbound-message)
- [x] LLM pool: provider abstraction + OpenAI provider
- [x] Core module system with `SynapseModule` lifecycle contract
- [x] Synapse Pulse registered as first product module (`pulse`)
- [x] Docker Compose for Postgres 16, Redis 7, API, Web

## Phase 2 — Legacy Frontend + Pulse Backend Rename (Mixed)

- [x] Next.js 15 app (App Router, TypeScript, Tailwind CSS)
- [x] Light / dark / auto theme via `next-themes`
- [x] EN / PT i18n via `next-intl` (cookie-based locale, clean URLs)
- [x] Top navigation only (no sidebar)
- [x] Synapse animated canvas background
- [x] Login page with JWT cookie flow
- [x] Overview page (no charts, module cards, quick actions)
- [ ] Frontend module paths need Pulse alignment by frontend owner
- [x] Pulse backend queue API and status FSM
- [x] `PulseEntry` Prisma model with status FSM
- [x] Pulse REST API (`/v1/pulse/queue`, `/errors`, `/retry`)
- [x] Middleware: cookie-based auth guard, redirect to `/login`

## Phase 3 — RBAC + Route Protection (Next)

- [x] Global guard order: throttling, JWT, tenant, permissions
- [x] Pulse permissions use action-shaped `pulse:*` permissions
- [ ] Add route-level RBAC coverage tests for Pulse, billing, module registry
- [ ] Add CI/static checks for tenant-owned Prisma access

## Phase 4 — Module Registry Backend

- [x] Pulse manifest registered with core module registry
- [ ] Persist tenant module enablement and plan entitlement gates
- [ ] Add public/admin module marketplace backend API

## Phase 5 — Queue Workers + AI Pipeline

- [ ] BullMQ processor for `message-processing` queue
- [ ] BullMQ processor for `ai-response` queue
- [ ] Pulse queue processor: audio → STT → LLM extraction → status update
- [ ] OpenAI Whisper integration for audio transcription
- [ ] LLM routing by cost / latency / privacy policy
- [ ] Calendar webhook dispatcher (Google Calendar / CalDAV)
- [ ] Production webhook HMAC validation (Discord, WhatsApp)

## Phase 6 — Billing (Stripe + Usage)

- [ ] Stripe Customer + Subscription creation on register
- [ ] Plan keys: `light`, `pro`, `premium`
- [ ] Admin-controlled feature flags for commercial plan activation
- [ ] Entitlement checks at queue/LLM boundaries
- [ ] Stripe webhook handler (subscription lifecycle events)
- [ ] Operational usage meters: AI calls, audio transcription, workflow runs, storage, messages, automation executions

## Phase 7 — Security Hardening

- [ ] HMAC webhook validation for all adapters (Discord, WhatsApp, Telegram)
- [ ] JWT refresh token flow
- [ ] Audit log table (tenant-scoped immutable events)
- [ ] CSP + secure headers (Helmet)
- [ ] Sensitive field masking in logs
- [ ] Penetration testing checklist (OWASP Top 10)

## Phase 8 — Observability + Scale

- [ ] OpenTelemetry traces from API to queue workers
- [ ] Prometheus metrics endpoint
- [ ] Grafana dashboards (queue depth, LLM latency, error rate)
- [ ] Kubernetes deployment manifests (API + workers)
- [ ] Pain Runtime Operator integration (replace `StubPainClient`)
- [ ] Horizontal worker scaling by queue depth

## 2026-05-07 Backend Update

- Changed: roadmap now treats Synapse Pulse as the first product module and separates registry, RBAC, billing, usage, and AppSec work.
- Completed: Pulse backend rename, registry manifest, permissions, and Prisma rename migration.
- Pending: billing core, usage metering, module marketplace persistence, and Pulse contract tests.
- Risks: plan commercialization depends on enough public modules; Pulse alone should not activate plan entitlements.
- Next recommended step: complete RBAC/tenant-isolation tests before adding billing gates.

## 2026-05-07 Naming Update

- Changed: all backend roadmap references now use Pulse / `pulse`.
- Completed: scope and business logic remain the same: operational communication queues, extraction, validation, and workflow actions.
- Pending: frontend path and API-client alignment remains outside backend ownership.
- Risks: naming drift can create broken contracts between module registry, RBAC, and clients.
- Next recommended step: publish Pulse backend contracts before frontend integration.

## 2026-05-07 RBAC + Route Protection Update

- Changed: Phase 3 now has initial backend coverage for permission guards, tenant guard behavior, and Pulse route metadata.
- Completed: unit-level RBAC tests for Pulse operator/viewer permissions and tenant mismatch rejection.
- Pending: HTTP e2e coverage and tenant-isolation repository tests.
- Risks: without e2e tests, wiring regressions in Passport/JWT strategy could still slip through.
- Next recommended step: add repository tenant-isolation tests, then start Phase 4 persisted module registry backend.

## 2026-05-07 Pulse Tenant Isolation Test Update

- Changed: Phase 3 tenant-isolation coverage now includes Pulse repository query-shape tests.
- Completed: Pulse repository tests cover tenant-scoped find, list/count, update/readback, update miss, and create behavior.
- Pending: persisted module registry/store implementation is now the next backend stage.
- Risks: no real database migration validation yet.
- Next recommended step: add Prisma models for module catalog, tenant module installation, and plan/module entitlement hooks.

## 2026-05-07 Module Registry Store Update

- Changed: Phase 4 module registry backend has initial persistence.
- Completed: module catalog, tenant module installation state, Pulse manifest seeding, runtime sync, audit logging, and module registry service tests.
- Completed: draft/private/disabled catalog items are not tenant-activatable through the current registry API.
- Pending: marketplace purchase state, plan entitlement gates, public module count checks for commercial plan activation.
- Risks: enabling a module is durable now, but it is not yet constrained by billing or plan entitlements.
- Next recommended step: start billing core with plan definitions, feature flags, and tenant entitlement checks.

## 2026-05-07 Billing Core Update

- Changed: Phase 6 billing core has initial implementation.
- Completed: Light/Pro/Premium plan records, commercial feature flags, plan/module entitlements, module purchases, billing read/admin APIs, and module enablement entitlement checks.
- Pending: Stripe integration, module purchase lifecycle, usage meter event storage, billing-period aggregation, and e2e tests.
- Risks: commercial flags and public module counts now control plan activation, but Stripe status is still local/manual.
- Next recommended step: add operational usage metering for AI calls, audio transcription, workflow runs, storage, messages, and automation executions.

## 2026-05-07 Operational Usage Metering Update

- Changed: operational usage metering stage has initial backend implementation.
- Completed: `usage_events` schema, `UsageMeteringService`, `GET /v1/usage/summary`, shared usage metric contract, and first instrumentation points for Pulse/messages/workflows.
- Pending: storage meter instrumentation, pricing/rating engine, usage aggregation, Stripe meter reporting, and production dashboards.
- Risks: usage can be counted before being billed, so reporting and reconciliation are still needed.
- Next recommended step: implement usage pricing/rating records and monthly aggregation service.
