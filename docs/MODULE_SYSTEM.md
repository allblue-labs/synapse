# Module System

Synapse core is domain-neutral. Business capabilities are delivered by modules.

## Core Owns

- LLM pool and routing.
- Prompt engine and context/memory foundation.
- Task and workflow orchestration.
- Module lifecycle, permissions, actions, events, and contracts.
- Observability and per-tenant visibility.

## Modules Own

- Domain concepts.
- Provider integrations.
- Module-specific state.
- Module actions and emitted events.

## Current Contract

Backend modules implement:

```ts
interface SynapseModule {
  name: string;
  displayName: string;
  version: string;
  description: string;
  register(core: SynapseCoreService): void | Promise<void>;
  actions: ModuleAction[];
  events?: ModuleEvent[];
  permissions?: string[];
}
```

Shared manifest/action/event shapes live in `packages/contracts`.

## Current Modules

- `pulse`: Synapse Pulse, the first extractable product module for operational communication queues, AI extraction, validation, and workflow actions.

## Boundary Rule

Messaging, incidents, inventory, and workforce must not enter core. If core needs a new capability, it should be a generic primitive useful across modules.

## Runtime Coordination

When modules are enabled or disabled, Synapse updates a tenant runtime spec. Today this is stored in memory and sent to a stub Pain client. Later the same flow will apply specs to Pain Runtime Operator.

## 2026-05-07 Backend Update

- Changed: module registry now registers `PulseSynapseModule` directly instead of a generic messaging product module.
- Completed: Pulse manifest exposes slug `pulse`, `pulse:*` permissions, and initial action/event metadata.
- Pending: persistent module marketplace/store records, tenant module purchases, entitlement gates, and runtime specs backed by storage.
- Risks: in-memory enablement is not production durable; module commercial activation must wait for enough public modules to satisfy plan entitlements.
- Next recommended step: design the persisted module registry/store schema before adding billing entitlement enforcement.

## 2026-05-07 Naming Update

- Changed: first module manifest is Pulse / `pulse`.
- Completed: action and event names use `pulse.entry.*`.
- Pending: persisted module registry schema still needs to store slug, display name, permissions, actions, and commercial state.
- Risks: registry slug changes are breaking until persisted aliases or migrations exist.
- Next recommended step: add a module-registry test asserting Pulse appears exactly once with slug `pulse`.

## 2026-05-07 RBAC + Route Protection Update

- Changed: Pulse module route metadata is now tested against the `pulse:*` permission contract.
- Completed: module API boundary is safer for future registry, entitlement, and marketplace work.
- Pending: module registry still needs persisted records and tests asserting Pulse manifest registration.
- Risks: in-memory registry behavior is still not durable across process restarts.
- Next recommended step: implement persisted module registry/store models and service tests.

## 2026-05-07 Pulse Tenant Isolation Test Update

- Changed: Pulse module persistence boundary now has tenant-scoping tests.
- Completed: the first product module has baseline isolation coverage before registry persistence begins.
- Pending: persisted module install records must follow the same tenant-scoped repository pattern.
- Risks: module registry enablement is still in memory and not auditable.
- Next recommended step: design Prisma models for module catalog, tenant module state, and audit events for enable/disable.

## 2026-05-07 Module Registry Store Update

- Changed: module registry now persists catalog and tenant installation state.
- Completed: `module_catalog_items` stores Pulse manifest metadata; `tenant_module_installations` stores tenant enable/disable state; registry service tests cover seed/list/enable behavior.
- Completed: tenant-facing registry list/enable/disable paths only operate on `PUBLIC` module records.
- Pending: module marketplace purchase records, admin feature flags, module categories, and public module availability rules.
- Risks: persisted registry exists, but runtime rehydration and billing entitlement enforcement are not complete.
- Next recommended step: implement billing core and entitlement gates around module enablement.

## 2026-05-07 Billing Core Update

- Changed: module enablement now depends on billing entitlement or active module purchase.
- Completed: Pulse gets a default Light plan entitlement after catalog seeding; non-entitled tenants cannot enable modules through the registry service.
- Pending: marketplace purchase APIs and Stripe-backed purchase state.
- Risks: plan/module entitlements are backend-managed but not yet exposed through a full admin UI contract.
- Next recommended step: add operational usage metering primitives and then marketplace purchase lifecycle.

## 2026-05-07 Operational Usage Metering Update

- Changed: modules can now record operational usage through platform-owned usage metering.
- Completed: Pulse records automation execution, audio transcription, and AI extraction events without owning billing logic.
- Pending: module-level usage contracts for future modules and pricing/rating integration.
- Risks: modules must not bypass the shared usage metering service.
- Next recommended step: define standard usage event naming/idempotency rules for module authors.

## 2026-05-07 Usage Rating Update

