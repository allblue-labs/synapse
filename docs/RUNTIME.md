# Runtime Architecture

Synapse is the control plane. Pain Runtime Operator is the future execution plane.

## Control Plane Responsibilities

Synapse owns:

- tenants
- module lifecycle
- permissions and entitlements
- task intent
- desired tenant runtime specs
- local execution fallback

## Execution Plane Responsibilities

Pain will own:

- per-tenant Kubernetes runtime reconciliation
- distributed execution infrastructure
- runtime status reporting

Synapse does not implement Kubernetes logic.

## Task Execution

All execution intent should be represented as a shared `Task`:

```ts
type Task = {
  id: string;
  type: 'llm' | 'workflow' | 'message' | 'analysis';
  tenantId: string;
  module: string;
  payload: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
};
```

Executors implement:

```ts
interface TaskExecutor {
  execute(task: Task): Promise<TaskResult>;
}
```

Current executors:

- `LocalExecutor`: active implementation for local Synapse execution.
- `PainExecutor`: placeholder that preserves the future integration boundary.

## Tenant Runtime Spec

`TenantRuntimeSpec` represents desired per-tenant infrastructure:

```ts
type TenantRuntimeSpec = {
  tenantId: string;
  plan: string;
  modules: Array<{
    name: string;
    enabled: boolean;
    config?: Record<string, unknown>;
  }>;
};
```

## Pain Client

The Pain adapter contract is:

```ts
interface PainClient {
  applyRuntime(spec: TenantRuntimeSpec): Promise<void>;
  destroyRuntime(tenantId: string): Promise<void>;
  getStatus(tenantId: string): Promise<unknown>;
}
```

`StubPainClient` is a no-op logger. It does not call Pain or Kubernetes.

## Future Integration Path

1. Persist tenant runtime specs.
2. Replace or configure the stub client with a real Pain API client.
3. Switch selected task types from `LocalExecutor` to `PainExecutor`.
4. Add runtime status reconciliation and UI.

## 2026-05-09 Stage 1 — Runtime Context Boundary

- Changed: clarified future runtime handoff: modules assemble context packs; Synapse validates governance and persists execution lifecycle.
- Completed: current `execution_requests` table is tenant/module-aware and platform-owned. Pulse must submit a module-specific, governance-ready context pack rather than expecting core runtime to assemble Pulse context.
- Pending: refine execution request/response contracts with `skill`, `executionType`, provider metadata, usage hints, security hints, and required output schema validation.
- Risks: allowing runtime/core to inspect Pulse domain models directly would couple the external Go Runtime path to module internals.
- Next recommended step: implement Pulse Context Pack first, then map it into existing platform execution request contracts.

## 2026-05-09 Stage 2 — Pulse Runtime-Ready Context Pack

- Changed: Pulse now produces an internal `PulseContextPack` containing execution type, skill, allowed actions, required output schema, security hints, and usage hints.
- Completed: this prepares the future Go Runtime boundary without implementing runtime calls, provider orchestration, gRPC, queues, Kubernetes, or local LLMs.
- Pending: governed `ExecutionRequest` creation must wrap the pack with platform validation and lifecycle persistence.
- Risks: the pack is not an execution authorization token; Synapse must still validate all governance rules before runtime handoff.
- Next recommended step: define the Stage 5 mapping from `PulseContextPack` to platform `ExecutionRequest.context`.

## 2026-05-09 Stage 3 — Runtime Queue Preparation

- Changed: Pulse now has `pulse.context` and `pulse.execution` queue contracts for future runtime handoff.
- Completed: no provider execution, OpenAI/Claude orchestration, Go Runtime call, Kubernetes, or local model behavior was implemented. The queues only prepare lifecycle boundaries.
- Pending: `pulse.context` should assemble and validate packs; `pulse.execution` should create or advance governed platform execution requests before any external runtime integration.
- Risks: runtime calls must not be added directly to `pulse.inbound`.
- Next recommended step: persist governed `ExecutionRequest` records after context assembly, still without calling providers.

## 2026-05-09 Stage 3B — Execution Request Preparation

