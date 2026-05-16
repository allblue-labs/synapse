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

## 2026-05-07 Stage 1 Backend Refinement + Pulse Foundation Update

- Changed: permission catalog now prepares granular permissions for modules, tickets, integrations, audit reads, and runtime execution governance.
- Completed: existing tenant roles remain supported while contracts document future platform/tenant role names; forbidden permission denials are audited.
- Pending: deliberate database/JWT role migration from current enum names to platform/tenant role names.
- Risks: changing persisted role names without a migration plan would break existing memberships and JWT assumptions.
- Next recommended step: create a role migration plan and e2e matrix before changing Prisma `UserRole` values.

## 2026-05-07 Pulse Operational Lifecycle Wiring Update

- Changed: existing Pulse route permissions now guard durable operational ticket/event side effects.
- Completed: validation side effects remain behind `pulse:validate`; create side effects remain behind `pulse:write`; reject/retry side effects remain behind their existing permissions.
- Pending: dedicated ticket read/write APIs must use `tickets:*` permissions when exposed.
- Risks: adding ticket APIs under `pulse:*` would weaken the permission model.
- Next recommended step: use `tickets:read`, `tickets:write`, `tickets:assign`, and `tickets:resolve` on upcoming ticket routes.

## 2026-05-07 Pulse Channel + Conversation Ingestion Update

- Changed: channel/conversation resolution currently runs behind `pulse:write` through entry creation.
- Completed: no new public route permissions were added.
- Pending: future channel/conversation read routes should use `pulse:read`; configuration routes should use integration/module management permissions.
- Risks: provider/channel setup should not be granted to broad operator roles without review.
- Next recommended step: define route metadata before exposing channel management APIs.

## 2026-05-07 Pulse Direct Conversation Validation Update

- Changed: no RBAC surface changed; tenant validation was hardened inside the `pulse:write` path.
- Completed: direct conversation ids now require tenant ownership.
- Pending: e2e role matrix for create-entry ingestion.
- Risks: route permission tests do not prove persisted cross-tenant rejection.
- Next recommended step: add e2e tests combining role and tenant rejection.

## 2026-05-07 Pulse Channel + Conversation Read API Update

- Changed: channel/conversation read routes use `pulse:read`.
- Completed: controller metadata tests cover the new methods.
- Pending: e2e role matrix for channel/conversation reads.
- Risks: channel management mutations must not reuse `pulse:read`.
- Next recommended step: use `integrations:manage` or a dedicated permission for future channel configuration writes.

## 2026-05-07 Pulse Ticket + Timeline Read API Update

- Changed: ticket list/detail/timeline routes require `tickets:read`; conversation timeline requires `pulse:read`.
- Completed: controller metadata tests cover the new routes.
- Pending: e2e OWNER/ADMIN/OPERATOR/VIEWER role matrix for ticket reads.
- Risks: ticket mutation permissions must remain more granular than ticket reads.
- Next recommended step: define `tickets:assign` and `tickets:resolve` route behavior before mutation endpoints.

## 2026-05-07 Pulse Read Pagination Update

- Changed: no permission surface changed; existing read permissions now cover paginated responses.
- Completed: validation applies before repository reads.
- Pending: e2e role tests for paginated reads.
- Risks: filters added later must not create alternate unprotected routes.
- Next recommended step: keep all read filter variants on the existing protected endpoints.

## 2026-05-07 Pulse Read Filtering Update

- Changed: no permission surface changed; filters are applied on existing protected routes.
- Completed: channel/conversation filters remain under `pulse:read`; ticket filters remain under `tickets:read`.
- Pending: e2e role tests with filtered reads.
- Risks: future admin-only filters should not be added to tenant-user routes without review.
- Next recommended step: add role-matrix e2e coverage for filtered reads.

## 2026-05-07 Pulse Read Contract Test Update

- Changed: expanded Pulse controller tests around filtered read routes while preserving existing permission metadata checks.
- Completed: filter forwarding tests cover `pulse:read` channel/conversation/timeline paths and `tickets:read` ticket/timeline paths.
- Pending: HTTP role-matrix tests for OWNER/ADMIN/OPERATOR/VIEWER.
- Risks: metadata tests do not execute guards; guard execution still needs e2e coverage.
- Next recommended step: add role-matrix e2e coverage for filtered Pulse reads.

## 2026-05-07 Pulse HTTP Read E2E Harness Update

- Changed: filtered read routes now have HTTP-level permission guard coverage.
- Completed: forbidden ticket reads are rejected and audited through the real `PermissionsGuard`.
- Pending: complete OWNER/ADMIN/OPERATOR/VIEWER matrix for every filtered read route.
- Risks: the current forbidden case uses an invalid role to prove guard failure; role matrix behavior still needs explicit cases.
- Next recommended step: add role-matrix HTTP tests for Pulse reads.

