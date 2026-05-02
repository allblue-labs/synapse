# Synapse Service Division

Synapse is organized as a GitHub monorepo with clear service ownership.

## Applications

- `apps/api`: NestJS backend service. Owns database access, tenant isolation, auth, domain workflows, integrations, queues, AI orchestration, and billing.
- `apps/web`: Next.js frontend service. Owns the SaaS dashboard, onboarding, agent configuration, conversation workspace, and browser-facing API access.

## Shared Packages

- `packages/contracts`: shared TypeScript contracts for API-facing domain shapes. This package is intentionally type-only and has no runtime dependency on NestJS, Prisma, or Next.js.

## Infrastructure

- `infra/docker`: local Docker Compose and service wiring.
- `docs`: architecture decisions, service boundaries, and implementation notes.

## Boundary Rules

- The web app never imports Prisma, NestJS internals, or backend services.
- The API never imports React, Next.js, or frontend components.
- Shared packages must stay framework-neutral.
- Database schema changes begin in `apps/api/prisma`.
- Browser-visible data contracts belong in `packages/contracts` after the API shape is stable.
- Environment variables are service-scoped: backend secrets stay in `apps/api`; frontend variables must use `NEXT_PUBLIC_` only when intentionally exposed.
