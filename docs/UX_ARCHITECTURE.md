# UX Architecture

Last updated: 2026-05-07

This document records backend-facing UX contracts only. Frontend visual architecture, pages, components, and interactions are owned outside this backend workstream.

## Backend Contracts

- Pulse backend route prefix: `/v1/pulse`.
- Pulse queue routes: `GET /queue`, `GET /queue/:id`, `POST /entries`, `POST /queue/:id/validate`, `POST /queue/:id/reject`, `POST /queue/:id/retry`, `GET /errors`.
- Required permissions: `pulse:read`, `pulse:write`, `pulse:validate`, `pulse:reject`, `pulse:retry`.
- Module registry slug/display: `pulse` / `Synapse Pulse`.
- Stripe webhook callback: `POST /v1/billing/stripe/webhook` is provider-facing only and has no frontend UX contract.
- Subscription checkout contract: `POST /v1/billing/checkout/subscription` accepts `planKey`, `successUrl`, and `cancelUrl`; returns a Stripe Checkout Session id and URL.
- Customer portal contract: `POST /v1/billing/portal/session` accepts `returnUrl`; returns a Stripe Billing Portal Session id and URL.

## 2026-05-07 Backend Update

- Changed: backend contracts moved from the retired product naming to Pulse.
- Completed: backend route, permission, queue, registry, and Prisma names now align to Pulse.
- Pending: frontend owner must align routes and API client usage to these contracts.
- Risks: old frontend paths may still point to the previous module hierarchy and should be treated as pending integration work.
- Next recommended step: publish or generate OpenAPI/DTO contracts for Pulse before frontend integration.

## 2026-05-07 Naming Update

- Changed: user-facing module contract name is Synapse Pulse.
- Completed: backend route prefix is `/v1/pulse`; registry slug is `pulse`.
- Pending: frontend routing and labels remain outside backend ownership.
- Risks: frontend may show stale names until Claude Opus updates the app.
- Next recommended step: hand off `/v1/pulse` route and `pulse:*` permission requirements to frontend integration.

## 2026-05-07 RBAC + Route Protection Update

- Changed: backend contract tests now lock the Pulse route prefix and required permission metadata.
- Completed: frontend integration can rely on `/v1/pulse` and `pulse:*` as the current backend contract.
- Pending: no frontend UX work was performed by backend.
- Risks: API shape still lacks generated OpenAPI documentation.
- Next recommended step: generate or document Pulse DTO schemas before frontend integration.

## 2026-05-07 Pulse Tenant Isolation Test Update

- Changed: no frontend UX behavior changed; backend persistence contract is safer.
- Completed: Pulse API consumers can rely on tenant-scoped repository behavior behind `/v1/pulse`.
- Pending: generated API schemas are still needed for frontend integration.
- Risks: frontend cannot infer tenant-isolation behavior from route shape alone.
- Next recommended step: document Pulse DTO response shapes in backend API contracts.

## 2026-05-07 Module Registry Store Update

- Changed: `GET /v1/modules` now returns tenant-specific `enabled` state from persisted installation records.
- Completed: backend module registry contract remains slug-based and now durable.
- Completed: module listing is tenant-specific and limited to public catalog modules.
- Pending: frontend owner must decide how to present module installed/enabled state; backend did not change frontend UX.
- Risks: clients should not assume module catalog availability means commercial entitlement.
- Next recommended step: document module registry response examples for frontend integration.

## 2026-05-07 Billing Core Update

- Changed: backend now exposes `GET /v1/billing/account`, `GET /v1/billing/plans`, and `POST /v1/billing/feature-flags/:key`.
- Completed: frontend contracts can read plan commercial activation state and billing account data; backend did not implement frontend UX.
- Pending: DTO/OpenAPI documentation and frontend-owner integration.
- Risks: billing plan visibility does not imply checkout or Stripe lifecycle readiness.
- Next recommended step: document billing API response examples before frontend integration.

## 2026-05-07 Operational Usage Metering Update

- Changed: backend exposes `GET /v1/usage/summary?billingPeriod=YYYY-MM` for tenant usage summaries.
- Completed: response shape is metric type, unit, quantity, and event count.
- Pending: frontend-owner integration and richer billing-period/invoice views.
- Risks: usage summaries are raw operational quantities, not rated prices.
- Next recommended step: document usage summary examples alongside billing API contracts.

## 2026-05-07 Usage Rating Update

- Changed: backend exposes `GET /v1/usage/rated-summary`, `GET /v1/usage/rates`, and `POST /v1/usage/rates`.
- Completed: rated summary response includes total amount cents and per-line rated/unrated status.
- Pending: frontend-owner integration and admin rate management UX.
- Risks: rated summaries are local estimates until Stripe reporting/reconciliation lands.
- Next recommended step: document rated usage response examples for frontend integration.

## 2026-05-07 Stripe Usage Reporting Update

- Changed: backend exposes `GET /v1/usage/stripe-meters`, `POST /v1/usage/stripe-meters`, and `POST /v1/usage/stripe-report`.
- Completed: frontend/admin consumers can inspect meter mappings and trigger reporting through backend contracts; no frontend UI was changed.
- Pending: admin workflow design, webhook reconciliation views, and Stripe customer portal integration.
- Risks: report statuses are operational billing state and should be shown carefully once frontend work begins.
- Next recommended step: document Stripe reporting response examples for admin integration.

## 2026-05-07 Stripe Webhook Reconciliation Update