## 2026-05-08 Pulse Ticket Lifecycle Mutation Update

- Changed: lifecycle routes use granular ticket permissions.
- Completed: assignment/escalation use `tickets:assign`; resolution uses `tickets:resolve`; reopen/cancel/operator-review/flow-advance use `tickets:write`.
- Pending: OWNER/ADMIN/OPERATOR/VIEWER HTTP role matrix for lifecycle commands.
- Risks: future lifecycle commands must not fall back to broad `pulse:write`.
- Next recommended step: add lifecycle role-matrix HTTP tests.

## 2026-05-08 Pulse Event Catalog + Timeline Aggregation Update

- Changed: consolidated timelines reuse existing read permissions.
- Completed: conversation timelines use `pulse:read`; ticket timelines use `tickets:read`.
- Pending: role-matrix HTTP tests for timeline category filters.
- Risks: future admin-only timeline categories should not appear on tenant-user routes without permission review.
- Next recommended step: include timeline routes in the lifecycle role-matrix suite.

## 2026-05-08 Pulse Guided Flow State Machine Update

- Changed: flow advancement remains protected by `tickets:write`.
- Completed: no broad `pulse:write` permission was introduced for state-machine movement.
- Pending: OWNER/ADMIN/OPERATOR/VIEWER matrix tests for flow advancement.
- Risks: future automated/runtime transitions will need a distinct service permission model.
- Next recommended step: define service-actor permission boundaries before runtime-driven flow transitions.

## 2026-05-08 Pulse Confidence + Human Review Layer Update

- Changed: confidence-triggered review/escalation uses the existing `tickets:write` flow advancement path.
- Completed: no new broad permission was introduced.
- Pending: role-matrix tests for low-confidence flow advancement and operator review submission.
- Risks: future runtime/service actors need separate permission boundaries from human operators.
- Next recommended step: define service actor RBAC before external runtime writes flow transitions.

## 2026-05-08 Pulse Knowledge Context Foundation Update

- Changed: knowledge context uses existing Pulse permissions.
- Completed: list/get/query use `pulse:read`; publish/archive use `pulse:write`.
- Pending: decide whether knowledge management needs a dedicated permission before broader admin UX.
- Risks: broad `pulse:write` may be too permissive for tenant knowledge governance later.
- Next recommended step: evaluate `knowledge:manage` or `pulse:knowledge:manage` before frontend management surfaces ship.

## 2026-05-08 Pulse Scheduling Integration Contracts Update

- Changed: scheduling integration routes use integration-specific permissions.
- Completed: scheduling integration list/get and availability prepare use `integrations:read`; booking prepare uses `integrations:manage`.
- Pending: role-matrix tests for scheduling routes.
- Risks: actual booking execution may need a narrower permission than `integrations:manage`.
- Next recommended step: define booking execution permission before provider adapters.

## 2026-05-08 Pulse Usage Metering Foundation Update

- Changed: usage writes are side effects of already protected Pulse routes/use cases.
- Completed: no new public usage-write route was introduced.
- Pending: role-matrix tests proving lower-privilege users cannot trigger protected metered operations they should not access.
- Risks: future service actors need explicit permission boundaries for metered runtime writes.
- Next recommended step: include usage effects in lifecycle/scheduling role-matrix tests.

## 2026-05-08 Runtime Execution Lifecycle Contract Update

- Changed: runtime execution lifecycle APIs use runtime permissions.
- Completed: request/transition use `runtime:executions:create`; read uses `runtime:executions:read`.
- Pending: service-only transition permission and role-matrix HTTP tests.
- Risks: human-created transitions are not a final production authorization model.
- Next recommended step: introduce service actor permissions before runtime callbacks.

## 2026-05-08 Runtime AppSec Hardening Update

- Changed: runtime transition now has a dedicated permission instead of sharing create.
- Completed: request uses `runtime:executions:create`; read uses `runtime:executions:read`; transition uses `runtime:executions:transition`; cancel uses `runtime:executions:cancel`.
- Pending: service-only transition/callback permission design and OWNER/ADMIN/OPERATOR/VIEWER HTTP matrix tests.
- Risks: OWNER/ADMIN permission inheritance still allows human transition while service actors are pending.
- Next recommended step: introduce runtime service actor permissions and verify forbidden audit behavior.

## 2026-05-08 Database Fixture Foundation Update

