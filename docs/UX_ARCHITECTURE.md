# UX Architecture

Last updated: 2026-05-07

This document records backend-facing UX contracts only. Frontend visual architecture, pages, components, and interactions are owned outside this backend workstream.

## Backend Contracts

- Pulse backend route prefix: `/v1/pulse`.
- Pulse queue routes: `GET /queue`, `GET /queue/:id`, `POST /entries`, `POST /queue/:id/validate`, `POST /queue/:id/reject`, `POST /queue/:id/retry`, `GET /errors`.
- Required permissions: `pulse:read`, `pulse:write`, `pulse:validate`, `pulse:reject`, `pulse:retry`.
- Module registry slug/display: `pulse` / `Synapse Pulse`.
- Stripe webhook callback: `POST /v1/billing/stripe/webhook` is provider-facing only and has no frontend UX contract.
- Subscription checkout contract: `POST /v1/billing/checkout/subscription` accepts `planKey`, `successUrl`, and `cancelUrl`; returns a Stripe Checkout Session id and URL.
- Customer portal contract: `POST /v1/billing/portal/session` accepts `returnUrl`; returns a Stripe Billing Portal Session id and URL.

## 2026-05-07 Backend Update

- Changed: backend contracts moved from the retired product naming to Pulse.
- Completed: backend route, permission, queue, registry, and Prisma names now align to Pulse.
- Pending: frontend owner must align routes and API client usage to these contracts.
- Risks: old frontend paths may still point to the previous module hierarchy and should be treated as pending integration work.
- Next recommended step: publish or generate OpenAPI/DTO contracts for Pulse before frontend integration.

## 2026-05-07 Naming Update

- Changed: user-facing module contract name is Synapse Pulse.
- Completed: backend route prefix is `/v1/pulse`; registry slug is `pulse`.
- Pending: frontend routing and labels remain outside backend ownership.
- Risks: frontend may show stale names until Claude Opus updates the app.
- Next recommended step: hand off `/v1/pulse` route and `pulse:*` permission requirements to frontend integration.

## 2026-05-07 RBAC + Route Protection Update

- Changed: backend contract tests now lock the Pulse route prefix and required permission metadata.
- Completed: frontend integration can rely on `/v1/pulse` and `pulse:*` as the current backend contract.
- Pending: no frontend UX work was performed by backend.
- Risks: API shape still lacks generated OpenAPI documentation.
- Next recommended step: generate or document Pulse DTO schemas before frontend integration.

## 2026-05-07 Pulse Tenant Isolation Test Update

- Changed: no frontend UX behavior changed; backend persistence contract is safer.
- Completed: Pulse API consumers can rely on tenant-scoped repository behavior behind `/v1/pulse`.
- Pending: generated API schemas are still needed for frontend integration.
- Risks: frontend cannot infer tenant-isolation behavior from route shape alone.
- Next recommended step: document Pulse DTO response shapes in backend API contracts.

## 2026-05-07 Module Registry Store Update

- Changed: `GET /v1/modules` now returns tenant-specific `enabled` state from persisted installation records.
- Completed: backend module registry contract remains slug-based and now durable.
- Completed: module listing is tenant-specific and limited to public catalog modules.
- Pending: frontend owner must decide how to present module installed/enabled state; backend did not change frontend UX.
- Risks: clients should not assume module catalog availability means commercial entitlement.
- Next recommended step: document module registry response examples for frontend integration.

## 2026-05-07 Billing Core Update

- Changed: backend now exposes `GET /v1/billing/account`, `GET /v1/billing/plans`, and `POST /v1/billing/feature-flags/:key`.
- Completed: frontend contracts can read plan commercial activation state and billing account data; backend did not implement frontend UX.
- Pending: DTO/OpenAPI documentation and frontend-owner integration.
- Risks: billing plan visibility does not imply checkout or Stripe lifecycle readiness.
- Next recommended step: document billing API response examples before frontend integration.

## 2026-05-07 Operational Usage Metering Update

- Changed: backend exposes `GET /v1/usage/summary?billingPeriod=YYYY-MM` for tenant usage summaries.
- Completed: response shape is metric type, unit, quantity, and event count.
- Pending: frontend-owner integration and richer billing-period/invoice views.
- Risks: usage summaries are raw operational quantities, not rated prices.
- Next recommended step: document usage summary examples alongside billing API contracts.

## 2026-05-07 Usage Rating Update

- Changed: backend exposes `GET /v1/usage/rated-summary`, `GET /v1/usage/rates`, and `POST /v1/usage/rates`.
- Completed: rated summary response includes total amount cents and per-line rated/unrated status.
- Pending: frontend-owner integration and admin rate management UX.
- Risks: rated summaries are local estimates until Stripe reporting/reconciliation lands.
- Next recommended step: document rated usage response examples for frontend integration.

## 2026-05-07 Stripe Usage Reporting Update

- Changed: backend exposes `GET /v1/usage/stripe-meters`, `POST /v1/usage/stripe-meters`, and `POST /v1/usage/stripe-report`.
- Completed: frontend/admin consumers can inspect meter mappings and trigger reporting through backend contracts; no frontend UI was changed.
- Pending: admin workflow design, webhook reconciliation views, and Stripe customer portal integration.
- Risks: report statuses are operational billing state and should be shown carefully once frontend work begins.
- Next recommended step: document Stripe reporting response examples for admin integration.

## 2026-05-07 Stripe Webhook Reconciliation Update

- Changed: added a provider-facing Stripe webhook endpoint; no frontend pages, components, or interactions were changed.
- Completed: backend can reconcile subscription and invoice state for future billing/account UX surfaces.
- Pending: frontend-owner decisions for how to display billing status, webhook failures, checkout, and customer portal links after backend contracts exist.
- Risks: webhook event ledger details are operational/admin data and should not be exposed to tenant users without a reviewed contract.
- Next recommended step: document billing account status response examples after checkout/customer provisioning is implemented.

## 2026-05-07 Stripe Checkout Provisioning Update

