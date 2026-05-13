# Queue Foundation

Synapse uses BullMQ and Redis for async processing.

## Queue Names

- `message-processing`: normalize/persist inbound messages and trigger downstream work.
- `ai-response`: generate agent responses from conversation context.
- `outbound-message`: send replies through channel adapters.

## Job Contracts

Payload contracts live in `packages/contracts`:

- `MessageProcessingJob`
- `AiResponseJob`
- `OutboundMessageJob`

## Retry Policy

Current default:

- `attempts`: 3
- backoff: exponential, 2 seconds base delay
- completed jobs retained for short-term inspection
- failed jobs retained for dead-letter review

## Failure Strategy

Failed jobs are not removed automatically. Production workers should emit structured logs with tenant ID, queue name, job ID, and provider/channel error metadata. A future dead-letter dashboard should allow replay after root-cause review.

## Module Metadata

Module-produced jobs should include `moduleName` when available. Messaging jobs currently use the queue contracts in `packages/contracts` and are produced after inbound message persistence.

## Ordering Risk

Conversation messages can arrive rapidly. Future workers should use per-conversation ordering or locks before generating AI responses.

## 2026-05-09 Stage 1 — Pulse Async Pipeline Review

- Changed: reviewed Pulse async processing against the target event-driven architecture.
- Completed: current code has a Pulse-specific BullMQ processor (`pulse-processing`) plus platform/generic queues. This confirms async processing exists, but it is not yet split into the target bounded pipelines.
- Pending: replace the single Pulse processing path with explicit queue contracts: `pulse.inbound`, `pulse.context`, `pulse.execution`, `pulse.actions`, `pulse.timeline`, and `pulse.failed`.
- Risks: a single broad worker can become a hidden module monolith and may perform heavy DB/AI work in one retry boundary.
- Next recommended step: Stage 3 should add queue constants/contracts, idempotency keys, and minimal processors per boundary before adding heavy runtime calls.

## 2026-05-09 Stage 2 — Context Assembly Queue Target

- Changed: Pulse Context Pack assembly is now available as an internal use case ready to be called by a future `pulse.context` worker.
- Completed: no new queue was added in Stage 2; the implementation stays synchronous/internal until Stage 3 defines queue contracts and retry/idempotency policy.
- Pending: `pulse.context` job payload should include tenant id, skill, execution type, conversation id, ticket id, playbook key, idempotency key, and request tracing metadata.
- Risks: invoking context assembly directly from heavy HTTP paths would violate the async pipeline target.
- Next recommended step: Stage 3 should persist minimal inbound events, enqueue `pulse.context`, then produce governed execution requests.

## 2026-05-09 Stage 3 — Pulse Queue Contracts

- Changed: Pulse queues are now defined in code: `pulse.inbound`, `pulse.context`, `pulse.execution`, `pulse.actions`, `pulse.timeline`, and `pulse.failed`.
- Completed: each queue has a payload contract and a publisher method on `PulseQueueService`. Default retry policy is 3 attempts with exponential backoff; failed-capture jobs use 1 attempt. Completed jobs are retained for short-term inspection and failed jobs are retained.
- Completed: the current entry processor now listens on `pulse.inbound`, so existing Pulse entry processing remains functional while the broader pipeline is split.
- Pending: add processors for context assembly, governed execution request creation, action dispatch, timeline append, and failure capture.
- Risks: publishing to queues without processors would create backlog; only `pulse.inbound` should be used for live work until the next processors land.
- Next recommended step: implement `pulse.context` as the next active worker.

## 2026-05-09 Stage 3B — Pulse Context Worker

- Changed: `pulse.context` now has an active BullMQ processor.
- Completed: context jobs validate required payload fields, assemble `PulseContextPack`, persist an idempotent `ExecutionRequest`, emit context/runtime-request operational events, and publish failure capture jobs to `pulse.failed`.
- Pending: `pulse.execution`, `pulse.actions`, and `pulse.timeline` processors are still contracts only.
- Risks: `pulse.failed` captures failure jobs but does not yet have a replay/dashboard processor.
- Next recommended step: add execution governance before activating `pulse.execution`.

## 2026-05-09 Stage 3C — Governance Before Execution Queue