- Changed: no RBAC matrix changed in this fixture slice.
- Completed: database fixtures validate server-side tenant ownership after permission gates would allow a command.
- Pending: HTTP role-matrix fixtures for runtime request/read/transition/cancel and Pulse ticket commands.
- Risks: database fixtures do not replace route-level forbidden tests.
- Next recommended step: add HTTP role-matrix tests with forbidden audit assertions.

## 2026-05-08 Platform Runtime Client Signer Update

- Changed: no human-facing RBAC permissions changed.
- Completed: runtime client request mapping carries backend-derived actor and permission context for the isolated runtime.
- Pending: service-actor permissions for automated submission/callback transitions.
- Risks: runtime callback authorization must not reuse broad human permissions.
- Next recommended step: define dedicated service actor permission boundaries for runtime submission and callbacks.

## 2026-05-08 Frontend Contract Pack Update

- Changed: frontend permission gates are documented as backend contracts.
- Completed: mapped Pulse, tickets, integrations, modules, billing, usage, and runtime permissions to expected UI affordances.
- Pending: HTTP role-matrix examples and generated permission metadata.
- Risks: UI permission gates are advisory; backend remains final authority.
- Next recommended step: frontend should hide/disable actions by permission and always handle `403`.

## 2026-05-08 Admin Bootstrap Billing Plan Fix

- Changed: no RBAC contract changed.
- Completed: superseded by platform-admin bootstrap; first-admin no longer assigns `OWNER`.
- Pending: smoke test proving bootstrap creates or upgrades a tenantless platform admin.
- Risks: admin credentials remain env-driven and must not be logged.
- Next recommended step: add bootstrap verification to operational runbooks.

## 2026-05-08 Platform Admin Bootstrap Foundation

- Changed: `admin:create` no longer assigns tenant `OWNER`; RBAC now accepts both tenant roles (`OWNER`, `ADMIN`, `OPERATOR`, `VIEWER`) and canonical Synapse roles (`platform_admin`, `tenant_owner`, `tenant_admin`, `tenant_operator`, `tenant_viewer`).
- Completed: `platform_admin` maps to all current backend permissions; guards evaluate permissions through the shared contract without hardcoded controller role checks.
- Pending: platform user-management role matrix and possible platform-only permissions for admin/tester/customer lifecycle APIs.
- Risks: older runbooks may still describe first admin as tenant owner; `platform_admin` is broad by design and must stay protected by audit and secure bootstrap.
- Next recommended step: add HTTP role-matrix tests for platform admin versus tenant roles.

## 2026-05-08 Granular Platform Administration Foundation

- Changed: platform RBAC now includes `super_admin`, `admin`, and `tester`.
- Completed: tenant roles now derive from `TENANT_PERMISSIONS` and cannot inherit `platform:*`; `super_admin` has all permissions; granular `admin` can manage customers/testers and selected metrics/modules/policies; `tester` has broad platform read permissions but no `platform:metrics:read`; platform user listing uses `platform:users:read` instead of tenant `users:read`.
- Pending: route-level fixtures for platform user-management and platform scope enforcement decorators/helpers on future admin resources.
- Risks: `platform_admin` remains as a legacy alias for `super_admin` to avoid breaking local databases created during the earlier bootstrap step.
- Next recommended step: add tests proving `admin` cannot call `platform:users:manage_admins` and `tester` cannot read admin metrics.

## 2026-05-08 Platform Governance Scope Enforcement

- Changed: platform governance read routes now require platform permissions plus stored scope checks.
- Completed: `platform:metrics:read`, `platform:modules:manage`, and `platform:policies:manage` are enforced before scope filtering; tenant roles cannot inherit `platform:*`.
- Pending: fine-grained mutation permission split, such as platform module read vs rollout update.
- Risks: `platform:modules:manage` currently gates read-side module governance because no separate read permission exists yet.
- Next recommended step: introduce explicit platform governance read/write permission pairs before adding mutations.

## 2026-05-08 Platform Governance Mutations

- Changed: write-side module/policy governance reuses `platform:modules:manage` and `platform:policies:manage` plus stored scope checks.
- Completed: granular admins can mutate only assigned module/policy keys; tenant roles remain unable to reach platform routes.
- Pending: split read/write permissions before expanding mutation surface.
- Risks: current permission names are coarse for a mature admin console.
- Next recommended step: add `platform:modules:read`, `platform:modules:update`, `platform:policies:read`, and `platform:policies:update` in a compatibility pass.

## 2026-05-08 Platform Governance Test Fixtures

