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

## 2026-05-09 Stage 3K — Signed Runtime Result Callback

- Changed: Synapse exposes `/v1/runtime/results` for signed runtime result callbacks.
- Completed: HMAC verification uses runtime key id, timestamp tolerance, raw body, method, and path. Valid callbacks are routed by the persisted execution request module, not by trusting callback payload module data.
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

## 2026-05-09 Stage 3T — Runtime Output Schema Enforcement

- Changed: Pulse runtime result ingestion now enforces the saved Context Pack `requiredOutputSchema` for successful executions.
- Completed: output is validated before lifecycle success, planner execution, or timeline/action projection.
- Pending: provider/runtime retry semantics for invalid contract output and richer action payload schemas.
- Risks: validator covers the current Pulse V1 schema subset; future runtime schemas may need a shared schema validator.
- Next recommended step: add action/output schema metadata to action definitions and derive the required output contract from it.

## 2026-05-14 Stage 4A — Runtime Governance Reminder

- Changed: platform-owned module/usage governance helpers now exist for future runtime request boundaries.
- Completed: modules can ask Synapse whether a module feature can be used and whether usage can be consumed.
- Pending: wire these helpers into runtime execution governance before external provider execution is enabled.
- Risks: runtime must not trust module-owned context for billing/credit decisions.
- Next recommended step: call `canUseModuleFeature` and `consumeUsageOrReject` from runtime execution governance.

## 2026-05-14 Stage 4B — Membership Runtime Governance Note

- Changed: workspace selection provides a clearer tenant/user boundary for future runtime requests.
- Completed: selected sessions are tenant-scoped to a validated membership before tenant runtime routes are used.
- Pending: runtime execution governance should resolve live membership permissions, not only JWT role snapshots.
- Risks: stale sessions may contain old role snapshots after membership mutation.
- Next recommended step: add live membership permission lookup/cache to runtime governance and route guards.

## 2026-05-14 Stage 4C — Runtime Permission Resolution

- Changed: route guards now resolve live membership permissions before runtime execution routes can be authorized.
- Completed: runtime route permissions use the same resolver/cache path as other tenant routes.
- Pending: runtime execution governance internals should also call the resolver when evaluating saved actor snapshots.
- Risks: saved actor snapshots may still contain historical permissions and need explicit expiry/revalidation policy.
- Next recommended step: revalidate actor snapshots before runtime side-effect planning.

## 2026-05-14 Stage 4D — Runtime Auth Fixture Note

- Changed: authorization DB fixture covers the guard/resolver path runtime routes depend on.
- Completed: stale session role snapshots are not authoritative in route authorization.
- Pending: revalidation of saved runtime actor snapshots.
- Risks: runtime callbacks may still use historical actor snapshots until revalidation is added.
- Next recommended step: revalidate saved actor permissions at runtime result planning.

## 2026-05-14 Stage 4E — Runtime Actor Snapshot Revalidation

- Changed: Pulse runtime result ingestion revalidates saved actor snapshots before planning actions.
- Completed: runtime result lifecycle success no longer implies side-effect authorization.
- Completed: current membership permissions decide automatic Pulse action enqueue.
- Pending: DB fixture for actor downgrade between execution request and result callback.
- Risks: saved actor snapshots remain historical and should not be reused as current authorization elsewhere.
- Next recommended step: apply the same revalidation pattern to other runtime-driven side effects as they are added.

## 2026-05-14 Stage 4F — Runtime User Quota Note

- Changed: no runtime behavior changed.
- Completed: membership quota enforcement reduces over-provisioned tenant users before runtime interactions.
- Pending: runtime usage quota enforcement through `consumeUsageOrReject`.
- Risks: runtime usage quota is separate from user quota.
- Next recommended step: wire runtime usage consumption boundaries after plan/quota cache.

## 2026-05-14 Stage 4G — Runtime Plan Cache Readiness

- Changed: platform now has cached tenant plan limits for runtime usage governance.
- Completed: `getTenantPlanLimits` can be used in runtime hotpaths without repeated billing joins.
- Pending: connect runtime execution and action usage to `consumeUsageOrReject`.
- Risks: runtime must still treat billing service as authority, not Redis/cache.
- Next recommended step: add usage consumption before runtime execution dispatch and action completion.

## 2026-05-14 Stage 4H — Runtime Usage Boundary Note

- Changed: runtime-derived Pulse actions now become usage only when the backend action handler applies a real side effect.
- Completed: provider calls are still not metered because this NestJS backend does not execute real LLM providers yet.
- Pending: AI execution usage at the future provider dispatch boundary.
- Risks: runtime success and billable action success are separate lifecycle outcomes.
- Next recommended step: meter provider calls only when external runtime/provider execution exists.

## 2026-05-14 Stage 4I — Runtime Usage Retry Note

- Changed: runtime-derived action usage retries are now safe at the platform usage layer.
- Completed: duplicate runtime/action callbacks that reuse the same usage idempotency key do not require additional credits.
- Pending: replay protection for external runtime callbacks remains separate.
- Risks: runtime callback replay security must not rely on usage idempotency alone.
- Next recommended step: add callback replay protection before external runtime provider callbacks are enabled.

## 2026-05-14 Stage 4J — Runtime Action Idempotency Note

- Changed: runtime-planned `ticket.advance_flow` actions now carry the queue idempotency key into the Pulse lifecycle boundary.
- Completed: duplicate runtime action delivery does not apply the same flow transition twice.
- Pending: external callback replay protection and DB fixture execution.
- Risks: runtime callback replay and action execution idempotency are related but separate controls.
- Next recommended step: add signed callback replay storage before connecting an external runtime service.

## 2026-05-14 Stage 4K — Runtime Action Ledger Readiness

