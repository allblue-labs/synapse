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

## 2026-05-08 Pulse Ticket Lifecycle Mutation Update

- Changed: moved Pulse from read-only operational state into command-based ticket lifecycle handling.
- Completed: first lifecycle commands cover assignment, resolution, reopening, escalation, cancellation, operator review, and flow advancement.
- Pending: timeline aggregation, guided state-machine enforcement, confidence threshold policy, and usage metering candidates.
- Risks: command APIs are stable enough for backend validation but should not be treated as final playbook execution semantics.
- Next recommended step: implement consolidated operational timeline queries and central event type definitions.

## 2026-05-08 Pulse Event Catalog + Timeline Aggregation Update

- Changed: Pulse operational history is now queryable through category-aware timelines.
- Completed: central event type constants, category mappings, timeline use case, controller routes, and contract response types.
- Pending: playbook transition enforcement, confidence threshold policy, and database-backed e2e fixtures.
- Risks: categories are intentionally V1 and may expand as Pulse skills mature.
- Next recommended step: implement guided flow state machine and confidence review policy.

## 2026-05-08 Pulse Guided Flow State Machine Update

- Changed: guided flow state enforcement has started inside the Pulse lifecycle path.
- Completed: state constants, allowed transition graph, HTTP validation, lifecycle enforcement, and status mapping.
- Pending: confidence threshold policy, playbook integration, and runtime execution contracts for state advancement.
- Risks: state-machine V1 should remain module-local until another product module needs a similar primitive.
- Next recommended step: add confidence thresholds and automatic review/escalation triggers.

## 2026-05-08 Pulse Confidence + Human Review Layer Update

- Changed: confidence policy now influences guided flow outcomes.
- Completed: low-confidence automated transitions move into review/escalation states and preserve masked decision summaries for operator timelines.
- Pending: configurable thresholds, operator assignment policy, and UI-facing allowed action examples.
- Risks: confidence decisions are operational governance, not AI provider execution logic.
- Next recommended step: build tenant-scoped Pulse Knowledge Context contracts/repositories.

## 2026-05-08 Pulse Knowledge Context Foundation Update

- Changed: Pulse now has the backend foundation for tenant-owned business context.
- Completed: repository, use case, DTOs, controller routes, shared contracts, and tests for knowledge context operations.
- Pending: retrieval scoring, version history, runtime-context assembly, and frontend examples.
- Risks: retrieval remains intentionally basic until runtime/search strategy is chosen.
- Next recommended step: finalize scheduling integration contracts and settings abstractions.

## 2026-05-08 Pulse Scheduling Integration Contracts Update

- Changed: scheduling provider integration is now contract-ready.
- Completed: provider ports and tenant-scoped integration readiness validation exist for availability/booking preparation.
- Pending: provider adapters, credentials vault integration, rate limits, and event/audit lifecycle for actual bookings.
- Risks: current endpoints are preparation contracts, not execution contracts.
- Next recommended step: add usage metering foundation for operational Pulse actions.

## 2026-05-08 Pulse Usage Metering Foundation Update

- Changed: Pulse operational actions are now connected to the platform usage ledger.
- Completed: messages, ticket operations, flow transitions, knowledge storage, knowledge operations, and scheduling prepare intents write usage events.
- Pending: usage summaries by Pulse dimension, channel limits, provider execution metrics, and plan-limit checks.
- Risks: metering exists but does not yet enforce commercial entitlements.
- Next recommended step: continue with runtime integration contracts and execution lifecycle preparation.

## 2026-05-08 Runtime Execution Lifecycle Contract Update

- Changed: runtime preparation now has persisted execution lifecycle models.
- Completed: lifecycle service and controller cover request, read, and transition operations without external runtime calls.
- Pending: runtime service actor model, queue/gRPC provider boundary, cancellation semantics, and database-backed tenant fixtures.
- Risks: exposing transition APIs to human roles is temporary until service actor authorization is designed.
- Next recommended step: AppSec hardening for runtime routes and Pulse lifecycle route matrices.

## Phase F1 — Frontend Stage 1A (Done)

- [x] Route IA reorg: `(dashboard)/*` → `(workspace)/workspace/*`
- [x] Public marketing routes: `/pricing`, `/modules` (read-only public catalog)
- [x] Platform admin shell at `/platform/*` with distinct chrome
- [x] Pulse rename throughout the frontend (files, types, paths, content strings)
- [x] Pulse sub-route IA scaffolded (`inbox`, `tickets`, `tickets/[ticketId]`, `timeline`, `playbooks`, `knowledge`, `catalog`, `campaigns`, `integrations`, `settings`, `metrics`, `logs`)
- [x] API client switched to `api.pulse.*` and `/v1/pulse/*`
- [x] Edge middleware (cookie-presence guard + public allowlist)
- [x] Shared `PendingSection` scaffold for IA-listed but not-yet-built surfaces
- [x] i18n dictionaries + SegmentNav slug map updated for new IA

## Phase F1B — Frontend Stage 1B (Next)