- Changed: RBAC fixtures now cover platform governance routes.
- Completed: tests prove testers cannot read platform metrics and tenant owners cannot access platform governance; granular admins can reach policy mutation routes before service scope checks.
- Pending: read/write permission split is still pending.
- Risks: scope checks rely on `platformScopes` being valid JSON arrays.
- Next recommended step: add role matrix coverage again after splitting platform read/write permissions.

## 2026-05-08 Platform Governance Database Fixtures

- Changed: persisted RBAC scope behavior now has opt-in database coverage.
- Completed: two granular admins with different module/policy scopes are tested against real Prisma reads and writes.
- Pending: invalid/malformed `platformScopes` fixtures.
- Risks: malformed scope JSON currently normalizes to empty scopes; dev DB fixture runs are destructive if using the reset flow.
- Next recommended step: add validation when updating platform scopes.

## 2026-05-09 Stage 1 — Context Governance RBAC Review

- Changed: documented RBAC boundary for future Pulse Context Pack assembly and execution requests.
- Completed: Synapse will authorize who may request execution and which module/skill/action is allowed; Pulse will decide what operational context is assembled.
- Pending: permission metadata for Pulse context/execution submission routes if Stage 2 exposes new APIs.
- Risks: adding generic core context APIs could bypass module-specific permission and tenant checks.
- Next recommended step: keep context assembly invoked from Pulse use cases guarded by `pulse:*`, `tickets:*`, and future runtime governance permissions.

## 2026-05-09 Stage 2 — Pulse Context RBAC Boundary

- Changed: Pulse context assembly is implemented as an internal use case, not a public generic context API.
- Completed: no new route permission surface was added; future callers must invoke the use case from Pulse/runtime governance flows that already enforce tenant, module, role, plan, and usage policy.
- Pending: define the permission gate for future execution-request submission, likely combining module access, ticket/workflow permission, and runtime execution governance.
- Risks: exposing raw assembly directly over HTTP would bypass the intended governance layer.
- Next recommended step: when adding `pulse.context` or execution-request endpoints, require explicit Pulse/module permissions and forbidden audit logging.

## 2026-05-09 Stage 3 — Pulse Queue RBAC Boundary

- Changed: queue publication remains inside existing Pulse use cases instead of adding public queue endpoints.
- Completed: no new external RBAC surface was added. Existing API routes still authorize before use cases enqueue work.
- Pending: future execution-request creation from `pulse.context` must verify runtime execution permissions and module enablement before persisting a governed request.
- Risks: a worker cannot rely on the original HTTP permission check forever; long-running async work should persist actor/governance metadata where required.
- Next recommended step: include actor/request metadata in the future `pulse.context` to `execution_requests` handoff.

## 2026-05-09 Stage 3B — Execution Request RBAC Gap

- Changed: `pulse.context` can persist `ExecutionRequest` records internally.
- Completed: no new public route was added, so external RBAC surface remains unchanged.
- Pending: queued context jobs should carry actor metadata and a future governance validator should verify `runtime:executions:create` plus Pulse/module permissions before execution transitions.
- Risks: current internal jobs are system-originated; production flows need clear actor attribution for human-triggered executions.
- Next recommended step: add actor/governance metadata to Pulse context job creation paths.

## 2026-05-09 Stage 3C — Store Visibility RBAC

- Changed: `storeVisible` is a super-admin-only module governance field.
- Completed: granular admins can keep managing scoped module rollout/governance fields, but attempts to toggle store visibility are denied and audited unless the actor is `super_admin` or legacy `platform_admin`.
- Pending: split platform module read/update/store-commercialization permissions for finer production control.
- Risks: current compatibility allows legacy `platform_admin`; long-term UI should label this as super-admin authority.
- Next recommended step: add `platform:modules:commercialize` or equivalent before production admin rollout.

## 2026-05-09 Stage 3D — Execution Worker RBAC Boundary

- Changed: `pulse.execution` is internal queue work and adds no public route.
- Completed: request governance still occurs before queueing; execution worker only consumes already-queued lifecycle records.
- Pending: actor metadata and permission snapshots for human-triggered async execution.
- Risks: internal workers still need auditable actor attribution before production human-triggered runtime actions.
- Next recommended step: carry actor id/permission snapshot from the originating use case into execution metadata.

## 2026-05-09 Stage 3E — Timeline RBAC Boundary

- Changed: timeline projection is internal queue work, not a public route.
- Completed: no new external permission surface was added.
- Pending: actor attribution propagation for human-triggered timeline events.
- Risks: system-originated events are clear today, but future human actions need actor id snapshots.
- Next recommended step: add actor metadata to action/context jobs before production use.

## 2026-05-09 Stage 3F — Actions RBAC Boundary

