# Tenant Isolation

Synapse treats tenant isolation as a core product safety requirement.

## Current Approach

- Tenant-owned database entities include `tenantId`.
- Authenticated requests derive tenant context from JWT claims.
- `TenantGuard` rejects requests where an optional `x-tenant-id` header conflicts with the authenticated tenant.
- Tenant-scoped application code should use `TenantPrismaService` for common tenant-owned domains.

## Why Not Global Prisma Middleware Yet

Global Prisma middleware can hide tenant behavior and break legitimate admin/system jobs, nested writes, or cross-tenant operational queries. Synapse currently uses explicit tenant-safe helpers so developers can see where tenant scope enters a query.

## Developer Rules

- Do not trust client-provided `tenantId` in request bodies.
- Do not call `prisma.agent`, `prisma.conversation`, or other tenant-owned delegates directly from controllers.
- Prefer `TenantPrismaService` or a domain repository for tenant-owned data.
- If a system/admin query must cross tenants, isolate it in a clearly named service and document why.
- Add tests for tenant-sensitive read and write paths.

## Future Hardening

- Evaluate PostgreSQL Row Level Security as defense in depth.
- Add CI checks for direct Prisma access in tenant-sensitive modules.
- Add integration tests that attempt cross-tenant reads/writes.

## 2026-05-07 Backend Update

- Changed: Pulse persistence moved to `PulseEntry`/`pulse_entries`; repository updates now include both `id` and `tenantId`.
- Completed: Pulse list, failed-list, create, update, and readback paths are tenant-scoped in the repository.
- Pending: formal integration tests that prove tenant A cannot read, validate, reject, retry, or update tenant B Pulse entries.
- Risks: `save(entry)` depends on the domain entity carrying the correct tenant id; prefer use-case methods that pass tenant context explicitly.
- Next recommended step: add a tenant-isolation spec for `PulseRepository` and controller-level authorization tests.

## 2026-05-07 Naming Update

- Changed: tenant-owned operational entries are named `PulseEntry` and stored in `pulse_entries`.
- Completed: no tenant-isolation behavior changed during the naming update.
- Pending: migration validation against a database with existing entry data.
- Risks: migration order matters because the rename preserves data.
- Next recommended step: apply the Pulse rename migration in a disposable database and inspect row preservation.

## 2026-05-07 RBAC + Route Protection Update

- Changed: added `TenantGuard` tests for required tenant context and mismatched `x-tenant-id` rejection.
- Completed: request tenant context assignment from the authenticated user is covered.
- Pending: Pulse repository tests must prove tenant A cannot mutate tenant B entries.
- Risks: guard tests prove request context behavior, not every persistence boundary.
- Next recommended step: add mocked Prisma tests for `PulseRepository.update` and `findById` tenant scoping.

## 2026-05-07 Pulse Tenant Isolation Test Update

- Changed: added mocked Prisma tests for Pulse repository tenant scoping.
- Completed: `findById`, `list`, `update`, failed update, and `create` paths are covered.
- Pending: integration tests against PostgreSQL with two tenants and conflicting entry IDs are still needed.
- Risks: repository tests do not cover future product-module repositories.
- Next recommended step: reuse this test pattern for every new tenant-owned module repository.

## 2026-05-07 Module Registry Store Update

- Changed: tenant module installation state is now stored in `tenant_module_installations`.
- Completed: module enable/disable state is scoped by `tenantId` and module id with a unique tenant/module constraint.
- Completed: tenant operations only use `PUBLIC` module catalog records.
- Pending: integration tests that prove tenant A module state does not affect tenant B runtime state.
- Risks: runtime specs are still in memory after persistence writes, so process restarts require runtime rehydration later.
- Next recommended step: add runtime rehydration from tenant module installations before Kubernetes/Pain integration.

## 2026-05-07 Billing Core Update

