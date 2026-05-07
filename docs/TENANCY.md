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
