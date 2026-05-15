# Architecture Decisions

## 2026-05-02 — Modular Monolith for the API

**Decision:** Build the backend as a NestJS modular monolith with domain modules.

**Reason:** A monolith reduces operational complexity at the current scale while the modular boundary (`SynapseModule` interface) allows future extraction to microservices without a full rewrite.

**Consequence:** Clear boundary rule enforced: domain logic must live in `product-modules/`, never in `core/`.

---

## 2026-05-02 — PostgreSQL + Prisma for persistence

**Decision:** Single PostgreSQL instance with Prisma ORM.

**Reason:** Relational integrity is essential for multi-tenant data. Prisma provides type-safe queries, migrations, and a clear schema contract. JSON columns allow flexible metadata without extra tables.

---

## 2026-05-02 — BullMQ + Redis for async tasks

**Decision:** All async work (message processing, AI responses, outbound sends) flows through BullMQ.

**Reason:** Decouples inbound webhook latency from processing latency. Provides retry, backoff, dead-letter semantics out of the box. Redis is already in the stack for rate limiting.

---

## 2026-05-02 — Tenant isolation via guard pipeline

**Decision:** Every authenticated request passes through `AuthGuard → TenantGuard → RolesGuard`. `TenantPrismaService` injects `tenantId` into all queries.

**Reason:** Defense in depth. Guard pipeline catches missing context early; scoped service prevents cross-tenant leakage even if a guard is misconfigured.

---

## 2026-05-02 — Provider-agnostic LLM pool

**Decision:** Define a `LlmProvider` interface; route through `LlmPoolService` by task type, privacy, cost.

**Reason:** Prevents tight coupling to OpenAI. Allows adding Claude, Gemini, or local models without changing caller code. Cost/privacy routing can be enforced per tenant plan.

---

## 2026-05-05 — Next.js App Router + next-intl (no locale prefix in URLs)

**Decision:** Use `next-intl` without route-based locale segments. Locale is stored in a cookie and detected from `Accept-Language`.

**Reason:** SaaS dashboards benefit from clean URLs (`/modules`, not `/en/modules`). The locale switcher writes a cookie and reloads, which is standard for SaaS apps.

---

## 2026-05-05 — Cookie-based JWT auth for the web app

**Decision:** After login, the JWT is stored in `document.cookie` (not `localStorage`). Middleware reads the cookie to protect routes server-side.

**Reason:** Cookies are sent automatically on every request, enabling middleware-level auth checks before SSR. `localStorage` tokens require a client-side render cycle before protection kicks in, creating a flash of unprotected content.

**Note:** The cookie is currently `SameSite=Lax` without `HttpOnly` (so the API client can read it to build the `Authorization` header). A production hardening path is to make it `HttpOnly` and introduce a thin BFF (Backend for Frontend) proxy that attaches the token server-side.

---

## 2026-05-07 — Pulse as the first extractable product module

**Decision:** Synapse Pulse lives at `apps/api/src/product-modules/pulse/`, uses slug `pulse`, exposes `/v1/pulse/...`, and is registered directly in the core module registry as the first product module.

**Reason:** Synapse itself is not a chatbot or messaging product. Pulse is an extractable operational communication module, while channels, conversations, messages, queues, orchestration, audit, billing, RBAC, and tenant safety remain backend platform primitives.

**Consequence:** No backend route, permission, registry manifest, Prisma model, or queue should use the retired product naming. Existing databases must apply the Pulse rename migration before running the renamed code.

**Status:** Completed for backend naming and registry. Pending backend tests for route protection, tenant isolation, and migration validation.

**Risk:** Frontend and any external clients using previous route names require explicit contract coordination.

**Next recommended step:** add contract tests around `/v1/pulse/*` permissions and tenant boundaries.

---

## 2026-05-07 — Product module renamed to Pulse

**Decision:** The first product module is named Synapse Pulse and uses slug `pulse`.

**Reason:** Only the module name changed; the defined rules and business logic remain the same.

**Consequence:** Backend contracts use `/v1/pulse`, `pulse:*` permissions, `PulseModule`, `PulseEntry`, `PulseStatus`, and `pulse-processing`.

**Status:** Completed in backend code, Prisma schema, shared permissions, registry manifest, and docs.

**Risk:** Clients using interim names must update before integration.

**Next recommended step:** lock the Pulse contract with route and RBAC tests.

---

## 2026-05-07 — RBAC tests lock Pulse permissions

**Decision:** Lock Pulse route protection with focused backend tests around metadata and guard behavior before building the next backend stage.

**Reason:** Pulse is the first product module and its route/permission contract is the integration boundary for frontend, module registry, billing gates, and usage metering.

**Consequence:** Changes to `/v1/pulse` metadata or `pulse:*` permission mapping now fail tests.

**Status:** Completed for unit-level guard and controller metadata coverage.

**Risk:** These tests do not replace full authenticated HTTP e2e coverage.

**Next recommended step:** add tenant-isolation repository tests and then persist module registry state.

---

## 2026-05-07 — Repository query-shape tests for tenant boundaries

**Decision:** Add mocked Prisma query-shape tests for Pulse repository tenant scoping before adding new persistence-heavy module registry work.

**Reason:** Pulse is tenant-owned operational data; repository queries must keep `tenantId` visible and testable.

**Consequence:** Future changes that remove tenant scope from Pulse read/write paths should fail tests.

**Status:** Completed for Pulse repository unit coverage.

**Risk:** Mocked tests do not validate PostgreSQL behavior or migrations.

**Next recommended step:** build persisted module registry/store models with tenant-scoped installation records.

---

## 2026-05-07 — Persisted module registry and tenant installations

**Decision:** Persist module catalog entries and tenant-specific module installation state in PostgreSQL.

**Reason:** In-memory registry state is not production durable and cannot support module marketplace, auditability, entitlements, or tenant-specific enablement.

**Consequence:** Pulse is seeded into `module_catalog_items`; tenant enable/disable writes `tenant_module_installations`, applies runtime state, and records audit events.

Tenant-facing registry operations only list and activate `PUBLIC` modules.

**Status:** Completed for initial registry/store persistence and service tests.

**Risk:** Billing entitlement checks are not yet enforced at enablement time.

**Next recommended step:** implement billing core plans, feature flags, module purchase records, and entitlement checks.

---

## 2026-05-07 — Billing core gates module enablement

**Decision:** Add platform-level billing plans, commercial feature flags, plan/module entitlements, and module purchases before operational usage metering.

**Reason:** Module enablement must not become commercially meaningful without subscription or purchase entitlement checks.

**Consequence:** `ModuleRegistryService.enable` now requires `BillingService.canEnableModule`; plans only become commercially active when their feature flag is enabled and enough public modules exist.

**Status:** Completed for local billing core and backend tests.

**Risk:** Stripe lifecycle is not wired yet, so billing status remains local application state.

**Next recommended step:** add operational usage metering and then Stripe lifecycle integration.

---

## 2026-05-07 — Append-only operational usage events

**Decision:** Record operational usage as tenant-scoped append-only events with metric type, quantity, unit, billing period, resource attribution, and optional idempotency key.

**Reason:** AI, transcription, workflow, storage, message, and automation costs need auditable raw events before pricing, aggregation, and Stripe reporting.

**Consequence:** Usage recording is separated from rating and invoice reporting. Instrumented code writes usage events; billing aggregation will consume them later.

**Status:** Completed for schema, service, summary API, and initial Pulse/message/workflow instrumentation.

**Risk:** Raw events are not yet priced or reconciled with Stripe.

**Next recommended step:** add usage pricing/rating tables and billing-period aggregation.

---

## 2026-05-07 — Admin-managed usage rate cards

**Decision:** Usage rating uses admin-managed active rate cards instead of hardcoded prices.

**Reason:** Production billing prices are commercial policy, not module logic. Missing rates should be visible as unrated lines rather than silently using made-up defaults.

**Consequence:** Rated summaries snapshot aggregate quantities and amounts when active rates exist; unrated lines remain explicit for finance/admin review.

**Status:** Completed for local rating and aggregate snapshots.

**Risk:** Stripe usage reporting and invoice reconciliation are still pending.

**Next recommended step:** report rated aggregates to Stripe and reconcile webhook outcomes.