- Changed: `pulse.actions` adds no public API and does not execute side effects yet.
- Completed: action allowlist prevents arbitrary action names from being treated as executable.
- Pending: actor id, permission snapshot, and per-action RBAC gates before real side effects.
- Risks: action queues without actor metadata are acceptable only for system-preparation events.
- Next recommended step: require actor/governance metadata in action jobs before enabling handlers.

## 2026-05-09 Stage 3G — Action RBAC Gap

- Changed: `ticket.advance_flow` requires actor metadata but does not yet validate a permission snapshot in the handler.
- Completed: lifecycle use case receives an actor for audit attribution.
- Pending: action job creation must enforce `tickets:write` or equivalent before enqueueing.
- Risks: direct queue writes could bypass route guards if worker-side permission snapshots are not added.
- Next recommended step: include permissions in `PulseActionJob` metadata and validate them before handler execution.

## 2026-05-09 Stage 3H — Action Enqueue RBAC

- Changed: governed action enqueue now requires permission snapshots.
- Completed: `ticket.advance_flow` requires `tickets:write` before a job is accepted.
- Pending: worker-side defense-in-depth check using the same snapshot before executing real handlers.
- Risks: enqueue-time checks protect approved paths; worker-side checks would protect against accidental internal bypasses.
- Next recommended step: validate permission snapshot again inside real action handlers or processor before side effects.

## 2026-05-09 Stage 3I — Runtime Action RBAC Planning

- Changed: runtime-suggested Pulse actions now pass through the same action-governance permission checks as internal callers.
- Completed: planner delegates enqueue to `PulseActionGovernanceService`, so `ticket.advance_flow` still requires `tickets:write` and actor metadata.
- Pending: define service-actor permission profiles for future runtime callbacks and add role-matrix fixtures for action planning.
- Risks: permission snapshots must be captured at the original request boundary; stale or missing snapshots should deny future action planning.
- Next recommended step: persist actor permission snapshots with execution requests before enabling automatic runtime-driven actions.

## 2026-05-09 Stage 3J — Runtime Result Service Actor Gap

- Changed: Pulse result ingestion requires an actor snapshot for lifecycle transition/action planning attribution.
- Completed: actor id is passed to runtime lifecycle transition and the same permission snapshot is forwarded to action planning.
- Pending: define runtime service actor authentication and persist original human actor permission snapshots on execution requests.
- Risks: caller-provided actor snapshots are acceptable for internal tests only; production callback ingestion must resolve actor/service identity server-side.
- Next recommended step: add service actor RBAC before exposing a runtime result endpoint or worker.

## 2026-05-09 Stage 3K — Runtime Callback Actor Snapshot Gap

- Changed: signed callback DTO no longer acts as an authorization source.
- Completed: callback transport is authenticated by HMAC; actor authorization is resolved from execution metadata in the next enforcement layer.
- Pending: persisted fixture coverage for stored actor snapshots and callback denial when snapshots are missing.
- Risks: HMAC proves trusted runtime transport, not user authority.
- Next recommended step: keep runtime callbacks actorless and rely on execution request snapshots for action planning.

## 2026-05-09 Stage 3L — Runtime Result RBAC Snapshot

- Changed: result ingestion now uses saved RBAC snapshots from execution request context.
- Completed: runtime controllers save permission snapshots for user-created executions; Pulse context jobs can carry actor snapshots into async execution requests; callback DTO no longer accepts permissions.
- Pending: worker-side defense-in-depth for `pulse.actions` and DB role-matrix fixtures for runtime-driven action planning.
- Risks: snapshots are point-in-time permissions and may differ from the user's current role.
- Next recommended step: add worker-side permission snapshot checks before real action handlers execute.

## 2026-05-09 Stage 3M — Runtime Result RBAC Fixtures

- Changed: persisted fixture validates stored actor snapshots drive runtime-result action planning.
- Completed: callback/runtime output cannot supply replacement permissions; action planning uses the original snapshot.
- Pending: worker-side permission defense-in-depth fixtures for `pulse.actions`.
- Risks: action enqueue governance is covered, but processor-side revalidation is still pending.
- Next recommended step: add permission snapshot validation inside `PulseActionsProcessor` before executing real handlers.

## 2026-05-09 Stage 3N — Worker-Side Action RBAC

- Changed: `PulseActionsProcessor` now validates permission snapshots before executing real side-effect handlers.
- Completed: `ticket.advance_flow` requires `tickets:write` in the queued actor snapshot even if the job reached the queue directly.
- Pending: handler registry and role-matrix DB fixture for queued action execution.
- Risks: rule drift is possible if future handlers bypass the shared `PULSE_ACTION_RULES` table.
- Next recommended step: make action rule declaration mandatory for handler registration.