- Changed: module usage can now be converted into rated billing-period aggregates by the platform.
- Completed: rating remains platform-owned and independent from Pulse business logic.
- Pending: module author documentation for metric units and idempotency keys.
- Risks: inconsistent metric units across modules would fragment rating.
- Next recommended step: publish metric/unit conventions for future modules.

## 2026-05-07 Stripe Usage Reporting Update

- Changed: platform billing can report module usage aggregates to Stripe without module-owned Stripe logic.
- Completed: modules remain isolated from Stripe; Pulse only records usage through platform metering.
- Pending: module marketplace purchase lifecycle and Stripe-backed module subscriptions.
- Risks: modules must not create Stripe events directly.
- Next recommended step: keep Stripe integrations inside billing/usage platform services.

## 2026-05-07 Stripe Webhook Reconciliation Update

- Changed: Stripe subscription/invoice reconciliation remains in the platform billing module, not in product modules.
- Completed: Pulse remains isolated from Stripe lifecycle logic; module usage and commercial state continue to flow through platform metering, registry, and billing services.
- Pending: marketplace purchase lifecycle for module a-la-carte purchases.
- Risks: future modules must not depend on Stripe webhook payloads directly.
- Next recommended step: define a platform-owned module purchase contract before exposing paid module checkout.

## 2026-05-07 Stripe Checkout Provisioning Update

- Changed: subscription checkout is platform-owned and plan-based, not module-owned.
- Completed: product modules still do not know about Stripe customers, prices, checkout sessions, or subscriptions.
- Pending: a-la-carte module purchase checkout and marketplace entitlement reconciliation.
- Risks: future paid modules must use platform purchase contracts instead of direct Stripe coupling.
- Next recommended step: design module purchase checkout around `module_purchases` and registry entitlements.

## 2026-05-07 Stripe Portal + Redirect Allowlist Update

- Changed: billing portal access remains platform-owned and outside product modules.
- Completed: modules remain isolated from customer portal and subscription self-service behavior.
- Pending: module purchase portal/checkout rules for a-la-carte modules.
- Risks: module marketplaces must not bypass platform billing portal controls.
- Next recommended step: define module purchase lifecycle APIs under billing/registry contracts.

## 2026-05-07 Stage 1 Backend Refinement + Pulse Foundation Update

- Changed: module catalog now supports tier, visibility, rollout state, feature flag, and active/inactive metadata.
- Completed: Pulse manifest declares Light tier, public visibility, GA rollout, and operational actions/events for tickets and flow transitions.
- Pending: admin APIs for module rollout controls and feature-flag-aware module listing.
- Risks: module metadata exists but admin management is not yet exposed.
- Next recommended step: add module registry admin endpoints after RBAC/platform-admin separation is finalized.

## 2026-05-07 Pulse Operational Lifecycle Wiring Update

- Changed: Pulse module actions now have durable operational outputs through tickets and events.
- Completed: current queue API remains compatible while the module becomes more operational internally.
- Pending: guided-flow action contracts and module-owned ticket/timeline read actions.
- Risks: Pulse module should continue using platform usage/audit/registry services instead of owning those concerns.
- Next recommended step: add flow transition contracts around `pulse.flow.transition`.

## 2026-05-07 Pulse Channel + Conversation Ingestion Update

- Changed: Pulse module now resolves operational channel/conversation state during entry ingestion.
- Completed: transport details remain module-owned while tenant, billing, usage, and audit remain platform-owned.
- Pending: provider webhook adapters mapping into Pulse ingestion contracts.
- Risks: channel abstractions must stay provider-neutral enough for Telegram and future transports.
- Next recommended step: add provider mapping contracts for WhatsApp and Telegram inbound events.

## 2026-05-07 Pulse Direct Conversation Validation Update

- Changed: Pulse module compatibility path for direct conversation ids now validates tenant ownership.
- Completed: module internals no longer trust direct ids blindly.
- Pending: provider mapping contracts still need to become the preferred ingestion path.
- Risks: keeping both direct and provider-context paths increases maintenance until deprecation.
- Next recommended step: mark direct-id ingestion as compatibility-only in API docs.

## 2026-05-07 Pulse Channel + Conversation Read API Update

- Changed: Pulse exposes initial operational state reads without moving business logic into core.
- Completed: channel/conversation APIs live inside `src/product-modules/pulse`.
- Pending: ticket/timeline read APIs and provider mapping docs.
- Risks: keep transport setup concerns isolated from core module registry logic.
- Next recommended step: add Pulse ticket/timeline reads inside the product module boundary.

## 2026-05-07 Pulse Ticket + Timeline Read API Update

- Changed: Pulse module exposes ticket and operational event timeline reads inside the product-module boundary.
- Completed: core remains uninvolved in Pulse-specific ticket/timeline logic.
- Pending: playbook/flow transition APIs and ticket mutation workflows.
- Risks: do not move Pulse ticket semantics into core orchestration.
- Next recommended step: add flow transition use cases inside Pulse.

## 2026-05-07 Pulse Read Pagination Update

