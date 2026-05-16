# Synapse Runtime Architecture

Last updated: 2026-05-08

## Responsibility Boundary

Synapse Runtime is not the SaaS platform backend. The NestJS platform remains responsible for auth, RBAC, tenants, billing, subscriptions, feature flags, usage governance, audit, module registry, AppSec, and execution request persistence.

The Runtime is responsible for LLM/provider execution orchestration, timeout-safe execution, retry/fallback behavior, normalized provider responses, execution metadata, and future MCP/tool/local-model orchestration.

## Structure

- `cmd/runtime`: service entrypoint
- `internal/contracts`: execution request/response/context contracts
- `internal/execution`: execution engine and lifecycle behavior
- `internal/policies`: execution policy defaults and validation
- `internal/providers`: provider interface and registry
- `internal/providers/openai`: OpenAI adapter
- `internal/providers/claude`: Claude adapter
- `internal/telemetry`: structured logging and masking helpers
- `internal/transport/http`: REST transport

## Execution Lifecycle

1. REST receives `POST /executions`.
2. Transport validates JSON shape and request size.
3. Engine validates tenant/module/input requirements.
4. Policy layer resolves timeout, retry, fallback, and provider allowlist.
5. Engine selects providers from request preference or registry order.
6. Provider execution runs in a goroutine under request context timeout.
7. Engine retries failed attempts up to policy limits.
8. Engine falls back to the next allowed provider when enabled.
9. Provider response is normalized into `ExecutionResponse`.
   When structured output is requested, provider text is parsed as JSON into `structuredPayload`; invalid JSON fails the attempt and may trigger retry/fallback.
10. Runtime logs execution metadata without sensitive prompts or provider secrets.

## Provider Abstraction

Providers implement:

- `Name()`
- `Execute(ctx, request)`
- `Stream(ctx, request)`
- `Health(ctx)`
- `Models(ctx)`

Stage 1 includes OpenAI and Claude adapters. Claude system messages are sent through Anthropic's `system` field. Future providers should live in separate adapter packages and never leak provider-specific payload details into the engine.

## REST V1

- `GET /health`
- `GET /providers`
- `GET /models`
- `POST /executions`

REST is the Stage 1 transport. The package layout is designed so gRPC and queue consumers can call the same execution engine later.

## Platform Authentication

`POST /executions` is protected by HMAC signatures when the server is started normally.

Required headers:

- `x-synapse-runtime-key-id`
- `x-synapse-runtime-timestamp`
- `x-synapse-runtime-signature`

Canonical string:

```text
METHOD
PATH
UNIX_TIMESTAMP
RAW_BODY
```

The signature is `sha256=` plus the HMAC-SHA256 hex digest using `SYNAPSE_RUNTIME_SHARED_SECRET`. The timestamp must be within five minutes of the runtime clock.

Local development may set `SYNAPSE_RUNTIME_ALLOW_UNSIGNED=1`, but this must not be enabled in production.

The NestJS platform now has a matching signer/client foundation. V1 dispatch uses this signed REST client only from Synapse core runtime orchestration. Product modules must not call the Runtime directly. Synapse should remain the only control-plane submitter until queue/gRPC service identity is designed.

Future asynchronous callbacks should target Synapse core `/v1/runtime/results`. Synapse validates signatures and routes by persisted execution state. Product modules only implement result handler contracts.

## AppSec

- Provider keys are read from environment variables only.
- Runtime request bodies are size-limited.
- Unknown JSON fields are rejected.
- Execution requests require HMAC signatures by default.
- Request context timeout is enforced.
- Panics are recovered at the transport boundary.
- Logs avoid raw prompts, provider secrets, tokens, credentials, and chain-of-thought.
- Tenant id is mandatory in every execution request.

## Future Kubernetes Direction

Kubernetes/client-go orchestration is not implemented in Stage 1. Future work should add worker scheduling behind the execution engine without changing platform-facing contracts.

## Future MCP Direction

Allowed tools are present in the execution request contract, but tool execution is not implemented. Future MCP/tool support should enforce tenant-scoped tool allowlists from the platform before any tool invocation.

## Current Limitations

- Service authentication is HMAC shared-secret based; managed rotation/workload identity is not implemented yet.
- No gRPC or queue consumer yet.
- No streaming provider responses yet.
- No local model adapters yet.
- No Kubernetes scheduling yet.
- No platform lifecycle callback yet.
- Pulse V1 uses synchronous REST; async callback/replay storage remains pending.