## 2026-05-09 Stage 3O — Non-Retryable RBAC Failures

- Changed: RBAC denials inside `PulseActionsProcessor` now throw BullMQ `UnrecoverableError`.
- Completed: missing `tickets:write` for `ticket.advance_flow` is recorded as `non_retryable_governance`.
- Pending: worker-side role-matrix fixture and handler registry.
- Risks: audit/monitoring should distinguish denied jobs from transient worker failures.
- Next recommended step: expose governance failure counts through observability/metrics.

## 2026-05-09 Stage 3P — Action Validation RBAC Boundary

- Changed: payload validation now runs after worker-side permission revalidation and before handler mutation.
- Completed: permission failures are classified separately from payload validation failures.
- Pending: metrics for `non_retryable_governance` and `non_retryable_validation`.
- Risks: UI/operator labels should not conflate malformed payloads with missing permissions.
- Next recommended step: expose separate observability counters for both failure classes.

## 2026-05-09 Stage 3Q — Action Registry RBAC Note

- Changed: handler lookup is centralized, but RBAC rules remain in `PULSE_ACTION_RULES`.
- Completed: existing worker-side permission revalidation remains active after registry lookup.
- Pending: attach required permissions directly to handler registry metadata.
- Risks: rule drift remains possible until handler and permission metadata are colocated.
- Next recommended step: colocate permissions with handler registration.

## 2026-05-09 Stage 3R — Action Definition RBAC

- Changed: action permissions now come from `PulseActionDefinition`.
- Completed: `ticket.advance_flow` requires `tickets:write` from the same definition at enqueue and execution time.
- Pending: role-matrix fixture for registry-backed action execution.
- Risks: future handlers must declare permissions accurately.
- Next recommended step: add tests that every registered handler has non-empty permissions before side effects.

## 2026-05-09 Stage 3S — Context Pack Action RBAC Note

- Changed: Context Pack action vocabulary now comes from registered action definitions, which also carry required permissions.
- Completed: action names exposed to runtime align with enqueue/worker enforcement.
- Pending: do not expose permission lists to runtime unless explicitly needed.
- Risks: runtime sees action names, not authorization grants; backend still enforces permissions.
- Next recommended step: keep permission enforcement server-side and add schema metadata only.

## 2026-05-09 Stage 3T — Runtime Output RBAC Boundary

- Changed: runtime output validation blocks action names not present in the saved Context Pack schema before RBAC/action planning.
- Completed: invalid runtime output does not reach governed enqueue checks or worker RBAC, reducing noisy denied action jobs.
- Pending: action capability read DTOs must remain sanitized if exposed to operators.
- Risks: schema validation complements RBAC; it does not replace server-side permission checks.
- Next recommended step: continue enforcing permissions in enqueue governance and worker execution while adding action schema metadata.

## 2026-05-14 Stage 4A — Membership RBAC Direction

- Changed: tenant creation now writes a membership owner relation instead of relying on an implicit global customer role.
- Completed: tenantless users can exist; tenant access continues to require membership/tenant context.
- Pending: CRUD APIs for memberships, roles, and permissions plus explicit workspace selection in auth/session.
- Risks: route guards still resolve permissions from the JWT role snapshot for compatibility; this is not the final source of truth.
- Next recommended step: implement membership-backed permission resolution in guards and remove controller reliance on single user role semantics.

## 2026-05-14 Stage 4B — Membership Management RBAC

- Changed: membership management uses the actor's tenant membership for escalation checks instead of only trusting `user.role`.
- Completed: tenant admins cannot assign/manage roles equal to or higher than their own; owners cannot remove the last owner.
- Pending: configurable role/permission models beyond enum-backed roles.
- Risks: expected roles remain enum-backed (`OWNER`, `ADMIN`, `OPERATOR`, `VIEWER`) while platform names map to contract roles.
- Next recommended step: introduce role/permission read APIs and migrate permission resolution to live membership data.

## 2026-05-14 Stage 4C — Live RBAC Resolution

- Changed: route RBAC now resolves tenant permissions from membership records through `PermissionResolverService`.
- Completed: JWT role is no longer the only source of truth for tenant permissions.
- Completed: Redis caches resolved permission sets for 60 seconds and membership mutations invalidate affected keys.
- Pending: persisted role/permission CRUD to replace enum-only role policy.
- Risks: platform role permissions still come from contract constants.
- Next recommended step: add role/permission read APIs and persisted permission overrides.

## 2026-05-14 Stage 4D — RBAC Fixture Coverage

