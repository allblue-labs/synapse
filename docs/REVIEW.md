# Production Readiness Review

Date: 2026-05-02

## Architecture Gaps

- The monorepo division is good, but backend services currently mix persistence, validation, and use-case orchestration in the same classes.
- Tenant scoping is present in most exposed methods, but the pattern is manual and not yet standardized.
- Contracts are useful but too narrow for queues, messages, AI outputs, and billing-facing states.

## Security Gaps

- Auth uses Argon2 and JWTs, but there is no role/permission guard yet.
- Rate limiting is missing.
- Request body size limits are not explicit.
- Webhook validation is not part of the channel adapter contract yet.
- Tenant channel credentials are represented as `credentialsRef`, but encryption/secret management is deferred.

## Multi-Tenancy Risks

- Prisma does not enforce tenant isolation automatically.
- Updates that verify tenant ownership first and then update by `id` are acceptable early, but safer helper/repository patterns are needed.
- Future admin/system operations need deliberate escape hatches instead of weakening tenant-scoped application code.

## Frontend/Product Gaps

- Dashboard screens communicate the product direction, but current data is static sample data.
- Empty/loading states are missing.
- Authentication/session integration is not wired.
- Agent/channel/knowledge forms are not connected to the API yet.

## Infra Gaps

- Docker Compose exists for local development, but Kubernetes readiness needs explicit readiness endpoints and migration strategy.
- No structured logging or metrics export exists yet.
- Redis/BullMQ is configured globally, but no queue module or worker contracts exist.

## Dependency/Audit Concerns

- `npm audit` reports findings in the dependency tree.
- These should be triaged by severity and exploitability rather than fixed blindly with breaking upgrades.

## Testing Gaps

- Build/lint/typecheck exist.
- Tenant isolation, auth guard, channel normalization, and AI prompt building need focused tests.
- Frontend test structure is not established yet.

## Immediate Next Priorities

1. Add tenant-safe repository/helper patterns.
2. Add rate limiting, request body limits, role guard, and structured logs.
3. Add queue contracts and queue module for message processing and AI responses.
4. Strengthen channel adapter contracts with webhook validation.
5. Extract AI prompt building and structured output contracts.
6. Add documented testing and security policies.
