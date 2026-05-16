# Implementation Status

Last updated: 2026-05-07

## What Is Implemented

### Backend (apps/api)
- NestJS API: auth (register, login, JWT), tenants, users, health, rate limiting, structured JSON logging
- Prisma multi-tenant schema with full index coverage and cascade deletes
- Multi-tenancy guards: `TenantGuard`, `RolesGuard`, `TenantPrismaService`
- Agent CRUD with LLM model config
- Conversation and message CRUD with last-message timestamp atomicity
- Channel abstraction: `ChannelAdapter` interface with Telegram/Discord/WhatsApp adapters
- Knowledge base text search (per-agent + tenant-wide)
- BullMQ queue infrastructure: `message-processing`, `ai-response`, `outbound-message` queues
- LLM pool routing to OpenAI provider
- Prompt builder and structured response parser
- Task dispatch via `TaskEngineService` (local executor)
- Core module system with registry, enable/disable lifecycle
- Synapse Pulse registered as first product module with slug `pulse`
- **PulseModule**: REST endpoints (`/v1/pulse/queue`, `/errors`, `/retry`), `PulseEntry` Prisma model with status FSM, confidence score, extracted data, queue processor, and tenant-scoped repository writes
- Runtime architecture with Pain client placeholder
- Docker Compose for Postgres 16, Redis 7, API, Web

### Frontend (apps/web)
- Next.js 15 (App Router) built from scratch with TypeScript + Tailwind CSS
- `next-themes`: light / dark / auto (system default)
- `next-intl`: English + Portuguese, locale stored in cookie, no URL prefix
- Top navigation only (no sidebar): Overview + Modules links, theme toggle, locale toggle, sign-out
- Synapse background: animated canvas with thin lines + nodes at very low opacity (blue/neutral)
- Logo (`public/logo.png`) used in nav, login, and landing hero
- Routes:
  - `/` → redirect `/overview`
  - `/overview` — dashboard landing (no charts, module cards, quick actions)
  - `/login` — auth page with Synapse background
  - `/modules` — module grid
  - Frontend routes still reflect the previous messaging-oriented UX and need frontend-owner alignment to Pulse.
- Middleware: JWT cookie check, redirect to `/login` if unauthenticated
- API client (`lib/api.ts`) with cookie-based JWT bearer injection
- Standalone Docker build mode (`output: 'standalone'`)

## What Is Partially Done

- Pulse backend: endpoints and BullMQ processor are wired, but AI/audio adapters are still placeholder implementations and operational workflow actions are not implemented
- LLM routing: only OpenAI; cost/latency/privacy routing not active
- Queue workers: producers exist, but `message-processing` and `ai-response` processors are stubs
- Pain runtime: stubbed `StubPainClient` — no real Kubernetes reconciliation
- Webhook validation: Telegram has basic validation; Discord + WhatsApp throw `ServiceUnavailable`
- Billing: `BillingAccount` schema exists; signed Stripe webhook reconciliation is wired for subscription and invoice status events, but customer creation, checkout, portal, and retry jobs are still pending

## What Is Missing

- Pulse production audio → transcription pipeline (Whisper / cloud STT integration)
- Pulse operational action executors and workflow-run metering
- BullMQ worker processors for `message-processing` and `ai-response` queues
- Stripe billing checkout/customer portal integration for plans Light, Pro, Premium and admin-controlled feature flags
- Operational usage billing for AI calls, audio transcription, workflow runs, storage, messages, and automation executions
- Production webhook HMAC validation for Discord and WhatsApp
- Metrics/tracing export (Prometheus, OpenTelemetry)
- Kubernetes worker strategy for Pain integration

## Technical Risks

| Risk | Mitigation |
|------|------------|
| LLM cost at scale | LLM pool ready for routing by cost; implement multi-provider in Phase 3 |
| Queue backpressure | BullMQ exponential backoff configured; concurrency limits TBD |
| Cross-tenant data leak | `TenantPrismaService` wraps all queries; guards on all routes |
| Webhook replay attacks | `x-request-id` logged; HMAC validation required before production |
| JWT expiry | 15m expiry configured; refresh token flow not yet implemented |

## 2026-05-07 Backend Update

- Changed: renamed the first product module backend surface from the retired messaging-oriented shape to Synapse Pulse (`pulse`), including route prefix, permissions, queue name, registry manifest, Prisma model/enum, and migration.
- Completed: Pulse is now under `apps/api/src/product-modules/pulse`; module registry advertises `pulse`; repository writes are tenant-scoped.
- Pending: generated Prisma client/migrations must be applied in the target database; frontend routes remain owned by Claude Opus and need contract alignment.
- Risks: existing databases require the rename migration before deploying the new code; old clients using previous route/permission names will fail.
- Next recommended step: run migration/generation and then add backend contract tests for Pulse RBAC and tenant isolation.

## 2026-05-07 Naming Update

- Changed: module name and slug are now Pulse / `pulse` across backend code, Prisma schema, permissions, queue naming, contracts, and docs.
- Completed: business rules, queue flow, validation flow, tenant isolation behavior, and extraction logic remain unchanged.
- Pending: frontend-owner contract alignment to `/v1/pulse` and `pulse:*`.
- Risks: any external consumer still using the interim route or permission names will fail authorization or routing.
- Next recommended step: add Pulse route/RBAC contract tests before adding billing or usage gates.

## 2026-05-07 RBAC + Route Protection Update

- Changed: added backend tests for `PermissionsGuard`, `TenantGuard`, and Pulse controller route-permission metadata; narrowed Jest transforms to TypeScript specs only.
- Completed: Pulse route prefix and `pulse:*` route metadata are locked by tests; operator/viewer permission behavior and tenant header mismatch handling are covered.
- Pending: full HTTP e2e tests with JWTs and persisted users are still needed before production hardening.
- Risks: metadata/unit tests do not exercise Passport JWT validation or database-backed membership loading.
- Next recommended step: implement Pulse tenant-isolation repository tests, then move into persisted module registry/store backend work.

## 2026-05-07 Pulse Tenant Isolation Test Update

- Changed: added `PulseRepository` tests for tenant-scoped read, list, update, update miss, and create paths.
- Completed: Pulse persistence boundary now verifies `tenantId` is included in repository reads and writes.
- Pending: database-backed integration tests remain needed after test database setup is standardized.
- Risks: mocked Prisma tests prove query shape, not actual PostgreSQL constraints or migration behavior.
- Next recommended step: start persisted module registry/store backend models and service tests.

## 2026-05-07 Module Registry Store Update

- Changed: added persisted module catalog and tenant module installation models, migrations, and service behavior.
- Completed: Pulse manifest is seeded into `module_catalog_items`; tenant enable/disable state is stored in `tenant_module_installations`; runtime state and audit events are applied on enable/disable; service tests cover seeding, listing, enabling, and disabled-module rejection.
- Completed: tenant-facing list/enable/disable operations are restricted to `PUBLIC` catalog modules.
- Pending: module marketplace purchase records, plan entitlement gates, commercial activation flags, and HTTP e2e tests.
- Risks: module registry persistence is implemented, but commercial activation rules are not enforced yet.
- Next recommended step: implement billing/entitlement models that connect Light/Pro/Premium plans, module purchases, and operational usage gates.

## 2026-05-07 Billing Core Update

- Changed: added billing plans, feature flags, plan/module entitlements, module purchases, and billing admin/read APIs.
- Completed: Light/Pro/Premium plans seed at startup; Light commercial flag is enabled, Pro/Premium flags are disabled; plan activation checks required public module counts; Pulse enablement is gated by active purchase or active commercial plan entitlement.
- Pending: Stripe customer/subscription lifecycle, module purchase checkout/webhooks, operational usage meters, and HTTP e2e tests.
- Risks: billing core gates module enablement, but payment state is not yet synchronized from Stripe.
- Next recommended step: implement operational usage metering event schema/service before wiring AI/transcription billing boundaries.

## 2026-05-07 Operational Usage Metering Update

- Changed: added tenant-scoped append-only usage events and a usage summary API.
- Completed: usage metric categories exist for AI calls, audio transcription, workflow runs, storage, messages, and automation executions; Pulse entry creation, Pulse AI extraction, Pulse audio transcription, message creation, and workflow starts record usage events; usage recording is idempotent when a key is supplied.
- Pending: storage byte accounting, automation execution coverage outside Pulse entry creation, billing-period rating/pricing, Stripe usage reporting, and e2e tests.
- Risks: metering exists, but costs are not yet rated or pushed to Stripe.
- Next recommended step: add pricing/rating and billing-period aggregation for usage events.

## 2026-05-07 Usage Rating Update

- Changed: added admin-managed usage rate cards and tenant billing-period aggregate snapshots.
- Completed: usage rates support metric/unit/currency pricing; `GET /v1/usage/rated-summary` calculates and stores rated period aggregates; unrated usage remains explicit instead of using fake prices; usage rates are protected by `billing:manage`.
- Pending: Stripe usage reporting, invoice reconciliation, rated aggregate review workflows, and e2e authorization tests.
- Risks: inactive/missing rates leave lines unrated, so finance review is required before invoices are finalized.
- Next recommended step: implement Stripe usage reporting from rated aggregates.

## 2026-05-07 Stripe Usage Reporting Update

- Changed: added Stripe meter mappings and per-aggregate Stripe report records.
- Completed: rated aggregate lines can be reported to Stripe meter events through `/v2/billing/meter_events`; reports persist `SENT`, `FAILED`, or `SKIPPED` state; missing customer ids, unrated lines, missing meter mappings, and non-positive/non-integer values are not sent.
- Pending: Stripe webhook reconciliation, customer/subscription creation, checkout/customer portal, and production retry scheduling.
- Risks: Stripe reporting requires configured meters and customer ids; Stripe processes meter events asynchronously.
- Next recommended step: implement Stripe webhook signature validation and lifecycle reconciliation.

## 2026-05-07 Stripe Webhook Reconciliation Update

- Changed: added a signed `POST /v1/billing/stripe/webhook` backend endpoint, raw-body capture, and an idempotent `stripe_webhook_events` ledger.
- Completed: Stripe webhook signatures are verified with `STRIPE_WEBHOOK_SECRET`; duplicate events are ignored; subscription events reconcile customer id, subscription id, plan key, status, and period end; invoice paid/failed events reconcile billing status.
- Pending: Stripe customer creation, checkout/customer portal flows, module purchase checkout, retry scheduling for failed webhook reconciliation, and database-backed webhook e2e tests.
- Risks: webhook reconciliation depends on Stripe metadata containing `tenantId` and `synapse_plan_key`, or on existing customer/subscription ids already tied to a tenant billing account.
- Next recommended step: implement Stripe customer/subscription provisioning and checkout session creation.

## 2026-05-07 Stripe Checkout Provisioning Update

- Changed: added backend subscription checkout creation with Stripe customer provisioning under `POST /v1/billing/checkout/subscription`.
- Completed: checkout requires `billing:manage`, commercially active plans, configured Stripe price ids, tenant-owned billing accounts, and Stripe metadata for webhook reconciliation.
- Pending: customer portal, checkout session retrieval/reconciliation, module purchase checkout, retry jobs, and HTTP e2e tests with signed Stripe callbacks.
- Risks: checkout is unusable until real Stripe price ids are configured in plan metadata or `STRIPE_PRICE_LIGHT`, `STRIPE_PRICE_PRO`, and `STRIPE_PRICE_PREMIUM`.
- Next recommended step: implement customer portal session creation and checkout session reconciliation.

## 2026-05-07 Stripe Portal + Redirect Allowlist Update

- Changed: added `POST /v1/billing/portal/session` and redirect-origin allowlisting for checkout and portal URLs.
- Completed: portal sessions require `billing:manage`, a tenant-owned Stripe customer id, server-side Stripe credentials, and an allowed return URL origin.
- Pending: checkout session retrieval, portal configuration management, module purchase checkout, and HTTP e2e tests.
- Risks: `BILLING_REDIRECT_ALLOWED_ORIGINS` must be configured correctly per environment or billing redirects will be blocked.
- Next recommended step: implement checkout/session retrieval and reconciliation for completed checkout flows.

## 2026-05-07 Stage 1 Backend Refinement + Pulse Foundation Update

- Changed: added Stage 1 operational foundation models and contracts without redesigning the NestJS modular monolith or implementing the future external runtime.
- Completed: module catalog now stores tier, visibility, rollout state, feature flag, and active state; Pulse now has tenant-scoped schemas for channels, operational conversations, tickets, operational events, playbooks, knowledge contexts, skills, integration settings, and execution requests.
- Completed: added Pulse operational event repository with audit-safe metadata redaction and tenant-scoped query tests; forbidden permission denials now record audit events.
- Completed: added runtime-ready execution request/response/provider contracts and scheduling provider contracts for Google Calendar, Outlook Calendar, and Calendly.
- Pending: HTTP APIs/use cases for the new Pulse entities, full role migration to platform/tenant role names, usage limit enforcement at every execution boundary, e2e tenant-isolation tests, and frontend integration by the frontend owner.
- Risks: the new migration must be applied before code using the new models runs; existing role enum names remain mapped through current contracts and need a deliberate migration plan.
- Next recommended step: implement Pulse ticket/conversation use cases and operational event emission for create/validate/reject/retry flows.

## 2026-05-07 Pulse Operational Lifecycle Wiring Update

- Changed: existing Pulse queue use cases now emit operational events and validation creates a tenant-scoped operational ticket.
- Completed: entry creation records `pulse.entry.received`; validation creates a `SCHEDULING` ticket and records `pulse.entry.validated`; rejection records `pulse.entry.rejected`; retry records `pulse.entry.retry_requested`.
- Completed: added `PulseTicketRepository` with tenant-scoped tests and use-case tests for create/validate side effects.
- Pending: explicit Pulse channel/conversation creation APIs, unsupported message-type fallback events, flow transition engine, and use-case tests for reject/retry side effects.
- Risks: validation currently creates a scheduling-oriented ticket because the legacy entry extraction shape is still scheduling-focused; the upcoming generic Pulse DTO pass should map ticket type intentionally.
- Next recommended step: add PulseChannel and PulseConversation APIs/contracts so entry ingestion no longer depends on legacy `conversationId` strings.