- Changed: added DB fixture for stale JWT downgrade and cross-tenant RBAC resolution.
- Completed: fixture asserts effective permissions come from current membership, not the stale session role.
- Pending: run in database-enabled environment.
- Risks: enum-backed roles remain the policy source.
- Next recommended step: model persisted role/permission overrides after fixture run is green.

## 2026-05-14 Stage 4E — Runtime Snapshot RBAC Revalidation

- Changed: runtime action planning now uses live RBAC permissions, not saved snapshot permissions alone.
- Completed: actor snapshots remain attribution data while current membership decides action authorization.
- Pending: persisted role/permission overrides.
- Risks: platform role snapshots in runtime requests still need clear policy if platform actors trigger tenant actions.
- Next recommended step: add explicit platform-actor policy for tenant runtime actions.

## 2026-05-14 Stage 4F — RBAC Membership Quota

- Changed: membership create remains RBAC-controlled and now also checks platform user quota.
- Completed: role escalation checks run before quota/persistence; quota failure still blocks write.
- Pending: persisted role/permission overrides.
- Risks: admin UX must distinguish forbidden RBAC from quota exhaustion.
- Next recommended step: expose display-safe quota error handling in frontend contracts.

## 2026-05-14 Stage 4G — RBAC/Quota Cache Note

- Changed: no RBAC behavior changed.
- Completed: plan-limit cache supports membership quota enforcement without making Redis an authorization authority.
- Pending: persisted role/permission models.
- Risks: quota cache must not be confused with membership permission cache.
- Next recommended step: keep separate cache namespaces for quota and authorization data.

## 2026-05-14 Stage 4H — Action Usage RBAC Note

- Changed: no RBAC permissions changed.
- Completed: action usage is recorded only after handler permission checks pass and a real side effect is applied.
- Pending: DB fixture for downgraded actor plus usage non-emission.
- Risks: authorization denials must stay non-billable.
- Next recommended step: add fixture coverage proving forbidden action jobs do not create usage records.

## 2026-05-14 Stage 4I — Usage Retry RBAC Note

- Changed: no RBAC behavior changed.
- Completed: usage retry safety is independent of role resolution and still requires the original operation to pass authorization before usage is first written.
- Pending: forbidden action usage DB fixture.
- Risks: idempotency must not be used as an authorization shortcut.
- Next recommended step: test forbidden action jobs with duplicate idempotency keys.

## 2026-05-14 Stage 4J — Action Retry RBAC Note

- Changed: no role or permission behavior changed.
- Completed: action idempotency is evaluated after the action processor permission check and tenant-scoped ticket lookup.
- Pending: fixture for permission-denied duplicate action jobs.
- Risks: retry idempotency must not authorize a user whose current permissions were revoked.
- Next recommended step: combine actor revalidation and action idempotency in persisted fixtures.

## 2026-05-14 Stage 4K — Action Ledger RBAC Note

- Changed: no permission surface changed.
- Completed: ledger claims happen after action processor permission validation and tenant-scoped ticket lookup.
- Pending: fixture combining revoked actor permissions with existing action ledger rows.
- Risks: ledger rows are not authorization grants and must never bypass live RBAC.
- Next recommended step: test actor downgrade plus duplicate action delivery.

## 2026-05-14 Stage 4L — Transactional Action RBAC Note

- Changed: no RBAC behavior changed.
- Completed: transaction starts only after action processor permission checks have allowed the handler path.
- Pending: actor downgrade plus transaction fixture.
- Risks: transaction idempotency must not replace live permission revalidation.
- Next recommended step: combine permission revalidation, ledger conflict, and transaction assertions in DB fixtures.

## 2026-05-15 Stage 4M — Action Telemetry RBAC Note

- Changed: no RBAC behavior changed.
- Completed: telemetry records authorization-related failures as categorized outcomes, not raw permission payloads.
- Pending: actor downgrade fixture with telemetry expectations if needed.
- Risks: telemetry must not reveal hidden permissions or admin-only metrics.
- Next recommended step: keep action telemetry internal and sanitized.

## 2026-05-15 Stage 5A — RBAC Database Hotpaths

- Changed: added membership lookup index `tenantId + userId + role`.
- Completed: authorization cache fallback and membership CRUD now have a stronger DB access path.
- Pending: persisted role/permission tables remain future work.
- Risks: DB indexes do not replace live membership permission resolution.
- Next recommended step: add query-plan checks for permission resolver fixtures after DB is available.

## 2026-05-15 Stage 5B — RBAC Across Schemas

- Changed: Pulse moved to schema `pulse`, but RBAC remains Synapse-owned in `public`.
- Completed: modules still consume resolved permissions from platform guards/services instead of owning role checks.
- Pending: DB fixtures proving tenant users cannot access `pulse.*` records outside their membership.
- Risks: schema separation does not replace membership-based authorization.
- Next recommended step: cover Pulse repository reads with membership/RLS rejection fixtures.

