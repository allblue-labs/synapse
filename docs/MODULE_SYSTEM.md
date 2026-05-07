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