- [ ] Pulse ticket detail UI: operational timeline, extracted context, confidence overlays, workflow state, playbook step, human review actions, audit trail
- [ ] Pulse inbox redesign as operational queue (status / skill / confidence / priority — not chat-style)
- [ ] Pulse playbook visual editor
- [ ] Pulse knowledge / catalog / campaigns operational UX
- [ ] Pulse metrics premium dashboard
- [ ] Module store premium UI (workspace install/upgrade flow)
- [ ] Platform admin operational dashboards (tenants list, runtime metrics, billing pipeline, audit explorer)
- [ ] Design-system additions: operational cards, queue components, timeline component, confidence indicators, animated synapse bg refinements
- [ ] Marketing landing premium redesign (Stripe/Linear-grade hero + sections)
- [ ] RBAC restricted-state UX + plan-based upgrade prompts surfaced inline

## Phase F1C — Frontend Stage 1C (Later)

- [ ] Marketing site polish (about/customers/legal pages; case studies)
- [ ] Tenant onboarding wizard (post-signup setup)
- [ ] In-product search (`⌘K`) wired to real entities
- [ ] Per-tenant theme override (white-label)

## 2026-05-08 Runtime AppSec Hardening Update

- Changed: runtime hardening moved from documented risk into enforced lifecycle behavior.
- Completed: dedicated transition permission, cancel permission route, request/transition/cancel audit records, invalid transition rejection, and runtime payload redaction.
- Pending: service actor model, external callback auth, database-backed tenant isolation fixtures, and role-matrix HTTP tests.
- Risks: human tenant admins can still transition lifecycle state until the service-actor model is introduced.
- Next recommended step: build database-backed runtime/Pulse isolation fixtures before provider adapters or runtime callbacks.

## 2026-05-08 Database Fixture Foundation Update

- Changed: database fixture work has started with opt-in Prisma-backed specs.
- Completed: runtime execution and Pulse ticket lifecycle fixtures cover core two-tenant isolation and side-effect segregation.
- Pending: CI database lifecycle, HTTP authorization fixtures, module registry/billing fixture coverage, and timeline/read fixture expansion.
- Risks: fixtures prove behavior only when `RUN_DATABASE_TESTS=1` is used against migrated PostgreSQL.
- Next recommended step: add test database orchestration and then expand fixtures to route-level RBAC matrices.

## 2026-05-08 Platform Runtime Client Signer Update

- Changed: the backend now has the platform-side signing/client foundation for the isolated Go Runtime.
- Completed: HMAC signer, HTTP client, config schema, client tests, and callback contract type.
- Pending: orchestration use case, callback endpoint with signed validation, queue/gRPC transport, runtime service actors, and database-backed integration fixtures.
- Risks: this is not runtime execution orchestration yet; no existing Pulse flow calls the external runtime.
- Next recommended step: implement a runtime submission use case with explicit lifecycle transitions and audit/usage boundaries.

## 2026-05-08 Frontend Contract Pack Update

- Changed: frontend integration readiness now has a single backend-owned contract pack.
- Completed: route inventory, DTO examples, permission gates, state enums, timeline categories, runtime governance guidance, billing/usage integration notes, and frontend milestone recommendation are documented.
- Pending: OpenAPI generation and example responses from seeded fixtures.
- Risks: contract drift if backend routes change without updating the pack.
- Next recommended step: frontend owner should implement Pulse ticket detail, operational timeline, and lifecycle action integration first.

## Phase F1B — Frontend Stage 1B Batch 1 (Done — 2026-05-08)

- [x] Pulse design-system primitives: ConfidenceMeter, OperationalTimeline, status pills (TicketStatus / Skill / Priority / TicketType / Channel / ConversationState / EscalationBadge)
- [x] Pulse UI contracts + dev fixtures (`lib/pulse/types.ts`, `lib/pulse/fixtures.ts`) — single swap-in seam for backend integration
- [x] Pulse ticket detail screen (timeline, extracted context, workflow + playbook progress, AI summary, review-rationale callout, RBAC-gated review actions)
- [x] Pulse tickets list with bucketed sections (Operator queue / Active / Resolved) + headline counters
- [x] Pulse inbox redesigned as a 3-lane operational queue (Operator queue / In flow / Watching) — not a chat mirror
- [x] Globals utility for data-driven progress bars (`.bar-progress` consumes `--w`)
- [x] Removed legacy `inbox/queue-client.tsx` (PulseEntry-shaped, replaced by ticket-driven UX)

## Phase F1B — Batch 2 (Next)

- [ ] Playbooks visual editor (DAG: trigger → AI step → human review → outcome)
- [ ] Pulse metrics premium dashboard (counters, time-bucketed charts, AI usage by skill/model)
- [ ] Knowledge editor with versioning + retrieval preview
- [ ] Catalog browser (categories, pricing, AI-friendly attributes)
- [ ] Campaigns builder (audience, schedule, channels, message templates, guardrails)
- [ ] Integrations health cards (Google Calendar / Outlook / Calendly initial set)

## Phase F1B — Batch 3 (After)

- [ ] Module store premium UI (workspace install/upgrade flow, plan eligibility, usage visibility)
- [ ] Platform admin operational dashboards (tenants, runtime, billing pipeline, audit explorer)
- [ ] Marketing landing premium redesign (Stripe/Linear-grade hero + sections)
- [ ] RBAC restricted-state UX + plan-based upgrade prompts surfaced inline
- [ ] Animated synapse background refinements (operational variant)

