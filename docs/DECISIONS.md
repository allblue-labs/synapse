# Architecture Decisions

## 2026-05-02 - Use a Modular Monolith for the API

**Decision:** Build the backend as a NestJS modular monolith with domain modules.

**Context:** Synapse needs clean SaaS domain boundaries without the operational cost of early microservices.

**Alternatives considered:** Separate services from day one; a single unstructured API app.

**Consequences:** Faster development and simpler deployment now, with clear extraction points later for channel ingestion, AI jobs, analytics, and billing webhooks.

## 2026-05-02 - Keep API, Web, and Contracts in One Monorepo

**Decision:** Use `apps/api`, `apps/web`, and `packages/contracts` inside one GitHub repository.

**Context:** The backend and frontend need to evolve together while preserving service boundaries.

**Alternatives considered:** Separate repositories; shared types copied manually between apps.

**Consequences:** Easier coordinated changes, but requires discipline: web must not import Prisma/Nest internals, API must not import React/Next internals, and contracts must remain framework-neutral.

## 2026-05-02 - Use Explicit Tenant Scoping Instead of Implicit Prisma Middleware First

**Decision:** Prefer explicit tenant-aware repositories/helpers before global Prisma middleware.

**Context:** Every tenant-owned entity must be isolated, but global middleware can create dangerous implicit behavior and can break admin/system queries or nested writes.

**Alternatives considered:** Prisma middleware/extensions that automatically inject `tenantId`; PostgreSQL Row Level Security immediately.

**Consequences:** Developers must use documented tenant-scoped access patterns. This is more explicit and safer for early development, while leaving room for PostgreSQL RLS as defense in depth later.

## 2026-05-02 - Keep WhatsApp Provider-Agnostic

**Decision:** Model WhatsApp as a channel type behind an adapter, not as a specific vendor integration.

**Context:** WhatsApp can be reached through Meta Cloud API or third-party providers. Synapse should avoid vendor lock-in.

**Alternatives considered:** Hardcode a single WhatsApp provider payload into the domain.

**Consequences:** More upfront adapter discipline, but cleaner future provider switching.

## 2026-05-02 - Treat AI Orchestration as a Domain Layer

**Decision:** Keep prompt building, context injection, lead extraction, and provider calls inside `ai-orchestrator`, not in channel adapters.

**Context:** Synapse's differentiator is business-outcome conversation intelligence, not basic message relay.

**Alternatives considered:** Let each channel call LLMs directly; build a generic chatbot wrapper.

**Consequences:** Channel code remains transport-focused, and AI behavior can be tested, improved, and provider-swapped centrally.

## 2026-05-02 - Use JSON Logs as the API Logging Baseline

**Decision:** Emit structured JSON logs from the NestJS API.

**Context:** Synapse needs request, tenant, and user correlation before production deployment.

**Alternatives considered:** Human-readable console logs only; adding a heavier logging framework immediately.

**Consequences:** Logs are machine-ingestable now and can later be routed to Datadog, Loki, OpenTelemetry collectors, or cloud logging without changing application call sites.

## 2026-05-02 - Add Queue Contracts Before Worker Logic

**Decision:** Define BullMQ queue names, retry defaults, and shared payload contracts before implementing processors.

**Context:** Message ingestion and AI generation need async boundaries, but full worker behavior should follow after channel and AI contracts stabilize.

**Alternatives considered:** Keep all processing synchronous; implement workers immediately without shared contracts.

**Consequences:** The system has a safe async foundation and clear future worker responsibilities without overbuilding processors too early.

## 2026-05-02 - Split Synapse Core from Business Modules

**Decision:** Synapse core owns intelligence, orchestration, module runtime, and observability. Business capabilities such as messaging, incidents, inventory, and workforce must be implemented as modules.

**Context:** Synapse is an intelligent agent orchestration platform, not a chatbot platform. Messaging is only the first module and must not define the platform architecture.

**Alternatives considered:** Keep channels/conversations inside core; build each business capability as a separate service immediately; keep a generic chatbot-style architecture.

**Consequences:** The platform is more extensible and strategically aligned, but it requires stronger contracts and discipline. Some existing backend folders must be moved or wrapped into module boundaries.

## 2026-05-02 - Route LLM Calls Through a Pool Strategy

**Decision:** All model calls should go through a core LLM pool that can route by task type, cost, latency, privacy, and tenant policy.

**Context:** Synapse must support OpenAI first and local/private models later. Direct provider calls from modules would make routing, observability, and cost controls inconsistent.

**Alternatives considered:** Let each module call OpenAI directly; configure one global model for all tasks.

**Consequences:** Initial implementation is slightly more abstract, but the platform can later support Anthropic, Gemini, Ollama, vLLM, tenant budgets, and private workloads without rewriting modules.

## 2026-05-02 - Define Modules as Isolated Capability Packages

**Decision:** A module exposes metadata, actions, events, permissions, and a `register(core)` lifecycle hook.

**Context:** Modules need to be plug-and-play while consuming stable core capabilities.

**Alternatives considered:** NestJS modules only; dynamic plugin loading before contracts stabilize.

**Consequences:** We get a clear SDK now without overbuilding runtime plugin loading. Dynamic loading can come later once the contract proves itself.

## 2026-05-02 - Use Top Navigation for Platform Primitives

**Decision:** Replace the global left sidebar with a top navigation containing only platform-level routes: Overview, Modules, Agents, Activity, Settings, and User.

**Context:** A sidebar listing domain features made Synapse feel like a single-feature admin app. The product is a platform, so module internals must not appear as global primitives.

**Alternatives considered:** Keep a global sidebar; use separate layouts per module with visually distinct chrome.

**Consequences:** Global navigation stays platform-focused. Modules get contextual navigation inside their route tree while still feeling native because they share the same shell and design system.

## 2026-05-02 - Route Module UX Under `/modules/[moduleSlug]`

**Decision:** Place module-owned UI under `/modules/[moduleSlug]`, with internal routes such as `/modules/messaging/conversations`.

**Context:** Messaging is a module, not a global feature. Root-level `/conversations` violates the core/module boundary.

**Alternatives considered:** Keep root-level shortcuts to common module pages; create iframe-like module containers.

**Consequences:** URLs mirror architecture. Modules control their internal navigation without becoming embedded apps or visually detached experiences.
