# Synapse Roadmap

Last updated: 2026-05-05

## Phase 1 — Foundation (Done)

- [x] Monorepo (npm workspaces: `apps/api`, `apps/web`, `packages/contracts`)
- [x] NestJS API with JWT auth, multi-tenancy, rate limiting, structured logging
- [x] Prisma schema: Tenant, User, Agent, Conversation, Message, Channel, KnowledgeItem, BillingAccount
- [x] Multi-tenancy guard pipeline: `AuthGuard → TenantGuard → RolesGuard`
- [x] BullMQ queue infrastructure (3 queues: message-processing, ai-response, outbound-message)
- [x] LLM pool: provider abstraction + OpenAI provider
- [x] Core module system with `SynapseModule` lifecycle contract
- [x] Messaging registered as first product module
- [x] Docker Compose for Postgres 16, Redis 7, API, Web

## Phase 2 — Frontend + ClinicFlow AI (Done)

- [x] Next.js 15 app (App Router, TypeScript, Tailwind CSS)
- [x] Light / dark / auto theme via `next-themes`
- [x] EN / PT i18n via `next-intl` (cookie-based locale, clean URLs)
- [x] Top navigation only (no sidebar)
- [x] Synapse animated canvas background
- [x] Login page with JWT cookie flow
- [x] Overview page (no charts, module cards, quick actions)
- [x] Modules page + Messaging module page
- [x] ClinicFlow AI: overview, queue table, detail sheet, errors, settings
- [x] `ClinicFlowEntry` Prisma model with status FSM
- [x] ClinicFlow REST API (`/v1/clinic-flow/queue`, `/errors`, `/retry`)
- [x] Middleware: cookie-based auth guard, redirect to `/login`

## Phase 3 — Queue Workers + AI Pipeline (Next)

- [ ] BullMQ processor for `message-processing` queue
- [ ] BullMQ processor for `ai-response` queue
- [ ] ClinicFlow queue processor: audio → STT → LLM extraction → status update
- [ ] OpenAI Whisper integration for audio transcription
- [ ] LLM routing by cost / latency / privacy policy
- [ ] Calendar webhook dispatcher (Google Calendar / CalDAV)
- [ ] Production webhook HMAC validation (Discord, WhatsApp)

## Phase 4 — Billing (Stripe)

- [ ] Stripe Customer + Subscription creation on register
- [ ] Plan keys: `starter`, `pro`, `enterprise`
- [ ] Entitlement checks at queue/LLM boundaries
- [ ] Stripe webhook handler (subscription lifecycle events)
- [ ] Credit top-up flow (Stripe Checkout)
- [ ] Usage tracking per tenant per billing period

## Phase 5 — Security Hardening

- [ ] HMAC webhook validation for all adapters (Discord, WhatsApp, Telegram)
- [ ] JWT refresh token flow
- [ ] Audit log table (tenant-scoped immutable events)
- [ ] CSP + secure headers (Helmet)
- [ ] Sensitive field masking in logs
- [ ] Penetration testing checklist (OWASP Top 10)

## Phase 6 — Observability + Scale

- [ ] OpenTelemetry traces from API to queue workers
- [ ] Prometheus metrics endpoint
- [ ] Grafana dashboards (queue depth, LLM latency, error rate)
- [ ] Kubernetes deployment manifests (API + workers)
- [ ] Pain Runtime Operator integration (replace `StubPainClient`)
- [ ] Horizontal worker scaling by queue depth