- Changed: added a backend checkout creation contract; no frontend pages, components, or interactions were changed.
- Completed: frontend integration can request a subscription Checkout Session URL for a commercially active plan once price ids are configured.
- Pending: frontend-owner integration, customer portal contract, redirect URL allowlisting, and billing status display contracts.
- Risks: checkout redirects are external navigation and should be integrated deliberately by the frontend owner.
- Next recommended step: document customer portal contract after backend implementation.

## 2026-05-07 Stripe Portal + Redirect Allowlist Update

- Changed: added backend customer portal session contract and redirect-origin allowlist requirements.
- Completed: frontend integration can request a portal URL for tenants with Stripe customer ids; no frontend UX was changed.
- Pending: frontend-owner integration and success/cancel/return URL coordination per environment.
- Risks: frontend-provided redirect URLs must use configured allowed origins.
- Next recommended step: document checkout-session retrieval contract after backend implementation.

## 2026-05-07 Stage 1 Backend Refinement + Pulse Foundation Update

- Changed: backend contracts now include Pulse operational concepts for channels, conversations, tickets, operational events, scheduling providers, and runtime execution lifecycle.
- Completed: no frontend pages/components/interactions were changed.
- Pending: frontend-owner integration decisions for Pulse operational screens and ticket/timeline views.
- Risks: new entities are backend foundation only until DTO/API examples are published.
- Next recommended step: publish Pulse operational API DTO examples after use cases/controllers are added.

## 2026-05-07 Pulse Operational Lifecycle Wiring Update

- Changed: backend now creates ticket/timeline data that future frontend Pulse views can consume.
- Completed: no frontend files were changed.
- Pending: ticket/timeline read API contracts and frontend-owner integration.
- Risks: frontend should not consume internal repository shapes; public DTOs are still pending.
- Next recommended step: publish Pulse ticket and event read DTOs after backend routes are implemented.

## 2026-05-07 Pulse Channel + Conversation Ingestion Update

- Changed: entry creation backend contract now optionally accepts provider/channel/participant fields for operational conversation resolution.
- Completed: no frontend files were changed.
- Pending: frontend-owner integration and public response DTO examples for channel/conversation/timeline views.
- Risks: frontend should prefer provider/channel context over direct `conversationId` once new contracts are documented.
- Next recommended step: document create-entry examples after read APIs are added.

## 2026-05-07 Pulse Direct Conversation Validation Update

- Changed: direct `conversationId` remains accepted but now fails if it is not tenant-owned.
- Completed: no frontend files were changed.
- Pending: documented provider-context ingestion examples for frontend/provider integrations.
- Risks: stale direct ids will produce not-found errors.
- Next recommended step: publish read DTOs and examples for Pulse conversations.

## 2026-05-07 Pulse Channel + Conversation Read API Update

- Changed: backend exposes initial read contracts for Pulse channels and conversations.
- Completed: no frontend files were changed; routes are available for frontend-owner integration later.
- Pending: response examples, pagination, ticket/timeline APIs, and frontend integration.
- Risks: current shapes are minimal operational records, not final UI view models.
- Next recommended step: document Pulse ticket/timeline contracts after backend routes are added.

## 2026-05-07 Pulse Ticket + Timeline Read API Update

- Changed: backend exposes initial read contracts for Pulse tickets and timelines.
- Completed: no frontend files were changed.
- Pending: response examples, pagination/filtering, and frontend-owner integration.
- Risks: these are backend operational records, not final UX-composed view models.
- Next recommended step: document paginated DTOs once pagination lands.

## 2026-05-07 Pulse Read Pagination Update

- Changed: Pulse read responses now include pagination metadata.
- Completed: no frontend files were changed.
- Pending: frontend-owner integration and response examples.
- Risks: UX should use pagination metadata instead of assuming all records are returned.
- Next recommended step: document example responses after filters are added.

## 2026-05-07 Pulse Read Filtering Update

- Changed: backend read contracts now include operational filters for future frontend views.
- Completed: no frontend files were changed.
- Pending: response examples and frontend-owner integration.
- Risks: frontend should treat filter values as contract enums where applicable.
- Next recommended step: publish API examples after e2e tests land.

## 2026-05-07 Pulse Read Contract Test Update

- Changed: backend tests now protect the read-filter query contract before frontend integration.
- Completed: valid and invalid filter values are covered in DTO tests; controller tests verify filtered read calls keep tenant context server-owned.
- Pending: generated API examples/OpenAPI and frontend-owned integration.
- Risks: examples still need to document enum values exactly as backend contracts expose them.
- Next recommended step: publish API examples after HTTP e2e tests land.

## 2026-05-07 Pulse HTTP Read E2E Harness Update

- Changed: backend route behavior for Pulse read filters is now verified over HTTP.
- Completed: no frontend files were changed; HTTP tests prove query values are transformed/rejected as backend contracts define.
- Pending: generated API examples/OpenAPI for Claude Opus frontend integration.
- Risks: frontend should wait for documented response examples before building rich operational screens.
- Next recommended step: publish backend API examples after database-backed e2e fixtures or mutation contracts land.

## 2026-05-08 Pulse Ticket Lifecycle Mutation Update

- Changed: backend now exposes stable operator-action endpoints for ticket details and timelines.
- Completed: no frontend files were changed; request contract types were added for assign, resolve, reopen, escalate, cancel, operator review, and flow advancement.
- Pending: response examples/OpenAPI and frontend-owned integration.
- Risks: UI should present these as operational actions, not generic edit-ticket forms.
- Next recommended step: publish endpoint examples after timeline aggregation APIs are added.

## 2026-05-08 Pulse Event Catalog + Timeline Aggregation Update

- Changed: backend now exposes timeline APIs suitable for ticket details and conversation history surfaces.
- Completed: no frontend files were changed; contract types were added for Pulse event types, timeline categories, and timeline responses.
- Pending: generated API examples/OpenAPI and frontend-owned timeline composition.
- Risks: UI should treat categories as backend contract values and avoid rendering raw payload fields without product review.
- Next recommended step: publish API examples after guided flow-state semantics are defined.

## 2026-05-08 Pulse Guided Flow State Machine Update

