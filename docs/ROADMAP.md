# Synapse Roadmap

Synapse is an intelligent agent orchestration platform powered by an LLM pool. Business capabilities are delivered through isolated modules. The core platform must stay domain-neutral.

## 1. Core Platform Foundation

**Objective:** Establish the platform core for intelligence, orchestration, module runtime, tenant safety, and observability.

**Current status:** In progress.

**Completed tasks:**
- NestJS API workspace and Prisma foundation.
- Tenant-aware access helper pattern.
- Structured JSON logs, request IDs, health, readiness, and metadata endpoints.
- AI orchestrator foundation exists and is being moved into core intelligence.
- BullMQ global configuration exists.

**Pending tasks:**
- Complete core namespace and remove domain-specific assumptions from core modules.
- Add core task/workflow abstractions.
- Add context/memory engine foundation.
- Add metrics/tracing export beyond structured logs.

**Risks:**
- Core can become polluted by messaging-specific concepts if module boundaries are not enforced.
- Early abstractions can become too theoretical unless exercised by the messaging module.

**Next actions:**
- Create `core` modules for intelligence, orchestration, module runtime, observability, and tenancy.
- Move messaging concerns into `modules/messaging`.

## 2. Module System Implementation

**Objective:** Provide a strict SDK and lifecycle for plug-and-play Synapse modules.

**Current status:** Started.

**Completed tasks:**
- Initial shared contracts package exists.
- Architecture decision recorded for core/module split.

**Pending tasks:**
- Define `SynapseModule`, `ModuleAction`, `ModuleEvent`, permissions, and lifecycle contracts.
- Implement registry with register, enable, disable, and list behavior.
- Add module permission model.
- Add tests for module registration isolation.

**Risks:**
- Modules can accidentally import core internals instead of consuming stable core capabilities.
- Permission boundaries can become decorative if not enforced in action execution.

**Next actions:**
- Implement module SDK contracts in `packages/contracts`.
- Add backend module registry service.

## 3. Messaging Module (HIGH PRIORITY)

**Objective:** Deliver the first real business capability as a module: messaging channels, conversations, lead capture, and agent interaction.

**Current status:** In progress.

**Completed tasks:**
- Prisma schema includes conversations, messages, and channel accounts.
- Initial Telegram adapter exists.
- WhatsApp and Discord stubs exist.
- Queue contracts exist for message processing, AI response, and outbound messages.

**Pending tasks:**
- Move messaging code under `apps/api/src/modules/messaging`.
- Refine strict channel adapter contract.
- Enqueue inbound messages instead of doing all work synchronously.
- Add lead capture and conversation state contracts.
- Implement Telegram webhook validation properly before production.
- Add messaging module registration and permissions.

**Risks:**
- WhatsApp vendor lock-in if provider payloads leak into module/domain logic.
- Conversation ordering can break under high message volume.
- Lead capture can become model-output-only without validation and confidence handling.

**Next actions:**
- Create messaging module package structure and register it with core module runtime.

## 4. Workflow Engine Evolution

**Objective:** Introduce durable, event-driven workflows for module actions and AI-assisted tasks.

**Current status:** Basic planning.

**Completed tasks:**
- Queue foundation and job contracts exist.

**Pending tasks:**
- Define task model and workflow step contracts.
- Add event dispatcher and state transitions.
- Add workflow persistence model.
- Add retry, compensation, and idempotency strategy.

**Risks:**
- Overbuilding workflow logic before real module use cases stabilize.

**Next actions:**
- Start with a lightweight task engine consumed by messaging inbound flow.

## 5. Additional Modules (Incident/Ops)

**Objective:** Add future modules without changing core: incidents, ops, inventory, workforce, and other business capabilities.

**Current status:** Not started.

**Completed tasks:**
- Core/module direction established.

**Pending tasks:**
- Identify module SDK gaps from messaging implementation.
- Design module templates and permissions.

**Risks:**
- Future modules may pressure core to accept domain-specific shortcuts.

**Next actions:**
- Use messaging module as the reference implementation.