- Changed: Pulse module read APIs now use paged envelopes.
- Completed: pagination remains inside the Pulse module repositories/use cases/controllers.
- Pending: reusable filtering patterns for future modules.
- Risks: avoid creating core-specific abstractions until another module needs the same pattern.
- Next recommended step: add Pulse-specific filters first, then generalize only if repeated.

## 2026-05-07 Pulse Read Filtering Update

- Changed: Pulse-specific read filters were added inside the product module boundary.
- Completed: no core abstraction was introduced prematurely.
- Pending: shared filtering conventions for future modules if repeated.
- Risks: over-generalizing now would couple future modules to Pulse concepts.
- Next recommended step: keep next changes focused on Pulse flow transitions.

## 2026-05-07 Pulse Read Contract Test Update

- Changed: added module-local tests for Pulse read filter contracts.
- Completed: validation and controller contract tests live inside the Pulse product-module tree.
- Pending: module API examples and future flow-transition use cases.
- Risks: shared test helpers should be introduced only after another product module needs them.
- Next recommended step: add Pulse flow transition contracts after HTTP e2e coverage is planned.

## 2026-05-07 Pulse HTTP Read E2E Harness Update

- Changed: Pulse product-module tests now include a local HTTP harness.
- Completed: the harness stays inside the Pulse module boundary and stubs module use cases.
- Pending: reusable e2e helpers only if future modules need the same pattern.
- Risks: avoid moving Pulse-specific test setup into core prematurely.
- Next recommended step: proceed to Pulse ticket mutation contracts or database-backed read fixtures.

## 2026-05-08 Pulse Ticket Lifecycle Mutation Update

- Changed: Pulse lifecycle logic remains inside `src/product-modules/pulse`.
- Completed: command DTOs, lifecycle use case, event payload helper, repository mutation method, and controller routes are module-local.
- Pending: shared event conventions only if future modules repeat the pattern.
- Risks: do not move Pulse ticket semantics into core orchestration while preparing future runtime contracts.
- Next recommended step: add Pulse timeline aggregation within the product-module boundary.

## 2026-05-08 Pulse Event Catalog + Timeline Aggregation Update

- Changed: event taxonomy and timeline aggregation remain inside the Pulse product-module boundary.
- Completed: `domain/pulse-event-types.ts` centralizes V1 event names and category mappings.
- Pending: shared event taxonomy only if multiple product modules need a platform convention.
- Risks: premature platform abstraction would couple future modules to Pulse-specific history categories.
- Next recommended step: keep guided flow state-machine work module-local.

## 2026-05-08 Pulse Guided Flow State Machine Update

- Changed: Pulse owns its V1 state-machine rules inside the product-module domain.
- Completed: `domain/pulse-flow-state-machine.ts` defines supported states and transitions without adding core orchestration coupling.
- Pending: playbook-specific policies and runtime-ready transition contracts.
- Risks: do not promote this to a core workflow engine until module extraction requirements are clearer.
- Next recommended step: add confidence/human-review policies inside Pulse first.

## 2026-05-08 Pulse Confidence + Human Review Layer Update

- Changed: Pulse owns confidence routing policy inside the product-module domain.
- Completed: `domain/pulse-confidence-policy.ts` defines V1 thresholds without calling runtime providers.
- Pending: playbook-specific policy overrides and tenant settings.
- Risks: keep policy extractable-first and avoid coupling it to core billing/runtime services.
- Next recommended step: implement Pulse Knowledge Context inside the product-module boundary.

## 2026-05-08 Pulse Knowledge Context Foundation Update

- Changed: knowledge context lives entirely inside the Pulse product module.
- Completed: module-local repository, port, DTOs, use case, controller routes, and contracts were added.
- Pending: retrieval adapters only after runtime/search strategy is selected.
- Risks: do not move Pulse-specific context semantics into core knowledge-base modules prematurely.
- Next recommended step: add scheduling contracts inside Pulse integration boundaries.

## 2026-05-08 Pulse Scheduling Integration Contracts Update

- Changed: scheduling contracts remain inside Pulse integration boundaries.
- Completed: provider port and integration-setting repository ports are module-local and extractable-first.
- Pending: provider adapters and shared platform integration lifecycle APIs.
- Risks: avoid coupling Pulse scheduling to core orchestration before provider lifecycle is finalized.
- Next recommended step: add usage metering foundation inside platform services while keeping Pulse event candidates module-local.

## 2026-05-08 Pulse Usage Metering Foundation Update

- Changed: Pulse modules call the platform usage service through explicit use-case boundaries.
- Completed: no billing/rating logic moved into Pulse; Pulse only emits usage events.
- Pending: shared naming conventions for future modules' usage units.
- Risks: keep module-authored usage units documented to avoid marketplace billing ambiguity.
- Next recommended step: document runtime execution usage unit conventions with runtime contracts.

## 2026-05-08 Runtime Execution Lifecycle Contract Update