## Phase F1B — Frontend Stage 1B Batch 2 (Done — 2026-05-08)

- [x] API client (`lib/api.ts`) extended with the full Pulse surface from `docs/FRONTEND_CONTRACT_PACK.md`
- [x] Pulse view-model layer (`lib/pulse/types.ts`, `lib/pulse/loaders.ts`)
- [x] Lifecycle Server Actions (`lib/pulse/actions.ts`) for the seven ticket commands
- [x] Honest non-data states (`components/ui/load-state.tsx`)
- [x] Null-tolerant `ConfidenceMeter` + `ChannelPill`
- [x] Ticket detail / tickets list / inbox wired to real `/v1/pulse/*`
- [x] Legacy fixtures removed

## Phase F1B — Batch 3 (Next)

- [ ] Module store workspace UI (consume `/v1/modules`, install/disable, plan eligibility, usage visibility)
- [ ] Billing visibility (`/v1/billing/account`, `/v1/billing/plans`, checkout + portal redirects, usage summary + rated summary)
- [ ] Knowledge management UI (list / publish / archive / query — clearly labelled "filter" not "semantic search" per contract pack)
- [ ] Scheduling integrations UI (list integrations, prepare availability, prepare booking — "prepare" UX must not imply a confirmed booking)
- [ ] Pulse metrics premium dashboard
- [ ] Pulse playbook visual editor
- [ ] Runtime governance UI for platform admin (`runtime:executions:*` — read-only by default, transition/cancel restricted)

## Phase F1B — Batch 4 (After)

- [ ] Marketing landing premium redesign
- [ ] RBAC restricted-state UX + plan-based upgrade prompts inline
- [ ] Animated synapse background refinements

## 2026-05-08 Admin Bootstrap Billing Plan Fix

- Changed: superseded by Platform Admin Bootstrap Foundation below.
- Completed: retired plan-key cleanup remains valid for tenant/customer billing creation paths.
- Pending: automated smoke coverage for `admin:create`.
- Risks: older roadmap notes may still imply platform admin equals tenant owner.
- Next recommended step: add a Docker smoke test for migration + platform-admin provisioning.

## 2026-05-08 Platform Admin Bootstrap Foundation

- Changed: first-admin provisioning moved from tenant OWNER bootstrap to platform administrator bootstrap.
- Completed: platform admins are represented by `User.platformRole = PLATFORM_ADMIN`, shared contracts expose `platform_admin`, and auth can issue tenantless platform sessions.
- Pending: platform administration API surface for admin/tester/customer lifecycle, role assignment, tenant assignment, deactivation, and audit search.
- Risks: platform admin UI must not assume `CurrentUser.tenant` exists.
- Next recommended step: build backend `platform-users` operational APIs gated by `users:*` permissions and audited as platform events.

## 2026-05-08 Granular Platform Administration Foundation

- Changed: the next backend step moved from bootstrap-only admin to granular platform administration.
- Completed: `super_admin` can create granular platform admins, testers, and tenant customer users; granular admins can create testers/customers but cannot create admins.
- Pending: scope-aware platform metrics/modules/policies endpoints and fixture coverage.
- Risks: selected scopes must be enforced at every future platform admin read/write boundary, not only in the UI.
- Next recommended step: add platform metrics APIs with redacted sensitive fields for non-super roles.

## 2026-05-08 Platform Governance Scope Enforcement

- Changed: scope-aware platform reads moved from pending to implemented foundation.
- Completed: platform usage metrics, module governance list, and policy list now enforce stored platform scopes.
- Pending: write-side governance for module rollout states, policy toggles, admin metric dashboards, and fixtures.
- Risks: platform module and policy routes are read-only in this slice.
- Next recommended step: implement audited platform mutations for module rollout and policy toggles, restricted to `super_admin` or matching scoped admins.

## 2026-05-08 Platform Governance Mutations

- Changed: audited mutation layer for platform module/policy governance is now implemented.
- Completed: module governance patch and policy patch endpoints reuse permission gates and `platformScopes`.
- Pending: fixtures, platform admin UX contracts for mutation forms, and future policy-domain modeling.
- Risks: without HTTP fixtures, scoped-denial regressions are only partially covered by unit tests.
- Next recommended step: implement HTTP role/scope matrix tests for platform governance endpoints.

## 2026-05-08 Platform Governance Test Fixtures

- Changed: platform governance test coverage now includes HTTP guard fixtures and service scope/audit fixtures.
- Completed: route permission denials, scope denials, and audit records are covered in fast Jest tests.
- Pending: automated DB execution in CI.
- Risks: mock fixtures can still drift if opt-in DB fixtures are not run.
- Next recommended step: wire CI database execution.

## 2026-05-08 Platform Governance Database Fixtures

- Changed: `npm run test:db` now has platform governance scope matrix coverage when `RUN_DATABASE_TESTS=1`; dev can use the current Docker Postgres as disposable state.
- Completed: persisted scope loading, module mutation, policy mutation, out-of-scope denials, forbidden audit, and scoped usage metrics are covered.
- Pending: seed migration checks and policy metadata fixtures.
- Risks: local developers may miss DB-only regressions if they only run normal unit tests.
- Next recommended step: use the reset flow in `apps/api/prisma/MIGRATIONS.md` before container QA.

