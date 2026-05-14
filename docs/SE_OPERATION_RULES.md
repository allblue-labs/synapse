# Synapse Operation Rules

## Governance Boundary

- Synapse platform owns subscriptions, credits, quotas, billing, tenant limits, module access checks, plan enforcement, RBAC, permissions, audit, and AppSec.
- Product modules must not enforce subscription, credit, quota, or billing policy.
- Product modules may own operational domain data, context assembly, workflows, skills, and module-specific operational events.

## Tenant Lifecycle

- Registration may create a tenant only when explicitly requested with tenant data.
- A user may exist without a tenant.
- Workspace creation is checked against configurable platform plan limits.
- Module activation without a workspace must return: `You must create at least one workspace before activating modules.`

## Plan Templates

- Trial: max 1 workspace.
- Light: max 1 workspace, 3000 monthly credits, max 3 users per tenant, Light-tier modules, max 1 active channel set.
- Pro: max 2 workspaces, higher credits/users/channels, Light + Pro modules.
- Premium: max 4 workspaces, highest credits/users/channels, Light + Pro + Premium modules.
- These values are seed templates only; Super Admin / delegated platform admins manage them through plan entitlement CRUD.

## Pulse Schedule

- Pulse may store business hours, closures, vacations, holiday overrides, operational pause, closed-message text, and next opening metadata.
- Pulse schedule decisions create operational events and waiting timeline work.
- Pulse schedule decisions must not read or enforce billing/subscription/credit state.

## Database Security

- App-level tenant enforcement remains mandatory.
- RLS is a complementary hardening layer and should be enabled only after a Prisma-compatible session variable strategy is validated.
- Tenant-scoped tables require tenantId filters and tenant-aware indexes.

## Current Pending Work

- Permission assignment APIs backed by configurable role policy.
- Redis hotpaths for plan/quota/membership caches and usage counters.
- Delayed resume processing for Pulse outside-hours waiting interactions.

## Workspace Sessions

- Authenticated users may have zero, one, or many tenant memberships.
- Frontend must explicitly select a workspace when more than one membership is available or when the current session is tenantless.
- `POST /v1/auth/workspace` is the backend boundary for issuing a tenant-scoped session from a validated membership.
- Membership mutations must audit create/update/remove and must not allow last-owner removal or role escalation.

## Permission Resolution

- Tenant route permissions must resolve from live membership data, not only from JWT snapshots.
- Redis may cache resolved membership permissions briefly, but PostgreSQL remains source of truth.
- Membership create/update/delete must invalidate the affected tenant/user permission cache.
- Direct database changes require TTL expiry or explicit operational invalidation.
- Database fixtures for permission resolution run only with `RUN_DATABASE_TESTS=1`.
- Runtime actor snapshots must be revalidated against live membership permissions before automatic actions are enqueued.