- Changed: runtime execution lifecycle is in core runtime, not in product modules.
- Completed: product modules can later create runtime requests through stable contracts without importing provider adapters.
- Pending: module-to-runtime orchestration service and external runtime adapter.
- Risks: do not let product modules call future provider clients directly.
- Next recommended step: define module-owned execution request conventions after AppSec hardening.

## 2026-05-08 Runtime AppSec Hardening Update

- Changed: runtime governance hardening remains in core runtime and does not move provider execution into product modules.
- Completed: product modules inherit stricter lifecycle contracts through core runtime permissions, transition validation, cancellation, audit, and payload masking.
- Pending: module-to-runtime request conventions and service-actor callback boundaries.
- Risks: product modules must not bypass core runtime lifecycle services when future runtime adapters exist.
- Next recommended step: define module-owned execution request conventions after tenant fixture coverage.

## 2026-05-08 Database Fixture Foundation Update

- Changed: fixture coverage preserves the core/product-module boundary.
- Completed: runtime lifecycle fixtures live in core runtime; Pulse lifecycle fixtures live inside `src/product-modules/pulse`.
- Pending: module registry enablement fixtures and module-to-runtime request convention fixtures.
- Risks: shared fixture helpers must stay generic and not pull Pulse semantics into core modules.
- Next recommended step: add module registry database fixtures after Pulse timeline fixture coverage.

## 2026-05-08 Platform Runtime Client Signer Update

- Changed: isolated runtime client remains in core runtime infrastructure, not in Pulse.
- Completed: product modules can later submit execution requests through core runtime contracts without knowing the Go Runtime signing protocol.
- Pending: module-owned execution request conventions and capability registration.
- Risks: product modules must not create direct provider/runtime clients.
- Next recommended step: add a core runtime submission use case before Pulse invokes external execution.

## 2026-05-08 Frontend Contract Pack Update

- Changed: module registry frontend contracts are documented in the handoff pack.
- Completed: documented `GET /v1/modules`, enable/disable routes, module entitlement guidance, and Pulse slug expectations.
- Pending: marketplace purchase examples and generated module response examples.
- Risks: frontend must not invent module availability or commercial activation state.
- Next recommended step: add concrete module registry response fixtures before marketplace UI expansion.

## 2026-05-08 Admin Bootstrap Billing Plan Fix

- Changed: no module registry behavior changed; later platform-admin bootstrap removes tenant billing from `admin:create`.
- Completed: module entitlement checks still depend on current billing/module registry seed state.
- Pending: smoke test after module registry and billing seeders run.
- Risks: module enablement still depends on billing/module registry seed state.
- Next recommended step: verify module list separately from platform-admin bootstrap in Docker QA.

## 2026-05-08 Platform Admin Bootstrap Foundation

- Changed: module administration can now be represented by `platform_admin` instead of overloading tenant `OWNER`.
- Completed: shared permissions let `platform_admin` satisfy `modules:*` and billing/module-management gates from the backend contract.
- Pending: platform admin module-store operations for public/private visibility, rollout state, and tenant entitlements.
- Risks: module enablement for a tenant still needs an explicit tenant boundary; platform admins should not mutate tenant module state without a validated tenant scope.
- Next recommended step: implement platform module-management APIs with explicit tenant/platform scopes.

## 2026-05-08 Granular Platform Administration Foundation

- Changed: granular admins can carry selected module scopes in `User.platformScopes.modules`.
- Completed: platform admin creation/update APIs persist selected module scopes for future module-store governance.
- Pending: module registry routes that enforce selected module scope before exposing management actions to granular admins.
- Risks: existing tenant module routes still rely on tenant permissions and do not yet consume platform scope selections.
- Next recommended step: add platform module-management endpoints that require both `platform:modules:manage` and matching module scope.

## 2026-05-08 Platform Governance Scope Enforcement

- Changed: added `GET /v1/platform/modules` for scope-aware platform module governance reads.
- Completed: granular admins only see modules listed in `platformScopes.modules`; `super_admin` can see all modules.
- Pending: platform mutations for active/visibility/rollout state and module scope fixtures.
- Risks: route currently exposes module metadata/read counts but does not mutate module state.
- Next recommended step: add audited module rollout update commands with explicit scope checks.

## 2026-05-08 Platform Governance Mutations

- Changed: added module governance mutation endpoint for active/status/visibility/rollout/tier.
- Completed: module updates enforce `platformScopes.modules` and record previous/next governance state in audit.
- Pending: runtime impact propagation when module active/visibility changes should invalidate tenant runtime specs.
- Risks: global module changes do not yet trigger downstream runtime cache invalidation.
- Next recommended step: wire module governance changes to runtime/module registry refresh events.

## 2026-05-08 Platform Governance Test Fixtures

