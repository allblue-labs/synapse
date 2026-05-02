# Implementation Status

Last updated: 2026-05-02

## What Is Implemented

- Monorepo workspace with `apps/api`, `apps/web`, and `packages/contracts`.
- NestJS API with auth, tenants, users, billing, health/readiness, structured logging, rate limiting, and tenant-aware access helpers.
- Prisma schema for current SaaS entities, including messaging-related tables.
- Initial core intelligence pieces: LLM provider interface, OpenAI provider boundary, prompt builder, response parser, knowledge lookup placeholder.
- LLM pool service with OpenAI as the first routing target.
- Core module system with registry endpoint and `SynapseModule` lifecycle contract.
- Messaging registered as the first module manifest.
- Initial queue foundation with BullMQ queues for message processing, AI response generation, and outbound messages.
- Next.js web app with a premium guided overview page, modules, agents, settings, login, empty states, loading states, and sample-data labeling.
- Docker Compose for PostgreSQL, Redis, API, and web.
- Docker Compose config validates without requiring a local `.env` file.
- Production-readiness docs for tenancy, security, observability, queues, channels, AI, contracts, and testing.

## What Is Partially Done

- Core/module split is now reflected in backend structure, but some legacy messaging implementation files still live under `src/modules` and are wrapped by `product-modules/messaging`.
- Messaging is registered as a module, but its implementation should be physically moved under the module folder in a later cleanup.
- LLM pool routing exists as a first-pass OpenAI route; cost/latency/private routing is still pending.
- Queue producers/contracts exist, but worker processors are not complete.
- Web UI uses top-level platform navigation, module-owned routes, and a guided root overview that explains agents, modules, and execution.

## What Is Missing

- Module action execution and permission enforcement beyond registration metadata.
- Messaging module registration and isolation from core.
- Workflow/task engine.
- LLM pool routing by cost, latency, privacy, and task type.
- Production webhook signature validation.
- Stripe billing implementation and module entitlements.
- Metrics/tracing exports.
- Kubernetes worker/deployment strategy.

## Current Technical Risks

- Core can absorb messaging logic if boundaries are not refactored now.
- Tenant isolation depends on explicit helper/repository usage and needs broader tests.
- WhatsApp and Discord adapters are not production-ready.
- Static frontend data can imply functionality that is not wired yet, so sample-data labeling remains required.
- `npm audit` reports dependency findings requiring triage.

## Next Recommended Step

Connect the guided overview quick actions to real onboarding/API-backed state.

## Frontend Routing Boundary

Global routes are limited to platform primitives: overview, modules, agents, activity, and settings.

Domain routes belong under module roots. Messaging is available only under `/modules/messaging` and its internal routes: conversations, leads, channels, and automations.