## 2026-05-09 Frontend Stage 1B — Batch 3 (Pulse lifecycle action UI)

- Changed: the first interactive Pulse milestone — ticket detail now exposes the seven lifecycle commands (assign, escalate, operator-review, advance flow, resolve, reopen, cancel) through `<TicketActionBar>` against `/v1/pulse/*`.
- Completed: Dialog and Toast primitives (`components/ui/dialog.tsx`, `components/ui/toast.tsx` + `<ToastProvider>` mounted in `Providers`), tenant-cache invalidator (`components/auth/tenant-invalidator.tsx` mounted in the workspace layout), `TicketActionBar` with `<Can>`-gated buttons, `useTransition` pending state, typed `ActionResult` → toast translation, and `revalidatePath` on success.
- Completed: `apps/web/app/(workspace)/workspace/modules/pulse/tickets/[ticketId]/page.tsx` wired to the new action bar; legacy disabled button row removed; `EscalationBadge` now lives next to the controls.
- Completed: handoff verification — `npm run typecheck`, `npm run lint`, `npm run build` all green; no retired module names (`clinicflow`, `clinic-flow`, `relay`-the-module) remain in `apps/web/{app,components,lib}`.
- Pending backend contract gaps: tenant member-picker endpoint (Assign dialog falls back to free-text id), `workflow.playbookStep` on ticket detail (cannot render current FSM position today), structured `extracted.fields` on ticket detail (Extracted Context panel renders empty list).
- Pending UI work (Batch 4): tenant member picker, playbook step indicator, knowledge management surface, scheduling integrations surface, Pulse metrics dashboard.
- Risks: list-fanout enrichment in `loaders.toRow` is unchanged; revalidation-based refresh shows a brief "Working…" pending state on slow networks.
- Next recommended step: Batch 4 — knowledge management UI + scheduling integrations UI on top of the already-exposed `/v1/pulse/*` client surface.

## 2026-05-09 Stage 1 — Module Context Ownership Review

- Changed: backend roadmap now separates Pulse cognitive context ownership from Synapse governance responsibilities.
- Completed: Stage 1 review documented that module-specific context must live in module code, while Synapse validates tenants, module enablement, RBAC, plans, usage, execution governance, audit, and context contract shape.
- Pending: Stage 2 Pulse Context Pack foundation; Stage 3 async queue split; Stage 4 index/RLS/Redis hardening; Stage 5 runtime-ready contract refinement.
- Risks: current Pulse processing still has legacy single-worker behavior and a compatibility `PulseEntry` path.
- Next recommended step: build `PulseContextPack` contracts and `PulseContextAssembler` before changing runtime submission.

## 2026-05-09 Stage 2 — Pulse Context Pack Foundation

- Changed: Stage 2 context foundation is now implemented inside the Pulse module boundary.
- Completed: module-local contract, port, repository, and use case produce an internal `PulseContextPack` for future runtime execution requests without moving Pulse semantics into Synapse core.
- Pending: runtime-governance mapping, async context queue boundary, persisted execution request submission, DB fixtures, and optional RLS/index hardening.
- Risks: the pack is a foundation, not a runtime submission endpoint; callers must still pass through Synapse governance before any future provider execution.
- Next recommended step: Stage 3 async pipeline foundation with `pulse.context` jobs invoking the assembler after inbound event persistence.

## 2026-05-09 Stage 3 — Pulse Async Pipeline Foundation

- Changed: Stage 3 queue boundaries are now represented in backend code.
- Completed: Pulse has queue names, payload contracts, retry defaults, idempotent job ids, and a publisher service. The current entry-processing path uses `pulse.inbound`.
- Pending: real processors for `pulse.context`, `pulse.execution`, `pulse.actions`, `pulse.timeline`, and `pulse.failed`; execution-governance persistence; DB fixtures for idempotent retries.
- Risks: adding worker logic too quickly could re-create one large worker across multiple queues; each queue must keep a narrow responsibility.
- Next recommended step: build the `pulse.context` processor only, then verify context assembly, idempotency, and failure capture before adding execution/action workers.

## 2026-05-09 Stage 3B — Pulse Context Worker

- Changed: `pulse.context` is now the first active bounded worker after `pulse.inbound`.
- Completed: worker assembles Pulse context asynchronously, persists governed execution request records, emits operational events, and captures failures.
- Pending: execution governance policy checks, `pulse.execution` worker, runtime queue handoff, and provider-call implementation in a later runtime stage.
- Risks: execution requests are prepared but not executed; downstream consumers must treat `REQUESTED` as pending governance/runtime work.
- Next recommended step: build a lightweight execution-governance service that validates module enablement, plan/usage limits, and allowed execution type before queueing runtime work.

## 2026-05-09 Stage 3C — Execution Governance + Store Visibility