## 6. LLM Pool Optimization (Local + Private)

**Objective:** Route tasks across LLM providers by cost, latency, privacy, and task type.

**Current status:** Started.

**Completed tasks:**
- LLM provider interface exists.
- OpenAI provider boundary exists.
- Prompt builder and response parser exist.

**Pending tasks:**
- Provider registry.
- Routing strategy by task type, cost, latency, and privacy policy.
- Local provider interface for Ollama/vLLM.
- Per-tenant model policies and budgets.

**Risks:**
- Routing without telemetry can make poor cost/quality decisions.

**Next actions:**
- Add LLM pool service with an OpenAI default route and future local-provider placeholders.

## 7. Billing + SaaS Layer

**Objective:** Support tenant subscriptions, entitlements, usage, and module access.

**Current status:** Placeholder.

**Completed tasks:**
- Billing account schema exists.
- Tenant registration creates starter billing account.

**Pending tasks:**
- Stripe checkout, portal, subscriptions, and webhooks.
- Module entitlement checks.
- Usage metering for LLM calls, messages, and enabled modules.

**Risks:**
- Entitlements can become scattered if not enforced through core permission/capability checks.

**Next actions:**
- Define entitlement checks for module enablement.

## 8. Observability + Production Hardening

**Objective:** Make platform and module behavior visible per tenant with logs, metrics, tracing, rate limits, and security controls.

**Current status:** Improved baseline.

**Completed tasks:**
- Structured JSON logs.
- Request ID correlation.
- Health/readiness/metadata endpoints.
- Global and auth-specific rate limits.
- Security and observability docs.

**Pending tasks:**
- Metrics endpoint.
- Distributed tracing.
- Per-module observability labels.
- Webhook signature validation.
- Secret encryption/managed secrets.

**Risks:**
- Module failures can be hard to diagnose without module/action/event fields in logs.

**Next actions:**
- Add module metadata to queue and module execution logs.

## 9. UX/UI Evolution

**Objective:** Make the product feel like a premium orchestration platform, not a generic admin dashboard.

**Current status:** Needs major improvement.

**Completed tasks:**
- Next.js workspace exists.
- Initial pages exist.
- Logo asset is wired.
- Temporary sample-data labels, empty states, and loading components exist.
- Global vs module route boundary defined: global routes stay platform-level; domain features live under `/modules/:moduleSlug`.

**Pending tasks:**
- Replace global sidebar with top navigation.
- Move messaging routes under `/modules/messaging/*`.
- Redesign dashboard around core platform and modules.
- Improve navigation, typography, spacing, hierarchy, and responsive states.
- Connect real API state.

**Risks:**
- Static sample screens can misrepresent product completeness.
- Generic dashboard styling can weaken premium brand perception.

**Next actions:**
- Apply top-nav platform shell and module-owned routing for messaging.

## Frontend Routing Strategy

Global routes:
- `/`
- `/modules`
- `/agents`
- `/activity`
- `/settings`

Module routes:
- `/modules/[moduleSlug]`
- `/modules/[moduleSlug]/...`

Messaging routes:
- `/modules/messaging`
- `/modules/messaging/conversations`
- `/modules/messaging/leads`
- `/modules/messaging/channels`
- `/modules/messaging/automations`

Global navigation must not expose module internals. Module pages own their contextual sub-navigation while inheriting the shared platform layout and design system.

## 10. Deployment / Kubernetes Readiness

**Objective:** Prepare API, web, workers, PostgreSQL, Redis, and future modules for production deployment.

**Current status:** Local Docker baseline.

**Completed tasks:**
- Dockerfiles for API and web.
- Docker Compose for PostgreSQL, Redis, API, and web.
- Readiness endpoint exists.

**Pending tasks:**
- Worker container strategy.
- Migration job strategy.
- Kubernetes manifests or Helm chart.
- Resource limits, probes, secrets, and config maps.

**Risks:**
- Workers and API can drift if queue contracts are not versioned.

**Next actions:**
- Keep Docker Compose working while introducing worker entrypoints.
