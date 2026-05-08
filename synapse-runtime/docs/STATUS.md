# Synapse Runtime Status

Last updated: 2026-05-08

## Stage 1 Foundation

- Changed: created the first isolated Synapse Runtime service in Go under `synapse-runtime/`, separate from the NestJS platform backend.
- Completed: REST transport, execution contracts, tenant-aware execution context, provider abstraction, OpenAI adapter, Claude adapter, execution engine, timeout propagation, retry/fallback behavior, structured logging, panic recovery, payload-safe logging conventions, and focused unit tests.
- Pending: service authentication with the NestJS platform, async queue/gRPC transport, streaming execution, Kubernetes orchestration, local model providers, MCP/tool execution, usage callbacks, and deployment manifests.
- Risks: provider adapters require real provider keys and have not been live-tested against production provider APIs in this environment.
- Next recommended step: define the platform-to-runtime authentication contract and add signed execution request validation before deployment.

## Verification

- `go test ./...` is expected to validate Stage 1 packages.
- Provider calls are not made during tests; fake providers cover engine behavior.

## 2026-05-08 Platform Handshake Foundation

- Changed: protected `POST /executions` with HMAC request signature validation for platform-to-runtime calls.
- Completed: added signature contract headers, replay-window validation, key id support, signed body verification, unsigned-request rejection, explicit local-dev unsigned mode, and tests for valid, invalid, expired, missing, and transport-level signatures.
- Pending: NestJS signing client, key rotation storage, callback authentication, queue/gRPC auth reuse, and deployment secret management.
- Risks: shared-secret HMAC is a Stage 2 foundation; production should move to managed secret rotation or workload identity before distributed runtime scale.
- Next recommended step: implement the NestJS runtime client signer and lifecycle callback contract.

## 2026-05-08 Platform Client Signer Alignment

- Changed: NestJS platform now has a matching HMAC signer and HTTP client foundation for `POST /executions`.
- Completed: runtime canonical signature format is shared across implementations by tests and documentation.
- Pending: callback auth, key rotation, and end-to-end signed request tests across both services.
- Risks: mismatched clocks can reject signed requests because the runtime enforces a five-minute replay window.
- Next recommended step: add integration tests that run the Go Runtime locally and submit from the NestJS client.