- Changed: module governance mutation behavior now has service fixture coverage.
- Completed: tests assert previous/next module governance state is included in audit events.
- Pending: runtime-state invalidation fixture.
- Risks: module governance changes still do not invalidate runtime/module caches.
- Next recommended step: add runtime-state invalidation on module governance mutation.

## 2026-05-08 Platform Governance Database Fixtures

- Changed: persisted module catalog governance now has opt-in DB coverage.
- Completed: DB fixture updates module rollout state and verifies the persisted row and audit record.
- Pending: cache/runtime propagation checks.
- Risks: changing global module governance can still leave runtime state stale; local DB reset clears module state completely.
- Next recommended step: emit module governance events for runtime/module registry refresh.

## 2026-05-09 Stage 1 — Module-Owned Context Architecture

- Changed: clarified that Synapse validates and governs module execution, while modules assemble their own operational/cognitive context.
- Completed: Pulse currently owns operational repositories/use cases under `src/product-modules/pulse`; schema is separated by `Pulse*` models and `pulse_*` tables; runtime execution records remain platform-owned `execution_requests`.
- Pending: add `PulseContextPack` contract, `PulseContextAssembler`, and module-local context repository/query methods. Synapse should validate only tenant/module/RBAC/plan/usage/execution policy and submitted context structure.
- Risks: moving context assembly into `src/core/intelligence` or `src/core/runtime` would make Pulse non-extractable.
- Next recommended step: implement Stage 2 inside the Pulse module tree and expose only a governance-ready execution request contract to Synapse core.

## 2026-05-09 Stage 2 — Pulse-Owned Context Pack

- Changed: Pulse now owns `PulseContextPack` assembly under `src/product-modules/pulse`.
- Completed: the module-level pack includes conversation/ticket state, playbook state, knowledge, products/services, campaigns, scheduling integration summary, allowed actions, output schema, security hints, and usage hints. Core Synapse code was not modified for Pulse-specific semantics.
- Pending: module-to-runtime boundary should accept this pack only after platform governance validates tenant/module/RBAC/plan/usage constraints.
- Risks: adding Pulse-specific conditionals to platform execution services would weaken extractable-first module boundaries.
- Next recommended step: Stage 3 should enqueue context assembly as Pulse-owned work, then Stage 5 can map packs to generic execution requests.

## 2026-05-09 Stage 3 — Pulse-Owned Async Boundaries

- Changed: Pulse now defines its own operational queue names and payload contracts under the module tree.
- Completed: queue ownership is module-local; Synapse core queues remain separate from Pulse queues. `PulseQueueService` is exported only as a module service for controlled publication.
- Pending: processors should stay inside `src/product-modules/pulse` and communicate with platform execution governance through contracts, not direct domain leakage.
- Risks: reusing generic platform queues for Pulse-specific stages would blur module extraction boundaries.
- Next recommended step: keep each new processor in Pulse infrastructure and expose only governed execution records to Synapse platform modules.

## 2026-05-09 Stage 3B — Pulse Context To Platform Execution Boundary

- Changed: Pulse now hands its assembled context to platform runtime lifecycle persistence through the generic `ExecutionRequest` contract.
- Completed: module-specific assembly remains inside Pulse; platform persistence stores tenant/module/request lifecycle only.
- Pending: governance service must sit between prepared Pulse context and any runtime execution.
- Risks: platform runtime services must not inspect Pulse domain tables directly.
- Next recommended step: keep future execution policies generic and validate the pack structure rather than reassembling module context.

## 2026-05-09 Stage 3C — Store Visibility + Execution Governance

- Changed: module catalog now separates runtime availability from marketplace/store exposure through `storeVisible`.
- Completed: module registry store listing requires status public, active, public visibility, and store visibility. Execution governance requires tenant module enablement and module request-type allowlist, not store display.
- Pending: internal-module assignment flow for modules that are enabled by organization policy rather than marketplace purchase.
- Risks: conflating `storeVisible` with `active` would break internal modules; keep them separate in all future APIs.
- Next recommended step: add admin APIs/runbooks for assigning internal modules to tenants without marketplace exposure.

## 2026-05-09 Stage 3D — Execution Worker Boundary

- Changed: Pulse owns the execution queue worker, while platform runtime lifecycle owns execution request persistence.
- Completed: module code does not call providers directly; it records a prepared dispatch result and leaves real runtime integration for the provider boundary.
- Pending: define generic runtime provider result contracts that any module can consume without platform knowing module internals.
- Risks: adding provider-specific branches inside Pulse would undermine the future external runtime path.
- Next recommended step: keep provider dispatch in a generic runtime adapter layer.

## 2026-05-09 Stage 3E — Timeline Projection Boundary

- Changed: Pulse timeline projection is a module-owned worker that persists module-owned operational events.
- Completed: platform runtime lifecycle remains generic; Pulse owns how execution lifecycle appears in its operational timeline.
- Pending: event payload schema registry for Pulse event types.
- Risks: generic platform audit should not replace Pulse operational timeline, and Pulse timeline should not replace platform audit.
- Next recommended step: keep audit and operational timeline as separate ledgers with linked identifiers.

