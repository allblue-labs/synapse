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
