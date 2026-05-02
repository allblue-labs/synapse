# Synapse Architecture

Synapse starts as a modular monolith because the product needs strong iteration speed and clean boundaries more than early service sprawl. Each NestJS module owns one domain concept and exposes services that require tenant context.

## Domain Boundaries

- `auth`: registration, login, token issuance, and authentication strategy.
- `tenants`: tenant lifecycle and tenant-level settings.
- `users`: user profile and membership access.
- `agents`: business agents, behavior, model settings, and lifecycle.
- `conversations`: conversation records, status, assignment-ready fields, and extracted data.
- `messages`: immutable conversation history with normalized and provider payloads.
- `channels`: provider adapters and normalized inbound/outbound message contracts.
- `knowledge-base`: customer-provided context for retrieval.
- `ai-orchestrator`: prompt assembly, retrieval injection, LLM provider calls, and response parsing.
- `billing`: subscription state and entitlements.

## Tenant Isolation

Every tenant-owned entity includes `tenantId`. Controllers derive tenant context from authenticated claims, and services use `tenantId` in reads before writes. This design keeps authorization close to the domain logic and prepares the database for PostgreSQL Row Level Security when the platform matures.

## Scaling Path

The first extraction candidates are not arbitrary modules. They are high-throughput workflows:

- channel webhook ingestion
- AI response generation
- outbound channel delivery
- billing webhook processing
- analytics aggregation

Those can move to workers or services later because the synchronous API already depends on clear interfaces.
