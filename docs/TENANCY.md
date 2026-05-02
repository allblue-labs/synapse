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