- Changed: added a provider-facing Stripe webhook endpoint; no frontend pages, components, or interactions were changed.
- Completed: backend can reconcile subscription and invoice state for future billing/account UX surfaces.
- Pending: frontend-owner decisions for how to display billing status, webhook failures, checkout, and customer portal links after backend contracts exist.
- Risks: webhook event ledger details are operational/admin data and should not be exposed to tenant users without a reviewed contract.
- Next recommended step: document billing account status response examples after checkout/customer provisioning is implemented.

## 2026-05-07 Stripe Checkout Provisioning Update

- Changed: added a backend checkout creation contract; no frontend pages, components, or interactions were changed.
- Completed: frontend integration can request a subscription Checkout Session URL for a commercially active plan once price ids are configured.
- Pending: frontend-owner integration, customer portal contract, redirect URL allowlisting, and billing status display contracts.
- Risks: checkout redirects are external navigation and should be integrated deliberately by the frontend owner.
- Next recommended step: document customer portal contract after backend implementation.

## 2026-05-07 Stripe Portal + Redirect Allowlist Update

- Changed: added backend customer portal session contract and redirect-origin allowlist requirements.
- Completed: frontend integration can request a portal URL for tenants with Stripe customer ids; no frontend UX was changed.
- Pending: frontend-owner integration and success/cancel/return URL coordination per environment.
- Risks: frontend-provided redirect URLs must use configured allowed origins.
- Next recommended step: document checkout-session retrieval contract after backend implementation.

## 2026-05-07 Stage 1 Backend Refinement + Pulse Foundation Update

- Changed: backend contracts now include Pulse operational concepts for channels, conversations, tickets, operational events, scheduling providers, and runtime execution lifecycle.
- Completed: no frontend pages/components/interactions were changed.
- Pending: frontend-owner integration decisions for Pulse operational screens and ticket/timeline views.
- Risks: new entities are backend foundation only until DTO/API examples are published.
- Next recommended step: publish Pulse operational API DTO examples after use cases/controllers are added.

## 2026-05-07 Pulse Operational Lifecycle Wiring Update

- Changed: backend now creates ticket/timeline data that future frontend Pulse views can consume.
- Completed: no frontend files were changed.
- Pending: ticket/timeline read API contracts and frontend-owner integration.
- Risks: frontend should not consume internal repository shapes; public DTOs are still pending.
- Next recommended step: publish Pulse ticket and event read DTOs after backend routes are implemented.

## 2026-05-07 Pulse Channel + Conversation Ingestion Update

- Changed: entry creation backend contract now optionally accepts provider/channel/participant fields for operational conversation resolution.
- Completed: no frontend files were changed.
- Pending: frontend-owner integration and public response DTO examples for channel/conversation/timeline views.
- Risks: frontend should prefer provider/channel context over direct `conversationId` once new contracts are documented.
- Next recommended step: document create-entry examples after read APIs are added.

## 2026-05-07 Pulse Direct Conversation Validation Update

- Changed: direct `conversationId` remains accepted but now fails if it is not tenant-owned.
- Completed: no frontend files were changed.
- Pending: documented provider-context ingestion examples for frontend/provider integrations.
- Risks: stale direct ids will produce not-found errors.
- Next recommended step: publish read DTOs and examples for Pulse conversations.

## 2026-05-07 Pulse Channel + Conversation Read API Update

- Changed: backend exposes initial read contracts for Pulse channels and conversations.
- Completed: no frontend files were changed; routes are available for frontend-owner integration later.
- Pending: response examples, pagination, ticket/timeline APIs, and frontend integration.
- Risks: current shapes are minimal operational records, not final UI view models.
- Next recommended step: document Pulse ticket/timeline contracts after backend routes are added.

## 2026-05-07 Pulse Ticket + Timeline Read API Update

- Changed: backend exposes initial read contracts for Pulse tickets and timelines.
- Completed: no frontend files were changed.
- Pending: response examples, pagination/filtering, and frontend-owner integration.
- Risks: these are backend operational records, not final UX-composed view models.
- Next recommended step: document paginated DTOs once pagination lands.

## 2026-05-07 Pulse Read Pagination Update

- Changed: Pulse read responses now include pagination metadata.
- Completed: no frontend files were changed.
- Pending: frontend-owner integration and response examples.
- Risks: UX should use pagination metadata instead of assuming all records are returned.
- Next recommended step: document example responses after filters are added.

## 2026-05-07 Pulse Read Filtering Update

- Changed: backend read contracts now include operational filters for future frontend views.
- Completed: no frontend files were changed.
- Pending: response examples and frontend-owner integration.
- Risks: frontend should treat filter values as contract enums where applicable.
- Next recommended step: publish API examples after e2e tests land.

## 2026-05-07 Pulse Read Contract Test Update

- Changed: backend tests now protect the read-filter query contract before frontend integration.
- Completed: valid and invalid filter values are covered in DTO tests; controller tests verify filtered read calls keep tenant context server-owned.
- Pending: generated API examples/OpenAPI and frontend-owned integration.
- Risks: examples still need to document enum values exactly as backend contracts expose them.
- Next recommended step: publish API examples after HTTP e2e tests land.

## 2026-05-07 Pulse HTTP Read E2E Harness Update

- Changed: backend route behavior for Pulse read filters is now verified over HTTP.
- Completed: no frontend files were changed; HTTP tests prove query values are transformed/rejected as backend contracts define.
- Pending: generated API examples/OpenAPI for Claude Opus frontend integration.
- Risks: frontend should wait for documented response examples before building rich operational screens.
- Next recommended step: publish backend API examples after database-backed e2e fixtures or mutation contracts land.
