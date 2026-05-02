# Testing Strategy

Synapse testing should focus on high-risk SaaS behavior, not empty coverage.

## Commands

```bash
npm run prisma:generate -w @synapse/api
npm run build -w @synapse/api
npm run lint -w @synapse/api
npm run test -w @synapse/api
npm run typecheck -w @synapse/web
npm run lint -w @synapse/web
npm run build -w @synapse/web
npm run typecheck -w @synapse/contracts
```

## Backend Priorities

- Tenant isolation tests for repositories/services.
- Auth guard and role guard tests.
- Channel adapter normalization and webhook validation tests.
- AI prompt builder and parser tests.
- Queue producer payload tests.

## Frontend Priorities

- Typecheck and lint are the current baseline.
- Add component tests for empty/loading states and critical forms.
- Add E2E smoke tests for login, onboarding, agent creation, and conversations once API-backed workflows exist.

## Minimum Production Quality Gate

- Build, lint, and typecheck must pass for all workspaces.
- Tenant isolation tests must pass for changed backend domains.
- New channel adapters must include webhook validation tests.
- AI prompt/output changes must include tests for business-goal preservation and safe fallback behavior.