- Changed: backend now exposes a constrained flow-state contract for operator actions.
- Completed: no frontend files were changed; `PulseFlowState` and `AdvancePulseFlowStateRequest.nextState` are now contract-defined values.
- Pending: API examples and frontend-owned affordances for allowed next actions.
- Risks: UI should not invent flow-state names; it should consume backend contract values and future allowed-transition responses.
- Next recommended step: publish allowed-transition examples after confidence/review policy is added.

## 2026-05-08 Pulse Confidence + Human Review Layer Update

- Changed: backend can now surface why automated flow advancement went to review or escalation.
- Completed: no frontend files were changed; `AdvancePulseFlowStateRequest` accepts an audit-safe `aiDecisionSummary`.
- Pending: API examples for review/escalation timeline entries and frontend-owned operator review UX.
- Risks: UI must present summaries, not raw AI reasoning or provider payloads.
- Next recommended step: document decision-summary examples after the strict summary schema is finalized.

## 2026-05-08 Pulse Knowledge Context Foundation Update

- Changed: backend exposes stable contracts for future Pulse knowledge management screens.
- Completed: no frontend files were changed; contracts cover records, publish requests, and query requests.
- Pending: API examples/OpenAPI and frontend-owned knowledge management integration.
- Risks: UI should distinguish active context from archived context and avoid implying semantic search until retrieval is implemented.
- Next recommended step: document knowledge API examples after scheduling contracts land.

## 2026-05-08 Pulse Scheduling Integration Contracts Update

- Changed: backend exposes scheduling integration readiness and prepare contracts for future scheduling UX.
- Completed: no frontend files were changed; contracts cover scheduling integration records and prepared availability/booking requests.
- Pending: API examples/OpenAPI and frontend-owned scheduling integration UX.
- Risks: UI must not present prepared booking requests as confirmed bookings.
- Next recommended step: document scheduling examples after usage metering candidate names are finalized.

## 2026-05-08 Pulse Usage Metering Foundation Update

- Changed: backend now records usage events that future admin/billing UX can summarize.
- Completed: no frontend files were changed; Pulse-specific usage unit names are documented in billing docs.
- Pending: frontend-owned usage summaries and admin billing views.
- Risks: UI should not display these units as charged until rate cards/meter mappings are active.
- Next recommended step: expose usage examples after runtime execution metrics are defined.

## 2026-05-08 Runtime Execution Lifecycle Contract Update

- Changed: backend exposes runtime execution lifecycle contracts for future admin/runtime views.
- Completed: no frontend files were changed; existing shared execution contract types remain the integration basis.
- Pending: API examples/OpenAPI and frontend-owned runtime admin views.
- Risks: UI must label lifecycle records as execution governance state, not completed runtime work.
- Next recommended step: document runtime examples after service actor authorization is designed.

## 2026-05-07 Frontend Stage 1A — IA Reorg + Pulse Rename

- Changed (frontend, Claude Opus): top-level route IA reorganised into three experiences. Public marketing at `/`, `/pricing`, `/modules`. Tenant workspace at `/workspace/*`. Platform admin at `/platform/*`. Each lives in its own App Router group with its own layout chrome.
- Completed: `(dashboard)/*` → `(workspace)/workspace/*` (history-preserving `git mv`). Old nested messaging module routes collapsed into `modules/pulse/*` with `queue → inbox` and `errors → logs` renames to align with the IA spec.
- Completed: full Pulse sub-route IA scaffolded — `/workspace/modules/pulse/{inbox,tickets,tickets/[ticketId],timeline,playbooks,knowledge,catalog,campaigns,integrations,settings,metrics,logs}`. Inbox / settings / logs ship live; the rest render via a shared `PendingSection` so the IA is present without misrepresenting implementation status.
- Completed: platform admin shell at `/platform/{overview,tenants,modules,billing,flags,integrations,runtime,audit}` — distinct top bar (indigo accent + "Platform" badge), quick-link back to workspace, every page on `PendingSection` until Stage 1B.
- Completed: marketing layer with `(marketing)` group: `/pricing` (Light/Pro/Premium with usage-billing notes), `/modules` (read-only public catalog preview).
- Completed: API client, entry/status types, and request paths updated to Pulse naming and `/v1/pulse/*` to match backend contract.
- Completed: Edge middleware (`apps/web/middleware.ts`) — public-route allowlist (`/`, `/login`, `/register`, `/pricing`, `/modules`) + `synapse_session` cookie presence guard. Static assets, `_next/*`, root metadata files and any URL with a file extension bypass via the matcher.
- Completed: i18n dictionaries + `SegmentNav` slug map updated for the new IA.
- Pending (Stage 1B, frontend): rich Pulse ticket detail with operational timeline / confidence overlays / human review actions; inbox redesign as operational queue; playbook visual editor; module store premium UI; platform admin operational dashboards; design-system additions; marketing landing premium redesign; RBAC restricted-state UX.
- Pending (cross-cutting): Pulse DTO/OpenAPI examples from backend before Stage 1B ticket/timeline screens are built — frontend currently relies on the existing `PulseEntry` shape.
- Risks: Stubs (`PendingSection`) carry a `Stage 1B` tag so they're greppable; risk is leaving them in production traffic past their due. Platform-admin role is not enforced client-side beyond the cookie gate; backend remains the only authority.
- Next recommended step: ship Stage 1B starting with the ticket detail screen (highest operational value), then inbox queue redesign, then module store and platform overview dashboards.

## 2026-05-08 Runtime AppSec Hardening Update

- Changed: backend runtime lifecycle contracts now distinguish request, transition, and cancel operations.
- Completed: no frontend files were changed; future admin/runtime views can rely on separate permissions and should present cancellation as an explicit operational command.
- Pending: API examples/OpenAPI and frontend-owned runtime admin views.
- Risks: UI must not expose transition controls broadly; runtime lifecycle records are governance state, not provider execution results.
- Next recommended step: document runtime route examples after service actor authorization is designed.

## 2026-05-08 Database Fixture Foundation Update

- Changed: no frontend files were changed.
- Completed: backend fixture coverage gives future frontend integration a safer contract baseline for runtime lifecycle and Pulse ticket mutation state.
- Pending: API examples/OpenAPI and frontend-owned handling of forbidden/cross-tenant states.
- Risks: UI should still rely on backend errors and permissions; fixture coverage does not create new frontend affordances.
- Next recommended step: publish route examples after HTTP role-matrix fixtures land.