---

## 2026-05-07 — Stripe meter reporting from rated aggregates

**Decision:** Report usage to Stripe from rated aggregate snapshots, not raw events.

**Reason:** Aggregates provide one tenant/period/metric/unit source of truth and make reporting idempotent with stable identifiers.

**Consequence:** Each aggregate has one Stripe report record with `SENT`, `FAILED`, or `SKIPPED` state. Lines are skipped rather than guessed when customer ids, meter mappings, ratings, or integer Stripe values are missing.

**Status:** Completed for outbound reporting and local reconciliation records.

**Risk:** Stripe webhooks and subscription lifecycle reconciliation are still pending.

**Next recommended step:** add signed Stripe webhook handling.

---

## 2026-05-07 — Signed Stripe webhook ledger

**Decision:** Stripe webhook intake is a public backend route that captures the raw request body, verifies the `Stripe-Signature` header with `STRIPE_WEBHOOK_SECRET`, and stores every accepted event id in `stripe_webhook_events`.

**Reason:** Stripe cannot call authenticated tenant routes, but financial lifecycle updates must still be replay-resistant, auditable, and reconciled into tenant-owned billing accounts.

**Consequence:** Duplicate Stripe event ids return success without reprocessing. Subscription and invoice lifecycle events update `BillingAccount`; unsupported events are recorded as ignored instead of discarded silently.

**Status:** Completed for subscription and invoice status reconciliation.

**Risk:** Events must be matchable through tenant metadata or an already linked Stripe customer/subscription id.

**Next recommended step:** add customer provisioning and checkout session creation so Stripe metadata is consistently set at the source.

---

## 2026-05-07 — Stripe checkout creates the tenant ownership link

**Decision:** Subscription checkout is created server-side from `BillingService`, after confirming the plan is commercially active and has a real Stripe price id.

**Reason:** Checkout must not invent pricing or trust frontend plan/customer data. The backend is the authority for tenant id, actor, plan activation, and Stripe metadata.

**Consequence:** Checkout sessions stamp `tenantId` and `synapse_plan_key` on both Checkout Session metadata and `subscription_data.metadata`; webhooks can reconcile lifecycle events back to one tenant billing account.

**Status:** Completed for subscription Checkout Session creation.

**Risk:** Missing Stripe price configuration blocks checkout by design.

**Next recommended step:** add customer portal sessions and checkout/session retrieval reconciliation.

---

## 2026-05-07 — Billing redirects are origin-allowlisted

**Decision:** Checkout success/cancel URLs and portal return URLs must match `BILLING_REDIRECT_ALLOWED_ORIGINS` before Synapse creates a Stripe hosted session.

**Reason:** Hosted billing flows redirect the user back to Synapse-controlled browser surfaces. The backend must prevent arbitrary redirect origins even though frontend owns the UX.

**Consequence:** Billing hosted-session APIs fail closed when the redirect origin is not configured. Portal sessions are only created for the tenant-owned Stripe customer id stored on `BillingAccount`.

**Status:** Completed for subscription checkout and customer portal session creation.

**Risk:** Misconfigured origins can block legitimate billing flows.

**Next recommended step:** add checkout session retrieval/reconciliation and e2e redirect-origin tests.

---

## 2026-05-07 — Pulse operational events as the module timeline

**Decision:** Pulse will use tenant-scoped operational events, tickets, playbooks, and knowledge context as the durable operational model instead of treating raw mirrored chats as the primary product model.

**Reason:** Pulse is an operational communication/orchestration module, not a chatbot or channel mirror. The backend needs auditable state changes, workflow transitions, human reviews, and execution traces.

**Consequence:** `PulseOperationalEvent` is the core timeline entity for important Pulse actions. Raw provider payloads and secrets must stay out of unrestricted operational persistence.

**Status:** Completed for persistence schema, contracts, and repository foundation.

**Risk:** Existing `PulseEntry` flows still need to emit the new operational events consistently.

**Next recommended step:** refactor Pulse use cases to create/update conversations, tickets, and operational events during queue processing.

---

## 2026-05-07 — Runtime preparation is contract-only

**Decision:** Stage 1 prepares execution lifecycle models and provider interfaces, but does not implement the future external Go Runtime, Kubernetes orchestration, local LLMs, or provider calls.

**Reason:** Synapse remains the SaaS control plane for auth, tenancy, billing, audit, registry, usage, and governance. Runtime execution can be integrated later through explicit contracts.

**Consequence:** `ExecutionRequest` stores tenant-aware lifecycle state and TypeScript contracts define request/response/provider shapes for future local, queue, or gRPC transports.

**Status:** Completed for schema and contracts.

**Risk:** Execution models are not yet connected to production workflows.

**Next recommended step:** add an execution lifecycle service that records requested/queued/running/completed transitions without calling external runtime providers.

---

## 2026-05-07 — Pulse entry lifecycle emits operational state

**Decision:** Existing Pulse entry use cases now create operational events, and validation creates the first operational ticket record.

**Reason:** Stage 1 should evolve the current backend rather than replace it. Emitting events from current use cases creates the operational timeline while preserving the existing queue endpoint contract.

**Consequence:** `PulseEntry` remains the queue-processing input, while `PulseOperationalEvent` and `PulseTicket` become durable operational outputs.

**Status:** Completed for create, validate, reject, and retry event emission plus validation ticket creation.

**Risk:** Ticket typing is still coarse until the generic Pulse flow engine maps intent to ticket types.

**Next recommended step:** add channel/conversation ingestion contracts and move ticket type selection into a flow/intent mapping service.

---

## 2026-05-07 — Pulse ingestion resolves operational conversations

**Decision:** Pulse entry creation resolves `PulseChannel` and `PulseConversation` from provider/channel/participant context when supplied, while keeping legacy `conversationId` input temporarily compatible.

**Reason:** Pulse needs a minimal operational conversation model without becoming an infinite chat mirror. Resolving the operational conversation during entry ingestion creates stable state for tickets and events.

**Consequence:** New callers should send provider/channel/participant context; old callers can continue using `conversationId` until a hardening/deprecation pass validates ownership or removes it.

**Status:** Completed for repositories, DTO fields, and create-entry use-case wiring.

**Risk:** Direct `conversationId` remains a tenant-ownership validation gap if exposed to untrusted callers.

**Next recommended step:** add channel/conversation APIs and then require resolved context for new ingestion flows.

---

## 2026-05-07 — Direct Pulse conversation ids must be tenant-validated

**Decision:** While direct `conversationId` remains temporarily supported, it must resolve through `PulseConversationRepository.findById(tenantId, id)` before entry creation.

**Reason:** Direct ids are a compatibility bridge, not a trust boundary. The backend must prevent a caller from linking an entry to another tenant's conversation.

**Consequence:** Invalid or cross-tenant ids fail before queueing, usage metering, and operational event writes.

**Status:** Completed for create-entry ingestion.

**Risk:** Existing integrations using stale conversation ids will now fail fast.

**Next recommended step:** publish provider-context ingestion examples and deprecate direct ids.

---

## 2026-05-07 — Pulse operational reads start with channels and conversations

**Decision:** Expose read-only Pulse channel and conversation APIs before write/admin channel management.

**Reason:** Frontend and provider integrations need a stable inspection surface for resolved operational state, but channel setup and mutation require a separate RBAC/AppSec pass.

**Consequence:** Initial endpoints are `pulse:read` only and return minimal tenant-scoped records. Pagination/filtering and admin mutation routes remain pending.

**Status:** Completed for channel/conversation list and detail.

**Risk:** Unpaginated list endpoints need refinement before high-volume use.

**Next recommended step:** add ticket and operational event timeline read APIs.

---

## 2026-05-07 — Pulse tickets use ticket permissions

**Decision:** Pulse ticket read APIs use `tickets:read`, while conversation timeline reads remain under `pulse:read`.

**Reason:** Tickets are operational work items that will eventually have assignment, resolution, and review workflows. They need permission granularity separate from generic Pulse conversation inspection.

**Consequence:** `GET /v1/pulse/tickets*` requires ticket permissions even though the routes live inside the Pulse module boundary.

**Status:** Completed for read-only ticket and timeline APIs.

