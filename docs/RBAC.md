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