## 2026-05-08 Platform Runtime Client Signer Update

- Changed: no frontend files were changed.
- Completed: backend can now prepare signed runtime submissions internally; no new frontend contract is exposed.
- Pending: UI-facing runtime status examples after orchestration and callbacks exist.
- Risks: frontend must not imply external runtime execution is active until backend orchestration is wired.
- Next recommended step: keep runtime UI labels as governance/lifecycle state only.

## 2026-05-08 Frontend Contract Pack Update

- Changed: added a frontend implementation handoff without changing frontend files.
- Completed: `docs/FRONTEND_CONTRACT_PACK.md` defines the first frontend milestone as Pulse ticket detail, operational timeline, permission-gated lifecycle actions, and safe event rendering.
- Pending: OpenAPI/examples and frontend-owned implementation.
- Risks: frontend should not treat Pulse as chat UI or call the isolated Go Runtime directly.
- Next recommended step: frontend owner should implement the first milestone from the contract pack.

## 2026-05-08 Frontend Stage 1B Batch 1 — Pulse operational UX

- Changed (frontend, Claude Opus): the three highest-value Pulse surfaces — ticket detail, tickets list, inbox — now ship real operational UX. Fixture-backed; backend integration deferred per directive.
- Completed: design-system additions for operational surfaces.
  - `ConfidenceMeter` (inline + block) — three confidence bands tied to the eventual auto-approve threshold.
  - `OperationalTimeline` — kind-driven icons, actor-typed avatar tones, inline confidence on AI events, structured-payload chip strip, low-confidence escalation marker.
  - `status-pills` — TicketStatus / Skill / Priority / TicketType / Channel / ConversationState / EscalationBadge sharing one base look.
- Completed: typed Pulse UI contracts at `apps/web/lib/pulse/types.ts` (`PulseTicketDetail`, `PulseTicketRow`, `PulseTimelineEvent`, plus canonical state/skill/priority unions). Dev fixtures at `apps/web/lib/pulse/fixtures.ts` — five well-shaped tickets with full timelines covering scheduling / support / operator-review / sales / resolved. Every screen calls `loadInboxTickets` / `loadTicketDetail` / `loadAllTickets` so the swap-in to real `api.pulse.*` is one file.
- Completed: `/workspace/modules/pulse/tickets/[ticketId]` — header card with status/skill/type/priority/channel pills + ConfidenceMeter (block); AI-summary callout; "why this needs review" rationale when status === PENDING_REVIEW; 2-col body with OperationalTimeline left and workflow/extracted-context/lifecycle panels right. Approve/Reject/Escalate/Resolve actions are wrapped in `<Can permission="...">` so RBAC is honoured even pre-backend.
- Completed: `/workspace/modules/pulse/tickets` — bucketed list (Operator queue / Active / Resolved) + 4-tile headline counter strip.
- Completed: `/workspace/modules/pulse/inbox` redesigned as a real operational queue. Three lanes:
  - Operator queue (top-priority, items handed off because confidence dropped or playbook required a human)
  - In flow (active conversations the AI is handling — watch passively)
  - Watching (waiting on customer)
  Plus headline counters: Needs review / In flow / Waiting customer / Auto-handled.
- Completed: legacy `inbox/queue-client.tsx` removed — was tied to the old `PulseEntry` shape.
- Pending (Batch 2): playbooks visual editor, Pulse metrics premium dashboard, knowledge / catalog / campaigns / integrations operational UX.
- Pending (Batch 3): module store premium UI, platform admin operational dashboards, marketing landing premium redesign, RBAC restricted-state UX, animated synapse bg refinements.
- Pending (backend integration, deferred to Stage 1C): Pulse DTO/OpenAPI examples → swap `lib/pulse/fixtures.ts` for `api.pulse.*` calls.
- Risks: pages using fixtures show a "Pending backend integration" badge in their PageHeader so the deferred wire-up is greppable.
- Next recommended step: Batch 2 — start with the playbooks visual editor (highest operational value next) and the metrics dashboard.

## 2026-05-08 Frontend Stage 1B Batch 2 — Pulse backend integration

- Changed (frontend, Claude Opus): Pulse inbox / tickets list / ticket detail are now wired to real `/v1/pulse/*` per `docs/FRONTEND_CONTRACT_PACK.md`. Fixtures removed.
- API client (`apps/web/lib/api.ts`) covers the full Pulse contract: channels, conversations, conversation events/timeline, tickets, ticket events/timeline, knowledge contexts (list/get/query/publish/archive), scheduling integrations (list/get + prepare availability/booking), seven lifecycle commands. `PULSE_FLOW_STATES` mirrors backend FSM.
- View models live in `apps/web/lib/pulse/types.ts` — explicit projections of backend records, never inventing data. Composition seam in `apps/web/lib/pulse/loaders.ts` returns `LoadResult<T>` so pages render honest empty/error/forbidden states without try/catch sprinkled at call sites.
- Server Actions in `apps/web/lib/pulse/actions.ts` implement the seven ticket lifecycle commands with `FormData`-or-typed-object inputs, structured `ActionResult` return shapes, and `revalidatePath` on success.
- New shared primitive `components/ui/load-state.tsx` — four variants (`empty`, `error`, `forbidden`, `not-found`).
- `ConfidenceMeter` and `ChannelPill` are null-tolerant: render "—" / collapse rather than misleading values when backend data is absent.
- Per the contract pack's AppSec rules, the loader's `summaryFor(event)` translates wire `event.type` strings into operator-facing summaries; raw provider payloads are filtered down to display-safe primitives in `safePayloadFields()`. Objects/arrays in event payloads are intentionally dropped from the timeline render.
- Pending integrations (Batch 3): module store, billing visibility, knowledge management UI, scheduling integrations UI, Pulse metrics dashboard, runtime governance for platform admin. API client already exposes these endpoints so wiring is purely additive.
- Risks: list-fanout enrichment in `loaders.toRow` issues per-row detail fetches to surface priority/confidence. The single-file seam to swap is `loaders.ts`.
- Next recommended step: Batch 3 — module store + billing visibility (highest tenant value), then the knowledge management surface.