**Risk:** Future ticket mutation routes must keep using `tickets:*` and not fall back to broad `pulse:*`.

**Next recommended step:** add pagination/filtering and then ticket mutation APIs with `tickets:assign` / `tickets:resolve`.

---

## 2026-05-07 — Pulse read APIs return paged envelopes

**Decision:** Pulse list/timeline read APIs return `{ data, total, page, pageSize }` rather than raw arrays.

**Reason:** Operational tenants can accumulate many channels, conversations, tickets, and timeline events. Paged envelopes give frontend and manual QA a stable backend contract before high-volume usage.

**Consequence:** Repository list methods use tenant-scoped `findMany` plus `count` and enforce a capped DTO page size.

**Status:** Completed for baseline pagination.

**Risk:** Filters are still needed to keep operator workflows efficient.

**Next recommended step:** add status/type/provider/date filters.

---

## 2026-05-07 — Pulse read filters stay resource-specific

**Decision:** Pulse read APIs use resource-specific DTOs instead of one large generic filter shape.

**Reason:** Channels, conversations, tickets, and operational events have different operational dimensions and permission implications. Resource-specific filters keep validation strict and understandable.

**Consequence:** Filter DTOs are separate for channel, conversation, ticket, and event timeline reads while sharing pagination through `PulseListDto`.

**Status:** Completed for first-pass filters.

**Risk:** Additional filters should be added deliberately with index/query review.

**Next recommended step:** add HTTP e2e tests for filter validation and tenant isolation.

---

## 2026-05-07 — Pulse read filter tests stay close to contracts first

**Decision:** Add DTO validation and controller forwarding tests before introducing a new HTTP e2e harness.

**Reason:** The current API test setup is unit/spec based. These tests still lock the contract that invalid filter values are rejected by DTO validation and that controllers use the server tenant context when forwarding filters.

**Consequence:** Pulse read filters have immediate backend coverage without introducing unrelated test infrastructure in the same slice.

**Status:** Completed for unit-level contract coverage.

**Risk:** Real HTTP request behavior, global validation-pipe wiring, and cross-tenant rejection still need e2e tests.

**Next recommended step:** add a dedicated Nest HTTP e2e harness for Pulse read endpoints.

---

## 2026-05-07 — Pulse read HTTP tests use a local Nest harness

**Decision:** Test Pulse read route behavior through a local Nest application with real global validation pipes, tenant guard, and permissions guard while stubbing use cases.

**Reason:** This verifies HTTP serialization, DTO validation, tenant-header rejection, and forbidden audit behavior without requiring a production database fixture in the same slice.

**Consequence:** Route-layer AppSec behavior is covered independently from repository tenant-scope tests.

**Status:** Completed for Pulse read filters.

**Risk:** Full request-to-database e2e coverage still depends on dedicated test database fixtures.

**Next recommended step:** add database-backed two-tenant fixtures when the test DB lifecycle is ready.

---

## 2026-05-08 — Pulse ticket mutations are operational commands

**Decision:** Expose intent-shaped ticket lifecycle commands rather than generic ticket update endpoints.

**Reason:** Pulse is an operational communication module, not a CRUD ticket database. Commands such as assign, resolve, escalate, review, and advance flow preserve business meaning and make event/audit trails reliable.

**Consequence:** Each lifecycle mutation emits a standardized Pulse operational event payload and a platform audit event, while repository writes remain tenant-scoped.

**Status:** Completed for first-pass lifecycle commands.

**Risk:** Flow advancement currently records metadata and confidence but does not yet enforce a formal playbook transition graph.

**Next recommended step:** add a central Pulse event type catalog and timeline aggregation APIs.

---

## 2026-05-08 — Pulse timelines are event-category projections

**Decision:** Build consolidated ticket and conversation timelines from Pulse operational events using a central event type catalog and category mappings.

**Reason:** Pulse should expose operational history, not raw mirrored chats. Category filters make operator actions, escalation history, confidence transitions, and workflow transitions discoverable without duplicating event storage.

**Consequence:** Timeline APIs return enriched operational event records and can evolve into projected read models later if query volume requires it.

**Status:** Completed for V1 timeline aggregation.

**Risk:** Category mappings must stay synchronized with newly introduced event types.

**Next recommended step:** use the workflow-state category to enforce guided flow transitions.

---

## 2026-05-08 — Pulse flow advancement uses an explicit V1 state graph

**Decision:** `advanceFlowState` validates requested states and transitions against a Pulse-owned state machine.

**Reason:** Pulse workflows need guided operational movement, not free-form string metadata. A state graph gives future playbooks, operator review, and runtime execution a stable lifecycle backbone.

**Consequence:** Flow advancement can now reject invalid movement and map review, escalation, waiting, completion, and cancellation states onto ticket statuses.

**Status:** Completed for V1 generic flow rules.

**Risk:** Tenant/playbook-specific transition policies are not implemented yet.

**Next recommended step:** add confidence threshold rules that route low-confidence transitions to review-required/operator takeover states.

---

## 2026-05-08 — Pulse confidence policy routes automated transitions to human review

**Decision:** Apply static V1 confidence thresholds only to AI/integration-driven flow advancement.

**Reason:** Human operators can intentionally move work forward, but automated decisions below confidence thresholds should become review or escalation work instead of silently advancing operational state.

**Consequence:** Confidence below `0.65` becomes `review_required`; confidence below `0.35` becomes `escalated`; summaries are stored as masked operational event payload data.

**Status:** Completed for V1 policy.

**Risk:** Thresholds are not tenant/playbook configurable yet.

**Next recommended step:** introduce tenant-scoped knowledge context so future runtime extraction has governed context inputs.

---

## 2026-05-08 — Pulse knowledge context is tenant-scoped operational context

**Decision:** Model Pulse knowledge context as tenant-owned operational records rather than global prompts or provider-side state.

**Reason:** Future runtime extraction needs governed context inputs for FAQs, instructions, products/services, business descriptions, and campaigns without leaking data across tenants.

**Consequence:** Knowledge context APIs are tenant-scoped and produce audit/event records on publish/archive, while query remains a simple backend contract for future retrieval.

**Status:** Completed for V1 foundation.

**Risk:** Semantic retrieval and versioning are not implemented yet.

**Next recommended step:** prepare scheduling provider contracts without implementing provider calls.

---

## 2026-05-08 — Pulse scheduling integrations are prepare-only contracts for now

**Decision:** Expose scheduling integration readiness and request preparation without provider calls.

**Reason:** Google Calendar, Outlook Calendar, and Calendly require secret isolation, provider-specific retries, and booking reconciliation. Pulse needs stable contracts first without pretending provider execution exists.

**Consequence:** Availability and booking endpoints return prepared, non-executable requests and validate tenant-owned active integrations.

**Status:** Completed for V1 contracts.

**Risk:** Consumers must not treat prepare responses as confirmed availability or bookings.

**Next recommended step:** add usage metering candidates before provider adapters.

---

## 2026-05-08 — Pulse usage metering uses existing platform metric types

**Decision:** Map Pulse usage candidates onto existing `UsageMetricType` values instead of adding new enum values.

**Reason:** Avoiding a schema migration keeps this slice focused while still producing operational billing data for messages, workflow runs, automation executions, and storage.

**Consequence:** Unit names carry Pulse-specific dimensions such as `ticket_operation`, `flow_transition`, `knowledge_operation`, and `scheduling_availability_prepare`.

**Status:** Completed for V1 usage candidates.

**Risk:** Repeated same-action ticket operations need operation-level ids before they can be counted precisely.

**Next recommended step:** prepare runtime execution contracts without implementing provider calls.

---

## 2026-05-08 — Runtime execution lifecycle is persisted but not executed

**Decision:** Store runtime execution requests and lifecycle transitions in Synapse now, without implementing the future external Go Runtime.

**Reason:** Synapse owns auth, tenancy, RBAC, audit, billing, and execution governance. Persisted lifecycle state gives the future runtime a stable contract while avoiding fake provider execution.

**Consequence:** Runtime APIs can create/read/transition execution records, but no gRPC, queue submission, Kubernetes, or local LLM work is performed.

**Status:** Completed for lifecycle contracts.

**Risk:** Transition permissions need a service-actor model before production runtime writes.

