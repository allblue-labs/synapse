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

- [x] Stripe Customer provisioning through subscription checkout
- [x] Stripe Customer Portal session creation
- [ ] Stripe Subscription creation on register
- [ ] Plan keys: `light`, `pro`, `premium`
- [ ] Admin-controlled feature flags for commercial plan activation
- [ ] Entitlement checks at queue/LLM boundaries
- [x] Stripe webhook handler (subscription lifecycle events)
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

## 2026-05-07 Usage Rating Update

- Changed: usage pricing/rating stage has initial backend implementation.
- Completed: `usage_rates`, `usage_period_aggregates`, rated summaries, shared rated usage contracts, and tests.
- Pending: Stripe usage reporting, invoice reconciliation, admin workflows for rate activation, and e2e tests.
- Risks: rating is local and does not yet create Stripe meter events.
- Next recommended step: wire Stripe usage reporting and webhook reconciliation.

## 2026-05-07 Stripe Usage Reporting Update

- Changed: Stripe usage reporting stage has initial backend implementation.
- Completed: Stripe meter mappings, report state persistence, meter event submission, skip/failure reconciliation records, contracts, and tests.
- Pending: signed webhook reconciliation, Stripe customer/subscription lifecycle, retry jobs, and live-mode validation.
- Risks: reporting is manual/API-triggered and not yet scheduled.
- Next recommended step: add Stripe webhook endpoint with signature validation and subscription/status reconciliation.

## 2026-05-07 Stripe Webhook Reconciliation Update

- Changed: Phase 6 now includes signed Stripe webhook intake and local lifecycle reconciliation.
- Completed: raw-body signature validation, duplicate-event protection, webhook event ledger, subscription status sync, invoice paid/payment-failed status sync, and route metadata tests.
- Pending: customer/subscription provisioning, checkout sessions, customer portal, module purchase lifecycle, retry jobs, and full HTTP e2e coverage.
- Risks: plan synchronization relies on Stripe metadata and existing tenant billing-account links.
- Next recommended step: build Stripe customer and checkout session creation with explicit tenant ownership checks.

## 2026-05-07 Stripe Checkout Provisioning Update

- Changed: Phase 6 now has tenant-owned Stripe customer provisioning and subscription Checkout Session creation.
- Completed: checkout sessions include tenant/plan metadata on both session and subscription data; existing customers are reused; new customer ids are persisted to `BillingAccount`.
- Pending: customer portal sessions, direct subscription-on-register policy decision, module purchase checkout, retry jobs, and e2e tests.
- Risks: plan price mapping must be configured by admins/ops before commercial checkout can work.
- Next recommended step: add customer portal session creation for existing Stripe customers.

## 2026-05-07 Stripe Portal + Redirect Allowlist Update

- Changed: Phase 6 now includes backend-created Stripe Customer Portal sessions and billing redirect allowlisting.
- Completed: portal sessions are tenant-owned and checkout/portal redirect URLs are origin-checked before any Stripe call.
- Pending: checkout session retrieval/reconciliation, module purchase checkout, portal configuration controls, and e2e tests.
- Risks: frontend integration must use environment-approved origins.
- Next recommended step: add checkout session retrieval so success redirects can be reconciled deterministically.

## 2026-05-07 Stage 1 Backend Refinement + Pulse Foundation Update

- Changed: roadmap now has a concrete Pulse operational foundation layer before deeper workflow/runtime work.
- Completed: Pulse core persistence models for channel, conversation, ticket, operational event, playbook, knowledge context, and skill; integration settings for calendar providers; execution lifecycle model for future runtime handoff.
- Completed: module registry metadata now supports tier, visibility, rollout state, feature flag, and active/inactive status.
- Pending: Pulse operational APIs, flow transition engine, unsupported-message event emission, usage/plan limit enforcement at module execution boundaries, and runtime adapter implementation in a later stage.
- Risks: adding many tables creates migration/QA scope; keep upcoming work incremental and repository/use-case driven.
- Next recommended step: wire Pulse entry processing into PulseConversation, PulseTicket, and PulseOperationalEvent.

## 2026-05-07 Pulse Operational Lifecycle Wiring Update

