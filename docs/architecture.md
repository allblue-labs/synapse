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

## 2026-05-09 Runtime Output Planning Boundary

Pulse now has a module-owned planner between normalized runtime output and operational action queues. Runtime responses remain advisory until Pulse validates output shape, allowed actions, confidence, supported flow state, ticket context, and action governance.

No provider/runtime response is consumed yet. The next architectural step is a narrow execution-result ingestion use case that loads tenant-scoped execution context and invokes the Pulse planner.

## 2026-05-09 Pulse Runtime Result Ingestion

Pulse now has that narrow ingestion use case. It loads the tenant-scoped execution request from the platform runtime lifecycle service, verifies the stored Context Pack belongs to Pulse, transitions lifecycle status, emits audit-safe timeline jobs, and invokes the Pulse action planner only for successful results.

The ingress adapter is still pending. External runtime callbacks must be signed and service-actor scoped before this path becomes public or provider-connected.

## 2026-05-09 Signed Pulse Runtime Callback

Pulse now has a signed REST ingress adapter for normalized runtime results. The route bypasses user JWTs because it is service-to-service, but it requires raw-body HMAC verification through runtime core before module ingestion.

The endpoint is not a frontend contract. It prepares the future external runtime boundary while keeping provider execution outside the NestJS platform.

## 2026-05-09 Runtime Actor Snapshot

Execution requests now carry the original actor/permission snapshot from the platform boundary. Pulse runtime result ingestion uses that stored snapshot for lifecycle attribution and governed action planning.

The runtime callback is therefore transport-authenticated only; it does not decide user authority.

## 2026-05-09 Runtime Result Persistence Fixtures

Pulse runtime result ingestion now has database-backed fixture coverage for actor snapshot usage, cross-tenant denial, and missing-snapshot rejection.

The fixture is opt-in through `RUN_DATABASE_TESTS=1`, matching the existing local database strategy.

## 2026-05-09 Action Worker Permission Revalidation

Pulse action rules now protect both sides of the queue: creating real action jobs and executing real side-effect handlers.

This keeps queue infrastructure from becoming an accidental privilege boundary. The worker still relies on tenant-scoped handlers for data isolation.

## 2026-05-09 Non-Retryable Action Governance Failures

Pulse action workers now classify RBAC/governance failures as terminal BullMQ failures. This avoids retry loops for payloads that cannot become valid without creating a new governed action job.

Transient infrastructure failures remain retryable.

## 2026-05-09 Strict Action Payload Validation

The first real Pulse action, `ticket.advance_flow`, now validates payload shape strictly before invoking domain mutation. Validation failures are terminal queue failures, separate from governance failures and transient infrastructure errors.

This sets the pattern for future action handlers: permissions, schema, and retry classification must be declared before side effects are enabled.

## 2026-05-09 Pulse Action Handler Registry

Pulse action execution now resolves real side-effect handlers through a module-local registry. The queue processor coordinates lifecycle projection and failure classification; handlers own domain side effects.

The next refinement is to colocate permissions, payload schema, retry classification, and future usage metadata with handler registration.

## 2026-05-09 Pulse Action Definitions

Pulse action handlers now expose definition metadata. Enqueue governance and worker execution both read required permissions from the same registry-backed definition.

This keeps module action policy closer to the handler that owns the side effect.

## 2026-05-09 Context Pack Action Derivation

Pulse Context Pack assembly now consumes action registry definitions when exposing real side-effect actions to future runtime execution.

The runtime receives a narrower action vocabulary, and backend governance/worker enforcement uses the same source for real action names.

## 2026-05-09 Runtime Output Schema Enforcement

Pulse runtime result ingestion now validates successful outputs against the saved module Context Pack before marking execution success or planning actions.

This keeps module-owned cognitive context contracts enforceable at the Synapse governance boundary without moving Pulse-specific semantics into platform core.

## 2026-05-14 Platform Governance and Pulse Operations Boundary

Synapse platform services own commercial and security governance: subscriptions, credits, quotas, tenant limits, module access, plan enforcement, RBAC, audit, and AppSec.

Pulse owns only operational data and behavior. The new Pulse schedule model covers business hours, temporary closure state, operational pause, closed-message preparation, and next opening metadata without embedding subscription or credit rules.

## 2026-05-14 Membership CRUD and Workspace Sessions

Tenant access now has an explicit membership-management surface and a workspace selection endpoint.

The selected session still carries a role snapshot for compatibility, but the backend now has the membership CRUD foundation needed to move permission resolution to live membership data.

## 2026-05-14 Live Membership Permission Resolution

`PermissionsGuard` now asks a backend resolver for the effective permission set.

Tenant permissions come from `UserMembership`, are accelerated through Redis with a short TTL, and fall back to PostgreSQL. JWT role remains useful for session context and audit comparison, but not as the sole authorization source.

## 2026-05-14 Authorization Database Fixtures

Authorization now has opt-in database fixtures for stale JWT downgrade and cross-tenant membership resolution.

These fixtures are skipped by default and run with `RUN_DATABASE_TESTS=1` when a migrated Postgres database is available.

## 2026-05-14 Runtime Actor Revalidation

