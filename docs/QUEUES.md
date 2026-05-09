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