- Changed: Pulse queue lifecycle now begins writing operational timeline/ticket state.
- Completed: operational event emission for create/validate/reject/retry and first ticket creation on validation.
- Pending: channel/conversation creation, generic ticket type mapping, guided flow transitions, unsupported transport fallbacks, and HTTP APIs for ticket/timeline reads.
- Risks: use-case side effects are now durable, so later refactors must preserve idempotency around retries and validation.
- Next recommended step: add explicit Pulse conversation/channel repositories and DTOs.

## 2026-05-07 Pulse Channel + Conversation Ingestion Update

- Changed: Pulse ingestion now has explicit channel/conversation resolution.
- Completed: tenant-scoped upsert repositories for PulseChannel and PulseConversation, DTO extensions, and use-case tests.
- Pending: channel/conversation list/detail routes, admin configuration routes, unsupported message-type event flow, and provider webhook mapping.
- Risks: ingestion remains backward compatible with optional raw conversation ids until a deprecation plan exists.
- Next recommended step: expose read-only Pulse channel/conversation APIs protected by `pulse:read`.

## 2026-05-07 Pulse Direct Conversation Validation Update

- Changed: direct conversation id compatibility is now tenant-validated.
- Completed: missing or cross-tenant direct ids fail before side effects.
- Pending: deprecation plan for direct ids and read APIs for resolved conversations.
- Risks: API consumers relying on unvalidated ids will now receive not-found errors.
- Next recommended step: add Pulse channel/conversation read endpoints.

## 2026-05-07 Pulse Channel + Conversation Read API Update

- Changed: Pulse operational state now has initial read API coverage.
- Completed: read-only channels and conversations routes with route-permission metadata tests.
- Pending: pagination, filters, ticket/timeline routes, and frontend contract examples.
- Risks: minimal endpoints should not be treated as final admin UX contracts.
- Next recommended step: add ticket and operational event timeline reads.

## 2026-05-07 Pulse Ticket + Timeline Read API Update

- Changed: Pulse read API coverage now includes tickets and operational timelines.
- Completed: tenant-scoped ticket list/detail and event timeline routes for conversations/tickets.
- Pending: pagination, filters, ticket assignment/resolve actions, and frontend contract examples.
- Risks: read APIs are useful for QA but still need pagination before scale.
- Next recommended step: implement Pulse read pagination/filter DTOs.

## 2026-05-07 Pulse Read Pagination Update

- Changed: Pulse read APIs now have baseline pagination.
- Completed: channel/conversation/ticket/event repositories and routes accept `page` and `pageSize`.
- Pending: status/type/provider/date filters and generated API examples.
- Risks: pagination without filters is only the first production-safety step.
- Next recommended step: add read filters for operational review workflows.

## 2026-05-07 Pulse Read Filtering Update

- Changed: Pulse read endpoints now support first-pass operational filters.
- Completed: provider/status/state/type/event/date filtering in DTOs and repositories.
- Pending: e2e tests, response examples, and frontend-owner integration.
- Risks: filters are useful but not yet indexed beyond existing schema indexes for every combination.
- Next recommended step: add e2e tests and inspect query plans once real data exists.

## 2026-05-07 Pulse Read Contract Test Update

- Changed: moved the Pulse read-filter track from implementation-only into tested backend contracts.
- Completed: DTO validation tests and controller forwarding tests cover the current filter surface.
- Pending: HTTP e2e harness, cross-tenant request fixtures, and generated response examples.
- Risks: without HTTP e2e, global validation-pipe behavior remains verified indirectly.
- Next recommended step: introduce Pulse read HTTP e2e tests before adding ticket mutation APIs.

## 2026-05-07 Pulse HTTP Read E2E Harness Update

- Changed: Pulse read filters now have request-level coverage.
- Completed: local Nest HTTP harness covers global validation pipes, tenant guard rejection, permission guard rejection, and audit logging for forbidden reads.
- Pending: database-backed request tests and response examples.
- Risks: use-case stubbing keeps the tests fast but leaves persistence integration for a later test database slice.
- Next recommended step: decide between test database fixtures and `tickets:assign` / `tickets:resolve` backend mutations.