## 2026-05-15 Stage 5C — RBAC Before Tenant DB Context

- Changed: Pulse repository context now complements guard-level RBAC instead of replacing it.
- Completed: controller/use-case permission checks still happen before repository access; DB session tenant context is a second boundary.
- Pending: forbidden-action audit fixtures once RLS is active.
- Risks: direct repository use from future jobs must still validate runtime actor permissions before mutation.
- Next recommended step: add worker actor-permission fixture for Pulse action jobs.

## 2026-05-15 Stage 5D — RBAC Plus RLS

- Changed: Pulse now has DB-level tenant isolation in addition to RBAC guards.
- Completed: RLS does not grant permissions; it only constrains tenant row visibility after Synapse authorization.
- Pending: fixtures combining forbidden RBAC and RLS rejection.
- Risks: successful RLS context does not mean a user is authorized; guards remain mandatory.
- Next recommended step: add negative worker/action fixture with invalid actor permissions.

## 2026-05-16 Stage 5E — RLS Fixture Scope

- Changed: RLS fixture now validates several Pulse data classes behind the same tenant context boundary.
- Completed: RBAC remains separate from DB visibility; fixture focuses on tenant row isolation only.
- Pending: combined RBAC plus RLS negative fixture.
- Risks: developers must not interpret RLS visibility as permission success.
- Next recommended step: add forbidden-action audit fixture with RLS active.

## 2026-05-16 — Tenant Context Profile RBAC

- Changed: Tenant Context Profile APIs are protected by existing tenant permissions instead of ad hoc role checks.
- Completed: read/status endpoints require `tenant:read`.
- Completed: start, answer, manual submit, summary generation, approval, rejection, and edit require `tenant:update`.
- Completed: tests assert controller permission metadata for the main routes.
- Pending: frontend should hide/disable profile mutation controls for users lacking `tenant:update`.
- Risks: future module code must call Synapse services and must not bypass RBAC by reading profile tables directly.

## 2026-05-16 — Runtime V1 RBAC Boundary

- Changed: runtime-dispatched Pulse results are action-planned only when the original execution request includes an actor snapshot.
- Completed: actor snapshots continue through existing Pulse runtime ingestion and permission revalidation before any side effect.
- Completed: executions without actor snapshots skip action planning instead of creating unauthorized module actions.
- Pending: service-actor model for trusted automated workflows.
- Risks: provider success is not authorization success; Synapse RBAC remains the gate before side effects.

## 2026-05-16 — Runtime Result RBAC Boundary

- Changed: runtime callback auth is centralized in Synapse core and remains separate from user JWT/RBAC.
- Completed: callback payload cannot provide actor authority; Pulse ingestion still uses saved execution actor snapshots for side-effect planning.
- Pending: service-actor policy for fully automated executions without a human actor snapshot.
- Risks: never treat a valid runtime signature as permission to mutate module state; module handlers must re-enter existing governance.

## 2026-05-16 — Runtime Callback Receipt RBAC Boundary

- Changed: callback receipt replay handling does not grant module permissions.
- Completed: replayed callbacks are short-circuited before module handlers can plan actions.
- Completed: first-time callbacks still rely on saved actor snapshots and module governance before side effects.
- Pending: service-actor policy for automated workflows.
- Risks: receipt status `PROCESSED` means the callback was handled once; it does not imply a user has ongoing permission for future actions.

## 2026-05-16 — Runtime Usage RBAC Boundary

- Changed: recording provider usage is a platform accounting side effect, not a user permission grant.
- Completed: Runtime provider usage is tied to the already-governed execution request after RBAC/module checks have occurred.
- Pending: service-actor policy for automated Runtime executions.
- Risks: a billable provider call does not mean the resulting module action is authorized; action governance remains separate.

## 2026-05-16 — Runtime Async Callback RBAC Boundary

- Changed: async Runtime acceptance leaves the execution `RUNNING` until Synapse receives the signed result.
- Completed: Pulse does not plan actions from `RUNNING`; action planning starts only after central result ingress.
- Pending: automated service-actor policy for non-human executions.
- Risks: callback delivery is not authorization; saved actor snapshots still gate side effects.

## 2026-05-16 — Callback Usage RBAC Boundary

- Changed: provider usage metering from callbacks is accounting, not authorization.
- Completed: metering happens before module action planning but after receipt claim.
- Pending: service-actor policy for automated callback-driven action planning.
- Risks: a metered provider result still cannot mutate module state without module governance.