## 2026-05-08 Admin Bootstrap Billing Plan Fix

- Changed: superseded by platform-admin bootstrap; frontend session contracts now need to handle platform admins without workspace tenants.
- Completed: no frontend files were changed by backend.
- Pending: frontend should still handle missing billing account states defensively for customer tenants.
- Risks: if customer tenant provisioning is not run, workspace state may not exist yet.
- Next recommended step: verify platform-admin login separately from customer workspace login.

## 2026-05-08 Platform Admin Bootstrap Foundation

- Changed: backend session shape for platform admins returns `role: "platform_admin"` and may omit `tenant`.
- Completed: frontend contract implication is documented here only; backend changed auth/contracts and did not implement frontend pages.
- Pending: frontend owner must route platform admins to platform administration surfaces rather than workspace-only views.
- Risks: any UI assuming `CurrentUser.tenant` always exists will misroute or crash for platform admins.
- Next recommended step: frontend should branch by `user.role === "platform_admin"` and treat workspace tenant as optional.

## 2026-05-08 Granular Platform Administration Foundation

- Changed: frontend contracts must treat `super_admin`, `admin`, and `tester` as distinct platform roles.
- Completed: backend exposes platform user-management contracts only; no frontend UX was changed.
- Pending: frontend admin surfaces must hide admin creation from granular admins and hide admin metrics from testers.
- Risks: frontend must not rely on UI hiding for security; backend permissions and future scope checks remain authoritative.
- Next recommended step: frontend should consume `/v1/users/me` role/permissions and later `platformScopes` from platform user APIs.

## 2026-05-08 Platform Governance Scope Enforcement

- Changed: backend now has scoped platform read APIs for future admin dashboards.
- Completed: frontend may consume platform usage metrics/modules/policies through backend only; no frontend implementation was changed.
- Pending: frontend admin dashboards must display scoped/partial states honestly for granular admins.
- Risks: UI must not infer hidden modules/policies exist when backend omits them by scope.
- Next recommended step: frontend handoff should add scoped empty states and forbidden states for platform admin surfaces.

## 2026-05-08 Platform Governance Mutations

- Changed: frontend contract now has backend mutation APIs for platform module and policy governance.
- Completed: no frontend files changed; backend exposes mutation endpoints for future admin surfaces.
- Pending: frontend should show mutation controls only when permissions/scopes allow and handle `403` as expected state.
- Risks: rollout/policy changes are global and should not be presented as tenant-local controls.
- Next recommended step: frontend handoff should place these actions in platform admin, not workspace module settings.

## 2026-05-08 Platform Governance Test Fixtures

- Changed: backend tests now document which platform admin states the frontend must handle.
- Completed: tester/tenant-owner forbidden states and scoped admin handoff behavior are covered.
- Pending: frontend can later mirror DB-backed scope-limited states.
- Risks: frontend must still treat backend `403` as authoritative.
- Next recommended step: include these cases in the frontend admin-dashboard handoff.

## 2026-05-08 Platform Governance Database Fixtures

- Changed: backend now proves persisted scope-limited states for admin dashboard data.
- Completed: DB fixture validates that scoped admins receive only assigned module/policy/usage data.
- Pending: frontend empty-state language for out-of-scope data.
- Risks: UI must not claim unscoped modules/policies do not exist globally.
- Next recommended step: frontend should label these views as scoped to assigned permissions.

## 2026-05-08 Dev Database Reset Flow

- Changed: backend dev QA can use the current Docker Postgres as disposable state.
- Completed: documented reset-and-run flow; no frontend behavior changed.
- Pending: frontend can run after reset only once platform/customer seed/admin bootstrap are recreated.
- Risks: reset removes all local sessions and workspace data.
- Next recommended step: coordinate reset timing before frontend manual validation.

## 2026-05-09 Frontend Stage 1B Batch 3 — Pulse lifecycle action UI

- Changed (frontend, Claude Opus): Pulse ticket detail is now interactive end-to-end. Operators can assign, escalate, submit operator review, advance flow, resolve, reopen, and cancel a ticket from the page header — each action gated by the user's backend permissions and validated again server-side.
- New shared primitives: `components/ui/dialog.tsx` (portal + scroll lock + focus management + Esc/overlay dismiss), `components/ui/toast.tsx` with a `<ToastProvider>` mounted inside the global Providers tree. Both are intentionally minimal — no shadcn/ui or radix dependency.
- Tenant cache hygiene: `components/auth/tenant-invalidator.tsx` is mounted inside the workspace layout. It watches `currentUser.tenant.id` and calls `router.refresh()` on a real change, dropping the App Router client cache so Pulse data cannot leak across tenants when a tenant-switcher UI eventually ships.
- The action bar (`components/pulse/ticket-action-bar.tsx`) is the click-to-act layer. Permission visibility uses `<Can>` against `currentUser.permissions` (`tickets:assign`, `tickets:resolve`, `tickets:write`); FSM hint flags from `capabilities.canX` disable transitions that would never succeed (e.g. resolve a `RESOLVED` ticket). `useTransition()` drives a single source of pending state across all dialogs; the typed `ActionResult` from `lib/pulse/actions.ts` produces `success` / `forbidden` / `error` toasts. Failure does not close the dialog — the operator can correct and retry. Server Actions revalidate ticket detail, tickets list, and inbox so the RSC re-render picks up fresh state.
- AppSec posture preserved: dialogs collect only operator-facing inputs (assignee id, reason, summary, category, confidence, FSM target). Raw provider payloads, secrets, and chain-of-thought are never displayed and never sent. Confidence is normalized to 0..1 client-side before hitting the API.
- Pending backend contract gaps (raised, not implemented): (1) tenant member-picker endpoint to replace the free-text assignee id in the Assign dialog. (2) `workflow.playbookStep` populated on `GET /v1/pulse/tickets/:id` so the Workflow side panel can show the *current* FSM position, not just allow a transition. (3) structured `extracted.fields` array on the ticket detail payload so the Extracted Context side panel can render real key/values.
- Pending UI work: tenant member picker, playbook step indicator + progress, knowledge management surface, scheduling integrations surface.
- Risks: list pages still use per-row detail enrichment via `loaders.toRow`; nothing in this batch addresses that. The action bar uses optimistic-revalidate, not optimistic state — operators on slow networks see a brief "Working…" spinner; acceptable.
- Next recommended step: Batch 4 — knowledge management surface + scheduling integrations surface, both gated on existing contract-pack endpoints in `lib/api.ts`.