## 2026-05-09 Stage 3F — Actions Boundary

- Changed: Pulse now owns an action queue boundary for module-specific operational side effects.
- Completed: the worker is module-local and projects action lifecycle to Pulse timeline.
- Pending: action handler contracts should stay extractable-first and avoid importing platform internals except approved governance/runtime contracts.
- Risks: direct controller-to-action mutation would bypass the intended async boundary.
- Next recommended step: implement actions as module handlers behind ports.

## 2026-05-09 Stage 3G — Typed Action Handler Boundary

- Changed: Pulse action execution now uses a `PulseActionHandler` contract.
- Completed: first handler stays inside Pulse and depends on Pulse lifecycle use case, preserving module ownership.
- Pending: handler registry for multiple actions and clean handler discovery.
- Risks: processor-level branching should not grow into a large action monolith.
- Next recommended step: move to a registry/provider list before adding several handlers.

## 2026-05-09 Stage 3H — Governed Action Creation Boundary

- Changed: action creation is separated from queue infrastructure through `PulseActionGovernanceService`.
- Completed: module code now has a clear place to validate action rules before enqueue.
- Pending: replace processor branching with handler registry as actions grow.
- Risks: exposing raw queue service as action creation surface would weaken module boundaries.
- Next recommended step: treat `PulseActionGovernanceService` as the module API for real action creation.

## 2026-05-09 Stage 3I — Pulse-Owned Runtime Action Planning

- Changed: Pulse now owns the conversion from validated runtime output to Pulse action jobs.
- Completed: planner keeps module-specific action semantics (`ticket.advance_flow`, flow state, confidence, allowed actions) inside `src/product-modules/pulse`; Synapse remains responsible for governance primitives and execution lifecycle.
- Pending: provider/runtime result ingestion, more Pulse action rules, and handler registry expansion.
- Risks: centralizing module-specific cognitive action logic in Synapse core would violate module ownership; keep future planners module-local.
- Next recommended step: connect runtime result ingestion to the Pulse planner through contracts, not direct core imports of Pulse internals.

## 2026-05-09 Stage 3J — Pulse Runtime Result Ownership

- Changed: Pulse owns runtime result ingestion for Pulse Context Packs.
- Completed: platform runtime lifecycle remains generic; Pulse interprets the stored Context Pack and normalized result before planning module actions.
- Pending: shared result-ingress adapter and handler registry as more modules gain planners.
- Risks: generic Synapse core must not learn Pulse-specific output semantics.
- Next recommended step: keep module result handlers behind explicit module-owned use cases.

## 2026-05-09 Stage 3K — Module-Owned Signed Result Adapter

- Changed: the signed result ingress is registered in Pulse, not in generic runtime core.
- Completed: runtime core owns HMAC verification primitives; Pulse owns the result DTO and module-specific ingestion path.
- Pending: shared adapter conventions for future modules.
- Risks: duplicating callback controllers per module could drift; keep shared signature verification in runtime core.
- Next recommended step: define a small common callback convention while keeping module-specific planners local.

## 2026-05-09 Stage 3L — Module Result Uses Platform Actor Snapshot

- Changed: Pulse result ingestion consumes platform-stored actor snapshots instead of runtime-submitted authorization.
- Completed: platform lifecycle stores snapshots generically; Pulse interprets them for module action planning.
- Pending: shared actor snapshot contract for future modules.
- Risks: each module should avoid inventing incompatible actor snapshot shapes.
- Next recommended step: promote actor snapshot shape into shared contracts once a second module needs it.

## 2026-05-09 Stage 3M — Pulse Result Fixture Boundary

- Changed: Pulse result-ingestion ownership is now covered by DB fixtures.
- Completed: Pulse interprets stored Pulse Context Packs and platform actor snapshots while platform lifecycle remains generic.
- Pending: shared module callback convention after another module adopts runtime results.
- Risks: genericizing too early could leak Pulse semantics into core.
- Next recommended step: keep fixtures module-local until a second module repeats the pattern.

## 2026-05-09 Stage 3N — Pulse Action Rule Sharing

- Changed: Pulse action rules are now shared by enqueue governance and action worker execution.
- Completed: module-local policy remains inside Pulse while providing defense-in-depth across queue boundaries.
- Pending: action handler registry to avoid processor branching as handlers grow.
- Risks: adding handler-specific rules outside the shared rule table would weaken consistency.
- Next recommended step: introduce typed handler registration metadata.

## 2026-05-09 Stage 3O — Action Failure Classification

- Changed: Pulse action workers now classify governance failures separately from infrastructure failures.
- Completed: module-local action policy controls both execution permission and retry behavior for real handlers.
- Pending: handler registry should declare retry classification alongside action key and permissions.
- Risks: classification spread across processor logic will become harder to maintain as handlers grow.
- Next recommended step: move action metadata into handler registration.