## 2026-05-07 Pulse Channel + Conversation Ingestion Update

- Changed: Pulse entry creation can now resolve tenant-owned channel and conversation records from provider/channel/participant context before queueing.
- Completed: added `PulseChannelRepository` and `PulseConversationRepository`; create-entry DTO accepts optional `provider`, `channelIdentifier`, `participantRef`, and `participantLabel`; entry creation emits `pulse.conversation.resolved`.
- Pending: read/admin APIs for Pulse channels and conversations, explicit unsupported message-type fallback handling, and migration of legacy callers to provider/channel context.
- Risks: existing callers can still pass a raw `conversationId`; future hardening should validate tenant ownership before accepting direct ids.
- Next recommended step: add Pulse channel/conversation read APIs and then deprecate direct `conversationId` ingestion.

## 2026-05-07 Pulse Direct Conversation Validation Update

- Changed: direct `conversationId` ingestion now validates tenant ownership before entry creation.
- Completed: `PulseConversationRepository.findById(tenantId, id)` was added; create-entry rejects missing/cross-tenant conversations before queueing, metering, or event creation.
- Pending: public deprecation of direct `conversationId` ingestion and read APIs for channel/conversation state.
- Risks: trusted internal callers may need to switch to provider/channel context before direct ids are removed.
- Next recommended step: expose read-only Pulse channel/conversation APIs and document provider-context ingestion.

## 2026-05-07 Pulse Channel + Conversation Read API Update

- Changed: added read-only Pulse channel and conversation APIs.
- Completed: `GET /v1/pulse/channels`, `GET /v1/pulse/channels/:id`, `GET /v1/pulse/conversations`, and `GET /v1/pulse/conversations/:id` are protected by `pulse:read` and backed by tenant-scoped repositories.
- Pending: response DTO examples, pagination/filtering, ticket/timeline read APIs, and provider integration docs.
- Risks: current list endpoints are intentionally minimal and unpaginated; add pagination before high-volume production use.
- Next recommended step: expose Pulse ticket and operational event timeline read APIs.

## 2026-05-07 Pulse Ticket + Timeline Read API Update

- Changed: added read-only Pulse ticket and operational event timeline APIs.
- Completed: `GET /v1/pulse/tickets`, `GET /v1/pulse/tickets/:id`, and `GET /v1/pulse/tickets/:id/events` use `tickets:read`; `GET /v1/pulse/conversations/:id/events` uses `pulse:read`.
- Completed: ticket and operational event repositories now have tenant-scoped read/list methods with tests.
- Pending: pagination/filter DTOs, richer response contracts, ticket mutation APIs, and e2e tenant-leak tests.
- Risks: list endpoints are minimal and unpaginated; timeline payloads should remain audit-safe before exposing richer event payloads.
- Next recommended step: add pagination/filtering DTOs across Pulse read APIs.

## 2026-05-07 Pulse Read Pagination Update

- Changed: Pulse channel, conversation, ticket, and timeline list endpoints now accept pagination query params.
- Completed: added shared `PulseListDto` with `page` and capped `pageSize`; repositories return `{ data, total, page, pageSize }` using tenant-scoped count/list queries.
- Pending: domain filters by status/provider/type/date and response DTO examples.
- Risks: pagination exists, but unfiltered timelines can still be broad for very active tenants.
- Next recommended step: add filters for channel provider/status, conversation state/status, ticket status/type, and event type/date.

## 2026-05-07 Pulse Read Filtering Update

- Changed: Pulse read APIs now support resource-specific filters.
- Completed: channels filter by provider/status; conversations filter by state/operational status; tickets filter by type/status; timelines filter by event type and occurred date range.
- Pending: response examples, e2e validation tests, and richer operator workflow filters.
- Risks: filter additions must always preserve tenant-scoped base queries.
- Next recommended step: add HTTP e2e tests for pagination/filter validation and cross-tenant isolation.

## 2026-05-07 Pulse Read Contract Test Update

- Changed: added backend contract coverage for Pulse read filter validation and controller forwarding.
- Completed: DTO tests now accept valid filters and reject unsupported channel, conversation, ticket, and timeline filter values; controller tests verify filtered reads preserve the server-provided tenant context.
- Pending: true HTTP e2e coverage once an API e2e harness is introduced.
- Risks: unit-level contract tests do not prove global pipe behavior or real request serialization.
- Next recommended step: add a Nest HTTP e2e harness for Pulse read endpoints and cross-tenant rejection cases.

## 2026-05-07 Pulse HTTP Read E2E Harness Update

- Changed: added a Nest HTTP test harness for Pulse read routes.
- Completed: HTTP tests cover valid filter transformation, invalid filter rejection, cross-tenant header rejection, and forbidden-read audit logging for Pulse channel/conversation/ticket/timeline reads.
- Pending: database-backed fixtures with two tenants and overlapping ids.
- Risks: the current harness stubs use cases, so repository/database isolation is still covered separately by unit tests rather than one integrated request-to-database test.
- Next recommended step: add database-backed Pulse read e2e fixtures or proceed to ticket mutation APIs once test DB wiring is available.

## 2026-05-08 Pulse Ticket Lifecycle Mutation Update

- Changed: added operational ticket lifecycle command APIs instead of generic CRUD mutations.
- Completed: `assignTicket`, `resolveTicket`, `reopenTicket`, `escalateTicket`, `cancelTicket`, `submitOperatorReview`, and `advanceFlowState` now have backend routes, DTO validation, tenant-scoped repository updates, Pulse operational events, audit events, and contract types.
- Pending: formal guided-flow state machine, consolidated timeline aggregation, usage metering writes, and database-backed multi-tenant fixtures.
- Risks: flow state currently lives in ticket metadata as a foundation; it needs stricter transition rules before playbook execution.
- Next recommended step: standardize Pulse timeline aggregation and event type catalogs around these lifecycle events.

## 2026-05-08 Pulse Event Catalog + Timeline Aggregation Update

- Changed: added a central Pulse event type catalog and consolidated operational timeline APIs.
- Completed: event-type filters are catalog-aware; `GET /v1/pulse/tickets/:id/timeline` and `GET /v1/pulse/conversations/:id/timeline` support category slices for entry, ticket lifecycle, operator actions, escalation, confidence, and workflow state transitions.
- Pending: response examples/OpenAPI, database-backed timeline isolation fixtures, and richer timeline denormalization for operator-facing summaries.
- Risks: timeline aggregation reads event records directly; future large tenants may need projection tables or query-plan review.
- Next recommended step: implement guided flow state-machine rules using the new workflow-state timeline category.

## 2026-05-08 Pulse Guided Flow State Machine Update

- Changed: `advanceFlowState` now uses a V1 guided-flow state graph instead of arbitrary metadata strings.
- Completed: supported states include intake, classify intent, collect context, waiting customer, execute action, review required, operator takeover, escalated, completed, and cancelled; invalid transitions are rejected; review/escalation/waiting/completion states map to ticket statuses.
- Pending: playbook-specific transition overrides, confidence threshold automation, and database-backed transition fixtures.
- Risks: V1 transitions are conservative and generic; tenant-specific playbooks will need explicit transition policies before runtime execution.
- Next recommended step: implement the confidence and human-review layer on top of review-required/operator-takeover states.

## 2026-05-08 Pulse Confidence + Human Review Layer Update

- Changed: automated flow advancement now applies V1 confidence thresholds before ticket writes.
- Completed: AI/integration transitions below `0.65` route to `review_required`; below `0.35` route to `escalated`; audit-safe AI decision summaries are stored through masked operational event payloads.
- Pending: tenant/playbook-specific thresholds, operator takeover assignment rules, and dedicated confidence review APIs.
- Risks: thresholds are static V1 defaults and should not be treated as tenant-configurable policy yet.
- Next recommended step: implement Pulse Knowledge Context foundation for FAQs, instructions, products/services, and campaigns.

## 2026-05-08 Pulse Knowledge Context Foundation Update

- Changed: added tenant-scoped Pulse Knowledge Context backend APIs.
- Completed: list/get/query/publish/archive flows support FAQs, business descriptions, operational instructions, products/services, and campaigns/promotions; publish/archive emit Pulse operational events and audit records.
- Pending: strict retrieval ranking, embedding/runtime integration, update/versioning workflow, and database-backed two-tenant fixtures.
- Risks: query uses simple title/content filtering as a runtime-ready contract, not semantic retrieval.
- Next recommended step: finalize scheduling integration contracts for Google Calendar, Outlook Calendar, and Calendly.

## 2026-05-08 Pulse Scheduling Integration Contracts Update

- Changed: added scheduling integration contract seams without provider calls.
- Completed: tenant-scoped scheduling integration list/get, availability prepare, booking prepare, provider port contracts, and shared prepared-request contract types for Google Calendar, Outlook Calendar, and Calendly.
- Pending: actual provider adapters, secret retrieval, booking execution, and webhook reconciliation.
- Risks: prepare endpoints validate readiness only; they intentionally do not contact providers or create bookings.
- Next recommended step: implement operational usage metering candidates for Pulse conversations, ticket operations, workflow executions, knowledge storage, and scheduling prepare/booking intents.

## 2026-05-08 Pulse Usage Metering Foundation Update

- Changed: Pulse now writes platform usage events for operational candidates.
- Completed: inbound entries record `MESSAGE`; ticket lifecycle and flow advancement record `WORKFLOW_RUN`; knowledge publish records `STORAGE` bytes; knowledge archive and scheduling prepare flows record `AUTOMATION_EXECUTION`.
- Pending: channel/number count metering, successful provider booking metering, plan-limit enforcement, and rated usage defaults.
- Risks: lifecycle idempotency keys are conservative per ticket/action and may undercount repeated same-action operations until operation ids exist.
- Next recommended step: prepare runtime integration contracts and execution lifecycle models for future Go Runtime.

## 2026-05-08 Runtime Execution Lifecycle Contract Update

- Changed: added tenant-aware runtime execution lifecycle persistence and protected APIs.
- Completed: request/get/transition APIs persist `ExecutionRequest` records and support requested, queued, running, succeeded, failed, cancelled, and timed-out states.
- Pending: external Go Runtime adapter, gRPC/queue submission, service actor permissions, and runtime usage metering.
- Risks: lifecycle APIs prepare state only; they do not execute providers or submit work to an external runtime.
- Next recommended step: continue Pulse AppSec hardening and role-matrix/database-backed tenant fixtures around runtime and Pulse mutation routes.

## 2026-05-07 Frontend Stage 1A — Route IA + Pulse rename

- Changed (frontend, owned by Claude Opus): full route IA reorganised into three experiences — public marketing (`/`, `/pricing`, `/modules`), tenant workspace (`/workspace/*`), platform admin (`/platform/*`).
- Completed: legacy `(dashboard)/*` routes moved under `(workspace)/workspace/*` via `git mv` (history preserved). Old nested messaging module routes collapsed into `modules/pulse/*` with `queue → inbox` and `errors → logs` renames.
- Completed: full Pulse sub-route IA scaffolded — `/workspace/modules/pulse/{inbox,tickets,tickets/[ticketId],timeline,playbooks,knowledge,catalog,campaigns,integrations,settings,metrics,logs}`. Inbox, settings and logs ship live; the remaining surfaces use a shared `PendingSection` scaffold tagged `Stage 1B` so they're discoverable but never lie about being implemented.
- Completed: platform admin shell at `/platform/{overview,tenants,modules,billing,flags,integrations,runtime,audit}` with a distinct top bar (indigo accent, "Platform" badge) and a quick-link back to the workspace; every page uses the same `PendingSection` until Stage 1B fills them.
- Completed: marketing layer — `/pricing` (Light/Pro/Premium tiers + usage-metering notes) and `/modules` (read-only public catalog preview) live behind a shared `(marketing)` layout with `PublicNav`.
- Completed: API client, entry/status types, and request paths updated to Pulse naming and `/v1/pulse/*` to match the backend rename.
- Completed: middleware (`apps/web/middleware.ts`) with public allowlist + `synapse_session` cookie presence guard; static assets, `_next/*`, root metadata files and any URL with a file extension bypass via the matcher.
- Completed: i18n dictionaries + SegmentNav slug map updated for the new IA.
- Pending (Stage 1B): rich operational UX for ticket detail (timeline, confidence overlays, AI decision summary, human review actions); inbox queue redesign as an operational queue; playbook visual editor; module store premium UI; platform admin operational dashboards; design-system additions (operational cards, queue components, animated synapse bg refinements); marketing landing premium redesign; RBAC restricted-state UX + plan-based upgrade prompts.
- Risks: backend Pulse DTO/OpenAPI examples are still pending — ticket / timeline / playbook screens will need to negotiate response shapes when they ship in Stage 1B. Platform-admin role isn't enforced client-side yet beyond the cookie gate; the layout banner makes the surface obvious but the backend remains the only authority.
- Next recommended step: ship Stage 1B starting with the ticket detail screen (highest operational value) and the inbox redesign, then move on to the module store and platform overview dashboards.

## 2026-05-08 Runtime AppSec Hardening Update

- Changed: runtime lifecycle governance now has stricter backend authorization and transition policy.
- Completed: added `runtime:executions:transition`, a dedicated cancel command, audit events for request/transition/cancel, transition-state validation, and recursive masking for sensitive runtime input/output/context payload keys.
- Pending: service-actor authentication, database-backed two-tenant runtime fixtures, route-level forbidden audit tests, and queue/gRPC callback authorization.
- Risks: transition/cancel APIs remain governance-only and must be restricted further before any external runtime can call back into Synapse.
- Next recommended step: add database-backed multi-tenant fixtures for runtime lifecycle and Pulse mutation routes.

## 2026-05-08 Database Fixture Foundation Update