## 2026-05-09 Stage 1 — Context Pack UX Contract Note

- Changed: documented backend implication for future frontend/runtime integration only; no frontend implementation changed.
- Completed: Pulse Context Packs are backend/module-internal contracts and should not expose raw provider payloads, chain-of-thought, or unmasked sensitive context to UI surfaces.
- Pending: frontend may later display high-level context summaries, playbook state, and required human-review reason fields after backend exposes audit-safe DTOs.
- Risks: rendering raw context packs in admin/debug UI would leak operational or sensitive tenant data.
- Next recommended step: expose separate audit-safe context preview DTOs if frontend needs context visibility.

## 2026-05-09 Stage 2 — Pulse Context Pack Frontend Note

- Changed: backend now has an internal Pulse Context Pack assembler; no frontend implementation is required for this stage.
- Completed: the pack is intentionally audit-safe but still operationally rich, so it remains a backend/runtime contract rather than a UI DTO.
- Pending: if frontend needs visibility later, backend should expose a separate preview endpoint with narrower fields and RBAC/audit controls.
- Risks: using raw context packs as debug payloads in the browser could expose tenant operational data.
- Next recommended step: frontend should continue integrating ticket/knowledge/scheduling APIs, not raw runtime context packs.

## 2026-05-09 Stage 3 — Pulse Async UX Note

- Changed: backend queue boundaries were added; no frontend changes are required.
- Completed: existing API behavior for entry creation/retry remains asynchronous. The internal queue name changed to `pulse.inbound`, but frontend contracts stay stable.
- Pending: when context/execution workers land, frontend may need status fields or timeline events rather than polling raw queue state.
- Risks: exposing queue internals in UI would couple operators to implementation details.
- Next recommended step: surface operational timeline/status DTOs, not BullMQ job data.

## 2026-05-09 Stage 3B — Execution Request UX Note

- Changed: backend now prepares runtime execution records from context jobs; no frontend changes are required.
- Completed: operational events can later drive timeline/status UI without exposing raw context packs or queue jobs.
- Pending: frontend-facing DTOs for execution status should be separate from internal `ExecutionRequest.context`.
- Risks: showing raw prepared execution payloads would leak operational context.
- Next recommended step: expose only timeline events and high-level execution status when the UI needs visibility.

## 2026-05-09 Stage 3C — Store Visibility UX Contract

- Changed: backend now exposes `storeVisible` on platform module governance records.
- Completed: frontend admin should treat `storeVisible` as a commercial marketplace switch, separate from active/status/visibility/rollout.
- Pending: frontend store should only show modules returned by backend store APIs; platform admin should restrict the control to super-admin users.
- Risks: ambiguous labels could cause admins to hide a module from sales when they intended to disable runtime, or vice versa.
- Next recommended step: admin UI should label this control as "Show in store" and explain that it does not disable installed/internal modules.

## 2026-05-09 Stage 3D — Execution Status UX Note

- Changed: execution records may now complete with a placeholder no-provider result.
- Completed: backend output clearly marks `executable: false` and `reason: runtime_provider_not_implemented`.
- Pending: frontend/admin surfaces should hide or label these placeholder results as backend/runtime preparation, not AI output.
- Risks: displaying `SUCCEEDED` alone would mislead operators.
- Next recommended step: expose a derived execution display status before showing runtime details in UI.

## 2026-05-09 Stage 3E — Timeline UX Note

- Changed: backend now projects execution dispatch lifecycle into Pulse operational events through `pulse.timeline`.
- Completed: frontend should continue querying timeline APIs instead of queue/job internals.
- Pending: frontend-safe DTOs may need labels that distinguish no-provider dispatch preparation from real runtime execution.
- Risks: raw queue names should not become operator-facing UI concepts.
- Next recommended step: add display-safe timeline labels once provider execution exists.

## 2026-05-09 Stage 3F — Actions UX Note

- Changed: backend now emits action lifecycle events, but they are preparatory.
- Completed: UI should not show action completion as business completion while `reason: action_handler_not_implemented`.
- Pending: display labels for prepared/skipped/failed action states.
- Risks: presenting prepared actions as applied actions would mislead operators.
- Next recommended step: frontend should wait for real action result DTOs before showing action outcome as completed.

## 2026-05-09 Stage 3G — Real Action UX Note

- Changed: `ticket.advance_flow` can now produce a real action completion with `sideEffectsApplied: true`.
- Completed: timeline payload includes action result fields such as ticket id/status/confidence/priority.
- Pending: frontend should distinguish real action completion from prepared-only completion by checking `sideEffectsApplied`.
- Risks: mixing prepared and real action events requires clear UI labels.
- Next recommended step: expose display-safe action result labels in timeline DTOs.

## 2026-05-09 Stage 3H — Action Governance UX Note

- Changed: backend can now distinguish action enqueue denial from action execution failure.
- Completed: missing permission snapshots are rejected before queueing.
- Pending: UI should surface permission/unsupported-action failures as governance denials, not runtime errors.
- Risks: treating enqueue denials like worker failures would confuse operators.
- Next recommended step: add frontend-safe error codes when action APIs are exposed.

## 2026-05-09 Stage 3I — Runtime Action Planning UX Contract

- Changed: no frontend implementation changed.
- Completed: backend can now distinguish planned/enqueued runtime actions from skipped suggestions caused by malformed output, low confidence, unsupported state, missing context, or RBAC denial.
- Pending: expose this through stable read APIs/timeline events before frontend renders runtime action recommendations.
- Risks: frontend must not render runtime output as an executed action unless the backend timeline reports governed completion.
- Next recommended step: add timeline categories/statuses for planned, skipped, denied, dispatched, and completed actions.