## 2026-05-09 Stage 3P — First Strict Action Schema

- Changed: `ticket.advance_flow` now owns a strict module-local payload schema.
- Completed: action semantics remain inside Pulse and do not leak into Synapse core.
- Pending: handler registry to attach schema, permissions, and failure classification in one place.
- Risks: duplicating schema patterns per handler can become noisy.
- Next recommended step: introduce typed action registration metadata.

## 2026-05-09 Stage 3Q — Action Handler Registry

- Changed: Pulse action handlers now resolve through a module-local registry.
- Completed: processor no longer depends on a specific handler class; `ticket.advance_flow` is the first registered handler.
- Pending: typed registration metadata for schemas, permissions, and failure classification.
- Risks: manual registry construction is acceptable for one handler but should evolve as actions grow.
- Next recommended step: define `PulseActionDefinition` metadata and register handlers through it.

## 2026-05-09 Stage 3R — Pulse Action Definitions

- Changed: `PulseActionDefinition` now describes module-local action metadata.
- Completed: `ticket.advance_flow` definition includes permission, validation failure class, and usage candidate.
- Pending: schema references and Context Pack derivation from definitions.
- Risks: definition metadata is partial until schema is included.
- Next recommended step: add schema metadata to action definitions and use it in Context Pack assembly.

## 2026-05-09 Stage 3S — Context Pack Action Definitions

- Changed: Pulse Context Pack assembly now consumes action registry definitions.
- Completed: module-specific action vocabulary remains in Pulse and is reused by runtime context preparation.
- Pending: schema metadata on definitions.
- Risks: prepared-only actions remain outside handler definitions by design.
- Next recommended step: split prepared-only action definitions from side-effect handler definitions.

## 2026-05-09 Stage 3T — Module-Owned Runtime Output Contract

- Changed: Pulse now enforces its own runtime output contract during result ingestion.
- Completed: Synapse lifecycle governance loads the saved execution, but Pulse validates the module-owned Context Pack schema before planning module actions.
- Pending: action definitions should own richer schema metadata for generated output/action contracts.
- Risks: prepared-only action contracts need their own module metadata path.
- Next recommended step: define schema metadata for real and prepared-only Pulse actions.

## 2026-05-14 Stage 4A — Platform Module Access Governance

- Changed: module access checks are exposed from platform billing/governance instead of being embedded in modules.
- Completed: module enablement checks now include catalog/store visibility, commercial plan activity, module tier allowance, active purchases, and optional credit availability.
- Pending: onboarding state enforcement and quota-specific module feature gates per module capability.
- Risks: prepared module features still need explicit platform feature keys before fine-grained quota checks.
- Next recommended step: define feature keys per module capability and route them through `canUseModuleFeature`.

## 2026-05-14 Stage 4B — Workspace-Aware Module Access

- Changed: workspace selection is now explicit before tenant module access.
- Completed: module routes continue to require tenant context; tenantless users must select/create a workspace first.
- Pending: module onboarding state checks after membership/session selection stabilizes.
- Risks: frontend must not assume a default workspace when multiple memberships exist.
- Next recommended step: add module onboarding state to platform governance responses.

## 2026-05-14 Stage 4C — Module Route Authorization Source

- Changed: module route permissions now benefit from live membership permission resolution.
- Completed: a stale session role cannot keep module permissions after the membership role is changed and cache invalidation/TTL takes effect.
- Pending: module-specific permission override models.
- Risks: module permissions still map from tenant role constants.
- Next recommended step: define persisted module permission overrides after role CRUD is modeled.

## 2026-05-14 Stage 4D — Module Authorization Fixture Note

- Changed: authorization fixture validates the same permission resolver used by module routes.
- Completed: stale sessions cannot retain tenant write permissions after membership downgrade in the resolver path.
- Pending: module-route HTTP fixture for stale session denial.
- Risks: current fixture targets the guard/resolver boundary, not full HTTP module endpoints.
- Next recommended step: add HTTP e2e for `POST /modules/:name/enable` after DB test app setup is standardized.

## 2026-05-14 Stage 4E — Module Runtime Action Authorization

- Changed: Pulse module runtime actions now re-check platform-owned RBAC before enqueue.
- Completed: module-owned runtime context does not become an authorization authority.
- Pending: module action metadata for richer skipped reasons.
- Risks: prepared-only actions still need consistent skip semantics.
- Next recommended step: standardize runtime action skipped reason contracts.

## 2026-05-14 Stage 4F — Module Boundary Note

- Changed: no module behavior changed.
- Completed: user quota enforcement lives in platform membership/billing flow, not in Pulse or module logic.
- Pending: module-specific user/member limits if ever modeled as platform feature keys.
- Risks: modules must not duplicate user quota checks.
- Next recommended step: keep module feature limits behind platform `canUseModuleFeature`.

## 2026-05-14 Stage 4G — Module Access Plan Cache

