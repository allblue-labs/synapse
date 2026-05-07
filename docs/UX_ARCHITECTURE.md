# UX Architecture

Last updated: 2026-05-07

This document records backend-facing UX contracts only. Frontend visual architecture, pages, components, and interactions are owned outside this backend workstream.

## Backend Contracts

- Pulse backend route prefix: `/v1/pulse`.
- Pulse queue routes: `GET /queue`, `GET /queue/:id`, `POST /entries`, `POST /queue/:id/validate`, `POST /queue/:id/reject`, `POST /queue/:id/retry`, `GET /errors`.
- Required permissions: `pulse:read`, `pulse:write`, `pulse:validate`, `pulse:reject`, `pulse:retry`.
- Module registry slug/display: `pulse` / `Synapse Pulse`.

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