- Changed: added opt-in database-backed fixture specs for runtime lifecycle and Pulse ticket mutation isolation.
- Completed: `RUN_DATABASE_TESTS=1 npm run test:db` now targets real Prisma/PostgreSQL fixtures for two-tenant idempotency, cross-tenant runtime transition rejection, runtime audit segregation, Pulse ticket mutation isolation, Pulse event/audit/usage segregation, and terminal mutation no-side-effect checks.
- Pending: CI test database provisioning, HTTP-level role-matrix fixtures, forbidden-action audit fixture coverage, and broader Pulse read/timeline database fixtures.
- Risks: database fixtures are skipped in normal unit mode until a real test database is supplied.
- Next recommended step: wire a disposable PostgreSQL test database for Ninja/CI and run `npm run test:db` before external runtime callback work.

## 2026-05-08 Platform Runtime Client Signer Update

- Changed: added NestJS-side infrastructure for signed calls to the isolated Go Runtime.
- Completed: `RuntimeSignatureService` creates the Go Runtime canonical HMAC headers; `RuntimeHttpClient` maps persisted Synapse execution requests into `POST /executions`; env validation now includes runtime URL, shared secret, and key id; lifecycle callback shape is defined as a contract only.
- Pending: wiring module execution paths to call the HTTP client, runtime callback endpoint/auth, service-actor permission model, idempotent submission policy, and end-to-end platform/runtime tests.
- Risks: the HTTP client is available but not yet invoked by product modules or lifecycle orchestration.
- Next recommended step: add a governed runtime submission use case that creates a lifecycle record, transitions it to queued/running, submits to the isolated runtime, and handles response transitions.

## 2026-05-08 Frontend Contract Pack Update

- Changed: added `docs/FRONTEND_CONTRACT_PACK.md` as the backend-owned integration handoff for the Next.js frontend owner.
- Completed: documented Pulse queue, channels, conversations, tickets, lifecycle actions, timelines, knowledge context, scheduling prepare contracts, module registry, billing, usage, runtime governance, RBAC permission gates, error handling, and the recommended first frontend milestone.
- Pending: generated OpenAPI, real response examples from database-backed fixtures, and future updates when runtime orchestration/callbacks are wired.
- Risks: the pack is a static handoff and must be kept in sync with backend route changes.
- Next recommended step: deliver the pack to the frontend LLM and start with Pulse ticket detail plus timeline and lifecycle actions.

## 2026-05-08 Frontend Stage 1B — Batch 1 (Pulse operational UX)

- Changed (frontend, owned by Claude Opus): the highest-value Pulse surfaces are now real — ticket detail, tickets list, and inbox redesigned as an operational queue.
- Completed: design-system primitives for operational surfaces.
  - `components/pulse/confidence-meter.tsx` — inline + block variants, three confidence bands (high/medium/low) driven by the same thresholds the auto-approve gate will use.
  - `components/pulse/operational-timeline.tsx` — vertical timeline with kind-driven icons, actor-typed avatar tones, inline ConfidenceMeter on AI events, structured-payload key/value chip strip, low-confidence escalation marker.
  - `components/pulse/status-pills.tsx` — TicketStatusPill, SkillPill, PriorityPill, TicketTypePill, ChannelPill, ConversationStatePill, EscalationBadge — one base look so a stack of pills reads as a single unit.
  - `.bar-progress` utility in globals.css — data-driven horizontal progress bars now consume `--w` from a CSS custom property instead of inline `width:` strings.
- Completed: typed Pulse UI contracts + dev fixtures.
  - `lib/pulse/types.ts` — `PulseTicketDetail`, `PulseTicketRow`, `PulseTimelineEvent`, plus the canonical state/skill/priority unions.
  - `lib/pulse/fixtures.ts` — five well-shaped mock tickets with full timelines covering scheduling/support/operator-review/sales/resolved cases. Single integration seam: every Stage 1B Pulse screen calls `loadInboxTickets` / `loadTicketDetail` / `loadAllTickets` here.
- Completed (screens): `/workspace/modules/pulse/tickets/[ticketId]` (full detail — header card, timeline, workflow + extracted-context + lifecycle side panels, RBAC-gated approve/reject/escalate/resolve buttons), `/workspace/modules/pulse/tickets` (bucketed list: Operator queue / Active / Resolved + headline counters), `/workspace/modules/pulse/inbox` (operational queue with three lanes: Operator queue → Active → Watching, plus headline counters).
- Completed: legacy `inbox/queue-client.tsx` removed (was wired to the old `PulseEntry` shape; replaced by ticket-driven UX). Auth-gated buttons on the ticket detail use the existing `<Can permission="pulse:validate" | "pulse:reject" | "tickets:assign" | "tickets:resolve">` gates so RBAC is honoured even before the backend wires action handlers.
- Pending (Stage 1B subsequent batches): playbooks visual editor; knowledge / catalog / campaigns operational UX; Pulse metrics premium dashboard; module store premium UI; platform admin operational dashboards; marketing landing premium redesign; RBAC restricted-state UX + plan-based upgrade prompts.
- Pending (cross-cutting): backend Pulse DTO/OpenAPI examples — when they ship, `lib/pulse/fixtures.ts` becomes a one-file swap to real `api.pulse.*` calls; nothing in the UI layer changes.
- Risks: every page using fixtures shows a "Pending backend integration" badge in its PageHeader actions slot so the deferred wire-up is greppable.
- Next recommended step: ship Batch 2 with the playbooks visual editor and the Pulse metrics dashboard — both compose against the same fixture seam.

## 2026-05-08 Frontend Stage 1B — Batch 2 (Pulse backend integration)

- Changed (frontend, owned by Claude Opus): swapped Pulse fixtures for real backend wires; the inbox / tickets list / ticket detail screens now call `/v1/pulse/*` directly. Aligned to `docs/FRONTEND_CONTRACT_PACK.md` exactly.
- Completed: `lib/api.ts` extended with the full Pulse surface — channels, conversations, conversation events/timeline, tickets, ticket events/timeline, knowledge contexts (list/get/query/publish/archive), scheduling integrations (read + prepare availability/booking), and lifecycle commands (assign, resolve, reopen, escalate, cancel, operator-review, flow advance). Added `PULSE_FLOW_STATES` (10-value FSM) and `qs(...)` helper.
- Completed: `lib/pulse/types.ts` rewritten to re-export backend record shapes from `@/lib/api` and add three view models (`PulseTicketRow`, `PulseTicketDetailVM`, `PulseTimelineEventVM`). UI types are explicitly *projections* — never invent data the backend doesn't send.
- Completed: `lib/pulse/loaders.ts` is the single seam between the API client and the screens. Composes ticket detail with timeline + best-effort conversation/channel enrichment; returns a typed `LoadResult<T>` (`ok | forbidden | not_found | error`) instead of throwing. Maps event-type strings to operator-facing summaries — never echoes raw provider payloads.
- Completed: `lib/pulse/actions.ts` — Server Actions for the seven ticket lifecycle commands. Each accepts `FormData` or a typed object; validates inputs locally, calls the backend, revalidates ticket detail / tickets list / inbox on success, and returns a typed `ActionResult`.
- Completed: `components/ui/load-state.tsx` — shared four-variant honest-state primitive (empty / error / forbidden / not-found). Used across all wired Pulse pages.
- Completed: `ConfidenceMeter` and `ChannelPill` are null-tolerant — honest "—" placeholder rather than misleading 0% / empty pill.
- Completed: legacy `lib/pulse/fixtures.ts` deleted; no screen falls back to mock data.
- Completed: ticket detail `/workspace/modules/pulse/tickets/:id` calls `GET /v1/pulse/tickets/:id` + `/timeline` + conversation/channel enrichment. Header buttons aligned to the lifecycle FSM (Escalate / Resolve / Reopen / Cancel) and `<Can>`-gated against `tickets:assign` / `tickets:resolve` / `tickets:write`.
- Completed: tickets list `/workspace/modules/pulse/tickets` calls `loadTicketsPage`. Honest empty fallback for tenants with zero tickets.
- Completed: inbox `/workspace/modules/pulse/inbox` calls `loadInboxLanes` (parallel filtered fetches).
- Pending: knowledge management / scheduling integrations / module store / billing / runtime governance / usage UIs — deferred to Batch 3. API client already exposes them so wiring is additive.
- Risks: tickets list fans out N detail-fetches per row to surface priority/confidence — acceptable today, the swap-in seam is `loaders.toRow`.
- Next recommended step: Batch 3 — module store + billing visibility, then knowledge management, scheduling integrations, runtime governance.

## 2026-05-08 Admin Bootstrap Billing Plan Fix

- Changed: superseded by Platform Admin Bootstrap Foundation below.
- Completed: retired `starter` remains removed from tenant/customer billing creation paths.
- Pending: container smoke test for platform-admin bootstrap after migrations.
- Risks: older runbooks may still describe `admin:create` as tenant bootstrap.
- Next recommended step: use the platform-admin bootstrap section below as canonical.

## 2026-05-08 Platform Admin Bootstrap Foundation

- Changed: `npm run admin:create` is now platform-admin bootstrap, not tenant/customer bootstrap.
- Completed: added `User.platformRole`, migration `20260508120000_platform_admin_user_role`, `platform_admin` contract permissions, tenantless platform-admin login/session support, explicit `@AllowTenantless()` route metadata, `/users/me` support for platform admins, and guard tests for platform-admin permission/tenant behavior.
- Pending: dedicated platform user-management APIs for creating/updating/deleting admins, testers, and tenant customer users; frontend platform-admin routing must consume `role: "platform_admin"` and optional `tenant`.
- Risks: existing users upgraded by email may still retain tenant memberships, but login prioritizes `platform_admin`; platform admins can intentionally enter a tenant boundary with `x-tenant-id`.
- Next recommended step: implement backend platform user-management endpoints with audit events and forbidden-action tests.

## 2026-05-08 Granular Platform Administration Foundation

- Changed: platform administration now distinguishes `super_admin`, granular `admin`, and `tester`; `admin:create` creates `SUPER_ADMIN`.
- Completed: Prisma enum/JSON scope migration, auth role mapping, scoped RBAC contracts, platform user-management APIs for admins/testers/customers, super-admin platform-access update API, audit events, and sensitive admin-metric masking helper.
- Pending: apply platform scope checks to future platform metrics/modules/policies endpoints and add HTTP/database fixtures for platform user lifecycle.
- Risks: granular scopes are stored and audited, but only future platform-specific module/metrics/policy APIs will consume them for per-resource filtering.
- Next recommended step: implement platform metrics/module/policy read APIs that enforce `platformScopes` and call the sensitive metrics masker.

## 2026-05-08 Platform Governance Scope Enforcement

- Changed: added backend platform governance read APIs for usage metrics, module catalog governance, and policy/feature-flag visibility.
- Completed: `GET /v1/platform/metrics/usage`, `GET /v1/platform/modules`, and `GET /v1/platform/policies` are tenantless platform routes gated by `platform:*` permissions, filtered through `User.platformScopes`, and metric responses pass through sensitive-field masking for non-super roles.
- Pending: mutation APIs for platform module rollout/policy changes, database-backed fixtures for scoped admins, and richer metrics beyond usage aggregation.
- Risks: current metrics endpoint is usage-focused and intentionally does not expose raw financial/provider payloads.
- Next recommended step: add HTTP fixtures proving granular admins only see scoped modules/policies/metrics and testers cannot access platform metrics.

## 2026-05-08 Platform Governance Mutations

- Changed: added audited write-side platform governance for module rollout settings and policy flags.
- Completed: `PATCH /v1/platform/modules/:module/governance` updates active/status/visibility/rollout/tier with module-scope enforcement; `PATCH /v1/platform/policies/:policy` updates policy enabled state/metadata with policy-scope enforcement; both emit audit events.
- Pending: HTTP/database fixtures for scoped mutation denial and full admin dashboard integration.
- Risks: policy mutation currently targets `BillingFeatureFlag` keys; future policy domains may need their own model before broader governance.
- Next recommended step: add fixture coverage for scoped platform mutations and forbidden audit records.

## 2026-05-08 Platform Governance Test Fixtures

- Changed: added focused backend fixtures for platform governance authorization and scope behavior.
- Completed: HTTP tests cover super-admin module mutation, granular-admin policy mutation handoff to service scope checks, tester denial from platform metrics, tenant-owner denial from platform governance, and forbidden audit logging; service tests cover scoped module mutation audit, scoped mutation denial audit, and policy update audit.
- Pending: CI database provisioning for running the opt-in fixtures automatically.
- Risks: database fixtures remain skipped unless `RUN_DATABASE_TESTS=1` is set.
- Next recommended step: wire a disposable PostgreSQL test database for CI/Ninja validation.

## 2026-05-08 Platform Governance Database Fixtures

- Changed: added opt-in Prisma/PostgreSQL fixtures for persisted `platformScopes`.
- Completed: `platform-governance.database-fixtures.spec.ts` seeds two scoped platform admins, two modules, two policies, usage events, verifies scoped reads/writes, persisted forbidden audit records, and redacted usage metrics.
- Pending: broader fixtures for policy metadata schemas.
- Risks: dev DB fixture runs are destructive when preceded by `docker compose down -v`; do not use this flow outside local/dev.
- Next recommended step: reset the Docker stack and run `docker compose exec api-synapse npm run test:db:dev-reset`.

## 2026-05-09 Frontend Stage 1B — Batch 3 (Pulse lifecycle action UI)

