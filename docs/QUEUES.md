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