- Changed: module purchases are tenant-scoped and module enablement checks tenant billing state.
- Completed: `module_purchases` uses unique tenant/module constraints; billing account lookup is tenant-scoped.
- Pending: usage meter events must be tenant-scoped and tested before AI/transcription costs are recorded.
- Risks: Stripe IDs are global identifiers and must never be used without tenant ownership checks.
- Next recommended step: implement tenant-scoped usage event writes with repository tests.

## 2026-05-07 Operational Usage Metering Update

- Changed: `usage_events` stores usage by tenant and billing period.
- Completed: usage idempotency is tenant-scoped; usage summaries filter by tenant and period.
- Pending: cross-tenant integration tests with real database fixtures.
- Risks: any future direct usage aggregation must always include tenant scope.
- Next recommended step: add e2e tests proving tenant A cannot read tenant B usage summaries.

## 2026-05-07 Usage Rating Update

- Changed: rated aggregates are tenant-scoped by tenant and billing period.
- Completed: aggregate upserts include tenant, billing period, metric, unit, and currency uniqueness.
- Pending: database-backed cross-tenant tests for rated summaries.
- Risks: any reporting job must rate one tenant/period at a time or enforce tenant filters.
- Next recommended step: add integration tests before batch rating jobs.

## 2026-05-07 Stripe Usage Reporting Update

- Changed: Stripe report records are tenant-scoped and tied to tenant aggregate ids.
- Completed: reporting looks up `BillingAccount` by tenant before sending customer usage.
- Pending: integration tests with multiple tenants and distinct Stripe customer ids.
- Risks: Stripe customer ids are global and must always be accessed through tenant-owned billing accounts.
- Next recommended step: add tenant-scoped webhook reconciliation for Stripe customer/subscription events.

## 2026-05-07 Stripe Webhook Reconciliation Update

- Changed: Stripe webhook reconciliation updates tenant billing accounts by tenant metadata first, then existing subscription/customer ids when metadata is unavailable.
- Completed: subscription events can set tenant-owned Stripe customer/subscription ids and billing status; invoice events only update accounts already linked by Stripe ids.
- Pending: checkout/customer provisioning must always stamp `tenantId` and `synapse_plan_key` metadata.
- Risks: Stripe identifiers are global; any future lookup must keep updates constrained to one `BillingAccount`.
- Next recommended step: add database integration tests with two tenants and distinct Stripe customer/subscription ids.

## 2026-05-07 Stripe Checkout Provisioning Update

- Changed: checkout provisioning creates or reuses Stripe customers only through the tenant-owned `BillingAccount`.
- Completed: new Stripe customer ids are persisted by `tenantId`; checkout sessions carry tenant metadata for later webhook reconciliation.
- Pending: multi-tenant e2e tests with two customers, customer portal tenant checks, and checkout session retrieval checks.
- Risks: a reused Stripe customer id must always come from the tenant billing account, never from client input.
- Next recommended step: add e2e tests proving tenants cannot create checkout sessions against another tenant customer.

## 2026-05-07 Stripe Portal + Redirect Allowlist Update

- Changed: portal sessions are created only from the authenticated tenant's `BillingAccount.stripeCustomerId`.
- Completed: no client-provided Stripe customer id is accepted for portal sessions.
- Pending: multi-tenant e2e tests for portal creation and checkout reconciliation.
- Risks: portal access depends on accurate tenant-owned customer ids.
- Next recommended step: add tests with two tenants and distinct Stripe customer ids.

## 2026-05-07 Stage 1 Backend Refinement + Pulse Foundation Update

- Changed: Pulse operational foundation tables all include `tenantId` and tenant-leading indexes/unique constraints.
- Completed: Pulse channels, conversations, tickets, events, playbooks, knowledge contexts, skills, integration settings, and execution requests are tenant-owned.
- Pending: repository/use-case tests for every new tenant-owned model beyond operational events.
- Risks: flexible cross-entity references like ticket/conversation ids must always be resolved through tenant-scoped queries.
- Next recommended step: add repositories that use `tenantId` in every read/write path for Pulse conversations and tickets.