- Changed (frontend, owned by Claude Opus): the Pulse ticket detail screen graduated from read-only to fully interactive. All seven lifecycle commands (assign, escalate, operator-review, advance flow, resolve, reopen, cancel) are now wired through `<TicketActionBar>` with permission-gated buttons and per-action input dialogs.
- Completed: `apps/web/components/ui/dialog.tsx` — headless modal primitive with portal, body scroll lock, Esc + click-outside dismiss (configurable), focus management, `role="dialog"` + `aria-modal` + labelled-by ids. Sizes `sm | md | lg`. Pure presentation; parent owns state.
- Completed: `apps/web/components/ui/toast.tsx` + `<ToastProvider>` wired into `components/providers/providers.tsx`. Four variants: `success`, `error`, `forbidden`, `info`. Auto-dismiss with `durationMs` override (`0` keeps until manually closed). Portal stack top-right with `aria-live="polite"`.
- Completed: `apps/web/components/auth/tenant-invalidator.tsx` mounted inside `(workspace)/workspace/layout.tsx` — a side-effect component that watches `currentUser.tenant.id` and calls `router.refresh()` when it changes. First mount establishes baseline without invalidating. Honours the contract pack rule "clear tenant/session-scoped cached data when context changes" today, even before a tenant-switcher UI ships.
- Completed: `apps/web/components/pulse/ticket-action-bar.tsx` — client component built on the new Dialog + Toast primitives. `<Can>`-gates each command (`tickets:assign`, `tickets:resolve`, `tickets:write`); FSM `capabilities.canX` flags disable buttons that would otherwise be no-ops; `useTransition()` tracks pending state per command; the typed `ActionResult` from `lib/pulse/actions.ts` is converted into `success | forbidden | error` toasts. Successful actions close the dialog; failures keep it open for retry.
- Completed: ticket detail page `/workspace/modules/pulse/tickets/[ticketId]` replaces its previous static disabled button row with `<TicketActionBar ticket={ticket} />`. The escalation badge that used to live on the page header has moved into the action bar so the priority signal travels with the controls.
- Completed: pre-handoff verification: `npm run typecheck`, `npm run lint`, `npm run build` — all green. No retired module names (`clinicflow`, `clinic-flow`, `relay`-the-module) remain in `apps/web/{app,components,lib}`. The single grep match is the verb "relay" in a comment in `lib/pulse/actions.ts`.
- Pending backend gaps (frontend cannot close these alone; called out so backend can prioritize): (1) tenant member-picker endpoint — the Assign dialog currently takes a free-text user id and shows a "member-picker pending" hint. (2) per-ticket flow state on `GET /v1/pulse/tickets/:id` — `workflow.playbookStep` is `null` today, so the side panel cannot render the current FSM position, only allow a transition. (3) structured `extracted.fields` array on the ticket detail payload — the loader's `extracted` projection currently emits an empty list because the backend payload does not surface key/value extraction.
- Pending UI work (Batch 4 candidates): tenant-side member picker (post backend endpoint), playbook-step indicator + progress bar in the Workflow side panel, structured `extracted.fields` rendering when the API exposes them, channel/conversation deeper drilldown views.
- Risks: the action bar relies on `revalidatePath` from Server Actions to refresh ticket detail / tickets list / inbox. Tenants on aggressive client-side prefetch may see a brief stale flash; acceptable today but worth revisiting when the inbox grows long.
- Next recommended step: Batch 4 — knowledge management UI + scheduling integrations UI, gated on contract-pack endpoints already exposed via `lib/api.ts`.

## 2026-05-09 Stage 1 — Module Context Ownership Review

- Changed: reviewed backend ownership boundaries for Synapse platform versus Pulse module context assembly.
- Completed: confirmed Synapse owns governance/platform concerns; Pulse owns operational domain, context assembly, playbooks, knowledge, skills, timelines, and module execution request shape. Current persistence uses strongly separated `Pulse*` Prisma models mapped to `pulse_*` tables in the main Postgres schema.
- Pending: Stage 2 must add a Pulse-owned Context Pack assembler/contract and keep module-specific cognitive context out of Synapse core. Stage 3 must split the current `pulse-processing` worker into bounded queues/pipelines.
- Risks: Prisma/Postgres full schema separation (`platform.*`, `pulse.*`) is not enabled now to avoid migration/build risk; RLS is deferred until a safe session-variable strategy is implemented and tested.
- Next recommended step: implement Pulse Context Pack contracts and module-local assembly service inside `src/product-modules/pulse`, with Synapse validating only governance and submitted context structure.
- Superseded 2026-05-15: Stage 5B introduced physical `pulse` schema separation; this entry remains historical context for the earlier decision.

## 2026-05-10 Frontend Evolution — Stage 1 (Layout Foundation)

- Changed (frontend, owned by Claude Opus): adopted the staged evolution strategy (one stage, one focus). Replaced the top-nav-only shell with a persistent operational sidebar; primary navigation moved off the top bar.
- Completed: `components/nav/workspace-sidebar.tsx` exports `WorkspaceSidebar` and `PlatformSidebar`. Each is sticky (top-14, full remaining viewport), collapsible (60→16 width), and persists collapse state in `localStorage` under `synapse.sidebar.collapsed` so a refresh keeps the operator's preference. Permission-aware: items gated by `any: Permission[]` use `hasAnyPermission` and disappear when denied.
- Completed: workspace sidebar groups items into `Workspace` (Overview / Modules / Agents / Activity) and `Pulse` (Inbox / Tickets / Timeline / Playbooks / Knowledge / Integrations / Settings). Platform sidebar lists Overview / Tenants / Modules / Billing / Flags / Integrations / Runtime / Audit, with a back-to-workspace link pinned at the bottom of the rail.
- Completed: `components/nav/top-nav.tsx` slimmed to logo + ⌘K trigger + Language + Theme + UserMenu. The old `PRIMARY_NAV` array and animated underline link strip were removed from the top bar. Header is now full-width (`px-4 lg:px-6`) instead of the centered `container-shell`.
- Completed: workspace + platform layouts switched to `sidebar + main` grid. `SegmentNav` now lives inside the main column (no longer renders as a full-width strip) so the breadcrumb flows with the content area.
- Completed: responsive baseline — sidebar is `hidden md:flex` (hides below `md`). A proper mobile drawer is reserved for **Stage 4 — Navigation Architecture**.
- Completed: dead-code policy — old `app/(platform)/platform/_components/platform-nav.tsx` left on disk but unimported. Removing it is out of scope; Stage 4 will retire it explicitly.
- Pending (deferred to later stages, per strategy):
  - Stage 2 (Design System): refine sidebar surface tokens, hover states, glass effects.
  - Stage 3 (Motion / Interaction): smooth route transitions, sidebar collapse motion, hover transitions.
  - Stage 4 (Navigation Architecture): mobile drawer, collapsible sub-sections, tooltips for collapsed labels, animated active states.