- Changed: platform plan-limit cache is available for module access hotpaths.
- Completed: modules still ask Synapse platform for governance; they do not read Redis directly.
- Pending: route module feature usage through cached plan-limit helpers where needed.
- Risks: modules must not depend on cache keys or billing table shape.
- Next recommended step: keep module-facing contracts stable around `canUseModuleFeature`.

## 2026-05-14 Stage 4H — Module Usage Boundary

- Changed: Pulse action definitions can drive platform usage consumption only through the action processor and `BillingService`.
- Completed: Pulse remains module-owned for operational action semantics; subscription, credit, and usage writes stay platform-owned.
- Pending: module-facing usage cost contract for future skills/actions.
- Risks: future modules must not write usage events directly or enforce credits internally.
- Next recommended step: standardize module action usage metadata as advisory input to platform governance.

## 2026-05-14 Stage 4I — Module Usage Retry Contract

- Changed: module-triggered usage retries are deduplicated by platform usage idempotency.
- Completed: Pulse does not own retry billing behavior; it only supplies tenant/module/action context.
- Pending: shared helper for action usage metadata across future modules.
- Risks: modules must generate stable idempotency keys for retryable jobs.
- Next recommended step: document action idempotency-key rules in module developer contracts.

## 2026-05-14 Stage 4J — Module Action Idempotency Contract

- Changed: Pulse `ticket.advance_flow` treats the action job idempotency key as the operational side-effect key.
- Completed: duplicate action delivery is skipped inside Pulse domain logic, while billing idempotency remains platform-owned.
- Pending: shared action execution contract for future modules.
- Risks: every future side-effect action must declare and persist its own idempotency boundary.
- Next recommended step: define a common action execution ledger contract.

## 2026-05-14 Stage 4K — Pulse-Owned Action Execution Ledger

- Changed: Pulse owns its module-specific action execution ledger.
- Completed: ledger is operational module data, not platform billing/subscription governance.
- Pending: reusable module contract for future modules that need side-effect idempotency.
- Risks: platform must not centralize module-specific action state in Synapse core tables.
- Next recommended step: document an extractable-first action ledger pattern for modules.

## 2026-05-14 Stage 4L — Transactional Module Action Pattern

- Changed: Pulse action side effects now use a module-owned transaction boundary.
- Completed: transaction covers only durable module/platform ledgers and does not call external providers.
- Pending: reusable transaction-aware module repository contracts.
- Risks: future modules must avoid long-running work inside DB transactions.
- Next recommended step: document a module action transaction pattern before adding more actions.

## 2026-05-15 Stage 4M — Module Action Telemetry Pattern

- Changed: Pulse owns action telemetry semantics for its operational actions.
- Completed: telemetry is module-specific and does not centralize Pulse cognitive/operational context in Synapse core.
- Pending: reusable low-cardinality telemetry conventions for future modules.
- Risks: module telemetry must remain extractable and avoid platform coupling.
- Next recommended step: document common action outcome names for modules.

## 2026-05-15 Stage 5A — Module Data Isolation Foundation

- Changed: Pulse-owned tables gained targeted indexes and prepared RLS policies.
- Completed: module operational data remains separated by `pulse_*` tables and tenant-scoped access paths.
- Completed: shared Prisma tenant context runner is available for module repositories.
- Completed: Stage 5B superseded the earlier future-path note by adding physical `pulse` schema separation.
- Risks: prepared policies are inert until RLS is enabled.
- Next recommended step: run DB fixtures with Pulse RLS active.

## 2026-05-15 Stage 5B — Module Schema Ownership

- Changed: Pulse now has a physical PostgreSQL schema boundary: `pulse`.
- Completed: Pulse-owned operational entities live in `pulse`; Synapse-owned module registry, enablement, billing, usage governance, and execution requests stay in `public`.
- Pending: future modules must receive their own schemas instead of being added to the Synapse schema.
- Risks: only governance-owned cross-schema references should be allowed; avoid module-to-module database coupling.
- Next recommended step: document a module schema template before adding the second module.

## 2026-05-15 Stage 5C — Module Repository Tenant Context

- Changed: Pulse module repositories use a module-local tenant-context wrapper around platform Prisma.
- Completed: module data remains extractable while Synapse supplies the tenant session enforcement primitive.
- Pending: create a reusable pattern for future module schemas.
- Risks: future modules should not duplicate governance checks inside their repositories.
- Next recommended step: promote the wrapper pattern into module architecture guidance.

## 2026-05-15 Stage 5D — Module RLS Pattern

- Changed: Pulse is the first module schema with RLS enabled.
- Completed: pattern is schema-owned operational tables plus Synapse-owned tenant governance and tenant session context.
- Pending: document a reusable RLS checklist for future module schemas.
- Risks: module-to-module DB references would complicate RLS ownership and should be avoided.
- Next recommended step: add module schema/RLS template before building another module.
