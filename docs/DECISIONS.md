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