- Changed: `pulse.context` now calls runtime execution governance after creating an execution request.
- Completed: approved requests move from `REQUESTED` to `QUEUED`. Denied requests throw and are captured through the existing `pulse.failed` path.
- Pending: `pulse.execution` worker remains unimplemented; queued requests are not sent to providers or external runtime.
- Risks: long-lived queued requests need operational monitoring before production.
- Next recommended step: add a `pulse.execution` worker that only transitions lifecycle states and records timeline events, still without provider calls.

## 2026-05-09 Stage 3D — Pulse Execution Worker

- Changed: `pulse.execution` now has an active worker.
- Completed: `pulse.context` publishes execution jobs after governance approval. The execution worker validates jobs, skips stale/non-queued requests, records dispatch events, and captures failures to `pulse.failed`.
- Pending: no real runtime/provider dispatch exists yet; `pulse.actions` and `pulse.timeline` remain contracts only.
- Risks: placeholder dispatch completion must not be treated as provider output.
- Next recommended step: implement `pulse.timeline` projection worker so lifecycle events can be queried without reading queue internals.

## 2026-05-09 Stage 3E — Pulse Timeline Worker

- Changed: `pulse.timeline` now has an active worker.
- Completed: execution dispatch lifecycle events are published to timeline and persisted as `PulseOperationalEvent` records. Timeline projection failures are captured in `pulse.failed`.
- Pending: `pulse.actions` remains unimplemented; older direct event writes still exist.
- Risks: queue-projected timeline events and direct-written events coexist during transition.
- Next recommended step: implement `pulse.actions`, then migrate selected direct event writers to timeline jobs.

## 2026-05-09 Stage 3F — Pulse Actions Worker

- Changed: `pulse.actions` now has an active worker.
- Completed: action jobs are validated, allowlisted, projected to timeline, and failure-captured. No real side effects are applied yet.
- Pending: typed action handlers and handler-specific DTOs.
- Risks: action completion currently means preparation completed, not business action execution.
- Next recommended step: implement one internal action handler before any integration/provider action.

## 2026-05-09 Stage 3G — First Real Action Handler

- Changed: `ticket.advance_flow` now has a typed action handler.
- Completed: the action worker applies the handler, then projects completion with `sideEffectsApplied: true`.
- Pending: worker-side permission snapshots and handler registry.
- Risks: action queue writes now have real mutation potential for this action.
- Next recommended step: add action enqueue governance before runtime outputs can generate action jobs.

## 2026-05-09 Stage 3H — Governed Action Enqueue

- Changed: added `PulseActionGovernanceService` before `pulse.actions`.
- Completed: `ticket.advance_flow` jobs require actor metadata and `tickets:write` permission snapshot before enqueue.
- Pending: runtime output parser must call this service rather than raw `enqueueAction`.
- Risks: raw queue publication bypasses governance and should not be used for real actions.
- Next recommended step: wire action creation from runtime results through the governance service.

## 2026-05-09 Stage 3I — Runtime Output to Governed Action Jobs

- Changed: added a planner between runtime output and `pulse.actions`.
- Completed: `PulseRuntimeActionPlannerService` validates output shape, confidence, allowed actions, state transitions, ticket context, and permission governance before enqueueing `ticket.advance_flow`.
- Pending: connect planner to execution-result ingestion and extend rules for additional action jobs.
- Risks: `pulse.execution` still does not call the planner because no real runtime output is consumed yet.
- Next recommended step: implement a narrow execution-result handler that invokes the planner, then emits timeline events for planned/skipped action suggestions.

## 2026-05-09 Stage 3J — Runtime Result Ingestion Boundary

- Changed: runtime result handling now has a use case that can publish timeline jobs and plan action jobs.
- Completed: successful results call the planner; failed/cancelled/timed-out results publish ingestion timeline state without action jobs.
- Pending: decide whether external runtime results arrive through signed REST callback, queue consumer, or both.
- Risks: direct queue/result ingestion without signature validation would be unsafe.
- Next recommended step: create a dedicated runtime result ingress adapter with idempotency and signature validation.

## 2026-05-09 Stage 3K — Signed REST Result Ingress

- Changed: REST callback ingress now exists for Pulse runtime results.
- Completed: signed REST ingress calls the same result ingestion use case that a future queue consumer should use.
- Pending: queue consumer variant, replay store, and callback dead-letter policy.
- Risks: REST and queue ingress paths could diverge if the queue consumer bypasses signature/idempotency conventions.
- Next recommended step: keep future queue consumer thin and route through the same ingestion use case.

