# Synapse Roadmap

This roadmap is the living implementation plan for Synapse. Update it whenever meaningful architecture, product, or delivery work changes.

## 1. Backend Core

**Goal:** Establish the NestJS modular monolith, Prisma schema, and core SaaS domains.

**Current status:** Refined foundation.

**Completed items:**
- NestJS API workspace in `apps/api`.
- Prisma schema for tenants, users, memberships, agents, conversations, messages, channels, knowledge items, and billing accounts.
- Auth registration/login with tenant owner creation.
- Initial agents, conversations, messages, channels, knowledge base, AI orchestrator, and billing modules.
- Lightweight tenant-aware helper pattern introduced for agents and conversations.

**Pending items:**
- Database migrations committed after local PostgreSQL is running.
- Seed data for local development.
- More explicit domain/use-case boundaries for critical workflows.

**Risks:**
- Services can grow too broad if all orchestration remains inside controllers/services.
- Missing migrations can slow environment setup.

**Next actions:**
- Add lightweight repository/use-case patterns for tenant-sensitive domains.
- Add focused unit tests around tenant isolation and important use cases.

## 2. Multi-Tenancy Hardening

**Goal:** Prevent accidental cross-tenant data access and make tenant scoping obvious.

**Current status:** Improved, still needs integration tests.

**Completed items:**
- Tenant-owned database entities include `tenantId`.
- Authenticated requests derive tenant context from JWT claims.
- Existing services scope reads by tenant where exposed through tenant routes.
- `TenantPrismaService` provides explicit tenant-scoped helper methods for common domains.
- Tenant scoping unit test pattern added.

**Pending items:**
- Tenant-aware repository/helper patterns.
- Tenant isolation tests.
- Future PostgreSQL Row Level Security evaluation.
- Broader adoption of tenant repositories across channels, messages, knowledge base, and billing.

**Risks:**
- Prisma does not enforce tenant scoping automatically.
- Admin/system jobs will need safe exceptions without normalizing unsafe query habits.

**Next actions:**
- Introduce explicit tenant scope helper and repository classes.
- Document required tenant access patterns.

## 3. Security Hardening

**Goal:** Establish secure defaults for auth, input safety, secrets, webhooks, and rate limits.

**Current status:** Improved baseline.

**Completed items:**
- Argon2 password hashing.
- JWT strategy with `sub`, `email`, `tenantId`, and `role`.
- Global validation pipe.
- Environment validation through Zod.
- Global rate limiting and stricter auth throttling.
- Request body limit configured.
- Role guard pattern introduced.

**Pending items:**
- Route-by-route role coverage beyond agents.
- Webhook signature validation for Stripe and channels.
- Secret encryption strategy for tenant channel credentials.

**Risks:**
- Auth-sensitive endpoints can be brute-forced without throttling.
- Provider webhook endpoints can be abused without signature checks.

**Next actions:**
- Add global and auth-specific rate limits.
- Add role guard pattern and permission documentation.

## 4. Observability

**Goal:** Make production behavior traceable by request, tenant, service, and failure mode.

**Current status:** Improved baseline.

**Completed items:**
- Health endpoint.
- Request ID response header.
- Structured JSON logger.
- Request completion/failure logs with request, tenant, and user context.
- Readiness and metadata endpoints.

**Pending items:**
- Metrics strategy for Kubernetes/Prometheus.

**Risks:**
- Debugging tenant-specific production issues is difficult without structured context.

**Next actions:**
- Add request logging interceptor and structured exception logging.
- Extend health endpoints.

## 5. Queue/Event Processing

**Goal:** Move message ingestion, AI responses, outbound delivery, and webhook side effects into resilient async jobs.

**Current status:** Foundation added.

**Completed items:**
- BullMQ and Redis dependencies/configuration exist.
- Queue module with `message-processing`, `ai-response`, and `outbound-message` queues.
- Shared queue payload contracts.
- Default retry/backoff policy.

**Pending items:**
- Worker processors.
- Dead-letter/replay tooling.
- Per-conversation ordering strategy.

**Risks:**
- Conversation message ordering can break without queue partitioning or locks.
- AI calls inside request paths can create latency and cost spikes.

**Next actions:**
- Add a queue module with named queues and typed job payloads.

## 6. Channel Integrations

**Goal:** Support WhatsApp, Telegram, and Discord through strict adapter contracts.

