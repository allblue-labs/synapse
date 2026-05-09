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
