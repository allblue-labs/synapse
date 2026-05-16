# Synapse Runtime Roadmap

Last updated: 2026-05-08

## Stage 1 — Isolated Runtime Foundation

- [x] Standalone Go module outside the NestJS backend
- [x] REST transport: `POST /executions`, `GET /health`, `GET /providers`, `GET /models`
- [x] Execution request/response/context contracts
- [x] Provider interface with `Execute`, `Stream`, `Health`, and `Models`
- [x] OpenAI provider adapter
- [x] Claude provider adapter
- [x] Retry/fallback execution engine
- [x] Context timeout and cancellation propagation
- [x] Structured logging and panic recovery
- [x] Unit tests with fake providers

## Stage 2 — Platform Handshake

- [x] Runtime-side signed service-to-service authentication validator
- [x] NestJS runtime client signer foundation
- [x] First Synapse core signed REST handoff to Go Runtime
- [ ] Runtime callback contract for lifecycle updates
- [ ] Usage/governance callback contract
- [ ] Tenant/provider policy synchronization
- [ ] Request idempotency at runtime boundary

## 2026-05-08 Platform Handshake Foundation

- Changed: Stage 2 began with runtime-side HMAC validation on execution requests.
- Completed: `POST /executions` can require `x-synapse-runtime-key-id`, `x-synapse-runtime-timestamp`, and `x-synapse-runtime-signature` headers; the service refuses startup without `SYNAPSE_RUNTIME_SHARED_SECRET` unless `SYNAPSE_RUNTIME_ALLOW_UNSIGNED=1` is explicitly set for local development.
- Pending: NestJS signer, secret rotation, callback auth, async transport auth, and request idempotency.
- Risks: shared secrets must be isolated per environment and never logged.
- Next recommended step: implement platform client signing and document exact canonical signature generation for NestJS.

## 2026-05-08 Platform Client Signer Alignment

- Changed: platform-side signing is now implemented in NestJS.
- Completed: `RuntimeSignatureService` and `RuntimeHttpClient` align with the runtime HMAC contract.
- Pending: lifecycle callback endpoint/auth, idempotent submission orchestration, and real platform-to-runtime integration tests.
- Risks: the client is not yet wired into product-module execution flows.
- Next recommended step: create a governed runtime submission use case in the platform.

## 2026-05-16 Runtime V1 — Synapse Handoff

- Changed: first product-module execution path now reaches the Go Runtime only through Synapse core runtime dispatch.
- Completed: Synapse core creates runtime invocation input from the persisted module-submitted Context Pack and sends OpenAI/Claude provider preferences with fallback enabled.
- Completed: product modules do not know Runtime transport, signature, URL, or provider policy.
- Completed: structured output parsing now exists in the runtime engine before responses are returned to the platform.
- Pending: callback auth/replay, async queue/gRPC transport, tenant provider policy sync, usage callbacks, and live provider smoke tests.
- Risks: synchronous REST is acceptable for V1 but should not become the long-term high-volume runtime path.
- Next recommended step: add replay-safe lifecycle callback storage before enabling asynchronous Runtime-to-API callbacks.

## 2026-05-16 Runtime V1 — Callback Target

- Changed: future async callback target is Synapse core `/v1/runtime/results`.
- Completed: callback routing is platform-owned and module handlers are contract adapters only.
- Pending: Runtime-side async callback sender and Synapse callback replay ledger.
- Risks: callback payloads must not select module routing; Synapse must route from persisted execution state.
- Next recommended step: implement callback receipt storage before enabling async callbacks.

## Stage 3 — Async Execution

- [ ] Queue consumer transport
- [ ] gRPC transport
- [ ] Streaming responses
- [ ] Cancellation endpoint or callback protocol
- [ ] Execution result persistence callback to platform

## Stage 4 — Provider Expansion

- [ ] Ollama adapter
- [ ] vLLM adapter
- [ ] DeepSeek adapter
- [ ] Provider health scoring
- [ ] Tenant-specific provider allowlists

## Stage 5 — Distributed Runtime

- [ ] Kubernetes/client-go orchestration
- [ ] Worker pools
- [ ] MCP/tool runtime
- [ ] Local model pools
- [ ] Prometheus/OpenTelemetry instrumentation