- Verification: `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓ (32 routes built clean).
- Risks: any page that relied on the previous top-nav having `PRIMARY_NAV` links is now redirected through the sidebar — no routes were changed. Existing in-page `container-shell` usage was removed from `TopNav`, `SegmentNav`, and the platform header but is still applied within page-level layouts where it adds value.
- Next recommended step: **Stage 2 — Design System Evolution** (one focus: transparent surfaces, thin borders, hover states, typography, shadows, glass effects, icon sizing, spacing rhythm). Do not start Stage 3+ until Stage 2 is closed.

## 2026-05-09 Stage 2 — Pulse Context Pack Foundation

- Changed: added Pulse-owned Context Pack contracts, repository port, tenant-scoped Prisma repository, and assembly use case under `apps/api/src/product-modules/pulse`.
- Completed: `PulseContextPack` now assembles conversation state, ticket state, playbook state, knowledge snippets, product/service context, campaign context, scheduling integration state, allowed actions, required output schema, security hints, and usage hints. Output is audit-safe: identifiers are masked and sensitive keys such as secrets, credentials, tokens, prompts, raw messages, audio, and media are redacted.
- Completed: added tests for context assembly, sensitive field redaction, cross-tenant/missing requested context rejection, and repository tenant filters. No migration was required; existing Pulse tables already support this foundation.
- Pending: expose this pack through the future execution-governance path, add DB-backed cross-tenant fixtures, enrich playbook/skill policies, and split Pulse queues in Stage 3.
- Risks: RLS remains deferred; tenant isolation depends on repository filters and guard-level tenant context until Stage 4. Context Pack is internal/backend-only and must not be rendered raw in frontend debug UI.
- Next recommended step: Stage 3 — add bounded Pulse queue contracts for `pulse.inbound`, `pulse.context`, `pulse.execution`, `pulse.actions`, `pulse.timeline`, and `pulse.failed` with idempotency and retry policy.

## 2026-05-09 Stage 3 — Pulse Async Pipeline Foundation

- Changed: added bounded Pulse queue contracts and a `PulseQueueService` for `pulse.inbound`, `pulse.context`, `pulse.execution`, `pulse.actions`, `pulse.timeline`, and `pulse.failed`.
- Completed: entry creation and retry now enqueue through the Pulse queue publisher with tenant-scoped idempotency keys. The existing Pulse processor was moved from the broad `pulse-processing` queue to `pulse.inbound`, preserving current entry processing while preparing the split pipeline. All Pulse queues are registered in `PulseModule`.
- Pending: implement dedicated context/execution/action/timeline processors, persist execution requests after context assembly, and route failures into `pulse.failed` from real worker error boundaries.
- Risks: only `pulse.inbound` has an active processor today; the other queues are contracts/publishers for the next stages, not complete workers.
- Next recommended step: implement the `pulse.context` worker to assemble `PulseContextPack` asynchronously and create governed platform `ExecutionRequest` records without calling providers.

## 2026-05-09 Stage 3B — Pulse Context Worker + Execution Request Preparation

- Changed: activated the `pulse.context` worker.
- Completed: `PulseContextProcessor` validates queue payloads, assembles a `PulseContextPack`, persists an idempotent platform `ExecutionRequest` through `RuntimeExecutionLifecycleService`, and emits Pulse operational events for context assembly and runtime-request preparation.
- Completed: failure handling now publishes a `pulse.failed` job and records `pulse.context.assembly_failed` before rethrowing to BullMQ retry handling.
- Pending: `pulse.execution` worker, module/plan/usage governance checks before provider execution, and DB-backed fixtures for persisted context-to-execution records.
- Risks: `ExecutionRequest` is created in `REQUESTED` state only; no runtime/provider call is made and no execution queue consumer exists yet.
- Next recommended step: implement execution-governance validation for Pulse requests, then advance approved execution requests to `QUEUED` without calling providers.

## 2026-05-09 Stage 3C — Execution Governance + Store Visibility

- Changed: added runtime execution governance and separated module store visibility from module activation/visibility.
- Completed: `RuntimeExecutionGovernanceService` validates that a module is active/public, enabled for the tenant, and that the request type is allowed for the module before advancing an `ExecutionRequest` from `REQUESTED` to `QUEUED`. `pulse.context` now creates the request and immediately asks governance to queue it, without provider/runtime calls.
- Completed: added `ModuleCatalogItem.storeVisible` with migration `20260509110000_module_store_visibility`. Store listing, tenant module enablement through the store, plan commercial activation counts, and billing `canEnableModule` now consider only `storeVisible` public modules. Platform module governance can update `storeVisible`, but only `super_admin`/legacy `platform_admin` may change that flag.
- Pending: actor-aware execution governance, per-tenant usage-limit checks before queueing, `pulse.execution` worker, and DB fixtures for store-hidden module behavior.
- Risks: `storeVisible=false` hides/commercially excludes a module but does not disable already-installed/internal module execution; this is intentional for internal organizational modules.
- Next recommended step: implement `pulse.execution` as a governance-approved worker that transitions queued requests without calling providers yet, plus DB fixtures for hidden-store modules.

## 2026-05-09 Stage 3D — Pulse Execution Worker Foundation

- Changed: activated the `pulse.execution` worker.
- Completed: `pulse.context` now enqueues `pulse.execution` after governance queues a request. `PulseExecutionProcessor` validates the job, loads the tenant-scoped execution request, skips non-queued requests, transitions queued requests through `RUNNING` to `SUCCEEDED`, and records operational events for dispatch start/completion/skips/failures.
- Completed: the worker output is explicit: `prepared: true`, `executable: false`, `reason: runtime_provider_not_implemented`, `providerCalls: false`. No Go Runtime, OpenAI, Claude, local model, or provider call exists.
- Pending: replace the no-provider dispatch stub with external runtime handoff, add usage metering at provider-call boundaries, and add DB fixtures for queued execution lifecycle.
- Risks: `SUCCEEDED` currently means the dispatch-preparation worker completed, not that an LLM provider completed cognitive execution.
- Next recommended step: add a runtime-provider boundary interface/job result contract before wiring any real provider or external Go Runtime call.

## 2026-05-09 Stage 3E — Pulse Timeline Worker Foundation

- Changed: activated the `pulse.timeline` worker.
- Completed: `PulseTimelineProcessor` validates timeline jobs and persists them as `PulseOperationalEvent` records. `pulse.execution` now publishes dispatch lifecycle events to `pulse.timeline` instead of writing them directly, keeping timeline projection out of BullMQ internals.
- Completed: timeline projection failures publish to `pulse.failed`; malformed timeline jobs are rejected before persistence.
- Pending: migrate more Pulse lifecycle writers to `pulse.timeline`, add replay/dead-letter handling, and implement `pulse.actions`.
- Risks: some older Pulse use cases still write operational events directly; the timeline queue is now active but not yet universal.
- Next recommended step: implement `pulse.actions` for approved operational side effects, then progressively route direct event writers through `pulse.timeline` where async projection is appropriate.

## 2026-05-09 Stage 3F — Pulse Actions Worker Foundation

- Changed: activated the `pulse.actions` worker.
- Completed: `PulseActionsProcessor` validates action jobs, enforces an allowlist, projects allowed actions as `pulse.action.dispatched` and `pulse.action.completed`, skips unsupported actions as `pulse.action.skipped`, and captures dispatch failures to `pulse.failed` plus `pulse.action.failed`.
- Completed: action completion is explicitly preparatory: `prepared: true`, `executable: false`, `reason: action_handler_not_implemented`, `sideEffectsApplied: false`.
- Pending: real action handlers for ticket mutations, scheduling checks, operator review requests, and integration dispatch; actor metadata and permission snapshots; DB fixtures.
- Risks: no real side effects are applied yet, by design. Consumers must not treat action completion as action execution.
- Next recommended step: add typed action handler contracts and implement one narrow non-provider action, likely internal `ticket.advance_flow`, behind tenant/RBAC/governance checks.

## 2026-05-09 Stage 3G — First Typed Action Handler

- Changed: added the first real Pulse action handler: `ticket.advance_flow`.
- Completed: `PulseActionHandler` contract exists and `PulseTicketAdvanceFlowActionHandler` applies the existing `TicketLifecycleUseCase.advanceFlowState` with tenant id, ticket id, supported flow state validation, and required actor metadata. `pulse.actions` now executes that handler and emits `pulse.action.completed` with `sideEffectsApplied: true`.
- Pending: actor permission snapshot validation, additional handlers (`ticket.assign`, `ticket.escalate`, scheduling preparation), DB fixtures for action tenant isolation, and runtime-output-to-action validation.
- Risks: `ticket.advance_flow` is now a real mutation when enqueued with valid actor metadata; action job creation must remain governed.
- Next recommended step: add actor/governance metadata to the context/execution/action chain and enforce per-action permission checks before enqueueing action jobs.

## 2026-05-09 Stage 3H — Action Enqueue Governance

- Changed: added `PulseActionGovernanceService` as the safe factory for action jobs.
- Completed: governed enqueue validates the action has a rule, requires actor metadata, requires permission snapshots, and currently enforces `tickets:write` before enqueueing `ticket.advance_flow`. Actor metadata is embedded into payload for handler audit attribution.
- Pending: wire runtime-output-to-action creation through this service, add more action rules, and persist actor/governance metadata from the original request.
- Risks: direct calls to `PulseQueueService.enqueueAction` can bypass governance; production action creation should use `PulseActionGovernanceService`.
- Next recommended step: make runtime result parsing use `PulseActionGovernanceService` exclusively and add tests that unsafe direct action outputs are rejected before queueing.

## 2026-05-09 Stage 3I — Runtime Output Action Planner

- Changed: added `PulseRuntimeActionPlannerService` to validate future runtime outputs before they can create governed Pulse action jobs.
- Completed: planner requires a strict audit-safe output shape (`decisionSummary`, `confidence`, `nextState`, `recommendedActions`), checks the Context Pack `allowedActions`, enforces a confidence threshold, validates supported flow states, and routes `ticket.advance_flow` through `PulseActionGovernanceService`.
- Completed: tests cover successful governed enqueue, low-confidence skip, malformed output rejection, and permission/governance denial propagation.
- Pending: connect the planner to real runtime result ingestion, persist original actor/governance metadata across execution requests, add more action rules, and add DB-backed multi-tenant fixtures.
- Risks: the planner is not yet called by `pulse.execution`; no external runtime/provider output is consumed. Direct queue publication remains infrastructure-only and must not become a production action path.
- Next recommended step: wire execution-result handling so runtime completion calls the planner, then add service-actor/tenant fixtures proving unsafe runtime action suggestions are rejected.

## 2026-05-09 Stage 3J — Pulse Runtime Result Ingestion Boundary

- Changed: added `IngestPulseRuntimeResultUseCase` as the narrow backend boundary from normalized runtime results into Pulse action planning.
- Completed: runtime lifecycle can now load the original tenant-scoped execution request with context/input. Pulse result ingestion verifies the execution belongs to Pulse, extracts the stored Context Pack, transitions lifecycle status, records audit-safe timeline jobs, and calls `PulseRuntimeActionPlannerService` only for successful results.
- Completed: tests cover successful ingestion/action planning, non-success result handling without action planning, non-Pulse request rejection, and lifecycle request loading.
- Pending: signed external runtime callback route/queue consumer, service actor authorization, DB-backed tenant fixtures, provider metadata/usage mapping, and removal of the no-provider placeholder once the external runtime exists.
- Risks: this use case is internal and not yet exposed through a signed callback or queue consumer. It assumes callers already authenticated the runtime/service actor.
- Next recommended step: add a signed runtime result ingress adapter that validates runtime signatures and calls this use case without exposing generic transition APIs to modules.

## 2026-05-09 Stage 3K — Signed Runtime Result Ingress

- Changed: added a signed Synapse runtime-result ingress endpoint at `/v1/runtime/results`.
- Completed: endpoint is `@Public()` only for JWT bypass and requires raw-body HMAC verification through `RuntimeSignatureService` before routing to the module result handler selected from the persisted execution request. Signature validation checks key id, timestamp window, canonical method/path/body, and constant-time signature comparison.
- Completed: raw body capture now includes the central runtime result path; DTO validation covers terminal statuses and output shape at the transport boundary.
- Pending: DB-backed callback fixtures, runtime replay store/idempotency beyond lifecycle/action keys, and future queue-consumer ingress.
- Risks: runtime result callbacks still depend on a shared secret; replay persistence and key rotation are still pending.
- Next recommended step: persist original actor/governance snapshot in execution request metadata and use it server-side during signed result ingestion.

## 2026-05-09 Stage 3L — Execution Actor Snapshot Enforcement

- Changed: runtime result ingestion now uses the original server-side actor snapshot stored on the `ExecutionRequest` instead of trusting callback-provided actor data.
- Completed: runtime request creation stores actor id, permission snapshot, and metadata actor snapshot. Pulse context jobs can carry actor snapshots into execution requests. Pulse runtime callback DTO no longer accepts actor data; ingestion extracts actor details from saved execution metadata before lifecycle transition or action planning.
- Completed: tests cover controller context snapshots, callback payload without actor, missing actor snapshot rejection, and existing signed callback/runtime planning paths.
- Pending: DB-backed fixtures for actor snapshot persistence, durable callback replay tracking, and migration/backfill policy for old execution requests without snapshots.
- Risks: old/pre-existing execution requests without actor snapshots cannot safely plan runtime-driven actions and are rejected.
- Next recommended step: add DB fixtures for signed callback ingestion using persisted actor snapshots and cross-tenant denial.

## 2026-05-09 Stage 3M — Runtime Result DB Fixtures

- Changed: added database-backed fixtures for Pulse runtime result ingestion.
- Completed: fixture covers persisted actor snapshot usage for action planning, cross-tenant result-ingestion denial, and refusal to plan automatic actions when an execution lacks `actorSnapshot`.
- Completed: fixture follows the existing `RUN_DATABASE_TESTS=1` pattern, so it is skipped by default unless database fixtures are explicitly enabled.
- Pending: HTTP raw-body signed callback e2e fixture and durable replay tracking.
- Risks: fixture verifies use-case persistence boundaries, not the full HTTP callback path.
- Next recommended step: add an HTTP callback e2e harness with signed raw body once the API test app pattern is ready for service-to-service callbacks.

## 2026-05-09 Stage 3N — Pulse Action Worker Permission Revalidation

- Changed: `PulseActionsProcessor` now revalidates action permission snapshots before executing real handlers.
- Completed: action rules are shared between enqueue governance and worker execution. `ticket.advance_flow` requires `tickets:write` at enqueue time and again immediately before handler execution. Missing permissions fail the job, emit `pulse.action.failed`, and do not call the handler.
- Completed: tests cover successful real action execution and rejection of queued actor snapshots missing `tickets:write`.
- Pending: DB fixture for processor-side rejection and expansion of worker-side rules as new handlers are added.
- Risks: prepared-only actions without handlers are not permission-revalidated because they do not apply side effects.
- Next recommended step: add a handler registry so each real handler declares its action key and required permission rule.

## 2026-05-09 Stage 3O — Non-Retryable Action Governance Failures

- Changed: `pulse.actions` now classifies worker-side governance/RBAC failures as permanent.
- Completed: `ForbiddenException` from action permission revalidation is recorded to `pulse.failed` and timeline with `failureClass: non_retryable_governance`, `retryable: false`, then thrown as BullMQ `UnrecoverableError` to avoid useless retries.
- Completed: transient failures such as timeline enqueue errors remain retryable and are marked `failureClass: retryable`.
- Pending: extend permanent failure classification for strict DTO/schema validation once handler DTOs are introduced.
- Risks: only explicit governance failures are non-retryable today; malformed jobs rejected before the catch path still fail fast without failed-queue projection.
- Next recommended step: introduce typed action DTO validation and classify validation failures as non-retryable.

## 2026-05-09 Stage 3P — Strict Action Payload Validation

- Changed: `ticket.advance_flow` now validates its action payload strictly before mutating tickets.
- Completed: unsupported fields, invalid `nextState`, invalid `transitionSource`, invalid confidence, non-string notes, invalid `ticketId`, invalid `aiDecisionSummary`, and malformed actor metadata are rejected through `PulseActionPayloadValidationException`.
- Completed: `PulseActionsProcessor` classifies that exception as `non_retryable_validation`, records `retryable: false`, and throws BullMQ `UnrecoverableError`.
- Pending: extract reusable DTO/schema helpers as more real action handlers are added.
- Risks: validation is currently hand-written for the first handler; schema drift can emerge when more handlers are added.
- Next recommended step: introduce a typed action handler registry with per-action schema, permissions, and retry classification metadata.

## 2026-05-09 Stage 3Q — Pulse Action Handler Registry

- Changed: added `PulseActionHandlerRegistry` and moved `PulseActionsProcessor` away from direct handler branching.
- Completed: real action handlers now expose an `action` key; the registry resolves handlers by action. `ticket.advance_flow` is registered as the first real handler.
- Completed: tests cover registry lookup and existing action processor behavior through the registry.
- Pending: move permissions, schema, and retry classification into handler registration metadata.
- Risks: registry is still manually wired with the first handler; metadata is not yet centralized.
- Next recommended step: enrich registry entries with action metadata so processor validation does not import action-specific rule tables.

## 2026-05-09 Stage 3R — Action Definition Metadata

- Changed: action handler registry now exposes action definition metadata.
- Completed: `PulseActionDefinition` carries action key, required permissions, validation failure class, and future usage candidate. `ticket.advance_flow` declares `tickets:write`, `non_retryable_validation`, and `workflow_run`. Both enqueue governance and worker execution now read permissions from the registry instead of a separate action rule table.
- Completed: tests cover registry definition lookup, governance with registry definitions, and processor behavior through definition metadata.
- Pending: move runtime Context Pack `allowedActions` and `requiredOutputSchema` derivation to these action definitions.
- Risks: registry construction is still manual and should eventually support multiple handlers cleanly.
- Next recommended step: derive Pulse Context Pack action/output schema hints from registered action definitions.

## 2026-05-09 Stage 3S — Context Pack Uses Action Registry

- Changed: `AssemblePulseContextUseCase` now uses `PulseActionHandlerRegistry` definitions for real side-effect actions.
- Completed: `allowedActions` includes registered handler actions such as `ticket.advance_flow` when a ticket is present. `requiredOutputSchema.recommendedActions.items.enum` is derived from the same allowed action set.
- Pending: derive full per-action output/payload schema from definitions, not only the action enum.
- Risks: prepared-only actions still come from assembler logic because they intentionally have no side-effect handler yet.
- Next recommended step: add schema metadata to `PulseActionDefinition` and use it to generate runtime output requirements.

## 2026-05-09 Stage 3T — Runtime Output Schema Enforcement

- Changed: Pulse runtime result ingestion now validates successful runtime output against the saved Context Pack `requiredOutputSchema` before lifecycle transition or action planning.
- Completed: V1 validation rejects missing required fields, unsupported fields, invalid string/number/array shapes, confidence outside range, oversized action lists, actions outside the schema enum, and mismatched optional `executionType` constants.
- Completed: invalid successful outputs do not transition the execution, do not call the action planner, and do not publish timeline jobs.
- Pending: replace the pragmatic V1 validator with a reusable schema utility if Context Pack schemas expand beyond the current subset.
- Risks: validator intentionally supports the current Pulse output schema subset only; nested action payload schemas still need definition-driven metadata.
- Next recommended step: add action/output schema metadata to `PulseActionDefinition` and derive stricter runtime output contracts from it.

## 2026-05-14 Stage 4A — Platform Governance + Pulse Schedule Boundary

- Changed: user registration no longer has to create a workspace; users can exist tenantless and create workspaces later through the tenant lifecycle API.
- Completed: tenant creation now calls platform-owned plan governance before creating a workspace. Trial/Light allow 1 workspace, Pro allows 2, Premium allows 4 through configurable plan entitlement JSON rather than module-owned rules.
- Completed: billing/platform governance exposes module-access helpers: `isModuleEnabledForTenant`, `canUseModuleFeature`, `consumeUsageOrReject`, and `getTenantPlanLimits`.
- Completed: Pulse gained module-owned operational schedule persistence and schedule decisions for outside-hours interactions without owning subscriptions, credits, quotas, or billing.
- Pending: full production CRUD expansion for memberships/roles/permissions/promotions and DB-backed RLS fixtures.
- Risks: plan/quota templates are stored in `BillingPlan.entitlements` and need admin UI integration by frontend owner; RLS remains documented as hybrid until Prisma session-variable strategy is validated.
- Next recommended step: finish membership CRUD with membership-based JWT/session selection so `user.role` is no longer treated as the long-term source of truth.

## 2026-05-14 Stage 4B — Membership CRUD + Workspace Session Selection

- Changed: added tenant membership CRUD APIs and explicit workspace session selection.
- Completed: tenant memberships can be listed, created, role-updated, and removed with pagination/filter DTOs, audit events, tenant scoping, duplicate checks, platform-user assignment blocking, role-escalation prevention, and last-owner protection.
- Completed: `POST /v1/auth/workspace` validates the authenticated user's membership before issuing a tenant-scoped session cookie.
- Completed: `GET /v1/users/me` can now return available memberships for tenantless sessions so frontend can drive workspace selection.
- Pending: move route permission resolution fully from JWT role snapshot to live membership/permission lookup with cache.
- Risks: JWT still carries the selected membership role for compatibility with existing guards.
- Next recommended step: implement membership-backed permission resolution in `PermissionsGuard` with a Redis/cache hotpath and DB fallback.

## 2026-05-14 Stage 4C — Live Membership Permission Resolution

- Changed: `PermissionsGuard` now resolves permissions through `PermissionResolverService` instead of trusting only the JWT role snapshot.
- Completed: tenant permissions are loaded from `UserMembership` using tenant/user scope, cached in Redis for a short TTL, and fall back to Prisma when cache is unavailable or cold.
- Completed: membership create/update/delete invalidates the affected user/tenant permission cache.
- Completed: tenantless sessions have no tenant permissions until a workspace is selected; platform roles still resolve through platform role permissions.
- Pending: configurable role/permission persistence beyond enum-backed roles.
- Risks: JWT still carries role for compatibility and observability, but authorization now records both JWT and resolved role on denials.
- Next recommended step: add DB-backed permission fixtures for stale session role changes and cross-tenant cache isolation.

## 2026-05-14 Stage 4D — Permission Resolver DB Fixtures

- Changed: added opt-in database fixtures for membership-backed authorization.
- Completed: fixture covers stale session downgrade denial, tenant-specific membership resolution, and no-membership permission denial.
- Completed: normal Jest run keeps DB fixtures skipped unless `RUN_DATABASE_TESTS=1`.
- Pending: run fixture in a live database environment after Postgres is available on the configured `DATABASE_URL`.
- Risks: local execution currently failed because Postgres was unreachable at `localhost:5435`.
- Next recommended step: start the dev database, apply migrations, and run `RUN_DATABASE_TESTS=1 npm test -- permission-resolver.database-fixtures`.

## 2026-05-14 Stage 4E — Runtime Actor Permission Revalidation

- Changed: Pulse runtime result ingestion now revalidates the saved actor snapshot against live membership permissions before planning automatic actions.
- Completed: successful runtime outputs still transition lifecycle, but action planning receives the current resolved role/permissions instead of trusting historical snapshot permissions.
- Completed: governance denials during runtime action planning are converted into a skipped action plan and do not enqueue side-effect jobs.
- Pending: DB fixture for runtime actor downgrade once local Postgres is available.
- Risks: runtime lifecycle success and action authorization are now intentionally separate outcomes; operators may need clear timeline labels for skipped actions.
- Next recommended step: enforce `maxUsersPerTenant` during membership creation through platform plan limits.

## 2026-05-14 Stage 4F — Membership User Quota Enforcement

- Changed: tenant membership creation now checks platform-owned plan limits before adding a user.
- Completed: `MembershipsService` calls `BillingService.getTenantPlanLimits(tenantId)` and blocks creation when current memberships are at or above `maxUsersPerTenant`.
- Completed: quota denial returns a clear business error and does not create the membership or invalidate permission cache.
- Pending: DB fixture for user quota enforcement and Redis plan/quota cache.
- Risks: direct database inserts can still bypass application-level quota checks.
- Next recommended step: add a platform plan/quota Redis hotpath with DB fallback.

## 2026-05-14 Stage 4G — Tenant Plan Limits Cache

- Changed: `BillingService.getTenantPlanLimits` now uses Redis as a short-lived tenant plan/quota hotpath.
- Completed: cache miss falls back to PostgreSQL billing account/plan state, writes a 60 second cache entry, and returns typed limits.
- Completed: plan updates/deletes, feature flag changes, Stripe subscription/invoice reconciliation, and Stripe customer provisioning invalidate affected tenant plan-limit cache keys on a best-effort basis.
- Pending: DB fixture for plan/account mutation invalidation and usage counter Redis hotpath.
- Risks: direct database changes bypass invalidation and rely on short TTL.
- Next recommended step: add runtime usage consumption boundaries through `consumeUsageOrReject`.

## 2026-05-14 Stage 4H — Governed Pulse Action Usage Consumption

- Changed: real Pulse action handlers now consume platform-governed usage only after successful side effects.
- Completed: `pulse.actions` records `WORKFLOW_RUN` usage through `BillingService.consumeUsageOrReject` when a registered handler completes with `sideEffectsApplied: true` and declares `usageCandidate: workflow_run`.
- Completed: prepared-only, skipped, failed, validation-denied, and no-side-effect actions do not create billable usage.
- Completed: `consumeUsageOrReject` is now idempotent when an idempotency key is supplied.
- Pending: runtime provider AI call usage consumption when provider calls become real.
- Risks: workflow-run credit cost is currently a simple quantity/credit of 1.
- Next recommended step: add usage consumption for runtime execution dispatch once provider execution is implemented.

## 2026-05-14 Stage 4I — Usage Idempotency Fixtures

- Changed: `BillingService.consumeUsageOrReject` now returns an existing usage event before quota checks when the same tenant/idempotency key was already recorded.
- Completed: this prevents idempotent retries from being rejected after the first attempt consumed the last available monthly credit.
- Completed: added opt-in database fixture coverage for duplicate action usage retries and tenant-scoped idempotency keys.
- Pending: run `RUN_DATABASE_TESTS=1 npm test -- billing-usage.database-fixtures` after local Postgres is available on `localhost:5435`.
- Risks: concurrent first-attempt races still rely on the database unique key and upsert behavior.
- Next recommended step: add action handler side-effect idempotency fixtures before enabling additional real actions.

## 2026-05-14 Stage 4J — Pulse Action Side-Effect Idempotency

- Changed: `ticket.advance_flow` now passes the action job idempotency key into `TicketLifecycleUseCase`.
- Completed: `advanceFlowState` records consumed action idempotency keys in ticket metadata and returns the existing ticket without update/event/audit/usage when the same action key is retried.
- Completed: lifecycle usage idempotency keys include the action idempotency key for action-driven flow transitions.
- Completed: added unit coverage and an opt-in DB fixture for duplicate action delivery.
- Pending: run `RUN_DATABASE_TESTS=1 npm test -- ticket-lifecycle.database-fixtures` once local Postgres is available.
- Risks: concurrent first delivery of the same action can still race before metadata is persisted; DB-level action execution ledger may be needed later.
- Next recommended step: add a durable action execution ledger or transaction-level guard before adding high-impact side-effect handlers.

## 2026-05-14 Stage 4K — Durable Pulse Action Execution Ledger

- Changed: added tenant-scoped `pulse_action_executions` persistence with `STARTED`, `SUCCEEDED`, and `FAILED` statuses.
- Completed: `TicketLifecycleUseCase` now claims `tenantId + actionIdempotencyKey` before action-driven flow side effects and marks the execution succeeded or failed.
- Completed: duplicate succeeded actions return the current tenant-owned ticket without reapplying side effects; duplicate in-progress actions fail fast with conflict for retry.
- Completed: added Prisma migration `20260514110000_add_pulse_action_execution_ledger` and repository/unit coverage.
- Pending: apply migration in Docker/dev database and run DB fixtures.
- Risks: side effects are still not wrapped in one database transaction with the ledger update.
- Next recommended step: move lifecycle action mutation/event/audit/usage writes into a transaction boundary around the ledger claim.

## 2026-05-14 Stage 4L — Transactional Action Execution Boundary

- Changed: action-driven ticket lifecycle mutations now run inside one Prisma transaction.
- Completed: ledger claim, ticket update, Pulse operational event, audit event, usage event, and ledger success update commit atomically for `ticket.advance_flow`.
- Completed: duplicate `SUCCEEDED` action keys return the ticket without writes; duplicate `STARTED` action keys return conflict before mutation.
- Pending: DB fixture execution after local Postgres is available.
- Risks: transactional path currently covers action-driven flow advancement; manual ticket lifecycle APIs still use the existing service/repository path.
- Next recommended step: expand transaction-aware repositories or a shared transaction runner before adding more side-effect action handlers.

## 2026-05-15 Stage 4M — Pulse Action Telemetry

- Changed: added `PulseActionTelemetryService` for audit-safe structured action/ledger observations.
- Completed: action telemetry records outcomes such as `claimed`, `already_succeeded`, `in_progress`, `succeeded`, `skipped`, `prepared`, `completed`, and `failed`.
- Completed: telemetry hashes action idempotency keys and does not log raw payloads.
- Completed: `TicketLifecycleUseCase` emits ledger outcomes and `PulseActionsProcessor` emits queue action outcomes.
- Pending: Prometheus/OpenTelemetry counters when observability stack is introduced.
- Risks: logs are observational and should not become billing or authorization authority.
- Next recommended step: add action status read DTOs or internal metrics only if operators need troubleshooting visibility.

## 2026-05-15 Frontend Evolution — Stage 2 (Design System Evolution)

- Changed (frontend, owned by Claude Opus): refined the design-system layer only — no page rewrites, no route changes, no backend touches. Every page that already references the design tokens (surfaces, buttons, pills, typography) picks up the new look automatically.
- Completed: shadow scale rebuilt in `apps/web/tailwind.config.ts`. Tiers now read top-to-bottom — `hairline → soft → card → dock → rail → elevated` — plus a new `glass` / `glass-dark` pair for translucent surfaces and a refined `glow` / `glow-lg` for hero CTAs. Heavy values were softened: `dock` shrunk from `0 12px 36px` to `0 8px 24px`, `rail` from `0 30px 80px` to `0 18px 48px`, `elevated` from `0 20px 60px` to `0 14px 40px`.
- Completed: surface tokens in `apps/web/app/globals.css` rebuilt with thinner borders (`/55` replaces `/70`–`/80` across the board) and lighter backgrounds (`bg-white/65` vs `bg-white/70`+) so the ambient mesh shows through. Surfaces now share a single inline comment block documenting their role — `card`, `card-elevated`, `surface-translucent`, `surface-floating`, `surface-rail`, `surface-dock`, `surface-inset`.
- Completed: two new hover-state companions — `.surface-hover` and `.surface-hover-brand` — replace the ad-hoc `hover:bg-white/40 hover:border-...` chains. They animate `transform + box-shadow + border-color` together with `duration-200 ease-snap` so the language is consistent.
- Completed: typography utility scale — `.t-h1`, `.t-h2`, `.t-h3`, `.t-body`, `.t-body-strong`, `.t-small`, `.t-meta`, `.t-meta-xs`, plus refined `.h-eyebrow` and existing `.h-display` / `.h-display-sm`. Pages can now drop ad-hoc `text-2xl font-bold tracking-tight` chains for `t-h1`. Existing usage is unaffected — these are additive.
- Completed: buttons (`.btn-primary` / `.btn-secondary` / `.btn-ghost`) refined for thinner borders, glass backdrop on secondary, unified `active:scale-[0.97]` press feedback, explicit `disabled:opacity-50 disabled:shadow-none` states, and `ease-snap` motion. Pills (`.pill`, `.pill-brand`) dropped from `/80` borders to `/60` and from `bg-white/70` to `/60`.
- Completed: focus ring tuned for glass surfaces — `ring-2 ring-brand-500/70 ring-offset-[1.5px]` (was `ring-offset-2` solid brand), so the keyboard halo no longer blows out translucent panels.
- Completed: spacing-rhythm utilities — `.stack-page` (40px), `.stack-section` (24px), `.stack-cluster` (12px), `.stack-tight` (6px). Use on the outermost element of a vertical sequence so the rhythm is consistent without `space-y-N` choices at every callsite.
- Completed: icon-size convention documented as no-op marker classes (`.icon-chrome`, `.icon-content`, `.icon-hero`) — Lucide takes `size={N}` directly; these exist for future icon wrappers to hook into without breaking callers.
- Verification: `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓ (32 routes built clean).
- Out of scope this stage (per the staged strategy): backend logic, full dashboards, page rewrites, navigation architecture, motion language beyond easing curves, content changes.
- Pending: Stage 3 (Motion / Interaction Layer), Stage 4 (Navigation Architecture), and the rest of the 11-stage plan.
- Risks: any handwritten `border-zinc-200/80` or `bg-white/70` in pages will not pick up the refined token set automatically — those should migrate to the corresponding `surface-*` utility when each page is touched again. Existing usage continues to compile and render.
- Next recommended step: **Stage 3 — Motion / Interaction Layer** (smooth route transitions, sidebar collapse motion, hover transitions, loading states, animated counters). Do not start Stage 4+ before Stage 3 closes.

