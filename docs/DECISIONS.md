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

## 2026-05-05 — ClinicFlow as a feature inside Messaging module

**Decision:** ClinicFlow lives at `product-modules/messaging/clinic-flow/`. Its routes are `/v1/clinic-flow/...`. The `ClinicFlowModule` is imported by `MessagingModule`.

**Reason:** ClinicFlow is a vertical feature within messaging, not a standalone core module. Keeping it inside Messaging ensures it uses shared channel infrastructure and respects the core/modules boundary.