**Next recommended step:** harden runtime and Pulse mutation AppSec coverage.

---

## 2026-05-07 — Three frontend experiences, three route groups

**Decision:** Split the Next.js frontend into three top-level experiences, each in its own App Router route group with its own layout chrome:

| Experience       | Route group       | URL prefix      | Chrome                                     |
|------------------|-------------------|-----------------|--------------------------------------------|
| Public marketing | `(marketing)`     | `/`, `/pricing`, `/modules` | `PublicNav` only                |
| Tenant workspace | `(workspace)`     | `/workspace/*`  | `TopNav` (operational), `SegmentNav`        |
| Platform admin   | `(platform)`      | `/platform/*`   | Distinct admin top bar + indigo accent      |

**Reason:** Mixing tenant and admin surfaces under a shared `(dashboard)` group made the IA ambiguous and tempted shared layouts that leaked admin affordances into tenant traffic. Splitting by route group lets each layout enforce its own auth posture and visual identity.

**Consequence:** Workspace and platform layouts both call `/users/me` and propagate the `CurrentUser` via `<CurrentUserProvider>`, but the chrome is independent. Marketing pages stay layoutless from a session standpoint — middleware pre-validates that they're on the public allowlist.

**Status:** Shipping in Stage 1A.

**Risk:** Three separate layouts mean three places to keep in sync (header height, cookie behaviour, etc.) — the shared primitives (`PageHeader`, `PendingSection`, `SegmentNav`) absorb most of that.

**Next recommended step:** add a shared "shell" primitive that both workspace and platform layouts compose, once the visual identities have stabilised.

---

## 2026-05-07 — `PendingSection` for IA-listed but not-yet-built surfaces

**Decision:** Every route in the IA that doesn't yet have a real implementation renders a `PendingSection` — a real `PageHeader` plus a dashed-outline card calling out the deferred scope and a `Stage 1B` tracking tag.

**Reason:** Stage 1 of the frontend overhaul is multi-batch. The IA needs to be present (so middleware, navigation, and breadcrumbs all line up) before the rich UX is built. Stubs that lie about being implemented (empty pages, "Coming soon" with no detail) erode trust; an explicit "what's coming" panel is honest and discoverable.

**Consequence:** Surface count is high but cost-of-build is low. Each Stage 1B PR replaces one `PendingSection` with the real thing — no IA churn.

**Status:** Stage 1A applies it to every Pulse surface (except inbox/settings/logs which already had a real impl) and every `/platform/*` page.

**Risk:** Stubs left in production traffic past their due date. Mitigation: every `PendingSection` carries a tracking tag (`Stage 1B`) so they're greppable.

**Next recommended step:** when Stage 1B begins, audit the codebase for `PendingSection` usage and prioritise replacements by tenant-visible value (ticket detail, inbox queue redesign, module store first).

---

## 2026-05-07 — Pulse route IA collapse

**Decision:** Backend already uses Pulse (`/v1/pulse/*`). Frontend mirrors this by collapsing the older nested messaging URL hierarchy into `modules/pulse/*` directly, and renaming `queue → inbox` and `errors → logs` to match the new IA Part 6 spec.

**Reason:** "Messaging" was a holdover concept from the original branding when Pulse was one feature inside a broader messaging module. With the official rename, the intermediate `messaging` segment adds a hop with no information; the `queue/errors` names also leak the implementation. `inbox/logs` align to the operational vocabulary used elsewhere in the product.

**Consequence:** Old pre-Pulse URLs are gone. Bookmarks break. Acceptable while the platform is in private beta — no public links to migrate.

**Status:** Done in Stage 1A.

**Risk:** External documentation referring to old paths must be updated alongside this PR.

**Next recommended step:** if/when the platform exits private beta, add a one-time set of static redirects from old paths to new ones (most likely as a Next middleware extension).

---

## 2026-05-08 — Runtime lifecycle transitions require explicit governance

**Decision:** Runtime lifecycle state changes use a dedicated transition permission, a separate cancel command, transition-state validation, audit records, and payload masking before persistence.

**Reason:** Runtime records are control-plane governance state. They may later be touched by an external Go Runtime, so Synapse must define authorization, transition rules, and audit-safe persistence before any callback integration exists.

**Consequence:** Runtime APIs still do not execute work, but they now reject invalid lifecycle jumps and avoid persisting obvious secrets, raw provider payloads, or chain-of-thought fields in execution input/output/context.

**Status:** Completed for V1 backend hardening.

**Risk:** A true runtime service-actor model is still pending.

**Next recommended step:** add database-backed tenant fixtures and forbidden-action tests before external runtime adapters.

---

## 2026-05-08 — Database fixtures are opt-in until test database orchestration exists

**Decision:** Add real Prisma/PostgreSQL fixture specs behind `RUN_DATABASE_TESTS=1` instead of making normal unit tests depend on a local database.

**Reason:** The backend needs true multi-tenant persistence checks, but this repository does not yet own a disposable test database lifecycle for every developer and CI run.

**Consequence:** `npm test` remains fast and deterministic, while `npm run test:db` gives Ninja and CI a focused entrypoint for database-backed isolation validation.

**Status:** Completed for runtime lifecycle and Pulse ticket lifecycle fixture foundation.

**Risk:** These fixtures will not execute unless a migrated PostgreSQL database is configured.

**Next recommended step:** provision a disposable test database and expand fixtures to HTTP role matrices.

---

## 2026-05-08 — Platform signs isolated Runtime requests

**Decision:** The NestJS platform owns the outbound HMAC signer and HTTP client for Stage 1 Go Runtime submissions.

**Reason:** The Runtime is an isolated execution service and should reject unsigned execution requests. The SaaS platform remains the control plane and must submit tenant-aware execution requests with signed, auditable context.

**Consequence:** `RuntimeHttpClient` can call `POST /executions` with the same canonical signature format enforced by the Go Runtime, but no product module invokes it yet.

**Status:** Completed for client/signature foundation.

**Risk:** Runtime callbacks and service-actor authorization are still pending.

**Next recommended step:** add governed lifecycle orchestration around client submission before wiring Pulse to runtime execution.

---

## 2026-05-08 — Frontend integration starts from a backend contract pack

**Decision:** Provide `docs/FRONTEND_CONTRACT_PACK.md` as the canonical frontend handoff before additional frontend integration.

**Reason:** The frontend owner needs stable backend route, permission, state, and error contracts without guessing from controller code or touching backend/runtime internals.

**Consequence:** Next.js integration can start with Pulse ticket detail, operational timeline, and lifecycle actions while respecting RBAC, tenancy, billing, and runtime-governance boundaries.

**Status:** Completed for current backend surface.

**Risk:** The pack is static until OpenAPI/generated contracts exist.

**Next recommended step:** keep the pack updated after every backend API change and add generated API examples later.

---

## 2026-05-08 — Admin bootstrap uses the Light plan

**Decision:** Superseded by the later platform-admin bootstrap decision below; first-admin provisioning no longer creates a tenant billing account.

**Reason:** `starter` is a retired pre-billing-core default. Current commercial plans are Light, Pro, and Premium, and `BillingAccount.planKey` is constrained to `billing_plans.key`.

**Consequence:** Tenant/customer creation paths must use current billing plan keys; `npm run admin:create` is now independent of tenant billing plans.

**Status:** Completed.

**Risk:** Running the script before migrations complete will still fail correctly.

**Next recommended step:** add a container smoke test for platform-admin provisioning.

---

## 2026-05-08 — Admin bootstrap creates a platform admin, not a tenant owner

**Decision:** `npm run admin:create` provisions `User.platformRole = PLATFORM_ADMIN` and does not create a tenant, billing account, or tenant membership.

**Reason:** The first administrator must administer Synapse itself, including future admin/tester/customer lifecycle operations. A tenant `OWNER` is a customer workspace role and should not be confused with platform administration.

**Consequence:** Platform admins log in with `role: "platform_admin"` and no default `tenantId`; `/users/me` returns no `tenant` unless an explicit tenant boundary is supplied for tenant-scoped operations.

**Status:** Completed for bootstrap/auth/RBAC foundation.

**Risk:** Frontend platform screens must treat `tenant` as optional for platform admins.

**Next recommended step:** add audited platform user-management APIs.