## 2026-05-15 Frontend Evolution — Stage 3 (Motion / Interaction Layer)

- Changed (frontend, owned by Claude Opus): refined the motion/interaction layer with **no new dependency**. Strategy listed `framer-motion` as a focus area; audit showed every Stage-3 goal (route transitions, sidebar collapse, hover, loading, counters, enter/exit) is achievable with CSS + Tailwind animations + small RAF-driven components. Adding ~50 kB of JS for primitives we already had would have been a poor trade. Decision logged here so a later stage can revisit if AnimatePresence-style orchestration becomes necessary.
- Completed: animation tokens in `apps/web/tailwind.config.ts` extended with new keyframes — `slideInLeft`, `fadeOut`, `press` (button micro-feedback), `countUp` (entering numbers), `spinnerRotate` — and matching `animate-*` aliases. All enter animations gained `both` so the final state survives the transition end.
- Completed: motion utilities in `apps/web/app/globals.css` — three universal transition aliases (`.transition-base`, `.transition-soft`, `.transition-spring`), a `.stagger-children` rule that adds incremental `animation-delay` to up-to-10 children, a refined `.page-enter` (now `panelIn 0.38s`), and a CSS-driven `.spinner-ring` primitive. Sidebar labels animate via `[data-collapsed="true"] .sidebar-label` rules so the icons drift to center as the width transitions.
- Completed: sidebar collapse now animates labels — `components/nav/workspace-sidebar.tsx` always renders the label inside a `<span class="sidebar-label">`; the parent `[data-collapsed]` attribute drives fade-out (120 ms) + translate-left, and fade-in (220 ms with 60 ms delay) on expand. Section labels animate the same way. The link container uses `overflow-hidden` + `transition-soft` so the chrome glides instead of snapping.
- Completed: `aria-expanded` was removed from the collapse toggle — the sidebar is always visible (only its width changes), so the attribute was semantically wrong and was failing the IDE's `jsx-a11y/aria-proptypes` check. `aria-label` already describes the state.
- Completed: `<AnimatedNumber/>` (`components/ui/animated-number.tsx`) — RAF-driven counter that tweens from previous → current value over `durationMs` (default 600 ms) with an `easeOutQuart` curve. Honours `prefers-reduced-motion: reduce` (snaps to final). Locale formatting via `Intl.NumberFormat`; `formatter` prop for currencies/percentages.
- Completed: `<Spinner/>` (`components/ui/spinner.tsx`) — CSS-only inline spinner driven by the new `animate-spinner` rule. Sized via `--spinner-size`; inherits `currentColor` so it picks up tone from the wrapping element.
- Completed: refined `<Skeleton/>` (`components/ui/skeleton.tsx`) — now pairs `animate-skeleton` opacity pulse with `.shimmer-overlay` sheen so loading states feel intentional rather than dormant.
- Completed: micro-polish on existing primitives — Dialog panel switched from `animate-fade-in` to `animate-panel-in` (subtle scale + blur reveal); Toast switched from `animate-fade-in` to `animate-slide-in-right` so notifications enter from the corner rather than blinking in place; Dialog border softened to `/70` to match Stage-2 surface tokens.
- Verification: `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓ (32 routes built clean; bundle unchanged at 102 kB shared First Load JS).
- Out of scope this stage (per strategy): page rewrites, navigation architecture (mobile drawer, tooltips on collapse, sub-section collapse), backend, content.
- Pending: Stage 4 (Navigation Architecture), Stage 5+ per the staged plan.
- Risks: existing pages that already include `animate-fade-in` will not pick up the new `count-up` / `press` keyframes until those callsites adopt the new utilities. All current usage continues to render unchanged.
- Next recommended step: **Stage 4 — Navigation Architecture** (mobile sidebar drawer, animated active states, collapsed-label tooltips, sub-section collapse, floating landing nav). Do not start Stage 5+ before Stage 4 closes.

## 2026-05-15 Frontend Evolution — Stage 4 (Navigation Architecture)

- Changed (frontend, owned by Claude Opus): consolidated the navigation architecture. `components/nav/workspace-sidebar.tsx` was rewritten as a single `<SidebarShell>` core that powers both `WorkspaceSidebar` and `PlatformSidebar`; new features (mobile drawer, tooltips, sub-section collapse, animated active indicator) are implemented once and shared. Public exports preserved so layouts compile unchanged.
- Completed: mobile sidebar drawer. `SidebarMobileProvider` wraps each shell layout and owns `open`/`setOpen` state; a `SidebarMobileTrigger` hamburger (`md:hidden`) lives in both top bars. The drawer is portaled to `document.body`, slides in from the left with the Stage-3 `animate-slide-in-left` keyframe, locks body scroll while open, closes on backdrop click / Esc / route change. No `framer-motion` dependency added.
- Completed: collapsed-label tooltips. When the desktop sidebar is `data-collapsed=true`, each `<a class="sidebar-link" data-tooltip="…">` reveals a pure-CSS popover on hover/focus, anchored to the link's right edge with a small arrow. The tooltip is gated on the parent's `data-collapsed` attribute so the expanded state never shows it.
- Completed: sub-section collapse. Sections marked `pinned: true` (`Workspace`, `Platform`) always render open; non-pinned sections (`Pulse`) get a chevron toggle on the section header. Closed sections collapse to `max-h-0` with a 200 ms ease-snap transition. State is persisted as a JSON array of section ids in `localStorage` under `synapse.sidebar.sections`, alongside the existing `synapse.sidebar.collapsed` key.
- Completed: animated active-state indicator. The left-edge accent bar now uses `origin-top scale-y-0/100` with a 200 ms `ease-snap` transition so the indicator grows in rather than appearing/disappearing instantly when the active route changes.
- Completed: `aria-expanded` on the collapse toggle was removed in Stage 3; the section chevron retains a proper `aria-expanded={!closed}` because it does control a real region.
- Completed: orphan retired — `app/(platform)/platform/_components/platform-nav.tsx` (unimported since Stage 1) was deleted, and the empty `_components/` directory was removed.
- Completed: marketing `public-nav.tsx` already had scroll-aware glass + active-section observer + mobile drawer before Stage 4; no changes needed there. The "floating landing navigation" focus area was a no-op rather than scope creep.
- Verification: `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓ (32 routes built clean; shared First Load JS unchanged at 102 kB).
- Out of scope this stage (per strategy): page content, dashboard internals, design-system surface rework, backend, content.
- Pending: Stage 5 (Workspace Overview), Stage 6+ per the staged plan.
- Risks: the mobile drawer is the first time a portal-rendered nav surface ships in the app shell; `body` scroll lock is per-provider so two nested layouts (unlikely) could compete. Workspace and platform shells are mutually exclusive routes today, so this is theoretical only.
- Next recommended step: **Stage 5 — Workspace Overview** (credits, quotas, modules, usage, channels, activities, metrics, charts, operational timeline). Strategy reminder: workspace overview is NOT Pulse-centric. Do not start Stage 6+ before Stage 5 closes.