- Changed: `pulse.context` now persists platform `ExecutionRequest` records with `requestType = pulse.<executionType>`.
- Completed: requests are idempotent per tenant/idempotency key and remain in `REQUESTED` status. Context packs are stored through runtime lifecycle masking and audit behavior.
- Pending: execution governance validation and transition to `QUEUED`; no external Go Runtime, provider adapter, gRPC, Kubernetes, or local model behavior exists in this step.
- Risks: prepared requests need cleanup/visibility policies if they remain `REQUESTED` for long periods.
- Next recommended step: implement a governance transition service that can approve/deny prepared execution requests.

## 2026-05-09 Stage 3C — Runtime Execution Governance

- Changed: added `RuntimeExecutionGovernanceService`.
- Completed: governance validates module active/public state, tenant module installation status, and module request-type allowlist before transitioning execution requests to `QUEUED`.
- Pending: actor permission propagation, usage-limit enforcement, and actual runtime/provider execution.
- Risks: governance currently proves module/request boundaries, but not per-actor permissions for async jobs.
- Next recommended step: carry actor metadata from HTTP/event source into Pulse context jobs before enabling human-triggered runtime work.

## 2026-05-09 Stage 3D — No-Provider Execution Dispatch

- Changed: `pulse.execution` now consumes queued execution requests.
- Completed: the worker transitions requests to `RUNNING` and then `SUCCEEDED` with a no-provider dispatch output: `runtime_provider_not_implemented`.
- Pending: external Go Runtime integration, provider adapters, signed callbacks, provider usage metadata, and real runtime result ingestion.
- Risks: lifecycle status alone is insufficient for UI/business meaning until provider execution exists.
- Next recommended step: add an explicit runtime provider handoff contract with request/response/callback validation.

## 2026-05-09 Stage 3E — Runtime Timeline Projection

- Changed: no-provider execution lifecycle events now flow through `pulse.timeline`.
- Completed: runtime lifecycle stays platform-owned while Pulse projects module-specific operational history.
- Pending: provider execution result events and signed runtime callback events.
- Risks: timeline projection is not a runtime callback validation mechanism.
- Next recommended step: add runtime result contracts before external runtime callbacks.

## 2026-05-09 Stage 3F — Runtime Action Boundary

- Changed: `pulse.actions` exists as the future destination for approved runtime/action recommendations.
- Completed: actions are allowlisted and projected without side effects.
- Pending: runtime output parsing and action request validation before enqueueing actions from execution results.
- Risks: runtime-recommended actions must not be trusted without module validation.
- Next recommended step: validate runtime output against `requiredOutputSchema` before creating action jobs.

## 2026-05-09 Stage 3G — Runtime-To-Action Risk

- Changed: one action handler now mutates ticket workflow state.
- Completed: there is still no automatic runtime-output-to-action enqueueing, so runtime cannot yet trigger the mutation directly.
- Pending: runtime output validation and action governance before automatic action enqueueing.
- Risks: when runtime output is connected, `ticket.advance_flow` must require confidence/permission/escalation checks.
- Next recommended step: implement runtime output validator before action enqueue.

## 2026-05-09 Stage 3H — Runtime-To-Action Governance

- Changed: governed action enqueue exists for future runtime recommendations.
- Completed: runtime-derived `ticket.advance_flow` actions will need `tickets:write` snapshot before enqueue.
- Pending: runtime output validator and confidence/escalation policy.
- Risks: runtime output must remain advisory until governance converts it into an action job.
- Next recommended step: validate runtime output against context pack `requiredOutputSchema`, then call action governance.

## 2026-05-09 Stage 3I — Runtime Output Planner

- Changed: Pulse now has an internal planner for future runtime completion output.
- Completed: planner accepts normalized runtime output, requires audit-safe decision summaries, validates confidence and state, checks Context Pack `allowedActions`, and delegates action enqueue to governance.
- Pending: external runtime callback/queue result ingestion, service actor authorization, provider usage capture, and lifecycle transition from real runtime responses.
- Risks: no provider/runtime response is currently consumed; this is preparation only.
- Next recommended step: implement execution-result ingestion that calls the planner after loading tenant-scoped execution request context.

## 2026-05-09 Stage 3J — Runtime Result Ingestion Boundary

- Changed: Pulse now has an internal use case for normalized runtime result ingestion.
- Completed: lifecycle transitions, Context Pack extraction, timeline projection, and action planning are connected behind one module-owned boundary.
- Pending: signed runtime callback endpoint, queue transport option, service actor authorization, provider usage metadata, and retry/replay strategy.
- Risks: this is not external runtime integration yet; no Go Runtime, provider call, or callback endpoint was implemented.
- Next recommended step: add signed callback/queue ingress using `RuntimeSignatureService`.