---

## 2026-05-08 — Platform roles are granular and tenantless

**Decision:** Platform users use `super_admin`, `admin`, and `tester` semantics, stored in `User.platformRole` and constrained further by `User.platformScopes`.

**Reason:** Synapse needs a bootstrap role with full control, limited admins with selected metrics/modules/policies, and testers with broad read access but no admin metrics.

**Consequence:** `admin:create` provisions only `SUPER_ADMIN`; normal platform admins are created through audited backend APIs and cannot create other admins.

**Status:** Completed for role/scopes foundation and user-management APIs.

**Risk:** Scope data must be consumed by future platform metrics/modules/policies APIs before it becomes a complete enforcement story.

**Next recommended step:** implement platform admin metric APIs with scope checks and sensitive-field redaction.

---

## 2026-05-08 — Platform governance reads must enforce stored scopes

**Decision:** Platform metrics/modules/policies are exposed through dedicated tenantless platform routes that load `User.platformScopes` server-side.

**Reason:** Granular admins must not rely on frontend filtering. The backend must decide which metrics, modules, and policies are visible.

**Consequence:** `super_admin` sees all platform governance reads; granular admins are restricted to selected scopes; testers do not have platform metric permission.

**Status:** Completed for read-side usage metrics, module list, and policy list.

**Risk:** Write-side governance is still pending and must reuse the same scope boundary.

**Next recommended step:** add audited write APIs for policy/module governance.

---

## 2026-05-08 — Platform governance writes are audited and scope-bound

**Decision:** Module rollout governance and policy flag changes are allowed only through platform routes that enforce both `platform:*` permissions and stored `platformScopes`.

**Reason:** Granular admins may control only selected modules/policies; write-side controls must not depend on frontend filtering.

**Consequence:** Every module/policy governance mutation records an audit event with previous/next governance state or policy update metadata.

**Status:** Completed for module catalog governance and billing feature-flag policies.

**Risk:** More complex policy domains may need dedicated models instead of overloading billing feature flags.

**Next recommended step:** add database-backed scoped mutation fixtures.

---

## 2026-05-08 — Platform governance needs both HTTP and service fixtures

**Decision:** Cover platform governance with fast HTTP guard fixtures plus service-level scope/audit fixtures before adding slower DB-backed cases.

**Reason:** Permission regressions and scope regressions fail at different layers; testing them separately keeps feedback fast and precise.

**Consequence:** Jest now validates route-level forbidden audit behavior and service-level scope denial audit behavior without requiring PostgreSQL.

**Status:** Completed for fast fixture layer.

**Risk:** Persistence-specific edge cases still require database-backed tests.

**Next recommended step:** add opt-in DB fixtures for persisted `platformScopes` and module/policy writes.

---

## 2026-05-08 — Persisted platform scopes require opt-in DB fixtures

**Decision:** Add `platform-governance.database-fixtures.spec.ts` behind `RUN_DATABASE_TESTS=1`.

**Reason:** Mock tests prove guard/service behavior, but persisted JSON scopes, Prisma enum values, module catalog writes, policy writes, and audit records need real database validation.

**Consequence:** Normal test runs stay fast while Ninja/CI can validate platform governance against PostgreSQL.

**Status:** Completed.

**Risk:** The fixture is skipped until a migrated test database is available.

**Next recommended step:** run the DB fixture in Docker/CI.

---

## 2026-05-08 — Dev DB fixtures use the current disposable Docker Postgres

**Decision:** In development, reset the existing Docker Postgres volume and run DB fixtures against that database instead of provisioning a second test database.

**Reason:** The project is still in local/dev mode and a full disposable test database lifecycle is not necessary yet.

**Consequence:** The approved flow is `docker compose down -v`, `docker compose up --build`, then `docker compose exec api-synapse npm run test:db:dev-reset`.

**Status:** Documented and supported by an API npm script.

**Risk:** This destroys local Docker data and must not be used in shared or production-like environments.

**Next recommended step:** run this flow before Ninja's manual QA pass.

---

## 2026-05-09 — Modules assemble cognitive context; Synapse governs it

**Decision:** Pulse owns Pulse-specific operational/cognitive context assembly. Synapse core validates governance requirements and the submitted context contract, but does not centralize Pulse-specific context semantics.

**Reason:** Business capabilities must remain extractable-first. Putting Pulse context assembly in core would couple Synapse to one module's operational model.

**Consequence:** New Pulse Context Pack code must live under `src/product-modules/pulse`; core runtime/execution services may validate tenant, module, RBAC, feature/plan/usage limits, audit, and schema shape only.

**Status:** Stage 1 documented.

**Risk:** Existing generic orchestration/intelligence primitives must not grow Pulse-specific branches during Stage 2/3.

**Next recommended step:** implement module-local Pulse context contracts and assembler.

---

## 2026-05-09 — Defer Postgres schema split and RLS until safe

**Decision:** Keep Pulse data in strongly separated `pulse_*` tables in the current schema for now; defer full `platform.*`/`pulse.*` Postgres schema separation and RLS enablement.

**Reason:** Current Prisma migrations/build are stable with one datasource/schema. Moving tables across schemas or enabling RLS without a proven `app.current_tenant_id` strategy risks breaking existing queries and migrations.

**Consequence:** Stage 2/3 should keep all Pulse persistence behind Pulse repositories and `Pulse*` models. Stage 4 can add a migration path for schemas/RLS after repository coverage and DB fixtures are stronger.

**Status:** Deferred intentionally.

**Risk:** Application-level tenant enforcement remains the only active isolation boundary until RLS is implemented.

**Next recommended step:** add repository coverage for tenant filters, then prototype RLS in a disposable dev database.

**Superseded 2026-05-15:** Pulse now uses physical PostgreSQL schema `pulse`; RLS activation remains gradual.

---

## 2026-05-09 — Pulse Context Pack is internal, audit-safe, and module-owned

**Decision:** Implement `PulseContextPack` inside `src/product-modules/pulse` as the module-owned context assembly contract for future runtime execution.

**Reason:** Pulse knows which conversation, ticket, playbook, knowledge, scheduling, confidence, and human-review details are operationally relevant. Synapse should govern and validate the pack, not assemble Pulse-specific cognitive context.

**Consequence:** The new assembler redacts sensitive fields, masks identifiers, emits usage/security hints, and returns a required output schema for future runtime validation. No frontend surface should render raw packs.

**Status:** Stage 2 foundation completed without migration.

**Risk:** DB-level RLS is still deferred, so tenant-filter coverage and future DB fixtures remain important.

**Next recommended step:** invoke the assembler from a `pulse.context` queue boundary before creating governed execution requests.

---

## 2026-05-09 — Pulse queues are bounded by operational responsibility

**Decision:** Split Pulse asynchronous work into named queue boundaries: `pulse.inbound`, `pulse.context`, `pulse.execution`, `pulse.actions`, `pulse.timeline`, and `pulse.failed`.

**Reason:** Pulse should not grow a single worker that validates, assembles context, requests execution, dispatches actions, writes timelines, and handles failures under one retry policy.

**Consequence:** New work is published through `PulseQueueService` with tenant-scoped idempotency keys. The existing entry processor now runs on `pulse.inbound`; the other queues are registered and contracted for incremental worker implementation.

**Status:** Stage 3 foundation completed.

**Risk:** Only `pulse.inbound` is active; unprocessed jobs should not be published to the other queues until their processors are implemented.

**Next recommended step:** implement `pulse.context` as the first new bounded processor.

---

## 2026-05-09 — Pulse context worker prepares execution records, not provider calls

**Decision:** `pulse.context` may create platform `ExecutionRequest` records, but it must not call LLM providers, the external Go Runtime, or local runtime executors.

**Reason:** Context assembly and execution governance are separate lifecycle stages. Persisting a request gives Synapse auditability/idempotency without collapsing context assembly into runtime orchestration.

**Consequence:** Context jobs produce `REQUESTED` execution records and Pulse operational events. Provider execution remains pending behind `pulse.execution` and future governance checks.

**Status:** Implemented.

**Risk:** A prepared execution request could be mistaken for completed execution unless consumers respect lifecycle status.

**Next recommended step:** add explicit execution governance checks before transitioning to `QUEUED`.