Runtime actor snapshots are now attribution records, not authorization authorities.

Pulse result ingestion revalidates the actor against live membership permissions before automatic actions are planned, keeping runtime callbacks aligned with current RBAC.

## 2026-05-14 Membership User Quota Enforcement

Membership creation now consumes platform plan limits before adding tenant users.

This keeps commercial governance in Synapse billing/platform services while tenant membership remains the RBAC persistence model.

## 2026-05-14 Tenant Plan Limits Cache

Tenant plan limits are now cached in Redis with PostgreSQL fallback.

The cache accelerates governance hotpaths such as membership quota checks, while billing tables remain the source of truth and mutation paths perform best-effort invalidation.

## 2026-05-14 Governed Pulse Action Usage

Pulse action handlers now report completed workflow side effects to platform billing through `BillingService.consumeUsageOrReject`.

The module remains responsible for operational action semantics, while Synapse platform remains responsible for usage idempotency, credits, quotas, and billing governance.

## 2026-05-14 Usage Idempotency Retry Safety

Usage idempotency now resolves an existing tenant/idempotency-key event before quota checks.

This prevents retry loops from turning a successful first usage write into a later quota failure while preserving first-write credit enforcement.

## 2026-05-14 Pulse Action Side-Effect Idempotency

Pulse `ticket.advance_flow` now persists consumed action idempotency keys in ticket metadata.

This gives normal BullMQ retries a durable skip path for duplicate operational side effects while the next architecture step remains a dedicated action execution ledger for concurrent duplicate protection.

## 2026-05-14 Durable Pulse Action Execution Ledger

Pulse now owns `pulse_action_executions`, a tenant-scoped ledger for operational action idempotency.

The ledger claims action keys before side effects and records `STARTED`, `SUCCEEDED`, or `FAILED`, keeping operational action state inside the module while Synapse platform continues to own governance and billing.

## 2026-05-14 Transactional Pulse Action Execution

Pulse `ticket.advance_flow` now commits ledger claim, ticket mutation, operational event, audit event, usage event, and ledger completion in one Prisma transaction.

The transaction contains only database work; external provider/runtime calls remain outside this boundary.

## 2026-05-15 Pulse Action Telemetry

Pulse action execution now emits structured, payload-free telemetry through `PulseActionTelemetryService`.

The service hashes idempotency keys and records queue/ledger outcomes for operators without creating billing records or frontend-facing contracts.

## 2026-05-15 Multitenant Database Hardening

Synapse added a database hardening migration focused on tenant-scoped performance and RLS readiness.

The migration adds targeted compound indexes for real hotpaths and prepares `app_security` RLS helper functions/policies. `PrismaService.withTenantContext()` now sets tenant context per transaction with `SET LOCAL app.current_tenant_id`; RLS enforcement remains intentionally disabled until repositories are migrated and DB fixtures prove behavior table-by-table.

## 2026-05-15 Pulse Schema Separation

Pulse operational persistence now maps to the PostgreSQL schema `pulse` through Prisma `multiSchema`.

Synapse platform/governance data remains in `public`: tenants, users, memberships, RBAC, billing, subscriptions, quotas, module registry, audit, usage, and runtime execution requests.

Pulse owns only operational module data in `pulse`: entries, channels, conversations, tickets, operational events, action executions, playbooks, schedules, knowledge contexts, skills, and Pulse integration settings. Cross-schema foreign keys to `public.Tenant` preserve central Synapse control.

## 2026-05-15 Pulse Tenant Context Repositories

Pulse repositories now use a module-local wrapper around `PrismaService.withTenantContext()`.

This keeps module code extractable-first while ensuring every current Pulse operational repository path sets the tenant database session before touching `pulse.*`. Synapse still owns governance checks before module calls, and RLS remains the next database-level enforcement layer.

## 2026-05-15 Pulse RLS Activation

Pulse RLS is enabled and forced in migration for current `pulse.*` tables.

The database policy uses `app_security.tenant_visible("tenantId")`, which requires the transaction-scoped tenant id set by Synapse or an explicit controlled platform bypass. This makes schema separation an actual tenant isolation layer, not only organization.

## 2026-05-16 Pulse RLS Fixture Coverage

The opt-in Pulse RLS fixture now spans the operational surfaces that matter for V1: tickets, channels, conversations, timeline events, schedules, knowledge, and integrations.

The fixture remains skipped by default and must be run with `RUN_DATABASE_TESTS=1` against a migrated PostgreSQL database.

## 2026-05-16 Runtime V1 Handoff

Synapse remains the control plane for runtime execution: it persists `ExecutionRequest`, validates module governance, queues work, signs the request, and ingests the normalized result.

The isolated Go Runtime is now the first execution plane for provider calls. Synapse core derives an invocation from the module-submitted Context Pack, calls `POST /executions` over signed REST, and routes successful output back through module validation/action governance. OpenAI and Claude stay behind runtime provider adapters; provider logic is not embedded in Pulse or other modules.

Runtime results return through Synapse core `/v1/runtime/results`. The central ingress validates HMAC/raw body, loads the persisted execution request, resolves the module handler from saved `moduleSlug`, and then invokes the module adapter. Modules do not expose runtime callback controllers.