- Changed: runtime-planned Pulse actions now have a durable backend execution ledger.
- Completed: ledger status models prepare for future runtime callback/action troubleshooting without implementing runtime orchestration.
- Pending: external runtime callback replay ledger remains separate.
- Risks: action ledger does not authenticate external runtime callbacks.
- Next recommended step: add callback replay protection before external runtime integration.

## 2026-05-14 Stage 4L — Runtime Action Transaction Readiness

- Changed: runtime-derived `ticket.advance_flow` side effects commit atomically after action planning.
- Completed: runtime output can succeed while action execution still remains governed by the transactional action ledger.
- Pending: callback replay protection and external runtime authentication.
- Risks: runtime callback replay control must remain separate from action transaction idempotency.
- Next recommended step: implement callback replay storage before external runtime callbacks are enabled.

## 2026-05-15 Stage 4M — Runtime Action Telemetry Readiness

- Changed: runtime-derived action outcomes now produce backend telemetry once they reach `pulse.actions`.
- Completed: telemetry does not expose raw runtime output.
- Pending: runtime callback replay telemetry remains future work.
- Risks: runtime/provider telemetry must avoid prompts, completions, secrets, and chain-of-thought.
- Next recommended step: apply the same payload-free telemetry rules to external runtime callbacks.

## 2026-05-15 Stage 5A — Runtime Execution DB Hotpaths

- Changed: runtime execution requests gained `tenantId + status + updatedAt` index.
- Completed: existing idempotency and module/status indexes remain intact.
- Pending: RLS activation for `execution_requests` after repository paths use tenant transaction context.
- Risks: external runtime callbacks must still validate tenant and signature before touching execution rows.
- Next recommended step: add callback replay table before external runtime integration resumes.

## 2026-05-15 Stage 5B — Runtime Governance Stays Platform-Owned

- Changed: Pulse operational data moved to `pulse`, but `execution_requests` remains in `public`.
- Completed: Synapse continues to own execution governance/persistence even when Pulse assembles context and requests execution.
- Pending: callback replay protection and tenant-context repository adoption.
- Risks: external runtime integrations must not write directly into `pulse.*` operational tables.
- Next recommended step: keep runtime callbacks routed through Synapse validation before Pulse ingestion.

## 2026-05-15 Stage 5C — Runtime-To-Pulse Tenant Context

- Changed: Pulse context assembly and runtime-result side-effect repositories now use tenant DB context.
- Completed: future runtime outputs must still pass through Synapse validation, then Pulse tenant-scoped repositories.
- Pending: external runtime callback replay protection.
- Risks: runtime callbacks must never receive direct database credentials or write to `pulse.*`.
- Next recommended step: add callback replay table in platform schema before runtime integration resumes.

## 2026-05-15 Stage 5D — Runtime Output Under Pulse RLS

- Changed: Pulse operational writes from runtime-derived flows will be RLS-protected.
- Completed: runtime execution governance remains in `public.execution_requests`; Pulse side effects happen through tenant context.
- Pending: RLS-active runtime result ingestion fixture.
- Risks: callback handlers must validate tenant/module/signature before entering Pulse repositories.
- Next recommended step: extend runtime-result DB fixture after migration rehearsal.

## 2026-05-16 Stage 5E — Runtime Adjacent RLS Fixture Coverage

- Changed: Pulse context/timeline data used by runtime-adjacent flows is now included in RLS fixture coverage.
- Completed: schedules, knowledge, integrations, conversations, and events have tenant visibility checks.
- Pending: runtime-result ingestion fixture with RLS active.
- Risks: external runtime callbacks remain unimplemented and must not bypass Synapse.
- Next recommended step: extend runtime-result fixture after disposable DB run.

## 2026-05-16 Runtime V1 — Signed Go Runtime Handoff

- Changed: Synapse core now dispatches queued platform `ExecutionRequest` records to the isolated Go Runtime over signed REST instead of completing with `runtime_provider_not_implemented`.
- Completed: modules do not know the Go Runtime client, URL, signer, transport, or provider adapter. Pulse only requests Synapse execution through platform lifecycle/governance contracts and supplies its module-owned Context Pack.
- Completed: runtime handoff uses `RuntimeExecutionDispatchService`, `RuntimeHttpClient`, HMAC signing, OpenAI/Claude provider preference, fallback policy, timeout, and structured output schema from the submitted execution context.
- Completed: Go Runtime now parses provider text into `structuredPayload` when structured output is requested; invalid JSON becomes a failed provider attempt.
- Completed: successful runtime results are routed through Pulse runtime ingestion when an actor snapshot exists, preserving output schema validation and action governance.
- Completed: executions without an actor snapshot can persist terminal runtime output, but action planning is skipped to avoid unauthorized module side effects.
- Pending: callback/replay ledger, async queue/gRPC runtime transport, provider live smoke tests with real keys, tenant-specific provider policies, and usage metering for provider calls.
- Risks: V1 dispatch is synchronous HTTP from the worker; long provider latency occupies the worker until queue/gRPC transport exists.
- Next recommended step: add callback replay/idempotency storage, then run local end-to-end API plus Go Runtime smoke test with dev provider keys.

## 2026-05-16 Runtime V1 — Central Result Ingress

- Changed: runtime results now terminate at Synapse core `/v1/runtime/results`.
- Completed: callback authentication, raw-body validation, and module routing are centralized.
- Completed: routing uses the persisted `ExecutionRequest.context.moduleSlug`; callback payloads cannot choose the module handler.
- Completed: Pulse registers a `RuntimeResultHandler` adapter and keeps runtime transport details out of the product module.
- Pending: callback replay ledger and async callback delivery from the Go Runtime.
- Risks: registry-based handler routing needs a production health check to detect missing module handlers at boot.
- Next recommended step: implement replay-safe callback receipts in `public`.