## 2026-05-15 Frontend Evolution — Stage 5 (Workspace Overview)

- Changed (frontend, owned by Claude Opus): rewrote `app/(workspace)/workspace/overview/page.tsx` so it reads as a **cross-module tenant overview** rather than a Pulse dashboard. Pulse is now one signal among several (live items, knowledge contexts), positioned beside Channels, Agents, Modules, and the Activity ledger.
- Layout: 4-tier vertical rhythm using `.stack-page`.
  1. **Identity hero** — tenant name, role chip (formatted from `currentUser.role`), `Plan / Period / Memberships` metadata row (honest `—` until billing client ships), 4-up hero stat cluster (Live items · Channels · AI inference · Automations).
  2. **3-column operational signal** — Quotas (4 metric-type bars with placeholder usage) · Channels (live counters from `api.pulse.listChannels` + provider list) · Activity (placeholder card pointing at the Pulse timeline + audit ledger until the cross-module activity client ships).
  3. **Modules cluster** — 4 equal-weight cards: Pulse · Agents · Knowledge · Store. Pulse no longer dominates the page.
  4. **Operational metrics + Shortcuts** — 2-column row. Metrics: AI inference, automation runs, resolution rate, operator interventions, response time, audit events, storage. Shortcuts include non-Pulse routes (Module store, Agents, Activity, Settings) so the page is honestly tenant-wide.
- Live data wired today: `api.users.me()` (identity), `api.pulse.listChannels` (channel health snapshot), `loadInboxLanes` (Pulse live counters), `loadKnowledgeContexts` (contexts total). Everything else renders `—` rather than fabricating numbers.
- Animation: every metric/counter uses the Stage-3 `<AnimatedNumber/>` so values that *do* arrive tween in instead of pop-rendering. Module cards adopt the Stage-3 `.stagger-children` cascade.
- Design tokens: `.surface-translucent`, `.surface-rail`, `.surface-dock`, `.surface-inset`, `.surface-hover-brand`, `.t-h1` / `.t-h3` / `.t-body` / `.t-small` / `.t-meta` / `.t-meta-xs`, `.stack-page` — Stage 2's design system is consumed end-to-end. Pre-Stage-2 ad-hoc class chains were removed.
- Permission gates: `<Can permission="agents:write">` on the Agents CTA in the hero. Sidebar (Stage 4) already filters cross-module nav by permission.
- Imports cleaned (`BarChart3`, `CheckCircle2`, `CreditCard`, `Zap` were removed) — lint clean.
- Verification: `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓ (`/workspace/overview` route is 1.7 kB / 108 kB First Load JS; shared bundle unchanged at 102 kB).
- Out of scope this stage (per strategy): module store, Pulse internals, platform admin, content marketing, backend.
- Pending: Stage 6 (Platform Overview) and the rest of the 11-stage plan. Pending backend dependencies surfaced honestly on the overview itself (billing summary client, cross-module activity ledger, rated usage facets) so future ICs see exactly what unlocks each `—`.
- Risks: the placeholder activity card and `—` quota bars are explicit "pending backend" affordances — if a future stage wires the data without removing the placeholder copy, operators could see double-counted UX. Both spots carry inline comments naming the wire-up dependency.
- Next recommended step: **Stage 6 — Platform Overview** (tenant metrics, runtime metrics, infrastructure states, subscriptions, operational health, failures/success metrics, system activity, tabs & filters). Strategy reminder: this should feel like an infra/control center. Do not start Stage 7+ before Stage 6 closes.

## 2026-05-15 Frontend Evolution — Stage 6 (Platform Overview)

- Changed (frontend, owned by Claude Opus): rewrote `app/(platform)/platform/overview/page.tsx` so it reads as an **infra/control center**, not a dashboard. Five-tier vertical rhythm: hero with period filter → system health rail → operations strip + activity stream → operational zones drilldown → runtime observability + shortcuts.
- New component — `components/platform/period-filter.tsx`. Client-side tablist (`1h / 24h / 7d / 30d / All`), persists selection in `localStorage` under `synapse.platform.period`, indigo-tinted active state, accessibility via `role="tablist"`/`role="tab"`/`aria-selected`. Purely visual today (data is `—` everywhere); becomes the seam that drives the loader's time-window param when the platform metrics client lands.
- System health rail — six zones (API, Runtime, Queues, Database, Stripe, Audit). Each zone now exposes a typed `HealthState` (`OPERATIONAL / DEGRADED / OUTAGE / UNKNOWN`), state icon (`CheckCircle2 / AlertTriangle / AlertOctagon / TimerReset`), latency placeholder (`p95 —`), uptime placeholder (`up —`), pulsing dot for live states, left-edge state color stripe.
- Operations strip — dedicated success/failure section. Four `OperationCell` tiles (Total · Succeeded · Failed · Median latency) and three per-zone `BreakdownRow`s (API · Runtime · Webhooks) with success/failure ratio bars rendered as a green/red `bar-progress` chain. Honest `—` until metrics ship; ratio bars stay at zero rather than fabricating.
- Activity stream — `surface-rail` panel with the existing audit-pending placeholder enriched: now lists the canonical action namespaces (`auth.*`, `pulse.ticket.*`, `billing.stripe_webhook.processed`, `runtime.execution.*`) so operators understand which categories will appear here when `GET /v1/platform/audit/events` is exposed.
- Zones drilldown — `Tenants / Runtime / Billing / Modules` cards each carry a typed primary stat (`null` today → `—`) plus two secondary stats. Cards use `surface-translucent` + `.surface-hover-brand` + `.stagger-children` so they cascade in on page-enter and lift on hover. Card-level halo accent comes from the zone tone (indigo / violet / emerald / sky).
- Runtime observability strip — added a 4th cell (`Error rate · per 1k ops`) alongside Active workers / Queue depth / Exec per minute. Sweep animation behind the title for the "live processing" cue.
- Every metric uses `<AnimatedNumber/>` (Stage 3) so values that *do* arrive tween in instead of pop-rendering. Design tokens are consumed end-to-end (`surface-*`, `t-h1/3`, `t-body`, `t-small`, `t-meta-xs`, `stack-page`, `live-dot`, `stripes-pulse`, `animate-sweep`).
- Imports cleaned of `Gauge` redundancy moved to hero; unused `ShieldAlert` retained for the audit shortcut. Lint clean.
- Verification: `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓ (32 routes built clean; shared First Load JS unchanged at 102 kB).
- Out of scope this stage (per strategy): tenant workspace, Pulse internals, module store internals, management area (Stage 7), onboarding.
- Pending: Stage 7 (Management Area). Pending backend dependencies surfaced honestly on the platform overview itself (platform metrics endpoint with success/failure breakdowns, `audit:read` for the activity stream, per-zone latency/uptime endpoint, runtime worker heartbeats).
- Risks: the period filter is currently visual-only. When metrics ship, the loader must consume `searchParams.period` (or context) — otherwise the filter will desync from the rendered numbers. Logged so the next IC sees the wire-up dependency.
- Next recommended step: **Stage 7 — Management Area** (users / roles / permissions / tenants / modules / integrations / llm providers). UX rule from strategy: operational tables + detail side panels + inline actions + realtime states. Avoid: giant CRUD forms, classic admin panels. Do not start Stage 8+ before Stage 7 closes.

## 2026-05-15 Frontend Evolution — Stage 7 (Management Area)

- Changed (frontend, owned by Claude Opus): built the **management pattern** as a set of reusable primitives, then applied it to the two highest-leverage admin surfaces. No CRUD forms anywhere; everything is operational table + detail side panel + inline actions.
- New primitives:
  - `components/ui/sheet.tsx` — refined to a polished detail side panel. Slides in from the right via Stage-3 `animate-slide-in-right`, glass surface, scroll lock, focus management, Esc/backdrop dismiss, `dismissable={false}` to lock during in-flight actions. Exports `Sheet`, `SheetBody`, `SheetFooter`, `SheetSection`.
  - `components/ui/status-pill.tsx` — single source of truth for operational state colour grammar. Seven tones (`emerald / amber / red / violet / sky / indigo / zinc`) mapped to chip + dot classes; `pulse` prop for realtime/in-flight states; `size="sm"` for inside-cell density.
  - `components/ui/inline-action.tsx` — small operational button with three tones (`neutral / primary / danger`) and built-in `pending` state that renders a `<Spinner>` in place of the icon. Two sizes for table-row vs sheet-footer density.
- Surfaces rewritten:
  - `app/(platform)/platform/tenants/page.tsx` — was `PendingSection` placeholder. Now an operational directory: hero with 3-stat cluster + `PeriodFilter`; toolbar (search + status filter chips + `shown / total` counter); table with avatar + name + slug + id, `<StatusPill>` for status and plan, member/module counts, created date, inline `Suspend / Restore` + `Inspect` actions per row. Row click opens the detail Sheet with Identity / Usage / Governance sections; footer mirrors the row action for confirmation.
  - `app/(platform)/platform/modules/page.tsx` — refactored from server-rendered hand-rolled table to client component using the new pattern. Hero + rollout ladder + governance card preserved on the left rail; right column now uses the new toolbar, table with `<StatusPill>` for lifecycle, visibility chip with icon, tier badges, `Reveal / Hide` + `Inspect` inline actions. Row click opens detail Sheet with About / Plan tiers / Governance sections.