## 2026-05-09 Stage 3L — Actor Snapshot Across Async Runtime Boundaries

- Changed: Pulse context jobs can now carry actor snapshots into execution request creation.
- Completed: result ingestion reads the saved snapshot rather than accepting callback actor data.
- Pending: queue consumer variant should preserve the same snapshot behavior and avoid new actor fields in runtime result jobs.
- Risks: async jobs without actor snapshots cannot safely create mutating action jobs.
- Next recommended step: add queue payload tests for actor snapshot propagation.

## 2026-05-09 Stage 3M — Runtime Result Fixture Queue Boundary

- Changed: DB fixture covers result ingestion through the same planner/governance path that enqueues actions.
- Completed: fixture asserts action enqueue receives the persisted actor snapshot after successful result ingestion.
- Pending: processor-side permission revalidation and queue-consumer ingress tests.
- Risks: current fixture mocks queue publication; it does not execute `pulse.actions`.
- Next recommended step: add worker-side permission validation before executing queued mutating actions.

## 2026-05-09 Stage 3N — Action Queue Permission Revalidation

- Changed: `pulse.actions` now revalidates actor permission snapshots before side-effect handlers.
- Completed: raw queue publication cannot execute `ticket.advance_flow` unless the job carries `tickets:write`.
- Pending: dead-letter/retry policy for repeated permission failures.
- Risks: permission failures currently throw and enter normal BullMQ retry behavior; repeated permanent failures should eventually be classified as non-retryable.
- Next recommended step: add non-retryable failure classification for governance errors.

## 2026-05-09 Stage 3O — Non-Retryable Action Queue Failures

- Changed: governance failures in `pulse.actions` now throw BullMQ `UnrecoverableError`.
- Completed: permission-denied jobs are captured once with `non_retryable_governance`; transient failures remain retryable.
- Pending: non-retryable validation classification.
- Risks: failed-queue consumers must preserve failure class metadata.
- Next recommended step: add failed-queue projection/alerting for non-retryable governance failures.

## 2026-05-09 Stage 3P — Non-Retryable Action Validation

- Changed: `pulse.actions` now treats strict handler payload validation as terminal.
- Completed: `ticket.advance_flow` invalid payloads are recorded as `non_retryable_validation`.
- Pending: failed-queue alerts for validation failures.
- Risks: malformed jobs rejected before the processor catch path still do not project failed metadata.
- Next recommended step: classify top-level job validation failures consistently.

## 2026-05-09 Stage 3Q — Action Registry Queue Boundary

- Changed: `pulse.actions` resolves real handlers through `PulseActionHandlerRegistry`.
- Completed: queue processor remains responsible for lifecycle projection; handlers remain responsible for side effects.
- Pending: registry metadata for queue retry/failure policy.
- Risks: prepared-only allowed actions still have no handlers by design.
- Next recommended step: move retry classification metadata into action definitions.

## 2026-05-09 Stage 3R — Action Definition Queue Metadata

- Changed: real action metadata is now available to queue governance and execution paths through the registry.
- Completed: permission checks no longer depend on a separate action rules table.
- Pending: queue retry/failure classification should use definition metadata directly when more handlers exist.
- Risks: prepared-only actions still bypass definitions because they intentionally have no side effects.
- Next recommended step: define separate metadata for prepared-only action types.

## 2026-05-09 Stage 3S — Context Pack Queue Action Alignment

- Changed: actions proposed by runtime context now align with registry-backed action execution.
- Completed: `recommendedActions` schema enum comes from allowed actions assembled before queueing execution requests.
- Pending: queue-time validation against schema before action planning.
- Risks: runtime output still needs explicit schema validation at result ingestion.
- Next recommended step: validate runtime output against Context Pack `requiredOutputSchema`.

## 2026-05-09 Stage 3T — Runtime Result Queue Contract Validation

- Changed: runtime result ingestion validates output before enqueueing action-planning/timeline projections.
- Completed: invalid successful outputs do not create `pulse.actions` work and do not publish runtime action planned timeline jobs.
- Pending: failed/runtime-invalid projection strategy if operators need sanitized visibility.
- Risks: current rejection happens synchronously in the result ingestion path.
- Next recommended step: add sanitized invalid-output timeline/audit projection if operational support needs it.