- Changed: execution governance and store commercialization controls are now implemented foundations.
- Completed: prepared Pulse execution requests are advanced to `QUEUED` only after module enablement and request-type validation. Module catalog has a `storeVisible` switch controlled by super admins.
- Pending: actor permission propagation into async jobs, usage-limit enforcement, and `pulse.execution` worker.
- Risks: store visibility is a commercial/display flag, not a security or runtime-disable flag.
- Next recommended step: add DB fixtures proving hidden modules do not appear in store or plan commercial counts, while enabled internal modules can still be governed/executed.

## 2026-05-09 Stage 3D — Pulse Execution Worker Foundation

- Changed: `pulse.execution` is now active as a lifecycle-only worker.
- Completed: queued execution requests can be consumed and marked as dispatch-prepared without provider calls.
- Pending: runtime-provider boundary, provider result ingestion, real `pulse.timeline` worker, usage metering, and DB fixtures.
- Risks: current execution completion is a placeholder lifecycle completion and must not be presented as AI/provider output.
- Next recommended step: define the provider handoff/result contract and then decide whether the external Go Runtime or queue transport owns the first real execution implementation.

## 2026-05-09 Stage 3E — Pulse Timeline Worker Foundation

- Changed: `pulse.timeline` is now active for async operational event projection.
- Completed: execution dispatch events are queued to timeline and persisted by a dedicated worker.
- Pending: action worker, broader event projection migration, replay tooling, and DB fixtures for timeline segregation.
- Risks: timeline is partly direct-write and partly queue-projected until older use cases are migrated.
- Next recommended step: build `pulse.actions` as the next bounded processor.

## 2026-05-09 Stage 3F — Pulse Actions Worker Foundation

- Changed: all target Pulse queue boundaries now have foundation code.
- Completed: `pulse.actions` validates and projects action lifecycle without real side effects.
- Pending: typed action handler contracts, first real internal action, integration action stubs, DB fixtures, and usage metering on real action completion.
- Risks: the queue is active but handler implementation is intentionally not complete.
- Next recommended step: implement a typed internal action handler for one safe ticket workflow action.

## 2026-05-09 Stage 3G — First Typed Action Handler

- Changed: `ticket.advance_flow` moved from prepared-only to real internal handler.
- Completed: typed handler contract and unit tests cover tenant-scoped flow advancement and missing actor rejection.
- Pending: per-action permission enforcement and more handlers.
- Risks: runtime-generated actions must not enqueue this handler without governance validation.
- Next recommended step: build action job creation service that validates runtime output schema and permission snapshot before enqueue.

## 2026-05-09 Stage 3H — Action Enqueue Governance

- Changed: action job creation has a governance service.
- Completed: `ticket.advance_flow` requires actor metadata plus `tickets:write` permission snapshot before enqueue.
- Pending: runtime output validator, handler registry, and DB fixtures.
- Risks: existing internal callers could still use the lower-level queue service if not disciplined.
- Next recommended step: connect runtime output validation to the governance service instead of direct queue publication.

## 2026-05-09 Stage 3I — Runtime Output Action Planner

- Changed: runtime-result-to-action validation now exists inside Pulse.
- Completed: `PulseRuntimeActionPlannerService` validates runtime output contract, allowed action scope, confidence threshold, supported flow state, ticket context, and then uses action governance before enqueueing `ticket.advance_flow`.
- Pending: call this planner from execution-result ingestion, add additional action rules/handlers, and build database-backed tenant/action fixtures.
- Risks: this is a validation/planning layer only; `pulse.execution` still uses a no-provider placeholder and does not consume real runtime responses.
- Next recommended step: implement execution result ingestion as a narrow boundary that invokes the planner after lifecycle completion, without provider calls inside NestJS.

## 2026-05-09 Stage 3J — Runtime Result Ingestion Boundary

- Changed: execution result ingestion now has a Pulse-owned use case.
- Completed: successful runtime results can transition lifecycle, publish timeline projection jobs, and invoke governed action planning using the original Context Pack. Failed/cancelled/timed-out results transition lifecycle and record ingestion without action planning.
- Pending: signed callback/queue transport, service actor RBAC, DB fixtures, and provider usage metering.
- Risks: no external runtime calls this yet; direct public use would be unsafe until signature validation exists.
- Next recommended step: implement signed runtime result ingress adapter and two-tenant fixtures before connecting any provider callback.

## 2026-05-09 Stage 3K — Signed Runtime Result Callback

- Changed: signed REST ingress now exists for Pulse runtime results.
- Completed: callback verification is fail-closed and covered by unit tests; callback routes to Pulse result ingestion after HMAC validation.
- Pending: replay persistence, original actor snapshot persistence, callback e2e tests, and queue transport option.
- Risks: shared-secret HMAC is acceptable for the first isolated runtime boundary, but key rotation and per-runtime key policy are still pending.
- Next recommended step: store original actor/permission snapshot with execution requests before automatic runtime-driven actions are enabled.

## 2026-05-09 Stage 3L — Stored Actor Snapshot for Runtime Results

- Changed: actor/governance metadata is now captured before runtime execution and reused during callback ingestion.
- Completed: callback DTO no longer carries actor authorization; action planning uses the saved execution actor snapshot.
- Pending: persisted fixture coverage, old execution handling policy, and replay/key-rotation hardening.
- Risks: automatic actions must continue rejecting executions without snapshots.
- Next recommended step: add database-backed signed callback fixtures.