## 2026-05-07 Pulse Operational Lifecycle Wiring Update

- Changed: Pulse lifecycle side effects use tenant-scoped operational event and ticket repositories.
- Completed: ticket creation and event reads/writes include `tenantId` in repository tests.
- Pending: tenant-scoped repositories for PulseChannel and PulseConversation.
- Risks: legacy `conversationId` remains a string on `PulseEntry`; future relation wiring must validate tenant ownership.
- Next recommended step: add conversation repository methods that resolve ids by tenant before linking entries/tickets/events.

## 2026-05-07 Pulse Channel + Conversation Ingestion Update

- Changed: entry ingestion can now resolve channels by tenant/provider/identifier and conversations by tenant/channel/participant.
- Completed: `PulseChannelRepository` and `PulseConversationRepository` tests lock tenant-scoped upsert keys.
- Pending: tenant-scoped read/list repositories and direct id validation for legacy `conversationId`.
- Risks: mixed legacy and resolved conversation paths must be unified before public provider webhooks are enabled.
- Next recommended step: add `findById(tenantId, id)` for PulseConversation and use it to validate direct ids.

## 2026-05-07 Pulse Direct Conversation Validation Update

- Changed: `PulseConversationRepository.findById` enforces `{ tenantId, id }` lookup for direct ids.
- Completed: create-entry use case refuses unowned conversation ids before side effects.
- Pending: database-backed two-tenant tests.
- Risks: future ticket/event linking must use the same tenant-scoped lookup pattern.
- Next recommended step: reuse tenant-scoped find methods in upcoming read APIs.

## 2026-05-07 Pulse Channel + Conversation Read API Update

- Changed: Pulse channel and conversation list/detail reads now use tenant-scoped repositories.
- Completed: `findById` and `list` methods include tenant filters for both entities.
- Pending: database-backed cross-tenant read tests.
- Risks: future include/expand options must keep tenant filters on related records.
- Next recommended step: add ticket/event read repositories with the same tenant-first pattern.

## 2026-05-07 Pulse Ticket + Timeline Read API Update

- Changed: Pulse ticket and operational event reads now use tenant-scoped repository methods.
- Completed: `PulseTicketRepository.findById/list`, `PulseOperationalEventRepository.listForConversation/listForTicket`.
- Pending: database-backed cross-tenant read tests.
- Risks: future timeline expansion must verify related ticket/conversation ownership by tenant.
- Next recommended step: add e2e tests with two tenants and overlapping ticket/event ids.

## 2026-05-07 Pulse Read Pagination Update

- Changed: paged reads use tenant-scoped `where` clauses for both data and count queries.
- Completed: repository tests assert tenant filters on paginated reads.
- Pending: database-backed two-tenant pagination tests.
- Risks: future filters must be merged into tenant-scoped queries, not replace them.
- Next recommended step: add helper builders for tenant-scoped filter objects.

## 2026-05-07 Pulse Read Filtering Update

- Changed: filter builders keep `tenantId` as the base predicate for channel, conversation, ticket, and event reads.
- Completed: tests assert tenant-plus-filter query shape.
- Pending: database-backed two-tenant filter tests.
- Risks: future include/expand behavior must apply tenant scope to related records too.
- Next recommended step: add e2e tests before adding expanded response payloads.

## 2026-05-07 Pulse Read Contract Test Update

- Changed: controller filter tests now verify filtered Pulse reads are executed with the server tenant id.
- Completed: channel, conversation, ticket, conversation-event, and ticket-event controller paths forward filters with the tenant id supplied by backend context.
- Pending: request-level tests with two tenants and overlapping ids.
- Risks: controller tests do not replace database-backed tenant isolation tests for real HTTP requests.
- Next recommended step: build e2e fixtures for cross-tenant filtered reads.

## 2026-05-07 Pulse HTTP Read E2E Harness Update

