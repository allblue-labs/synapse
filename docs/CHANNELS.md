# Messaging Module Channel Integrations

Channels are backend platform transport adapters used by product modules such as Pulse. They must not own AI behavior or core workflows.

## Adapter Contract

Each adapter must implement:

- `getChannelType()`
- `validateWebhook()`
- `normalizeInboundMessage()`
- `sendMessage()`

## Responsibilities

- Validate webhook authenticity before accepting provider payloads.
- Normalize provider payloads into Synapse's internal message shape.
- Send outbound messages through the provider.
- Keep provider-specific payloads out of domain services except as archived metadata.

## Current State

- Telegram has a permissive development validation path and basic normalization.
- WhatsApp has a provider-agnostic stub. It must be backed by a concrete provider implementation before production.
- Discord has a stub with normalization shape and outbound delivery intentionally deferred.
- Inbound accepted messages enqueue message-processing and AI-response jobs through core queue capabilities.

## Webhook Security Expectations

- Verify signatures or provider secrets.
- Reject replayed timestamps where supported.
- Use idempotency keys or provider message IDs.
- Log validation failures with request ID and channel account ID.
- Never allow unvalidated production webhooks to enqueue AI work.