## 2026-05-09 Stage 3M — Runtime Result Persistence Fixtures

- Changed: runtime-result ingestion now has database fixture coverage.
- Completed: tests prove tenant-scoped execution loading, persisted actor snapshot action planning, and missing-snapshot rejection.
- Pending: signed HTTP callback e2e and replay/key-rotation tests.
- Risks: fixture remains skipped unless `RUN_DATABASE_TESTS=1`.
- Next recommended step: implement replay protection for signed callbacks.

## 2026-05-09 Stage 3N — Action Worker Defense-in-Depth

- Changed: worker-side permission revalidation is now implemented for real Pulse action handlers.
- Completed: `ticket.advance_flow` cannot execute from a raw queue job unless the queued actor snapshot includes `tickets:write`.
- Pending: handler registry and persisted worker-side denial fixture.
- Risks: action rules must be kept in the shared rules table as handlers grow.
- Next recommended step: replace processor branching with a typed handler registry.

## 2026-05-09 Stage 3O — Non-Retryable Governance Failures

- Changed: permanent action governance failures no longer use normal BullMQ retries.
- Completed: worker-side RBAC denial is converted to `UnrecoverableError` after failure projection.
- Pending: non-retryable validation errors and handler registry metadata.
- Risks: retry classification must stay conservative so transient infrastructure failures still retry.
- Next recommended step: add typed action DTO schemas and validation classification.

## 2026-05-09 Stage 3P — Action Payload Validation

- Changed: first real action handler now has strict payload validation.
- Completed: invalid `ticket.advance_flow` payloads are terminal validation failures and do not retry.
- Pending: shared schema/handler registry.
- Risks: hand-written schemas do not scale cleanly across many actions.
- Next recommended step: add handler registry metadata for schema and permissions.

## 2026-05-09 Stage 3Q — Action Handler Registry

- Changed: Pulse action execution now resolves real handlers through a registry.
- Completed: processor no longer imports `PulseTicketAdvanceFlowActionHandler` directly.
- Pending: registry metadata for permissions, payload schema, and retry classification.
- Risks: manual registry wiring must be kept in sync as handlers are added.
- Next recommended step: attach action metadata to registry entries.

## 2026-05-09 Stage 3R — Action Definition Metadata

- Changed: handler metadata now includes permissions, validation failure class, and usage candidate.
- Completed: processor and enqueue governance share registry metadata.
- Pending: Context Pack/action schema derivation from registry.
- Risks: manual registry remains acceptable for one handler but not a long-term scaling pattern.
- Next recommended step: use registry definitions when assembling allowed actions and output schemas.

## 2026-05-09 Stage 3S — Context Pack Action Derivation

- Changed: Pulse Context Pack allowed real actions now derive from action registry definitions.
- Completed: runtime output schema now constrains `recommendedActions` to the current allowed action set.
- Pending: full schema derivation from action definitions.
- Risks: planner still has action-specific logic for `ticket.advance_flow`.
- Next recommended step: attach output/action schema metadata to definitions.

## 2026-05-09 Stage 3T — Runtime Output Schema Enforcement

- Changed: enforce the saved Pulse Context Pack output contract during runtime result ingestion.
- Completed: successful runtime results are schema-checked before lifecycle completion and before governed actions can be planned.
- Pending: definition-backed schemas for action-specific output/payload requirements.
- Risks: current validator is intentionally scoped to the Pulse V1 runtime output shape.
- Next recommended step: extend `PulseActionDefinition` with output/action schema metadata and derive Context Pack contracts from those definitions.

## 2026-05-14 Stage 4A — Governance-Owned Plan Limits

- Changed: platform billing/governance now owns tenant limits, module tier checks, credit checks, and module enablement contracts.
- Completed: Trial/Light/Pro/Premium quota templates are seeded as configurable plan entitlements; tenant creation is plan-limited; Pulse schedule data stays inside Pulse only.
- Pending: complete memberships/roles/permissions CRUD and replace single-tenant login selection with explicit workspace selection.
- Risks: quota values are configurable but still seeded from backend templates; admin CRUD needs frontend integration.
- Next recommended step: implement membership CRUD and session/workspace switching contracts.

## 2026-05-14 Stage 4B — Membership CRUD and Workspace Switching

- Changed: tenant membership management and workspace session switching are now backend-supported.
- Completed: membership list/create/update/remove APIs exist with tenant scope, DTO validation, audit logs, role-escalation prevention, and last-owner protection.
- Pending: live membership-backed permission resolution and Redis membership/permission cache.
- Risks: existing route guards still use the selected role from JWT for compatibility.
- Next recommended step: resolve permissions from membership data server-side on each request, with cache fallback strategy.

## 2026-05-14 Stage 4C — Membership Permission Cache

- Changed: route authorization now uses live membership permission resolution with Redis acceleration.
- Completed: Redis caches tenant membership permissions by tenant/user and Prisma remains source of truth.
- Pending: persisted role/permission CRUD models beyond enum roles.
- Risks: cache invalidation currently covers membership mutations in the API path; direct DB changes require TTL expiry or operational invalidation.
- Next recommended step: add DB fixtures for stale JWT role downgrade/upgrade behavior.