---

## 2026-05-09 — Store visibility is separate from module availability

**Decision:** Add `ModuleCatalogItem.storeVisible` as the commercial/store display switch.

**Reason:** Some modules are internal or organization-specific and should be runnable/governed without being sold or shown in the marketplace. Later, a super admin can make them store-visible without changing their operational code.

**Consequence:** Store listing, commercial plan activation counts, and store-based enablement require `storeVisible = true`. Internal execution governance does not require store visibility if the module is already enabled for the tenant.

**Status:** Implemented with migration.

**Risk:** Admin UI must clearly distinguish "active", "visibility", "rollout", and "store visible" to avoid accidental commercialization.

**Next recommended step:** add DB fixtures and frontend admin copy for this distinction.

---

## 2026-05-09 — Execution governance queues approved requests only

**Decision:** Runtime execution governance advances requests to `QUEUED` only after module and request-type checks.

**Reason:** Context assembly is not authorization to execute. Synapse must validate module enablement and allowed execution type before a runtime worker can act.

**Consequence:** `pulse.context` creates `REQUESTED` execution records, then calls governance. Approved records transition to `QUEUED`; denied records are audited and the context job fails into the Pulse failure path.

**Status:** Implemented for module enablement and request-type allowlist.

**Risk:** Actor and usage-limit validation are still pending because current async jobs do not carry actor/governance metadata.

**Next recommended step:** propagate actor metadata into context/execution jobs and enforce usage limits before provider calls.

---

## 2026-05-09 — Pulse execution worker is a no-provider dispatcher

**Decision:** Activate `pulse.execution` as a lifecycle dispatcher that does not call any runtime/provider yet.

**Reason:** We need the queue boundary, lifecycle transitions, failure capture, and operational events before introducing provider side effects.

**Consequence:** Queued execution requests transition through `RUNNING` to `SUCCEEDED` with output that explicitly states no runtime provider is implemented.

**Status:** Implemented.

**Risk:** Consumers must not confuse the placeholder dispatch completion with actual AI execution output.

**Next recommended step:** create the provider handoff/result contract before connecting the external Go Runtime.

---

## 2026-05-09 — Timeline projection gets its own worker

**Decision:** Add `pulse.timeline` as a dedicated worker for operational event projection.

**Reason:** Operators need durable timeline/history records without depending on BullMQ job state. Projection should be replayable and isolated from execution/action side effects.

**Consequence:** New execution-dispatch lifecycle events are enqueued to `pulse.timeline`; the worker persists `PulseOperationalEvent` records and captures projection failures.

**Status:** Implemented for execution dispatch events.

**Risk:** Direct event writes still exist in older use cases, so the architecture is transitional.

**Next recommended step:** migrate direct writers selectively and add replay controls.

---

## 2026-05-09 — Actions worker starts as allowlisted preparation only

**Decision:** Activate `pulse.actions` with validation, allowlisting, timeline projection, and failure capture, but without applying real side effects.

**Reason:** Action execution is high-impact. The queue boundary and event trail should exist before mutations/integrations are connected.

**Consequence:** Allowed actions emit dispatched/completed preparation events; unsupported actions are skipped; failures are captured. No ticket, scheduling, or integration mutation is performed by this worker yet.

**Status:** Implemented.

**Risk:** Downstream consumers must not interpret `pulse.action.completed` as real business-side-effect completion until handlers are wired.

**Next recommended step:** introduce typed action handler interfaces and implement one internal ticket action.

---

## 2026-05-09 — First real action is internal ticket flow advancement

**Decision:** Implement `ticket.advance_flow` as the first typed action handler.

**Reason:** It is internal to Pulse, already has domain validation and audit/usage behavior in `TicketLifecycleUseCase`, and does not require external provider credentials.

**Consequence:** `pulse.actions` can now apply a real side effect for this action when actor metadata and tenant-scoped ticket id are present.

**Status:** Implemented.

**Risk:** Action enqueue paths must be governed because this action mutates ticket state.

**Next recommended step:** add permission snapshots and action creation governance before allowing runtime outputs to generate action jobs automatically.

---

## 2026-05-09 — Action jobs require governance before enqueue

**Decision:** Introduce `PulseActionGovernanceService` as the approved entrypoint for creating action jobs.

**Reason:** `pulse.actions` now has at least one real mutation. Queue publication must validate action rules and permission snapshots before work is accepted.

**Consequence:** `ticket.advance_flow` enqueue requires actor metadata and `tickets:write`. The lower-level queue publisher remains infrastructure, not the production action creation API.

**Status:** Implemented for `ticket.advance_flow`.

**Risk:** Direct queue publication remains possible inside code; reviews should reject bypasses for real actions.

**Next recommended step:** route runtime result parsing and future API-triggered actions through this service only.

---

## 2026-05-09 — Runtime outputs must be planned before action enqueue

**Decision:** Add a Pulse-owned runtime action planner before runtime output can create action jobs.

**Reason:** Future provider/runtime responses are untrusted operational suggestions. Pulse must validate output shape, allowed actions, confidence, supported state transitions, and actor permission snapshots before any side effect is queued.

**Consequence:** `ticket.advance_flow` can be planned from a validated runtime output only through `PulseActionGovernanceService`; malformed, low-confidence, unsupported, or unauthorized suggestions are rejected or skipped.

**Status:** Implemented as an internal service, not wired to provider execution.

**Risk:** The planner is currently not connected to real runtime result ingestion, so future integration must avoid bypassing it.

**Next recommended step:** connect execution-result ingestion to the planner and add DB-backed cross-tenant fixtures.

---

## 2026-05-09 — Runtime result ingestion is module-specific and signed later

**Decision:** Add an internal Pulse result-ingestion use case, but do not expose it as an unauthenticated runtime callback.

**Reason:** The module owns how normalized runtime output becomes operational actions, while Synapse owns execution persistence and lifecycle governance.

**Consequence:** Pulse loads the tenant-scoped execution request, reads its stored Context Pack, transitions lifecycle, publishes audit-safe timeline jobs, and plans actions only after successful results.

**Status:** Implemented as an internal use case.

**Risk:** External runtime integration still needs signed callbacks or trusted queue consumers before this path is production-safe.

**Next recommended step:** build the signed ingress adapter and service actor model.

---

## 2026-05-09 — Runtime callbacks use HMAC raw-body verification

**Decision:** Expose Pulse runtime result ingress as a public JWT-bypass route protected by HMAC signature validation.

**Reason:** External runtime services should not use tenant-user JWTs, but callback payloads must still be authenticated and tamper-evident.

**Consequence:** `/v1/pulse/runtime/results` requires raw body, runtime key id, timestamp, and signature headers before invoking module ingestion.

**Status:** Implemented for Pulse result ingress.

**Risk:** Shared secret key rotation, replay persistence, and server-side actor snapshot resolution are still pending.

**Next recommended step:** persist original actor/governance metadata on execution request creation and stop trusting callback-provided actor snapshots.

---

## 2026-05-09 — Runtime callbacks do not provide action actor authority

**Decision:** Runtime callbacks no longer submit actor authorization data for Pulse action planning.

**Reason:** The runtime is an execution service, not an authorization source. Actor identity and permission snapshots must be captured by Synapse before execution leaves the platform boundary.

**Consequence:** Pulse result ingestion loads actor metadata from the stored execution request. Missing or malformed snapshots reject successful action planning.

**Status:** Implemented.

**Risk:** Existing executions created before this snapshot rule cannot safely trigger automatic actions.

**Next recommended step:** add persisted fixtures and decide whether old executions should be requeued, completed without actions, or manually reviewed.

---

## 2026-05-09 — Runtime result fixtures run behind database test flag

**Decision:** Add Pulse runtime result ingestion fixtures under the existing `RUN_DATABASE_TESTS=1` gate.

**Reason:** Development currently uses a single local database, and destructive/fixture DB tests should remain opt-in.

**Consequence:** CI/dev can validate tenant persistence boundaries explicitly without slowing or mutating normal unit-test runs.

**Status:** Implemented.

**Risk:** Default test runs skip these persisted guarantees unless the flag is enabled.

**Next recommended step:** document/run a pre-release command that enables database fixtures.

---

