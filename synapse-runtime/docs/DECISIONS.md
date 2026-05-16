# Synapse Runtime Decisions

## 2026-05-08 — Runtime is isolated from the platform backend

**Decision:** Build Synapse Runtime as a standalone Go service under `synapse-runtime/`, not inside `apps/api`.

**Reason:** NestJS owns SaaS control-plane concerns. The runtime owns cognitive execution, provider orchestration, retries, fallbacks, and future worker/tool execution.

**Consequence:** Runtime contracts are HTTP/JSON in Stage 1 and can later be mirrored into gRPC/queue consumers without coupling to NestJS internals.

**Status:** Completed for Stage 1.

**Risk:** Service-to-service authentication is still pending.

**Next recommended step:** define signed platform-to-runtime request validation.

---

## 2026-05-08 — Provider adapters hide provider-specific payloads

**Decision:** Provider-specific request/response formats live only in provider adapter packages.

**Reason:** The execution engine must reason about normalized runtime contracts, not OpenAI or Claude-specific wire shapes.

**Consequence:** Future providers such as Ollama, vLLM, DeepSeek, and local models can be added by implementing the same provider interface.

**Status:** Completed for OpenAI and Claude.

**Risk:** Streaming is interface-ready but not implemented in Stage 1 adapters.

**Next recommended step:** add streaming after service authentication and callback contracts are stable.

---

## 2026-05-08 — Runtime logs metadata, not sensitive prompts

**Decision:** Structured runtime logs include execution ids, tenant ids, provider names, attempts, latency, and errors, but avoid raw prompts, chain-of-thought, provider secrets, and token values.

**Reason:** Runtime observability must support operations without leaking tenant-sensitive execution data.

**Consequence:** Logging helpers recursively mask sensitive metadata keys and transport errors avoid echoing raw request bodies.

**Status:** Completed for Stage 1 logging.

**Risk:** Provider adapters must keep future logs behind the same safe logging conventions.

**Next recommended step:** add OpenTelemetry spans with the same redaction posture.

---

## 2026-05-08 — Runtime execution requests require HMAC signatures

**Decision:** Protect `POST /executions` with an HMAC-SHA256 signature over method, path, timestamp, and raw request body.

**Reason:** The runtime is not a public SaaS backend. Execution requests should come from the Synapse platform or another trusted control-plane component, and tenant context must not be accepted from arbitrary unsigned callers.

**Consequence:** Runtime startup requires `SYNAPSE_RUNTIME_SHARED_SECRET` by default. Local unsigned execution is possible only with explicit `SYNAPSE_RUNTIME_ALLOW_UNSIGNED=1`.

**Status:** Completed runtime-side validation.

**Risk:** Shared-secret HMAC needs key rotation and secure secret distribution before production scale.

**Next recommended step:** implement the NestJS signer and callback auth with the same canonical signature format.

---

## 2026-05-08 — Platform client mirrors Runtime signature contract

**Decision:** Keep the canonical HMAC signature format identical between the Go Runtime verifier and the NestJS platform signer.

**Reason:** The Runtime should not depend on NestJS internals, but both services need a stable interoperable handshake for Stage 2.

**Consequence:** The platform can sign `POST /executions` without embedding runtime provider logic, and the Runtime can validate requests without knowing platform implementation details.

**Status:** Completed for signer/client foundation.

**Risk:** End-to-end service tests are still pending.

**Next recommended step:** add signed integration tests and callback authentication.

---

## 2026-05-16 — Keep Runtime V1 synchronous but Synapse-governed

**Decision:** Wire the first V1 integration as signed synchronous REST from Synapse core runtime dispatch to `POST /executions`.

**Reason:** This proves the platform/runtime contract with OpenAI/Claude provider calls before introducing queue/gRPC callback complexity, while keeping product modules isolated from runtime details.

**Consequence:** Synapse remains the governance, persistence, orchestration, and runtime-dispatch layer; the Go Runtime only executes provider orchestration and returns normalized output.

**Status:** Implemented for Pulse execution worker handoff.

**Risk:** Provider latency occupies worker capacity until async callbacks or queue consumers are introduced.

**Next recommended step:** add callback replay storage and lifecycle callback authentication before moving to async execution.

---

## 2026-05-16 — Structured output is normalized inside the Runtime engine

**Decision:** When `structuredOutput` is requested, parse provider text output as JSON and return it as `structuredPayload`.

**Reason:** The platform should validate module output contracts against normalized data, not provider-specific text blobs.

**Consequence:** Invalid JSON becomes a provider-attempt failure and can trigger retry/fallback.

**Status:** Implemented.

**Risk:** Provider prompting must stay strict enough to produce JSON consistently until provider-native JSON modes are added per adapter.

**Next recommended step:** add provider-native structured output support for OpenAI/Claude where stable.

---

## 2026-05-16 — Runtime callbacks target Synapse core

**Decision:** Future Runtime-to-platform callbacks must target Synapse core `/v1/runtime/results`.

**Reason:** Product modules must not expose Runtime callback transport or authentication endpoints.

**Consequence:** Synapse authenticates callbacks and routes by persisted execution state; modules only implement result handler contracts.

**Status:** Platform-side ingress implemented; Runtime-side async sender pending.

**Risk:** Replay protection is still pending.

**Next recommended step:** add callback receipt storage before async callbacks are enabled.

---

## 2026-05-16 — Synapse owns Runtime callback replay receipts

**Decision:** Treat callback receipt/replay storage as a Synapse platform concern.

**Reason:** The Runtime should sign callbacks, but Synapse owns persistence, replay decisions, module routing, and idempotent handler invocation.

**Consequence:** Runtime async sender can retry safely against `/v1/runtime/results`; Synapse decides whether a callback is first-seen or replayed.

**Status:** Synapse-side receipt storage implemented.

**Risk:** Runtime still needs explicit callback attempt ids for better observability.

**Next recommended step:** add Runtime-side callback sender/retry policy after smoke testing signed REST.

---

## 2026-05-16 — Runtime provides usage metadata, Synapse meters usage

**Decision:** Runtime adapters may return provider usage metadata, but only Synapse records billable usage.

**Reason:** Runtime is the execution plane. Synapse is the governance and billing control plane.

**Consequence:** Runtime must not store billing records, enforce quotas, rate usage, or know plan limits.

**Status:** Implemented on the Synapse synchronous dispatch path.

**Risk:** Future async callback implementation must keep this split intact.

**Next recommended step:** include provider usage metadata in signed async callbacks without adding billing behavior to Runtime.

---

## 2026-05-16 — Add opt-in async callbacks before durable runtime queues

**Decision:** Implement async callback delivery as an opt-in REST capability before introducing durable queue/gRPC transport.

**Reason:** Synapse needs the callback contract validated early while preserving the current synchronous path by default.

**Consequence:** Runtime can return `accepted` and later POST signed terminal results to Synapse core.

**Status:** Implemented.

**Risk:** In-process async execution can be lost on Runtime restart.

**Next recommended step:** replace in-process async work with durable queue-backed execution.

---

## 2026-05-16 — Preserve provider metadata in callback envelope

**Decision:** Runtime callbacks include provider/model/usage/latency metadata and `runtimeExecutionId`.

**Reason:** Synapse needs audit-safe execution metadata to meter provider calls while keeping billing outside Runtime.

**Consequence:** Synapse can split the provider envelope from module output at callback ingress.

**Status:** Implemented.

**Risk:** Callback payloads must not include raw prompts, provider secrets, or chain-of-thought.

**Next recommended step:** add callback attempt ids for retry observability.