**Current status:** Contract refined.

**Completed items:**
- Initial Telegram adapter and channel service.
- Basic inbound normalization shape.
- Strict adapter contract includes webhook validation, normalization, sending, and channel type.
- WhatsApp and Discord provider stubs added.

**Pending items:**
- Webhook security documentation.
- Outbound send queue.
- Production-grade provider signature validation.

**Risks:**
- WhatsApp vendor lock-in if provider-specific payloads leak into domain services.
- Webhook replay attacks if validation is deferred too long.

**Next actions:**
- Refine adapter contract and add provider-neutral stubs.

## 7. AI Orchestrator

**Goal:** Make AI behavior outcome-oriented, provider-agnostic, and testable.

**Current status:** Improved foundation.

**Completed items:**
- LLM provider interface.
- OpenAI provider boundary.
- Initial prompt assembly with agent config and knowledge placeholders.
- Prompt builder service.
- Structured response parser with safe plain-text fallback.
- Shared AI response, lead extraction, and intent contracts.

**Pending items:**
- Provider registry for future Anthropic/Gemini/local LLMs.

**Risks:**
- Product can devolve into a generic chatbot wrapper if prompts and outputs are not domain-specific.

**Next actions:**
- Extract prompt building and structured AI response contracts.

## 8. Knowledge Base / Future RAG

**Goal:** Let customers add reliable context without overbuilding retrieval too early.

**Current status:** Basic placeholder.

**Completed items:**
- Knowledge item schema.
- Simple tenant/agent scoped lookup.

**Pending items:**
- Document ingestion pipeline.
- Chunking/versioning model.
- Embeddings provider abstraction.
- Retrieval evaluation.

**Risks:**
- Poor retrieval quality can harm agent trust more than model choice.

**Next actions:**
- Keep current lookup simple and document future RAG shape.

## 9. Billing / Stripe

**Goal:** Support subscriptions, entitlements, and usage-aware SaaS billing.

**Current status:** Schema placeholder.

**Completed items:**
- Billing account schema.
- Tenant registration creates starter billing account.

**Pending items:**
- Stripe customer/checkout/portal flows.
- Webhook signature validation and idempotency.
- Entitlement enforcement.
- Usage tracking.

**Risks:**
- Entitlements become inconsistent if enforced ad hoc.

**Next actions:**
- Define entitlement contract and centralized guard/service.

## 10. Frontend Product Experience

**Goal:** Deliver a premium SaaS dashboard focused on business outcomes and agent operations.

**Current status:** Improved presentation foundation.

**Completed items:**
- Next.js App Router workspace in `apps/web`.
- Dashboard shell, overview, agents, conversations, onboarding, knowledge, settings, and login screens.
- Logo asset wired into web app.
- Temporary sample data is explicitly marked in the UI.
- Reusable empty and loading state components added.

**Pending items:**
- Real API integration and authenticated session handling.
- Loading and empty states.
- Form workflows for agents/channels/knowledge.
- Responsive polish after browser review.

**Risks:**
- Temporary display data can be mistaken for product completeness.

**Next actions:**
- Mark temporary data clearly and add empty/loading components.

## 11. Testing / QA

**Goal:** Establish quality gates that catch tenant, auth, domain, and product regressions.

**Current status:** Initial meaningful tests added.

**Completed items:**
- Build/lint/typecheck scripts exist.
- Backend tests for prompt building and tenant scoping helper.
- Jest configured to avoid Watchman sandbox failures.

**Pending items:**
- More backend unit tests for tenant-scoped services/use cases.
- Auth guard tests.
- Contract type checks in CI.
- Frontend component/page test structure.
- E2E smoke tests.

**Risks:**
- Tenant isolation regressions are high severity and easy to miss manually.

**Next actions:**
- Add first meaningful backend tests and document minimum quality gate.

## 12. Deployment / Kubernetes Readiness

**Goal:** Prepare services for containerized deployment now and Kubernetes later.

**Current status:** Local Docker started.

**Completed items:**
- Dockerfiles for API and web.
- Docker Compose for PostgreSQL, Redis, API, and web.

**Pending items:**
- Readiness/liveness endpoint separation.
- Migration job strategy.
- Secrets and config management.
- Resource requests/limits.
- Observability export.

**Risks:**
- Containers can boot before migrations or dependencies are ready.

**Next actions:**
- Add readiness endpoint and document deployment assumptions.