- Changed: HTTP tests now verify tenant guard behavior for filtered Pulse reads.
- Completed: mismatched `x-tenant-id` is rejected before channel reads execute.
- Pending: database-backed tests with two tenants and overlapping Pulse ids.
- Risks: guard-level tenant rejection is covered, but persistence-layer leak checks still need integrated fixtures.
- Next recommended step: add database-backed cross-tenant filtered read tests.

## 2026-05-08 Pulse Ticket Lifecycle Mutation Update

- Changed: ticket lifecycle mutations resolve tickets by `(tenantId, ticketId)` before updating.
- Completed: repository update tests prove cross-tenant/missing tickets return null without write attempts; use-case tests ensure missing tickets do not emit events or audit entries.
- Pending: database-backed two-tenant lifecycle mutation fixtures.
- Risks: repository updates use a tenant-scoped pre-read followed by id update; future transactional hardening may be needed under concurrent writes.
- Next recommended step: add database-backed cross-tenant mutation tests after timeline aggregation lands.

## 2026-05-08 Pulse Event Catalog + Timeline Aggregation Update

- Changed: timeline aggregation uses tenant-scoped event repository queries.
- Completed: ticket and conversation timelines preserve tenant id as the base query predicate for filtered category reads.
- Pending: database-backed two-tenant timeline fixtures with overlapping event ids.
- Risks: future include/expand behavior must not load related ticket/conversation data outside tenant scope.
- Next recommended step: add database-backed timeline isolation tests after flow-state rules land.

## 2026-05-08 Pulse Guided Flow State Machine Update

- Changed: guided flow transitions execute through the existing tenant-scoped ticket lifecycle path.
- Completed: invalid transitions stop before repository updates; accepted transitions still update by tenant-owned ticket id only.
- Pending: two-tenant transition fixtures and concurrent transition handling.
- Risks: concurrent operators could race flow metadata until transactional transition checks are added.
- Next recommended step: add database-backed mutation isolation tests after confidence rules land.

## 2026-05-08 Pulse Confidence + Human Review Layer Update

- Changed: confidence policy executes inside the tenant-scoped lifecycle mutation path.
- Completed: review/escalation rerouting still uses tenant-owned ticket reads before updates.
- Pending: database-backed two-tenant confidence transition fixtures.
- Risks: static thresholds are global today; tenant-specific thresholds must be tenant-scoped when added.
- Next recommended step: keep future threshold settings tenant-owned and never platform-global by accident.

## 2026-05-08 Pulse Knowledge Context Foundation Update

- Changed: Pulse knowledge context repository requires `tenantId` for every read/list/publish/archive path.
- Completed: list/query filters always include tenant scope; archive performs tenant-scoped lookup before update.
- Pending: two-tenant database fixtures with overlapping context ids.
- Risks: future retrieval aggregation must not mix tenant contexts for runtime requests.
- Next recommended step: include knowledge context in the database-backed tenant isolation suite.

## 2026-05-08 Pulse Scheduling Integration Contracts Update

- Changed: scheduling integration reads and prepare flows are tenant-scoped.
- Completed: integration lookup requires `(tenantId, integrationId)` and validates provider match before preparing availability or booking requests.
- Pending: database-backed two-tenant integration fixtures.
- Risks: future provider adapters must not use external refs without first resolving tenant-owned integration settings.
- Next recommended step: include integration settings in the tenant isolation fixture plan.

## 2026-05-08 Pulse Usage Metering Foundation Update

- Changed: Pulse usage events are written with the active tenant id from the use-case boundary.
- Completed: ticket, knowledge, scheduling, and entry message usage writes include tenant-owned resource ids.
- Pending: database-backed two-tenant usage summary tests for Pulse-specific units.
- Risks: future batch/retry jobs must preserve tenant id and idempotency keys.
- Next recommended step: include Pulse usage events in tenant isolation fixture plans.

## 2026-05-08 Runtime Execution Lifecycle Contract Update

