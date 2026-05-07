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