## 2026-05-14 Stage 4D — Authorization DB Fixtures

- Changed: added opt-in DB fixture coverage for live membership authorization behavior.
- Completed: stale JWT role downgrade, tenant-specific membership lookup, and no-membership denial are covered.
- Pending: execute in live dev database/CI.
- Risks: fixtures require Postgres availability and current migrations.
- Next recommended step: wire these DB fixtures into a database-enabled CI lane.

## 2026-05-14 Stage 4E — Runtime Actor Revalidation

- Changed: runtime result action planning revalidates actor permissions before side effects.
- Completed: stale actor snapshots cannot enqueue governed Pulse actions after current membership permissions change.
- Pending: DB fixture for runtime actor downgrade.
- Risks: skipped action plans need operator-facing timeline clarity.
- Next recommended step: enforce plan `maxUsersPerTenant` in membership creation.

## 2026-05-14 Stage 4F — User Quota Enforcement

- Changed: membership creation now enforces plan user limits.
- Completed: user quota policy remains in platform billing/governance and memberships consume it through a service contract.
- Pending: DB fixture and cache strategy for plan/quota reads.
- Risks: quota checks are application-level only.
- Next recommended step: add plan/quota Redis cache with Postgres fallback.

## 2026-05-14 Stage 4G — Plan/Quota Cache

- Changed: tenant plan limits are now cached in Redis with PostgreSQL fallback.
- Completed: cache invalidation is best-effort on billing plan/account mutation paths.
- Pending: DB fixture for invalidation behavior and usage counter cache.
- Risks: direct DB edits rely on TTL.
- Next recommended step: wire runtime usage consumption to platform billing governance.

## 2026-05-14 Stage 4H — Action Usage Consumption

- Changed: completed real Pulse actions now record governed workflow usage.
- Completed: side-effect action completion consumes `WORKFLOW_RUN` through platform billing governance.
- Pending: provider-backed runtime AI call metering.
- Risks: current workflow-run credit cost is fixed at 1.
- Next recommended step: add provider-call usage once runtime dispatch performs real provider calls.

## 2026-05-14 Stage 4I — Usage Retry Safety

- Changed: idempotent usage retries now short-circuit before quota checks.
- Completed: unit coverage and opt-in DB fixture were added for tenant-scoped usage idempotency.
- Pending: execute DB fixture once Postgres is running locally.
- Risks: action side-effect idempotency still needs persisted coverage.
- Next recommended step: add fixture coverage for action handler side effects and timeline retry behavior.

## 2026-05-14 Stage 4J — Action Side-Effect Retry Safety

- Changed: Pulse flow advancement is now idempotent for repeated action job keys.
- Completed: duplicate action delivery skips ticket mutation, operational event, audit event, and lifecycle usage writes.
- Pending: DB fixture execution in a live local database.
- Risks: metadata-based guard is sufficient for normal retries but not a full concurrent execution ledger.
- Next recommended step: introduce a durable action execution ledger before enabling more powerful action handlers.

## 2026-05-14 Stage 4K — Durable Action Ledger

- Changed: Pulse now has a database-backed action execution ledger.
- Completed: ledger unique key is `tenantId + idempotencyKey`; indexes cover status, ticket, and action query paths.
- Pending: transactional lifecycle write boundary and DB fixture execution.
- Risks: current ledger narrows duplicate delivery risk but does not yet make all side-effect writes atomic.
- Next recommended step: add transaction-scoped action execution orchestration for `ticket.advance_flow`.

## 2026-05-14 Stage 4L — Transaction-Scoped Action Execution

- Changed: `ticket.advance_flow` side effects are now transaction-scoped.
- Completed: ledger, ticket, operational event, audit, and usage writes share one commit boundary.
- Pending: DB fixture execution and reusable transaction-aware repository pattern.
- Risks: manual lifecycle mutations remain non-transactional between event/audit/usage services.
- Next recommended step: introduce shared transaction-capable repository contracts for future actions.

## 2026-05-15 Stage 4M — Action Observability

- Changed: Pulse action execution now emits safe structured telemetry.
- Completed: queue and ledger outcomes are observable without exposing payloads or raw idempotency keys.
- Pending: real metrics backend integration.
- Risks: high-cardinality labels must stay out of future metrics systems.
- Next recommended step: decide whether action status should remain logs-only or gain sanitized internal read APIs.

## 2026-05-10 Frontend Evolution — Stage 1 (Layout Foundation)