- Changed: runtime execution lifecycle records are tenant-owned.
- Completed: request idempotency is scoped by tenant; read and transition use `(tenantId, executionId)` lookup before updates.
- Pending: two-tenant execution fixtures with overlapping idempotency keys.
- Risks: future external runtime callbacks must include tenant context and be validated server-side.
- Next recommended step: add database-backed execution lifecycle tenant isolation tests.

## 2026-05-08 Runtime AppSec Hardening Update

- Changed: runtime cancel/transition commands continue to resolve execution records through tenant-scoped lookup before writes.
- Completed: transition policy is enforced after `(tenantId, executionId)` lookup; idempotency keys remain tenant-scoped; audit records carry the owning tenant id.
- Pending: database-backed two-tenant runtime fixtures for request, transition, cancel, and idempotency reuse.
- Risks: future runtime callbacks must never update by execution id alone.
- Next recommended step: build two-tenant execution lifecycle fixtures with overlapping idempotency keys and attempted cross-tenant transitions.

## 2026-05-08 Database Fixture Foundation Update

- Changed: two-tenant persistence fixtures now exist for runtime and Pulse ticket lifecycle boundaries.
- Completed: runtime fixtures validate tenant-scoped idempotency keys, tenant-scoped reads, cross-tenant transition rejection, and audit segregation; Pulse fixtures validate ticket mutation ownership and event/audit/usage segregation.
- Pending: database-backed fixtures for Pulse timelines, knowledge context, scheduling integrations, module registry, billing, and usage summaries.
- Risks: fixtures require a migrated PostgreSQL database and are skipped by default.
- Next recommended step: run `npm run test:db` in a disposable test database and expand coverage to Pulse timeline reads.

## 2026-05-08 Platform Runtime Client Signer Update

- Changed: platform-to-runtime requests are built from server-owned `TenantExecutionContext`.
- Completed: runtime request body maps `tenantId`, module slug, actor, permissions, request id, and operational metadata from backend context rather than client-supplied transport data.
- Pending: cross-tenant runtime submission fixtures and callback tenant validation.
- Risks: future callback handling must validate tenant id against the persisted execution record before transition.
- Next recommended step: include platform/runtime submission and callback attempts in the two-tenant fixture plan.

## 2026-05-08 Frontend Contract Pack Update

- Changed: frontend tenant-handling rules are now documented in the contract pack.
- Completed: documented that tenant resources are server-scoped, `404` can represent not-found or blocked cross-tenant access, and tenant/session changes must clear scoped caches.
- Pending: concrete multi-tenant HTTP fixture examples.
- Risks: stale frontend caches can simulate cross-tenant leakage if not cleared on tenant/session changes.
- Next recommended step: include cache invalidation expectations in frontend implementation review.

## 2026-05-08 Admin Bootstrap Billing Plan Fix

- Changed: superseded by platform-admin bootstrap; `admin:create` no longer creates a first tenant.
- Completed: tenant creation paths still must use current billing plan keys.
- Pending: tenant/customer provisioning smoke tests separate from platform-admin bootstrap.
- Risks: older QA checklists may still expect `ADMIN_TENANT_*`.
- Next recommended step: split platform-admin and customer-tenant provisioning in local Docker QA.

## 2026-05-08 Platform Admin Bootstrap Foundation

- Changed: `admin:create` no longer creates a first tenant; platform admins are tenantless by default.
- Completed: `TenantGuard` allows `platform_admin` without tenant context only on routes marked `@AllowTenantless()` and uses `x-tenant-id` as the explicit tenant boundary when a platform admin operates inside a tenant.
- Pending: platform admin endpoints that list/select/manage tenants with audit-safe context.
- Risks: older local data may contain an admin email with both a tenant membership and platform role; tenant-scoped services must continue to reject missing tenant ids.
- Next recommended step: add HTTP fixtures for platform-admin tenant-bound and tenantless requests.

## 2026-05-08 Granular Platform Administration Foundation