## 2026-05-09 — Real Pulse actions revalidate permissions in the worker

**Decision:** Reuse Pulse action governance rules inside `PulseActionsProcessor` before invoking real action handlers.

**Reason:** Enqueue-time governance protects approved paths, but worker-side validation protects against accidental raw queue publication or future orchestration mistakes.

**Consequence:** Mutating handlers such as `ticket.advance_flow` require a valid actor permission snapshot at execution time.

**Status:** Implemented for current real handler.

**Risk:** New handlers must be added to the shared rule table or they will be rejected before execution.

**Next recommended step:** move action handlers into a registry where rule declaration and handler binding stay together.

---

## 2026-05-09 — Action governance failures are terminal queue failures

**Decision:** Convert Pulse action worker RBAC/governance failures into BullMQ `UnrecoverableError`.

**Reason:** Missing permissions in a queued job will not be fixed by retrying the same payload.

**Consequence:** Permission-denied action jobs are projected to failed/timeline state once and are not retried like infrastructure failures.

**Status:** Implemented for `ForbiddenException` in `pulse.actions`.

**Risk:** Validation failures still need explicit classification as action DTOs mature.

**Next recommended step:** classify strict action DTO validation failures as non-retryable too.

---

## 2026-05-09 — Action payload validation failures are terminal

**Decision:** Treat strict Pulse action payload validation failures as non-retryable queue failures.

**Reason:** An invalid action payload will not become valid through retry and should not repeatedly reach side-effect code.

**Consequence:** `ticket.advance_flow` rejects malformed payloads before mutation and records `non_retryable_validation`.

**Status:** Implemented for `ticket.advance_flow`.

**Risk:** Validation is currently per-handler and should be centralized as more actions are added.

**Next recommended step:** introduce action handler registration metadata for payload schema.

---

## 2026-05-09 — Pulse action handlers resolve through a registry

**Decision:** Introduce a module-local registry for real Pulse action handlers.

**Reason:** The action processor should coordinate queue lifecycle and failure projection, not grow branches for every operational action.

**Consequence:** Handlers declare an action key and the processor asks the registry for the matching handler.

**Status:** Implemented for `ticket.advance_flow`.

**Risk:** Permissions/schema metadata still lives outside the registry.

**Next recommended step:** add metadata to registry entries.

---

## 2026-05-09 — Pulse action metadata is colocated with handlers

**Decision:** Put required permissions, validation failure class, and usage candidate on action handler definitions.

**Reason:** Enqueue governance, worker execution, runtime planning, and future billing should share one module-local definition for each real action.

**Consequence:** `ticket.advance_flow` metadata now drives permission checks at both enqueue and worker execution.

**Status:** Implemented for first real action.

**Risk:** Context Pack allowed actions still derive from older local logic.

**Next recommended step:** derive Context Pack action/output schema hints from registered action definitions.

---

## 2026-05-09 — Context Packs read action definitions

**Decision:** Let Pulse Context Pack assembly read registered action definitions for real side-effect actions.

**Reason:** Runtime should receive the same action vocabulary that governance and workers enforce.

**Consequence:** `recommendedActions` schema is constrained to the allowed action set assembled for that tenant/ticket context.

**Status:** Implemented for action enum derivation.

**Risk:** Full payload schema is still not generated from action definitions.

**Next recommended step:** add schema metadata to `PulseActionDefinition`.

---

## 2026-05-09 — Runtime output is validated before lifecycle success

**Decision:** Validate successful Pulse runtime outputs against the saved Context Pack `requiredOutputSchema` before transitioning the execution to success or planning actions.

**Reason:** A runtime callback can be signed and still contain malformed or over-broad output; governance must enforce the exact module-owned contract that was sent with the original request.

**Consequence:** Invalid output leaves the execution in its previous state and cannot enqueue side-effect actions or timeline projections.

**Status:** Implemented for the Pulse V1 output schema subset.

**Risk:** Nested/action-specific payload schemas are not yet generated from action definitions.

**Next recommended step:** attach output/action schema metadata to `PulseActionDefinition`.

---

## 2026-05-14 — Synapse owns commercial governance, modules own operations

**Decision:** Keep subscription, credit, quota, billing, tenant limit, module access, plan enforcement, RBAC, audit, and AppSec decisions in platform services.

**Reason:** Product modules must remain extractable operational layers and must not embed Synapse commercial policy.

**Consequence:** Pulse can own business hours, closure windows, workflow state, context, and operational events, but asks platform services for module/usage governance.

**Status:** Implemented for tenant creation limits, module tier checks, credit helper contracts, and Pulse operational schedule foundation.

**Risk:** Existing JWT/session shape still carries a role snapshot; membership-based session selection remains pending.

**Next recommended step:** finish membership CRUD and explicit workspace/session switching.

---

## 2026-05-14 — RLS remains hybrid until Prisma session strategy is validated

**Decision:** Do not blindly enable PostgreSQL RLS in this step.

**Reason:** Current Prisma queries already rely on app-level tenant filters, and RLS requires a reliable per-transaction `app.current_tenant_id` strategy before activation.

**Consequence:** Tenant isolation remains enforced in guards/repositories with tenant indexes; RLS is documented as a complement, not a replacement.

**Status:** Hybrid strategy retained.

**Risk:** Database superuser/service-role access still requires operational controls.

**Next recommended step:** add a scoped RLS spike/fixture for one low-risk tenant table.

---

## 2026-05-14 — Workspace selection issues tenant-scoped sessions

**Decision:** Add an explicit workspace selection endpoint that validates membership before issuing a tenant-scoped session cookie.

**Reason:** Users can own or belong to multiple workspaces, and registration may produce tenantless users.

**Consequence:** Frontend can authenticate once, read available memberships, then choose a workspace without assuming automatic tenant creation.

**Status:** Implemented through `POST /v1/auth/workspace`.

**Risk:** Route permission checks still consume the role snapshot in the selected JWT.

**Next recommended step:** make `PermissionsGuard` resolve permissions from live membership data with cache.

---

## 2026-05-14 — Permissions resolve from live membership data

**Decision:** Route permission checks resolve tenant permissions from `UserMembership` via `PermissionResolverService`.

**Reason:** Membership is the source of truth for tenant authorization; JWT role snapshots can become stale after role updates.

**Consequence:** Redis is used as a short-lived authorization hotpath, but Prisma remains the source of truth and membership mutations invalidate the affected cache key.

**Status:** Implemented for tenant route permissions.

**Risk:** Role definitions are still enum-backed and not yet persisted/configurable.

**Next recommended step:** add persistent role/permission management models and fixtures for stale-session permission changes.

---

## 2026-05-14 — Authorization DB fixtures are opt-in

**Decision:** Keep permission resolver database fixtures behind `RUN_DATABASE_TESTS=1`.

**Reason:** They need a real Postgres database with current migrations, while the default unit suite should remain fast and local.

**Consequence:** Normal tests compile the fixture but skip execution; database-enabled runs can validate stale-session and cross-tenant behavior.

**Status:** Implemented.

**Risk:** Fixture value depends on running it regularly in a database-enabled lane.

**Next recommended step:** add a DB fixture CI job once infrastructure is ready.

---

## 2026-05-14 — Runtime actor snapshots must be revalidated before actions

**Decision:** Treat saved actor snapshots as historical attribution, not current authorization.

**Reason:** Runtime callbacks can arrive after membership permissions changed, so automatic side effects must use live authorization state.

**Consequence:** Pulse result ingestion revalidates the snapshot actor through `PermissionResolverService`; stale permissions cannot enqueue actions.

**Status:** Implemented for Pulse runtime result ingestion.

**Risk:** Successful runtime execution can produce a skipped action plan when authorization changed.

**Next recommended step:** add DB fixture coverage for runtime actor downgrade.

---

## 2026-05-14 — Membership creation consumes platform plan limits

**Decision:** Enforce `maxUsersPerTenant` in membership creation by calling platform billing/governance.

**Reason:** Memberships are tenant RBAC data, but user-count limits are commercial governance owned by Synapse platform.

**Consequence:** Membership creation blocks before persistence when the tenant's plan user quota is full.

**Status:** Implemented.

**Risk:** Enforcement is currently application-level.