- Changed: kicked off the staged frontend evolution plan (11 stages, one focus per stage). Stage 1 is the layout foundation only.
- Completed: persistent sidebar primitives for both shells (`WorkspaceSidebar`, `PlatformSidebar`), collapsible (240↔64 px) with `localStorage` state. Top-nav slimmed to logo + ⌘K + language + theme + user menu. Workspace + platform layouts switched to `sidebar + main` grid; the wider `container-shell` was retired from chrome so the main column owns horizontal real estate.
- Completed: handoff verification — `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓ (32 routes built clean).
- Pending: Stage 2 (Design System Evolution), Stage 3 (Motion / Interaction Layer), Stage 4 (Navigation Architecture). Mobile sidebar drawer, animated active states, tooltips for collapsed labels, and any sub-section collapse behaviour are reserved for Stage 4.
- Risks: orphan `app/(platform)/platform/_components/platform-nav.tsx` remains on disk (unimported) until Stage 4 retires it explicitly; out-of-scope deletions were intentionally avoided per the strategy's "modify only its own scope" rule.
- Next recommended step: **Stage 2 — Design System Evolution**. Do not start Stage 3+ before Stage 2 closes.

## 2026-05-15 Frontend Evolution — Stage 2 (Design System Evolution)

- Changed: refined the design-system layer in `tailwind.config.ts` + `globals.css`. Zero page rewrites; every existing page that already references the design tokens picks up the new look automatically.
- Completed: tiered shadow scale (`hairline → soft → card → dock → rail → elevated` plus `glass` / `glow`), thinner surface borders (`/55` replaces `/70`–`/80`), more translucent backgrounds so the ambient mesh shows through, two new hover companions (`surface-hover`, `surface-hover-brand`), full typography utility scale (`t-h1`–`t-h3`, `t-body`, `t-small`, `t-meta`), refined buttons + pills (thinner, glassier, unified press feedback), focus ring tuned for glass surfaces, and stack-rhythm utilities (`stack-page`, `stack-section`, `stack-cluster`, `stack-tight`).
- Completed: handoff verification — `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓.
- Pending: Stage 3 (Motion / Interaction Layer) — smooth route transitions, sidebar collapse motion, hover transitions, loading states, animated counters. Stages 4–11 follow per the staged strategy.
- Risks: pages that hand-rolled border/background literals will not migrate automatically; they keep working but should adopt `surface-*` utilities on next touch.
- Next recommended step: **Stage 3 — Motion / Interaction Layer**. Do not start Stage 4+ before Stage 3 closes.

## 2026-05-15 Frontend Evolution — Stage 3 (Motion / Interaction Layer)

- Changed: refined the motion/interaction layer in `tailwind.config.ts` + `globals.css` + small components — **CSS-first, no framer-motion install**. Audit showed every Stage-3 focus area was achievable without a new dependency.
- Completed: new keyframes (`slideInLeft`, `fadeOut`, `press`, `countUp`, `spinnerRotate`), three universal transition aliases (`.transition-base/soft/spring`), `.stagger-children` rule, refined `.page-enter`, sidebar label fade + translate on collapse, `<AnimatedNumber/>` (RAF-driven, reduced-motion-aware), `<Spinner/>` (CSS-only), refined `<Skeleton/>` with shimmer, Dialog panel uses `animate-panel-in`, Toast uses `animate-slide-in-right`.
- Completed: handoff verification — `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓.
- Pending: Stage 4 (Navigation Architecture) — mobile sidebar drawer, animated active states, collapsed-label tooltips, sub-section collapse, floating landing nav. Stages 5–11 follow per the staged strategy.
- Risks: framer-motion deferred — Stage 9 (Pulse Operational UX) or Stage 10 (Onboarding) may revisit if orchestrated enter/exit choreography is needed (e.g. AnimatePresence on a mobile drawer).
- Next recommended step: **Stage 4 — Navigation Architecture**. Do not start Stage 5+ before Stage 4 closes.

## 2026-05-15 Stage 5A — Database Performance + RLS Foundation

- Changed: shifted backend focus to production database performance, efficiency, and multitenant security.
- Completed: added compound indexes for existing tenant-scoped access patterns and prepared RLS policies.
- Completed: added tenant transaction context runner in `PrismaService`.
- Pending: RLS-active fixtures and query-plan validation against a live database.
- Risks: RLS must be activated gradually after all query paths set session tenant context.
- Next recommended step: migrate Pulse repositories to the transaction helper first.

## 2026-05-15 Stage 5B — Pulse Schema Separation

- Changed: introduced physical DB schema separation for Pulse while keeping Synapse governance central.
- Completed: Prisma schema now uses `public` for platform/governance and `pulse` for Pulse operational persistence.
- Pending: migration rehearsal, RLS fixtures, and repository tenant-context adoption.
- Risks: cross-schema FKs must stay intentional and limited to governance boundaries such as `public.Tenant`.
- Next recommended step: validate migrations against a clean disposable Postgres and then convert Pulse repositories.

## 2026-05-15 Stage 5C — Pulse Repository Tenant Context

- Changed: migrated Pulse repository access to tenant-scoped Prisma transactions.
- Completed: high-risk Pulse operational repositories no longer issue direct `pulse.*` Prisma calls outside tenant context.
- Pending: disposable DB migration/RLS rehearsal and query-plan validation.
- Risks: activation must remain table-by-table because app-level tenant filters are still the active runtime boundary.
- Next recommended step: create RLS fixture for `pulse_tickets` and `pulse_operational_events`.

## 2026-05-15 Stage 5D — Pulse RLS Enforcement

- Changed: prepared production RLS enforcement for Pulse schema.
- Completed: migration enables/forces RLS for Pulse operational tables and adds a skipped-by-default DB fixture.
- Pending: execute the fixture against disposable Postgres and expand coverage after first pass.
- Risks: FORCE RLS will expose any future direct Prisma paths without tenant context.
- Next recommended step: run database fixtures before applying this migration to shared dev/staging.