- Changed: platform user-management routes are tenantless and explicitly marked with `@AllowTenantless()`.
- Completed: tenant customer creation still requires an explicit `tenantId`; platform admin/tester creation does not create tenant memberships.
- Pending: tenant-bound fixtures for platform-created customer users.
- Risks: platform admins entering tenant-scoped operations must still supply an explicit tenant boundary and must not infer tenant ownership from email.
- Next recommended step: add two-tenant fixtures for platform-created customers and cross-tenant membership attempts.

## 2026-05-08 Platform Governance Scope Enforcement

- Changed: platform governance routes remain tenantless but never bypass scope checks.
- Completed: platform usage metrics can optionally filter by tenant id, but the response is aggregated and redacted rather than exposing raw tenant payloads.
- Pending: two-tenant fixtures for scoped platform metric reads.
- Risks: tenant id filters on platform metrics must stay administrative and must not become a tenant data-exfiltration path.
- Next recommended step: validate tenant-filtered platform metrics with scoped-admin fixtures.

## 2026-05-08 Platform Governance Mutations

- Changed: module/policy platform mutations remain tenantless platform operations and do not mutate tenant records directly.
- Completed: module catalog governance and policy flags are global platform state with audit metadata and actor attribution.
- Pending: validation that global platform changes cannot be triggered through tenant workspace roles.
- Risks: global module/policy changes affect all tenants and must be reviewed before production use.
- Next recommended step: require explicit confirmation metadata or change-ticket references for production governance writes.

## 2026-05-08 Platform Governance Test Fixtures

- Changed: tenant workspace roles are now explicitly tested against platform governance routes.
- Completed: HTTP fixture rejects tenant `OWNER` from tenantless platform governance even when the request has tenant context.
- Pending: CI execution of DB fixtures.
- Risks: platform metrics tenant filters still need broader persisted cross-tenant test data.
- Next recommended step: add a second metrics fixture for explicit tenant filters.

## 2026-05-08 Platform Governance Database Fixtures

- Changed: persisted fixture now seeds two tenants and validates scoped usage metrics against real tenant usage events.
- Completed: scoped admin only sees usage for assigned module and receives redacted sensitive metric fields.
- Pending: fixture for explicit `tenantId` filtering across two tenants.
- Risks: current fixture validates module scope more deeply than tenant-filter behavior; local reset flow destroys all current dev tenants.
- Next recommended step: add tenant-filtered platform metrics fixture.

## 2026-05-09 Stage 1 — Pulse Tenant Boundary Review

- Changed: reviewed tenant-scoped Pulse persistence and repository strategy before context-pack work.
- Completed: existing Pulse models include required `tenantId` and Pulse repositories generally accept tenant id as the first boundary argument. Current Pulse tables remain in the main schema but are strongly separated by `Pulse*` model names and `pulse_*` table names.
- Pending: add Stage 2 context assembly tests for cross-tenant rejection across channel, conversation, ticket, playbook, knowledge, skill, integration setting, and operational event reads.
- Risks: RLS is not enabled yet; any new Pulse repository method that reads by raw id without `tenantId` would be a leakage risk.
- Next recommended step: require every Pulse context repository method to accept `tenantId` and test negative cross-tenant reads.

## 2026-05-09 Stage 2 — Pulse Context Tenant Isolation

- Changed: Pulse Context Pack loading uses a dedicated repository where every Prisma query is scoped by `tenantId`.
- Completed: requested `conversationId`, `ticketId`, and `playbookKey` are treated as tenant-scoped resources; missing or cross-tenant ids return not found through the use case. Unit coverage asserts tenant filters on conversation, ticket, knowledge, integration, and timeline context reads.
- Pending: real PostgreSQL fixture for cross-tenant context rejection and future RLS prototype.
- Risks: RLS remains disabled; application-level tenant enforcement is still the active boundary.
- Next recommended step: add DB fixtures after Stage 3 queue contracts stabilize.

## 2026-05-09 Stage 3 — Pulse Queue Tenant Scope

