# RBAC

Last updated: 2026-05-07

Synapse uses action-shaped permissions as the shared contract between backend route protection and frontend gating. Backend enforcement is authoritative.

## Current State

- Roles: `OWNER`, `ADMIN`, `OPERATOR`, `VIEWER`.
- Permission catalogue lives in `packages/contracts/src/index.ts`.
- Backend routes declare permissions with `@Permissions(...)`.
- Global guard order is throttling, JWT, tenant guard, then permissions guard.
- Pulse permissions are `pulse:read`, `pulse:write`, `pulse:validate`, `pulse:reject`, and `pulse:retry`.

## 2026-05-07 Backend Update

- Changed: retired old module permissions from active contracts and routes; Pulse now uses `pulse:*`.
- Completed: Pulse controller permissions are granular and do not hardcode roles.
- Pending: route-level tests for allowed/forbidden role matrices and module registry/billing permissions.
- Risks: frontend UI gating may lag backend permission names; backend remains source of truth.
- Next recommended step: add e2e tests for Pulse endpoints per role.

## 2026-05-07 Naming Update

- Changed: permission contract is Pulse-only for the first product module.
- Completed: role permission matrix includes `pulse:read`, `pulse:write`, `pulse:validate`, `pulse:reject`, and `pulse:retry`.
- Pending: generated contracts must be consumed by clients after rebuild.
- Risks: stale built contract artifacts can cause compile-time or runtime mismatch.
- Next recommended step: rebuild `@synapse/contracts` before API or frontend integration.

## 2026-05-07 RBAC + Route Protection Update

- Changed: added tests for `PermissionsGuard` and Pulse controller permission metadata.
- Completed: `OPERATOR` is verified for Pulse operational actions; `VIEWER` is verified read-only for Pulse mutation attempts.
- Pending: `OWNER` and `ADMIN` HTTP e2e matrix coverage.
- Risks: role matrix changes in `@synapse/contracts` can affect frontend gating and backend authorization simultaneously.
- Next recommended step: add a compact role-permission matrix spec for every Pulse endpoint.

## 2026-05-07 Pulse Tenant Isolation Test Update

- Changed: no RBAC behavior changed; persistence tenant-boundary tests were added under Pulse.
- Completed: RBAC tests and repository tenant-scope tests now cover both route metadata and persistence query shape.
- Pending: HTTP e2e tests must combine auth, tenant guard, permissions, and repository behavior.
- Risks: testing layers separately can miss integration mistakes.
- Next recommended step: add Pulse e2e tests once test database fixtures are available.

## 2026-05-07 Module Registry Store Update

- Changed: module registry enable/disable remains protected by `modules:enable` and `modules:disable`, now with persisted effects.
- Completed: service-level tests cover module store behavior; route permissions were already protected by the global guard contract.
- Completed: RBAC-protected tenant operations cannot activate non-public catalog records through the current service path.
- Pending: e2e tests must verify only roles with module permissions can mutate tenant installation state.
- Risks: durable state raises the impact of a missed authorization regression.
- Next recommended step: add module registry endpoint e2e tests after test database fixtures are ready.

## 2026-05-07 Billing Core Update

- Changed: added billing controller metadata for `billing:read` and `billing:manage`.
- Completed: billing feature flag mutation is restricted to `billing:manage`; billing account/plans read paths use `billing:read`.
- Pending: role matrix e2e tests for billing endpoints.
- Risks: `OWNER` has billing management; `ADMIN` intentionally does not.
- Next recommended step: add HTTP e2e tests for OWNER/ADMIN/OPERATOR/VIEWER on billing routes.

## 2026-05-07 Operational Usage Metering Update

- Changed: usage summary reads are protected with `billing:read`.
- Completed: usage write APIs are not exposed to clients; only backend services record events.
- Pending: role matrix e2e tests for `GET /v1/usage/summary`.
- Risks: usage summary can reveal operational volume and should remain billing-protected.
- Next recommended step: include usage summary in billing route e2e coverage.

## 2026-05-07 Usage Rating Update

- Changed: `GET /v1/usage/rated-summary` uses `billing:read`; usage rate list/set uses `billing:manage`.
- Completed: usage controller metadata tests cover the new routes.
- Pending: OWNER/ADMIN/OPERATOR/VIEWER e2e matrix for usage rating endpoints.
- Risks: rated summaries expose financial amounts and should stay billing-protected.
- Next recommended step: include usage rating routes in billing e2e coverage.

## 2026-05-07 Stripe Usage Reporting Update

- Changed: Stripe meter mapping and report-trigger routes require `billing:manage`.
- Completed: usage controller metadata tests cover Stripe reporting routes.
- Pending: e2e tests for billing route role matrix.
- Risks: Stripe reporting is a financial write and must stay OWNER-only under the current permission matrix.
- Next recommended step: include Stripe reporting endpoints in OWNER/ADMIN/OPERATOR/VIEWER e2e tests.

## 2026-05-07 Stripe Webhook Reconciliation Update

- Changed: Stripe webhook route is marked `@Public()` because Stripe cannot present Synapse JWT or tenant context.
- Completed: billing controller tests assert the webhook bypasses session/tenant guards while all human billing routes remain permission-protected.
- Pending: e2e tests proving public access is limited to signed Stripe payloads and does not expose tenant billing reads/writes.
- Risks: public route metadata must not be copied to billing admin endpoints.
- Next recommended step: add HTTP e2e coverage for billing routes and signed/unsigned webhook attempts.

## 2026-05-07 Stripe Checkout Provisioning Update

- Changed: `POST /v1/billing/checkout/subscription` requires `billing:manage`.
- Completed: controller metadata tests cover checkout route protection; backend service receives tenant and actor from guards/decorators.
- Pending: OWNER/ADMIN/OPERATOR/VIEWER e2e matrix for checkout creation.
- Risks: checkout creation is a financial write and remains OWNER-only under the current permission matrix.
- Next recommended step: include checkout creation in billing route e2e coverage.

## 2026-05-07 Stripe Portal + Redirect Allowlist Update

- Changed: `POST /v1/billing/portal/session` requires `billing:manage`.
- Completed: controller metadata tests cover portal route protection.
- Pending: OWNER/ADMIN/OPERATOR/VIEWER e2e matrix for portal creation.
- Risks: customer portal allows billing self-service actions, so access must remain billing-management only.
- Next recommended step: include portal creation in billing route e2e coverage.
