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