- Changed: Pulse queue contracts carry `tenantId` as a required field and use tenant-scoped job ids.
- Completed: entry creation and retry enqueue `pulse.inbound` jobs with tenant id, entry id, conversation id, and idempotency key. The worker still reloads entries by `tenantId` and entry id before processing.
- Pending: tenant-scoped validation for future `pulse.context`, `pulse.execution`, `pulse.actions`, and `pulse.timeline` processors.
- Risks: BullMQ job ids prevent duplicate enqueue patterns but do not replace database tenant isolation.
- Next recommended step: add worker tests that reject cross-tenant ids after the `pulse.context` processor lands.

## 2026-05-09 Stage 3B — Context Worker Tenant Scope

- Changed: `pulse.context` creates execution requests using the job tenant id and Pulse assembler tenant-scoped reads.
- Completed: tests cover malformed tenant payload rejection and context-to-execution persistence with tenant id preserved.
- Pending: PostgreSQL fixture proving another tenant's conversation/ticket id cannot create an execution request.
- Risks: application-level tenant enforcement remains mandatory until RLS is implemented.
- Next recommended step: add DB fixture after execution-governance service is introduced.

## 2026-05-09 Stage 3C — Tenant Module Execution Governance

- Changed: execution governance validates tenant module installation before queueing execution.
- Completed: a tenant must have the module installed/enabled for an execution request to move to `QUEUED`.
- Pending: DB fixtures for two tenants, one enabled and one disabled, proving denied execution cannot cross tenant boundaries.
- Risks: module store visibility does not imply tenant enablement; each tenant remains independently governed.
- Next recommended step: add two-tenant execution-governance fixtures.

## 2026-05-09 Stage 3D — Execution Worker Tenant Scope

- Changed: `pulse.execution` receives tenant id and execution request id and reloads lifecycle state through tenant-scoped runtime APIs.
- Completed: worker tests cover queued dispatch, non-queued skip, malformed payload rejection, and failure capture.
- Pending: database fixture proving one tenant cannot dispatch another tenant's execution request.
- Risks: DB-level RLS remains deferred.
- Next recommended step: add persisted tenant isolation fixtures for execution lifecycle.

## 2026-05-09 Stage 3E — Timeline Tenant Scope

- Changed: `pulse.timeline` requires tenant id and writes tenant-scoped operational events.
- Completed: execution dispatch events carry tenant id through execution queue into timeline projection.
- Pending: DB fixtures proving timeline projection cannot write cross-tenant conversation/ticket associations.
- Risks: the worker trusts supplied conversation/ticket ids today; future projection should validate referenced ids when present.
- Next recommended step: add tenant-scoped reference validation in timeline projection for ticket/conversation ids.

## 2026-05-09 Stage 3F — Actions Tenant Scope

- Changed: action jobs require tenant id and preserve ticket/conversation ids through timeline projection.
- Completed: no tenant-scoped side effects are applied yet.
- Pending: real action handlers must reload ticket/conversation/integration state by tenant id before mutation.
- Risks: queued ids must not be trusted once real handlers are enabled.
- Next recommended step: build action handlers around tenant-scoped repositories only.

## 2026-05-09 Stage 3G — Action Tenant Scope

- Changed: `ticket.advance_flow` handler passes tenant id and ticket id into `TicketLifecycleUseCase`, which reloads the ticket by tenant.
- Completed: missing actor metadata is rejected before mutation.
- Pending: DB fixture proving cross-tenant ticket ids cannot be advanced through action jobs.
- Risks: RLS remains deferred, so repository tenant filtering remains critical.
- Next recommended step: add cross-tenant action fixture.

## 2026-05-09 Stage 3H — Action Enqueue Tenant Scope

- Changed: action governance creates tenant-scoped idempotency keys for action jobs.
- Completed: governed action enqueue includes tenant id, resource id, actor metadata, and permission snapshot.
- Pending: DB fixtures for cross-tenant denied action execution.
- Risks: tenant id still comes from caller context; future runtime-created actions must preserve original tenant context exactly.
- Next recommended step: validate action tenant id against the originating execution request before enqueueing runtime-derived actions.
