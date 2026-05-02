# Synapse

Synapse is a multi-tenant SaaS platform for AI-powered conversational agents focused on business outcomes: sales, lead qualification, support, and workflow automation across WhatsApp, Telegram, and Discord.

The product direction is intentionally not "generic chatbot builder." The architecture emphasizes tenant isolation, outcome-oriented agents, channel abstraction, and a provider-agnostic AI layer that can start with OpenAI and later support local models.

## Step 1 - Architecture Review

### Current Direction

The requested modular monolith is the right starting point. It keeps deployment simple while still drawing clear domain boundaries around auth, tenants, users, agents, conversations, messages, channels, knowledge base, AI orchestration, and billing. Those module boundaries are important because the likely future extraction points are clear: channel ingestion workers, AI orchestration workers, analytics, and billing webhooks.

### Key Decisions

- **Tenant isolation first:** every tenant-owned table has `tenantId`, indexed with its common access paths. Application services accept tenant context explicitly and never trust client-provided tenant IDs for scoped reads.
- **PostgreSQL as source of truth:** relational data fits tenants, users, agents, conversations, messages, subscriptions, and audit-style event history. JSONB is used only where payload shape is channel-specific or provider-specific.
- **Redis and BullMQ for async work:** inbound messages, AI generation, webhook processing, and integration retries should not run entirely inside request/response paths.
- **Provider interfaces over provider code:** channels and LLMs are implemented behind explicit contracts. That keeps Telegram/OpenAI as first implementations without shaping the whole system around them.
- **Modular monolith before microservices:** this reduces operational drag while preserving boundaries for later Kubernetes deployments.

### Risks and Improvements

- **Tenant data leakage:** the main SaaS risk. Mitigation: tenant context guard, tenant-scoped service methods, compound indexes, and eventually PostgreSQL Row Level Security for defense in depth.
- **Webhook trust and replay attacks:** channel and Stripe webhooks must validate signatures, timestamps, and idempotency keys before mutating state.
- **AI latency and cost spikes:** generation should move through queues, enforce per-tenant limits, cache knowledge retrieval where safe, and log token/cost metadata.
- **Conversation race conditions:** multiple inbound messages can arrive quickly. Use queue partitioning or per-conversation locks for ordered processing.
- **Knowledge base quality:** embeddings and retrieval need versioning. Bad context injection can degrade agent quality more than the model choice.
- **Billing entitlements:** subscriptions should gate agents, seats, monthly messages, channels, and AI usage centrally, not scattered across controllers.
- **Observability gaps:** every request/job should carry tenant, conversation, channel, and correlation IDs with structured logs and metrics.

### Security Baseline

- Passwords are hashed with Argon2.
- JWT access tokens contain `sub`, `tenantId`, and `role`.
- API routes are guarded by authentication and tenant context.
- Environment variables are validated at boot.
- Sensitive provider credentials are modeled per tenant and should be encrypted before production use.

## Step 2 - Professional Implementation Roadmap

### Phase 1 - Backend Core

- Create NestJS API project structure with TypeScript, validation, config, logging, and health checks.
- Define PostgreSQL schema with Prisma for tenants, users, memberships, agents, conversations, messages, channels, knowledge documents, and billing records.
- Implement multi-tenancy primitives: tenant context, guards, tenant-scoped services, and tenant-aware indexes.
- Implement auth: registration, login, password hashing, JWT strategy, and role-ready membership model.
- Implement agents: configurable personality, goals, rules, instructions, status, and model settings.
- Implement conversations: channel identity, lifecycle status, full history, extracted lead data, assignment-ready fields.

### Phase 2 - Infrastructure

- Add Docker Compose for API, PostgreSQL, Redis, and local development networking.
- Add `.env.example` and environment validation.
- Introduce BullMQ queues for inbound messages, AI generation, channel sends, and billing webhook work.
- Add observability basics: structured logs, request IDs, health endpoint, and queue health.
- Prepare deployment conventions for Kubernetes: stateless API, externalized config, readiness/liveness checks, and migration job.

### Phase 3 - Frontend

- Create Next.js App Router workspace with TypeScript and Tailwind.
- Build a premium SaaS design system inspired by the Synapse logo: restrained, modern, dense where needed, and polished.
- Create dashboard shell with tenant switcher, navigation, search, command patterns, and settings.
- Build core pages: onboarding, agents, agent detail/configuration, conversations inbox, conversation detail, and knowledge base.
- Add API client boundaries and auth session handling.

### Phase 4 - Integrations

- Implement channel abstraction with `receiveMessage()`, `sendMessage()`, and `normalizePayload()`.
- Ship Telegram first because setup and webhook flow are simpler than WhatsApp.
- Add inbound webhook endpoint, payload normalization, message persistence, queue handoff, and outbound send path.
- Add idempotency, retries, provider error mapping, and channel health status.

### Phase 5 - AI Layer

- Implement AI orchestrator service responsible for prompt construction, agent config injection, knowledge retrieval, provider calls, response parsing, and structured extraction.
- Add OpenAI provider behind the `LLMProvider` interface.
- Add token/cost metadata logging and per-tenant usage tracking.
- Add structured response contracts for user-facing replies, extracted lead fields, suggested status changes, and escalation signals.

### Phase 6 - Billing

- Integrate Stripe customers, checkout, subscriptions, billing portal, and webhook handling.
- Store subscription state and entitlement snapshots locally.
- Gate premium actions by plan limits and usage.
- Add billing observability: webhook idempotency, reconciliation jobs, and admin diagnostics.

## Step 3 - Implementation Started

This repository now contains the initial backend and infrastructure foundation:

- `apps/api`: NestJS API service.
- `apps/web`: Next.js dashboard service.
- `packages/contracts`: shared TypeScript contracts used by services without coupling them to framework internals.
- `apps/api/prisma/schema.prisma`: multi-tenant PostgreSQL schema.
- `infra/docker/docker-compose.yml`: local PostgreSQL, Redis, and API composition.
- `.env.example`: environment contract.

## Local Development

```bash
cp .env.example .env
npm install
npm run prisma:generate -w @synapse/api
npm run prisma:migrate -w @synapse/api
npm run dev:api
npm run dev:web
```

Or with Docker:

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

## Repository Division

Synapse is organized so services can live in one GitHub repository without becoming one tangled application:

- `apps/api` owns backend runtime behavior, domain services, database access, queues, integrations, AI orchestration, and billing.
- `apps/web` owns browser UI, dashboard workflows, and frontend API clients.
- `packages/contracts` owns shared TypeScript shapes for API-facing domain data.
- `infra` owns local and deployment infrastructure.
- `docs` owns architecture and service-boundary decisions.

The web service must not import Prisma or NestJS internals. The API service must not import React or Next.js. Shared packages stay framework-neutral.

## Project Tracking

- `docs/ROADMAP.md`: phased implementation roadmap and next actions.
- `docs/STATUS.md`: current implementation state, verification, known issues, and next step.
- `docs/DECISIONS.md`: concise architecture decision records.
- `docs/REVIEW.md`: latest production-readiness review.
- `docs/SECURITY.md`: dependency audit, secrets, webhook, tenant isolation, and rate-limiting policy.
- `docs/MODULE_SYSTEM.md`: core/module contract and boundary rules.

## Why This Shape

The backend is intentionally modular but not distributed. Synapse needs strong product velocity early, and a modular monolith gives clean ownership boundaries without forcing premature network seams. The schema and services are designed so high-load pieces, especially message ingestion and AI orchestration, can later move into workers or separate services with minimal domain churn.