## 2026-05-09 Stage 3J — Runtime Result Ingestion UX Contract

- Changed: no frontend implementation changed.
- Completed: backend now has separate concepts for runtime result ingestion, action planning, and action execution. Timeline events can later expose these as distinct operator states.
- Pending: frontend-safe DTO labels for ingested, planned, skipped, denied, dispatched, and applied states.
- Risks: rendering a successful runtime ingestion as a completed business action would mislead operators.
- Next recommended step: expose display-safe timeline summaries after signed runtime ingestion exists.

## 2026-05-09 Stage 3K — Signed Runtime Callback UX Note

- Changed: no frontend implementation changed.
- Completed: runtime callback transport is backend-only and should not be called from the browser.
- Pending: frontend-safe timeline/read DTOs for signed runtime result status.
- Risks: exposing callback routes in frontend clients would be incorrect; this is service-to-service only.
- Next recommended step: frontend should consume timeline/action status APIs, never runtime callback endpoints.

## 2026-05-09 Stage 3L — Runtime Actor Snapshot UX Note

- Changed: no frontend implementation changed.
- Completed: runtime-driven actions are now attributable to the original execution actor snapshot rather than callback payload.
- Pending: frontend-safe timeline DTOs should eventually show audit attribution without exposing sensitive permission snapshots.
- Risks: showing raw permission snapshots in UI would leak internal authorization details.
- Next recommended step: expose actor display labels through sanitized timeline/read DTOs only.

## 2026-05-09 Stage 3M — Runtime Result Fixture UX Note

- Changed: no frontend implementation changed.
- Completed: backend fixtures reinforce that runtime-driven action attribution should come from sanitized backend timeline/read models, not callback payloads.
- Pending: sanitized actor labels in timeline DTOs.
- Risks: frontend should not infer action attribution from runtime response content.
- Next recommended step: add display-safe timeline mapping after worker-side permission revalidation.

## 2026-05-09 Stage 3N — Action Worker Failure UX Note

- Changed: backend can now distinguish worker-side permission rejection from runtime/provider failure.
- Completed: rejected action jobs emit `pulse.action.failed` with permission failure reason and do not emit completed side-effect state.
- Pending: frontend-safe error labels for action governance denial versus worker rejection.
- Risks: exposing raw permission names may be too detailed for some operator UI surfaces.
- Next recommended step: map permission failures to sanitized timeline labels before frontend rendering.

## 2026-05-09 Stage 3O — Action Retry UX Note

- Changed: backend can distinguish retryable action failures from permanent governance failures.
- Completed: timeline payloads include `retryable` and `failureClass`.
- Pending: frontend-safe labels for retryable versus terminal action failures.
- Risks: UI should not offer retry controls for `non_retryable_governance` failures.
- Next recommended step: expose sanitized action failure status in timeline DTOs.

## 2026-05-09 Stage 3P — Action Validation UX Note

- Changed: backend can distinguish malformed action payloads from governance denials and transient failures.
- Completed: validation failures use `non_retryable_validation`.
- Pending: sanitized labels for invalid payload/action contract failures.
- Risks: frontend should not expose raw internal schema details to operators.
- Next recommended step: map validation failures to display-safe action failure reasons.

## 2026-05-09 Stage 3Q — Action Registry UX Note

- Changed: no frontend implementation changed.
- Completed: backend action execution path is more stable for future action status APIs.
- Pending: display-safe action definition/status contract.
- Risks: frontend should still consume timeline/read APIs, not action registry internals.
- Next recommended step: expose action status through sanitized timeline DTOs.

## 2026-05-09 Stage 3R — Action Definition UX Note

- Changed: backend action definitions now provide a future source for action labels/capabilities.
- Completed: no frontend implementation changed.
- Pending: sanitized action definition/read contract if frontend needs capability metadata.
- Risks: frontend must not import backend registry internals.
- Next recommended step: expose action capabilities through explicit read DTOs only if needed.

## 2026-05-09 Stage 3S — Context Pack Action UX Note

- Changed: no frontend implementation changed.
- Completed: backend action vocabulary is more consistent for future action capability/read APIs.
- Pending: sanitized action capability DTO if frontend needs to display available actions.
- Risks: Context Pack remains internal and should not be rendered raw in frontend.
- Next recommended step: expose action availability through dedicated read APIs, not raw Context Packs.

## 2026-05-09 Stage 3T — Runtime Output Validation UX Note

- Changed: no frontend implementation changed.
- Completed: backend now blocks malformed runtime outputs before they appear as planned actions or timeline side effects.
- Pending: display-safe runtime result failure reasons if operators need visibility into invalid automation outputs.
- Risks: frontend must not render raw schema-validation messages from internal runtime payloads.
- Next recommended step: expose sanitized timeline/status DTOs for runtime validation failures when needed.

## 2026-05-14 Stage 4A — Frontend Contract Note

- Changed: backend now supports tenantless registration/login and explicit workspace creation.
- Completed: module activation without a workspace receives the business error: `You must create at least one workspace before activating modules.`
- Pending: frontend owner must add workspace creation/selection flows and admin plan/quota management screens.
- Risks: admin plan entitlement JSON should be edited through constrained forms, not raw unrestricted JSON.
- Next recommended step: deliver frontend contracts for workspace creation and plan/quota admin forms.

## 2026-05-14 Stage 4B — Workspace Selection UX Contract

- Changed: `GET /v1/users/me` may include `memberships` for tenantless or platform sessions.
- Completed: `POST /v1/auth/workspace` switches the cookie session into a selected tenant membership.
- Pending: frontend workspace picker and account switcher integration.
- Risks: frontend must not silently pick the first membership when multiple workspaces exist.
- Next recommended step: frontend should show explicit workspace selection after login when no tenant is selected.

## 2026-05-14 Stage 4C — Live Permission UX Note

- Changed: backend authorization can reflect membership role changes before the user logs out.
- Completed: `users/me` remains the read contract for frontend permissions, while guards enforce live membership permissions on protected routes.
- Pending: frontend should refresh `users/me` after workspace selection and after membership admin changes.
- Risks: cached UI permissions can lag backend enforcement.
- Next recommended step: frontend should treat 403 responses as authority and refresh session/user state.

