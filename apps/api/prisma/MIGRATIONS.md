# Database migrations — strategy

Synapse uses **Prisma Migrate** in production-grade mode. The rules below are
non-negotiable on `main`.

## Principles

1. **Migrations are immutable.** Once a migration directory is committed to
   `main`, never edit its `migration.sql`. If the migration is wrong, write a
   new corrective migration on top.

2. **Never destructive on shared environments.** Producing data loss requires a
   coordinated, two-phase migration:
   - phase A — additive (add new column / table / enum value, dual-write)
   - phase B — drop the old surface only after every reader/writer has shipped

3. **Renames go through ALTER, not DROP/CREATE.** Postgres ≥ 10 supports
   `ALTER TYPE ... RENAME VALUE ...` and `ALTER TABLE ... RENAME COLUMN ...`
   — these preserve data in place and are atomic.

4. **No `prisma db push` against shared databases.** It bypasses migration
   history. It is allowed only on a developer's throw-away local DB.

5. **The deploy command is `prisma migrate deploy` only.** It applies committed
   migrations in order. Never `migrate dev` in CI/staging/production.

## Naming

`<UTCYYYYMMDDHHMMSS>_<lowercase_underscored_summary>` — e.g.
`20260506140000_init_rbac`. The summary should describe the *intent* of the
change in 2–5 words.

## Workflow

### Local — adding a migration

```sh
cd apps/api
# 1. edit prisma/schema.prisma
# 2. generate migration (creates migrations/<ts>_<name>/migration.sql AND applies to local DB)
npx prisma migrate dev --name <descriptive_name>
# 3. inspect the SQL — refactor manually if Prisma chose a destructive plan
# 4. commit the directory
git add prisma/migrations/<ts>_<name>
```

### CI — verifying

```sh
# Run on every PR — should be fast and idempotent.
npx prisma migrate deploy
```

### Local dev — disposable database reset + DB fixtures

During early development we use the current Docker Postgres as disposable
state instead of maintaining a second test Postgres. This is destructive and
intended only for local/dev environments.

```sh
cd infra/docker
docker compose down -v
docker compose up --build

# In another terminal, after api-synapse is healthy:
docker compose exec api-synapse npm run test:db:dev-reset
```

What this does:

- removes the current Postgres/Redis volumes
- recreates the stack from migrations
- runs opt-in database fixtures with `RUN_DATABASE_TESTS=1`
- lets each DB fixture clean up its own seeded tenants/users/modules/policies

### Production deploy

The Docker `migrate-synapse` service runs `prisma migrate deploy` once before
the API boots (see `docker-compose.yml`). It is wired as a `depends_on:
service_completed_successfully` for `api-synapse`, so the API will not start
until migrations finish cleanly.

## Initial migration

`20260506140000_init_rbac` is the baseline. It creates every table and enum
defined in `schema.prisma`, including the `UserRole = OWNER | ADMIN | OPERATOR
| VIEWER` enum used by the new RBAC layer.

> Historical note: an earlier draft of the schema named the third role
> `MEMBER`. There is no production database carrying that value at the time
> this baseline was created, so the rename is captured directly in the
> baseline rather than as an additional `ALTER TYPE ... RENAME VALUE` step.
> If you have a local database that pre-dates this baseline, drop and
> recreate the volume (`docker compose down -v`) before applying the
> baseline.

## RBAC tables

The current RBAC implementation is **role-driven**: the `UserMembership` row
carries the role, and the role-to-permission map lives in the shared
`@synapse/contracts` package. There is no `Role` or `Permission` table — both
are static and code-defined.

If/when tenant-custom roles become a requirement, the migration will be:
1. add `Role` (`id`, `tenantId?`, `name`, `description`) — `tenantId NULL` for
   system roles
2. add `Permission` (`key`, `description`) — seeded with `ALL_PERMISSIONS`
3. add `RolePermission` (`roleId`, `permission`) — many-to-many
4. add `roleId String?` to `UserMembership`, dual-write alongside the enum
5. backfill, swap reads, then drop the enum column in a second migration

Document the rollout in this file at the time it ships.