## 2026-05-09 Stage 3K — Signed Pulse Runtime Result Callback

- Changed: Pulse exposes `/v1/pulse/runtime/results` for signed runtime result callbacks.
- Completed: HMAC verification uses runtime key id, timestamp tolerance, raw body, method, and path. Valid callbacks call Pulse result ingestion.
- Pending: external Go Runtime implementation, provider callbacks, replay persistence, key rotation, and queue/gRPC ingress.
- Risks: this endpoint is service-to-service and must not become a frontend/API-client integration surface.
- Next recommended step: persist original execution actor/governance metadata and add callback isolation fixtures.

## 2026-05-09 Stage 3L — Execution Actor Snapshot

- Changed: execution request creation now persists actor and permission snapshots for later runtime result ingestion.
- Completed: Pulse result callback no longer accepts actor authority; ingestion uses the stored execution context snapshot.
- Pending: snapshot freshness policy, DB fixtures, and replay store.
- Risks: old executions without snapshots are rejected from automatic action planning.
- Next recommended step: add persisted signed-callback fixtures and define execution TTL for snapshot freshness.

## 2026-05-09 Stage 3M — Runtime Result Persistence Fixtures

- Changed: persisted fixtures now validate Pulse runtime result ingestion.
- Completed: covered successful persisted actor snapshot action planning, cross-tenant denial, and missing-snapshot rejection.
- Pending: signed HTTP callback fixture, replay protection, key rotation, and execution TTL policy.
- Risks: no external Go Runtime or provider callback is implemented.
- Next recommended step: implement replay protection for signed result callbacks.

## 2026-05-09 Stage 3N — Runtime Action Worker Revalidation

- Changed: runtime-planned Pulse actions now face a second permission check inside the action worker before side effects.
- Completed: `ticket.advance_flow` requires `tickets:write` when planned and when executed.
- Pending: non-retryable governance failures and handler registry.
- Risks: runtime result planning remains safe, but worker retries for permanent RBAC failures should be tuned.
- Next recommended step: classify RBAC/governance failures as terminal action failures.

## 2026-05-09 Stage 3O — Runtime-Planned Action Retry Classification

- Changed: runtime-planned action jobs with invalid permission snapshots now fail terminally in the action worker.
- Completed: governance failures are non-retryable; transient dispatch/projection failures still retry.
- Pending: validation failure classification and observability counters.
- Risks: stale actor snapshots may generate terminal failures if permissions are insufficient.
- Next recommended step: define snapshot freshness/TTL policy and governance failure metrics.

## 2026-05-09 Stage 3P — Runtime-Planned Action Payload Validation

- Changed: runtime-planned `ticket.advance_flow` actions now face strict payload validation before ticket mutation.
- Completed: invalid runtime-generated action payloads are terminal validation failures.
- Pending: schema registry for runtime output to action payload mapping.
- Risks: runtime outputs must stay aligned with action schemas.
- Next recommended step: make required output schemas derive from action schema metadata.

## 2026-05-09 Stage 3Q — Runtime-Planned Action Registry

- Changed: runtime-planned actions now flow into a registry-backed action execution path.
- Completed: `ticket.advance_flow` remains the only real runtime-plannable side-effect handler.
- Pending: derive runtime output/action schemas from registry metadata.
- Risks: runtime action planning and handler schemas can drift until metadata is shared.
- Next recommended step: expose action definitions to Context Pack assembly.

## 2026-05-09 Stage 3R — Runtime Action Definitions

- Changed: runtime-plannable real actions now have module-local definitions.
- Completed: `ticket.advance_flow` definition identifies required permissions and usage candidate for future runtime/action mapping.
- Pending: derive required runtime output/action payload schema from action definitions.
- Risks: runtime planner still hardcodes action-specific output handling.
- Next recommended step: have Context Pack assembly read registered action definitions.

## 2026-05-09 Stage 3S — Runtime Context Action Definitions

- Changed: Context Pack assembly now reads registered action definitions for real actions.
- Completed: runtime `recommendedActions` schema is constrained to allowed actions for the current Pulse context.
- Pending: runtime result schema validation and action payload schema generation.
- Risks: schema is currently advisory unless explicitly validated on result ingestion.
- Next recommended step: enforce Context Pack `requiredOutputSchema` during runtime result ingestion.