## 2026-05-14 Stage 4D — Stale Session UX Note

- Changed: DB fixture documents expected stale-session behavior.
- Completed: after backend role downgrade, protected writes should fail even if the browser still displays older permissions.
- Pending: frontend refresh strategy after 403.
- Risks: UI may appear permissive until it refreshes `users/me`.
- Next recommended step: frontend should refresh current user state on authorization failures.

## 2026-05-14 Stage 4E — Runtime Action Skip UX Note

- Changed: runtime actions can now be skipped because current actor permissions no longer allow the side effect.
- Completed: backend reports skipped action plans instead of enqueueing unsafe work.
- Pending: display-safe labels for skipped runtime automation actions.
- Risks: operators may see execution success with no action if UI does not show skip reason.
- Next recommended step: expose sanitized skip reasons in timeline/read DTOs.

## 2026-05-14 Stage 4F — User Quota UX Note

- Changed: membership creation can return a business quota error when plan user limit is reached.
- Completed: backend message includes plan key and allowed user count.
- Pending: frontend should display quota exhaustion as billing/plan state, not generic access denial.
- Risks: admins may confuse role permission failure with quota exhaustion.
- Next recommended step: document frontend error mapping for membership creation.

## 2026-05-14 Stage 4G — Plan Cache UX Note

- Changed: no frontend contract changed.
- Completed: quota checks should remain semantically identical while plan limits are cached.
- Pending: frontend error mapping for quota exhaustion.
- Risks: cache TTL may cause very short delay after manual plan edits.
- Next recommended step: frontend should allow retry after plan changes and treat backend error as source of truth.

## 2026-05-14 Stage 4H — Action Usage UX Note

- Changed: no frontend API contract changed.
- Completed: billable workflow usage is backend-governed and should be surfaced later through usage/billing summaries, not action payloads.
- Pending: display-safe usage summary endpoints for action-level workflow runs if product needs them.
- Risks: operators should not infer billing state from timeline action labels alone.
- Next recommended step: keep frontend usage displays tied to billing summary APIs.

## 2026-05-14 Stage 4I — Usage Retry UX Note

- Changed: no frontend API contract changed.
- Completed: backend retries of the same action usage do not create duplicate billing rows or require extra credits.
- Pending: none for frontend until usage summaries expose action usage.
- Risks: frontend should not retry raw action jobs directly.
- Next recommended step: keep retries behind backend workflow/action APIs.

## 2026-05-14 Stage 4J — Action Retry UX Note

- Changed: no frontend API contract changed.
- Completed: repeated backend delivery of the same Pulse action does not produce duplicate ticket transitions.
- Pending: display-safe action retry status is not exposed yet.
- Risks: frontend should continue treating backend timeline/status as source of truth.
- Next recommended step: expose sanitized action status only through timeline/read DTOs if needed.

## 2026-05-14 Stage 4K — Action Ledger UX Note

- Changed: no frontend API contract changed.
- Completed: duplicate action delivery is backend-controlled through the Pulse action ledger.
- Pending: optional read DTOs for action execution status if operator troubleshooting needs them.
- Risks: frontend should not render ledger internals directly.
- Next recommended step: expose only sanitized timeline/action status summaries if needed.

## 2026-05-14 Stage 4L — Transactional Action UX Note

- Changed: no frontend API contract changed.
- Completed: action timeline, ticket state, and usage are less likely to diverge after backend retries/failures.
- Pending: sanitized action status DTOs if needed for support tooling.
- Risks: UI should still rely on read APIs rather than assuming immediate queue completion.
- Next recommended step: keep action execution details behind backend-safe status summaries.

## 2026-05-10 Frontend Evolution — Stage 1 (Layout Foundation)

- Changed (frontend, Claude Opus): adopted the staged evolution strategy (one focus per stage). Stage 1 introduces a persistent operational sidebar and slims the top bar; subsequent stages will refine surfaces, motion, navigation architecture, and content.
- The workspace shell is now a `sidebar + main` grid. `components/nav/workspace-sidebar.tsx` exports two primitives: `WorkspaceSidebar` (tenant) and `PlatformSidebar` (admin). Each is a sticky 240/64-px collapsible rail with `localStorage`-persisted state under `synapse.sidebar.collapsed`. Permission gates run client-side via `hasAnyPermission`, so items the operator can't reach disappear instead of mocking presence.
- The top-nav surface is now a thin chrome: logo + ⌘K + Language + Theme + UserMenu. Primary navigation links were removed from the top bar and consolidated into the sidebar. The wider `container-shell` (1500-px max-w centered) was removed from `TopNav`, `SegmentNav`, and the platform header so the new shell uses the full horizontal width with comfortable padding (`px-4 lg:px-6` for chrome, `px-6 lg:px-10` for main content).
- `SegmentNav` now flows inside the main column instead of rendering as a full-width strip; its container was simplified to follow the parent flex layout.
- Visual identity is preserved: workspace sidebar uses brand accents for the active-section bar; platform sidebar uses indigo/violet. Active state is a static left-edge accent bar — animated active states are reserved for Stage 4. No motion language was changed in Stage 1.
- Responsive baseline: sidebar is `hidden md:flex` for now. A proper mobile drawer (and tooltips for collapsed labels, sub-section collapse, animated active states) are deferred to **Stage 4 — Navigation Architecture**.
- Out of scope this stage (per strategy): dashboard content, Pulse internals, module store internals, knowledge/scheduling/metrics work, motion tokens, design-system surface refinements.
- Pending: Stage 2 (Design System Evolution), Stage 3 (Motion / Interaction Layer), Stage 4 (Navigation Architecture) and the rest of the 11-stage plan in `docs/STATUS.md`.
- Risks: existing in-page `container-shell` callers (none today after the chrome refactor) would re-center inside the wider main column; nothing in the codebase relies on this currently. The unused `app/(platform)/platform/_components/platform-nav.tsx` is left on disk for Stage 4 to retire explicitly.
- Next recommended step: **Stage 2 — Design System Evolution** (transparent surfaces, thin borders, hover states, typography, shadows, glass effects, icon sizing, spacing rhythm). One focus per stage.
