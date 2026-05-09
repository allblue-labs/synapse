# Synapse Architecture

Synapse starts as a modular monolith because the product needs strong iteration speed and clean boundaries more than early service sprawl. Each NestJS module owns one domain concept and exposes services that require tenant context.

## Domain Boundaries

- `auth`: registration, login, token issuance, and authentication strategy.
- `tenants`: tenant lifecycle and tenant-level settings.
- `users`: user profile and membership access.
- `agents`: business agents, behavior, model settings, and lifecycle.
- `conversations`: conversation records, status, assignment-ready fields, and extracted data.
- `messages`: immutable conversation history with normalized and provider payloads.
- `channels`: provider adapters and normalized inbound/outbound message contracts.
- `knowledge-base`: customer-provided context for retrieval.
- `ai-orchestrator`: prompt assembly, retrieval injection, LLM provider calls, and response parsing.
- `billing`: subscription state and entitlements.

## Tenant Isolation

Every tenant-owned entity includes `tenantId`. Controllers derive tenant context from authenticated claims, and services use `tenantId` in reads before writes. This design keeps authorization close to the domain logic and prepares the database for PostgreSQL Row Level Security when the platform matures.

## Scaling Path

The first extraction candidates are not arbitrary modules. They are high-throughput workflows:

- channel webhook ingestion
- AI response generation
- outbound channel delivery
- billing webhook processing
- analytics aggregation

Those can move to workers or services later because the synchronous API already depends on clear interfaces.

## 2026-05-09 Module Context Ownership

Synapse is the governance/control plane; product modules own operational context. Module-specific cognitive context must be assembled inside the module boundary and submitted to Synapse/runtime governance as a validated contract.

For Pulse this means context assembly stays under `apps/api/src/product-modules/pulse`, not under generic core runtime/intelligence services. Synapse core can validate tenant existence, module enablement, RBAC, feature flags, plan/usage limits, execution policy, audit, and the context shape.

## 2026-05-09 Pulse Context Pack Foundation

Pulse now has a module-local `PulseContextPack` contract and assembler. It reads Pulse-owned operational tables through tenant-scoped queries and returns an audit-safe pack for future runtime execution governance.

No platform/core service assembles Pulse context. No Postgres schema split, RLS, Redis hotpath, queue split, or runtime provider call was introduced in this stage.

## 2026-05-09 Pulse Async Pipeline Foundation

Pulse now owns module-specific queue boundaries:

- `pulse.inbound`: normalize/process minimal inbound operational work.
- `pulse.context`: assemble Pulse Context Packs.
- `pulse.execution`: prepare governed execution lifecycle.
- `pulse.actions`: dispatch approved operational actions.
- `pulse.timeline`: append timeline/event projections.
- `pulse.failed`: capture failed Pulse jobs for review/replay.

Only `pulse.inbound` has an active worker today. The remaining queues are contracts for incremental implementation and keep heavy module logic out of the HTTP request lifecycle.

## 2026-05-09 Pulse Context Worker

`pulse.context` is now active. It is responsible for assembling Pulse-owned context and creating a platform-owned `ExecutionRequest` in `REQUESTED` status.

This is a persistence/lifecycle boundary only. It does not call the Go Runtime, local executors, OpenAI, Claude, or any provider. Runtime execution remains behind later governance and execution workers.

## 2026-05-09 Execution Governance + Store Visibility

Execution requests now pass through a platform governance service before becoming `QUEUED`. The first checks are module activation, tenant module enablement, and request-type allowlist.

Module catalog also has a separate `storeVisible` flag. This controls marketplace/commercial exposure only; it is not the same as module active state, tenant installation, rollout state, or runtime governance.

## 2026-05-09 Pulse Execution Worker

`pulse.execution` is now active as a no-provider dispatch worker. It consumes governed `QUEUED` execution requests and completes a placeholder lifecycle result that explicitly states no runtime provider exists yet.

This gives Synapse a complete async skeleton from context assembly to execution lifecycle without introducing external provider side effects.

## 2026-05-09 Pulse Timeline Worker

`pulse.timeline` is active and persists queued operational timeline jobs as `PulseOperationalEvent` records. Execution dispatch now emits timeline jobs instead of writing those events directly.

The system still has older direct event writes; the queue-projected timeline path is the preferred direction for async lifecycle events.

## 2026-05-09 Pulse Actions Worker

`pulse.actions` is active as a no-side-effect worker. It validates action jobs, checks an allowlist, and projects action lifecycle into `pulse.timeline`.

Real business mutations and integrations remain pending behind typed action handlers.

## 2026-05-09 First Real Pulse Action Handler

Pulse now has a typed action handler contract and one real handler: `ticket.advance_flow`. It mutates ticket workflow state through the existing Pulse lifecycle use case, preserving tenant filtering, audit, operational events, and usage metering already present there.

No external integrations or provider-triggered automatic actions are enabled yet.

## 2026-05-09 Governed Action Enqueue

`PulseActionGovernanceService` is now the module-level entrypoint for creating real action jobs. It validates action rules and permission snapshots before publishing to `pulse.actions`.

The lower-level queue service remains infrastructure and should not be used as a production action creation API for mutating actions.
