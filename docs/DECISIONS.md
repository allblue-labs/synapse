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