- Animation: every visible count uses `<AnimatedNumber/>` (Stage 3). Hover/pending/press feedback uses `.transition-soft` + the new `InlineAction` press scale. Realtime states use `<StatusPill tone="emerald" pulse>` consistent with Stage-6's heartbeat dots.
- Both new pages are **client components** because state (search, filter, selected row, pending) lives in React. When the real backend client lands (`GET /v1/platform/tenants`, `GET /v1/platform/modules`), the placeholder `ROWS` becomes a server-side fetch with the same shape — no UX rewrite needed.
- Placeholder discipline: every mutation today calls `pretendAction()` which fires a toast naming the audit event that will land when the backend mutation is wired. Inline copy in each page names the exact endpoint (`PATCH /v1/platform/modules/:id`, `platform.modules.governance.updated`).
- Cleanup: `<ul>` in the tenant sheet swapped to `<div>` (children were key/value rows, not list items). `aria-selected` removed from `<tr>` in favour of `data-selected` styling — `<tr>` is not a tablist.
- Verification: `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓. `/platform/tenants` is 6.93 kB / 123 kB First Load JS; `/platform/modules` is 7.87 kB / 124 kB. Shared bundle unchanged at 102 kB.
- Out of scope this stage (per strategy): users + roles + permissions UX (no client yet), integrations + LLM providers surfaces (placeholders untouched), workspace settings → members, audit ledger reader.
- Pending: the remaining management surfaces (`/platform/billing`, `/platform/flags`, `/platform/integrations`, `/platform/runtime`, `/platform/audit`) still show `PendingSection`. They now have the primitives they need (`Sheet`, `StatusPill`, `InlineAction`, `PeriodFilter`) to adopt the same pattern when each becomes the focus of its own follow-up.
- Risks: the placeholder `pretendAction()` toast names the audit event but does not actually write one. Future ICs wiring real mutations must remove `pretendAction` and replace each `onClick` with a Server Action call returning `ActionResult` — the existing `<InlineAction pending={...}>` interface already accepts that.
- Next recommended step: **Stage 8 — Module Store** (catalog, tiers, plans, modules, activation, onboarding state). Strategy reminder: should feel like a cloud marketplace / modern services catalog. The client `/workspace/modules` store already drafted in earlier work needs a Stage-8 review with the new primitives. Do not start Stage 9+ before Stage 8 closes.

## 2026-05-15 Frontend Evolution — Stage 8 (Module Store)

- Changed (frontend, owned by Claude Opus): rewrote `app/(workspace)/workspace/modules/page.tsx` as a **cloud marketplace**. No new primitives; every visual element consumes Stage-7's `Sheet`/`StatusPill`/`InlineAction` so the management vocabulary stays consistent across workspace and platform shells.
- Layout (top-to-bottom, `stack-page` rhythm):
  1. **Hero** — plan badge (`StatusPill tone="indigo" label="Plan · Pro"`), 3-stat cluster (Installed · Available · Catalog), CTAs (Manage plan + Browse catalog).
  2. **Active in your workspace** — only renders if the tenant has installed modules. Each card shows status pill, onboarding progress bar (`done/total`), the next-up onboarding steps, and inline `Manage` + `Open` actions.
  3. **Catalog** — category filter chips (`All / Operations / AI / Automation / Data / Connectivity`), responsive 1/2/3-col grid of cards. Each card carries `<StatusPill>` for `Live/Beta/Soon` + `Installed`, tier badges, pricing, and an inline `Install` / `Manage` / `Roadmap` action. Clicking the card opens the detail Sheet.
  4. **Plan comparison** — a table mapping each shippable module to `FREE / LIGHT / PRO / PREMIUM` tiers with checkmarks. Footer copy names the billing API dependency.
  5. **Roadmap rail** — dashed-border tiles for `soon` modules; click opens the same Sheet (with disabled install action).
- New module data fields added to the local `CATALOG` (no API change; placeholder until the catalog client lands):
  - `installed: boolean` — whether the tenant has activated the module.
  - `tiers: ReadonlyArray<Tier>` — plan tiers the module is available on.
  - `onboarding: ReadonlyArray<{label, done}>` — setup checklist per module (Pulse: connect channel · publish knowledge · define playbook · invite operator).
- **Detail Sheet** — opens on card click with: hero (status pills + plan + pricing), Features grid, Plan-tiers grid (all 4 tiers, included or muted), **Onboarding section** with a progress bar + checklist (visible only when installed), Activation copy block. Footer: `Open module` link + tone-appropriate primary action (`Install` / `Uninstall` / `On roadmap`).
- **Activation flow** — `<InlineAction tone="primary" icon={<Power/>}>Install</InlineAction>` in cards; `<InlineAction tone="danger" icon={<PowerOff/>}>Uninstall</InlineAction>` in the Sheet footer for installed modules. Both call `pretendAction()` which toasts the audit event (`modules.enabled` / `modules.disabled`) until the real `modules:enable` / `modules:disable` API is wired.
- **Realtime states** — `<StatusPill tone="emerald" pulse>` on `Live` and on installed cards' "Installed" chip. Onboarding progress bar fills with `bg-gradient-to-r from-brand-500 to-accent-500` until 100%, then switches to `bg-emerald-500` for "fully set" cue.
- Page is a **client component** (`'use client'`) because state (category filter, selected module, pending) lives in React. When the real catalog client ships, the static `CATALOG` becomes a server-side fetch with the same shape — no UX rewrite.
- Cleanup: unused `CATEGORIES` constant removed. Imports cleaned. `<Sparkles>` + `<Boxes>` retained via `void` so future polish (e.g. featured-badge) does not re-add an import.
- Verification: `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓. `/workspace/modules` is **8.93 kB / 125 kB First Load JS**. Shared bundle unchanged at 102 kB.
- Out of scope this stage (per strategy): Pulse internals (Stage 9), onboarding/AI interview flow (Stage 10), i18n finalization (Stage 11), backend. The admin-side `/platform/modules` was closed in Stage 7 and stays untouched.
- Pending backend dependencies (named in the page itself): catalog client (`GET /v1/workspace/modules` or similar), tenant module enablement client (`POST /v1/workspace/modules/:id/enable` and `disable`), per-tenant onboarding state, billing summary client (for the plan badge and the real `Manage plan` upsell).
- Risks: the "Plan · Pro" pill in the hero is hardcoded today. When billing ships, the loader must hydrate it from `currentUser.tenant.billingPlan` (or the dedicated billing summary endpoint) — otherwise the marketplace shows a plan the tenant doesn't actually have.
- Next recommended step: **Stage 9 — Pulse Operational UX** (queues, tickets, workflows, conversations, operational states, schedules, AI actions, agent activity). Strategy reminder: must feel like an intelligent operational platform, not a card grid. The Pulse routes already have wired API data (`loadInboxLanes`, ticket detail, etc.) — Stage 9 polishes the UX into the operational product the strategy describes. Do not start Stage 10+ before Stage 9 closes.

## 2026-05-15 Stage 5A — Multitenant Database Hardening

- Changed: added migration `20260515120000_multitenant_db_hardening` with production-oriented indexes for tenant, RBAC, usage, Pulse, integration, and runtime hotpaths.
- Completed: added RLS helper schema/functions and tenant-isolation policies for tenant-owned tables without enabling enforcement yet.
- Completed: Prisma schema now documents the new compound indexes used by real query patterns.
- Completed: `PrismaService.withTenantContext()` now sets transaction-scoped `app.current_tenant_id` and controlled `app.platform_bypass`.
- Pending: convert high-risk repositories to the tenant transaction runner and enable `ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY` table-by-table.
- Risks: RLS is still disabled; app-level tenant filters remain mandatory until repository conversion and DB fixtures pass.
- Next recommended step: migrate Pulse read/write repositories to `withTenantContext()` and activate RLS first on disposable Pulse tables.

## 2026-05-15 Stage 5B — Pulse PostgreSQL Schema Split

- Changed: promoted Pulse from naming-only separation to physical PostgreSQL schema separation via Prisma `multiSchema`.
- Completed: Pulse operational tables/enums now map to schema `pulse`; Synapse governance tables/enums remain in `public`.
- Completed: added migration `20260515133000_split_pulse_schema` to create `pulse` and move Pulse-owned tables, enums, action ledger, schedules, knowledge, skills, and integration settings.
- Pending: live DB migration/RLS rehearsal after repository conversion.
- Risks: schema split changes table qualification; database reset/migration should be tested before shared environments are updated.
- Next recommended step: run migrations on a disposable DB, then migrate Pulse repositories to tenant context and enable RLS table-by-table.

## 2026-05-15 Stage 5C — Pulse Tenant Context Repositories

- Changed: Pulse repositories now execute operational reads/writes through tenant-scoped Prisma transaction context.
- Completed: entries, channels, conversations, tickets, timelines/events, context assembly, knowledge, integration settings, action ledger, and action-driven lifecycle transaction paths use `withTenantContext()`.
- Completed: unsafe read-then-update paths now keep lookup and mutation inside the same tenant transaction.
- Pending: live DB fixtures with two tenants and RLS-active query-plan validation on `pulse.*`.
- Risks: unit tests prove call shape; database-enforced RLS still awaits migration rehearsal and fixtures.
- Next recommended step: apply migrations to disposable Postgres and enable RLS first on low-risk `pulse` read tables.

## 2026-05-15 Stage 5D — Pulse RLS Activation

- Changed: added migration `20260515143000_enable_pulse_rls` to enable and force RLS on current `pulse.*` operational tables.
- Completed: policies are recreated with explicit schema qualification before RLS activation.
- Completed: `PulseOperationalScheduleService` now uses tenant DB context; no runtime Pulse code path directly touches `pulse.*` outside tenant context.
- Completed: added opt-in `pulse-rls.database-fixtures.spec.ts` for cross-tenant ticket visibility and policy check rejection.
- Pending: run `RUN_DATABASE_TESTS=1 npm test -- pulse-rls.database-fixtures` against a migrated disposable DB.
- Risks: existing direct DB fixture setup must use platform bypass/tenant context when RLS is active.
- Next recommended step: run the disposable DB migration rehearsal and then broaden RLS fixtures to conversations/events/actions.

## 2026-05-16 Stage 5E — Pulse RLS Fixture Expansion

- Changed: broadened the opt-in Pulse RLS fixture beyond tickets.
- Completed: fixture now covers channels, conversations, operational events, knowledge contexts, schedules, and integration settings.
- Completed: shared DB fixture cleanup now removes Pulse schedules, knowledge contexts, skills, and integrations through controlled platform bypass.
- Pending: live disposable DB execution remains blocked until Postgres is available on the configured `DATABASE_URL`.
- Risks: fixture breadth is ready, but not yet proven against live migrated Postgres in this session.
- Next recommended step: start/reset the dev database, apply migrations, then run `RUN_DATABASE_TESTS=1 npm test -- pulse-rls.database-fixtures`.

## 2026-05-16 Backend Stage — Tenant Context Profile

- Changed: added Synapse-owned Tenant Context Profile foundation for the global tenant operational profile.
- Completed: Prisma models/migration for profile, draft, answer, summary, and immutable versions in the platform `public` schema.
- Completed: `TenantContextService`, controller, DTOs, contract, and local `TenantProfileInterviewExecutor` interface/implementation.
- Completed: forced approval gate through `getTenantContext()`; modules can request the approved contract but must keep module-specific context isolated.
- Completed: audit events for start, answer save, summary generation, approval, update, rejection, and bypass blocking.
- Completed: unit coverage for draft persistence, required-field validation, approval/versioning, edit versioning, bypass rejection, tenant isolation, and controller permission metadata.
- Pending: frontend interview/manual form integration and future runtime-backed interview executor.
- Risks: database-backed tenant context fixtures are pending until the dev Postgres fixture is available; app-level tenant guard remains the active platform boundary for these `public` tables.
- Next recommended step: wire module enablement checks to call `TenantContextService.getTenantContext()` before normal module usage.

## 2026-05-16 Runtime V1 — API To Go Runtime Handoff

- Changed: Synapse core runtime orchestration now calls the isolated Go Runtime through signed REST instead of completing with a no-provider stub.
- Completed: `RuntimeExecutionDispatchService` is the only API-side runtime handoff boundary; product modules do not import or know `RuntimeHttpClient`.
- Completed: Synapse builds runtime invocation input from the submitted execution context at dispatch time, preserving persisted context while avoiding a separate stored prompt field.
- Completed: Runtime response ingestion uses existing Pulse output validation/action governance when actor snapshots exist.
- Completed: executions without actor snapshots skip action planning and only persist terminal runtime output.
- Pending: live provider smoke test, callback replay ledger, async queue/gRPC transport, tenant provider policy sync, and runtime usage metering.
- Risks: synchronous runtime HTTP can hold worker capacity during slow provider calls.
- Next recommended step: run local API + Go Runtime end-to-end with shared HMAC secret and provider keys.

## 2026-05-16 Runtime V1 — Central Result Ingress

- Changed: moved runtime result HTTP ingress from Pulse-owned controller to Synapse core `/v1/runtime/results`.
- Completed: central ingress validates HMAC/raw body, loads the persisted execution request, resolves the module handler by saved `moduleSlug`, and routes to the module contract.
- Completed: Pulse now registers `PulseRuntimeResultHandler` with Synapse runtime result registry and no longer owns runtime callback transport.
- Pending: replay/idempotency ledger for callbacks and async callback tests with the Go Runtime.
- Risks: handler registry depends on modules registering during bootstrap; add boot-time health check before production rollout.
- Next recommended step: implement callback replay storage in platform schema.