**Next recommended step:** cache plan/quota reads through Redis with Postgres fallback.

---

## 2026-05-14 — Tenant plan limits use Redis as cache only

**Decision:** Cache resolved tenant plan limits in Redis with a short TTL and PostgreSQL fallback.

**Reason:** Membership/module/runtime hotpaths need plan/quota data without repeatedly joining billing account and plan tables.

**Consequence:** Redis accelerates reads but is never the source of truth. Billing plan/account mutations invalidate affected tenant cache keys best-effort.

**Status:** Implemented for `getTenantPlanLimits`.

**Risk:** Direct database edits bypass invalidation and rely on TTL expiry.

**Next recommended step:** add DB fixture coverage for invalidation and wire usage consumption boundaries.

---

## 2026-05-14 — Bill only completed real action side effects

**Decision:** Record operational workflow usage only after a registered Pulse action handler completes with `sideEffectsApplied: true`.

**Reason:** Prepared-only, skipped, failed, and validation-denied actions should not become billable workflow usage.

**Consequence:** `pulse.actions` calls platform `consumeUsageOrReject` for real workflow side effects and uses idempotency keys for retry safety.

**Status:** Implemented for `ticket.advance_flow`.

**Risk:** Credit cost is currently fixed at one workflow run per side-effect action.

**Next recommended step:** add configurable usage cost metadata to action definitions.

---

## 2026-05-14 — Idempotent usage retries bypass quota checks

**Decision:** When `consumeUsageOrReject` receives an idempotency key that already exists for the same tenant, return the existing usage event before checking remaining monthly credits.

**Reason:** A retry of the same completed operation must not fail because the first attempt legitimately consumed the remaining credit.

**Consequence:** Usage idempotency is tenant-scoped and retry-safe while first-time usage still enforces plan credit limits.

**Status:** Implemented with unit coverage and opt-in DB fixture coverage.

**Risk:** Concurrent first attempts still depend on database uniqueness/upsert semantics.

**Next recommended step:** add side-effect idempotency fixtures for Pulse action handlers.

---

## 2026-05-14 — Pulse action side effects use action idempotency keys

**Decision:** Persist consumed action idempotency keys in Pulse ticket metadata for `ticket.advance_flow`.

**Reason:** BullMQ retries can re-run the same action job; the operational side effect must not mutate the ticket or emit operational/audit/usage events again.

**Consequence:** Replayed action jobs return the current ticket state and avoid duplicate side effects.

**Status:** Implemented for `ticket.advance_flow`.

**Risk:** Metadata-based idempotency is not a substitute for a transaction-level action execution ledger under concurrent duplicate delivery.

**Next recommended step:** add a durable action execution ledger before introducing high-impact external action handlers.

---

## 2026-05-14 — Pulse action executions use a tenant-scoped ledger

**Decision:** Add `pulse_action_executions` with a unique `tenantId + idempotencyKey` constraint and explicit execution statuses.

**Reason:** Action retries and concurrent delivery need a durable guard outside mutable ticket metadata.

**Consequence:** `ticket.advance_flow` claims an action key before side effects, skips already-succeeded duplicates, and rejects in-progress duplicates for retry.

**Status:** Implemented with migration and repository coverage.

**Risk:** The claim and downstream ticket/event/audit/usage writes are not yet enclosed in a single transaction.

**Next recommended step:** introduce a transaction boundary for lifecycle action execution.

---

## 2026-05-14 — Action-driven Pulse lifecycle writes are transactional

**Decision:** Run `ticket.advance_flow` ledger claim, ticket mutation, operational event, audit event, usage event, and ledger completion inside one Prisma transaction.

**Reason:** Action retries and partial failures must not leave operational state, audit, usage, and execution status inconsistent.

**Consequence:** Duplicate completed action keys skip without writes; duplicate in-progress keys fail before mutation; successful action side effects commit together.

**Status:** Implemented for action-driven flow advancement.

**Risk:** This is implemented directly in the action-driven lifecycle path until repositories become transaction-aware.

**Next recommended step:** add transaction-aware repository contracts before more side-effect handlers are added.

---

## 2026-05-15 — Pulse action telemetry is log-based and audit-safe

**Decision:** Add structured logs for Pulse action/ledger outcomes using hashed idempotency keys and no raw payloads.

**Reason:** Operators need visibility into duplicate skips, in-progress conflicts, successes, and failures before a metrics backend exists.

**Consequence:** Action execution has observability today without introducing fake metrics infrastructure or leaking sensitive provider/customer payloads.

**Status:** Implemented.

**Risk:** Logs are not a durable product-facing action status API.

**Next recommended step:** add sanitized internal status DTOs only if operational troubleshooting requires them.

---

## 2026-05-15 — Prepare RLS policies before enabling enforcement

**Decision:** Create RLS helper functions and tenant-isolation policies now, and route tenant-scoped DB work through a transaction helper that sets `app.current_tenant_id`; do not enable table-level RLS until repositories use that helper consistently.

**Reason:** Enabling RLS without session tenant context would either break legitimate application queries or require unsafe permissive policies.

**Consequence:** App-level tenant filtering remains mandatory while repositories are migrated to the transaction helper and the database is ready for progressive RLS activation.

**Status:** Implemented foundation migration and Prisma tenant context runner.

**Risk:** There is no database-enforced tenant isolation until RLS is enabled table-by-table.

**Next recommended step:** migrate Pulse repositories to the tenant transaction runner and add DB fixtures that prove RLS rejection.

---

## 2026-05-15 — Add indexes only for real tenant hotpaths

**Decision:** Add compound indexes for known authorization, usage aggregation, Pulse queue/ticket/timeline, integration, and runtime execution access patterns.

**Reason:** Production performance should improve common tenant-scoped reads/writes without random index sprawl.

**Consequence:** Write overhead increases slightly, but high-frequency multitenant queries gain targeted indexes.

**Status:** Implemented.

**Risk:** Query plans still need validation with production-like cardinality.

**Next recommended step:** run `EXPLAIN ANALYZE` fixtures once dev DB is available with seeded volume.

---

## 2026-05-15 — Split Pulse into its own PostgreSQL schema

**Decision:** Move Pulse operational persistence from naming-only separation to the `pulse` PostgreSQL schema using Prisma `multiSchema`.

**Reason:** Keeping all module tables in the Synapse/platform schema will become operationally hard to govern as modules grow. Pulse needs extractable-first ownership of operational data while Synapse remains the controlling governance layer.

**Consequence:** Synapse-owned data remains in `public`; Pulse-owned tables/enums live in `pulse`; cross-schema relationships to `public.Tenant` preserve central tenant governance.

**Status:** Implemented schema mapping and migration.

**Risk:** Live migration must be rehearsed because moving tables/types changes physical qualification.

**Next recommended step:** run migrations on a disposable database and add DB fixtures proving cross-schema tenant isolation.

---

## 2026-05-15 — Route Pulse repositories through tenant DB context

**Decision:** Use `PrismaService.withTenantContext()` for Pulse operational repository reads/writes before enabling RLS.

**Reason:** `pulse.*` physical isolation is not authorization. RLS needs `app.current_tenant_id` set inside the same transaction that reads or mutates module data.

**Consequence:** Pulse repository methods now run inside tenant-scoped transactions; Synapse still performs governance/RBAC before module operations.

**Status:** Implemented for current Pulse repositories and action-driven lifecycle transaction.

**Risk:** RLS remains inactive until DB fixtures prove behavior against a live PostgreSQL database.

**Next recommended step:** enable RLS on one disposable Pulse table and prove cross-tenant rejection.

---

## 2026-05-15 — Enable RLS for Pulse schema after tenant context migration

**Decision:** Enable and force RLS on current `pulse.*` operational tables.

**Reason:** Pulse now has physical schema ownership and repository paths set tenant session context, so the database can enforce tenant isolation as a defense-in-depth layer.

**Consequence:** Direct table access without `app.current_tenant_id` returns no tenant rows, and mismatched tenant writes are rejected by policy.

**Status:** Migration and opt-in database fixture added.

**Risk:** Disposable DB rehearsal is still required before shared environment rollout.

**Next recommended step:** run `RUN_DATABASE_TESTS=1 npm test -- pulse-rls.database-fixtures` after applying migrations.
