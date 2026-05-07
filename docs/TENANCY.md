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
