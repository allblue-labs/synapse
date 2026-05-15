# Billing

Last updated: 2026-05-07

Synapse billing is platform-level. Modules are purchased or enabled through marketplace and entitlement rules; modules must not own subscription lifecycle logic.

## Current State

- `BillingAccount` exists in Prisma.
- Billing plans, commercial feature flags, module entitlements, and module purchases exist in Prisma.
- Stripe customer/subscription lifecycle can be reconciled from signed Stripe webhooks; customer creation, subscription checkout, and customer portal session creation are wired.
- Commercial plans are Light, Pro, and Premium.
- Plans are admin-controlled through feature flags and should only become commercially active when enough public modules exist to satisfy entitlements.
- Operational usage billing is required for AI calls, audio transcription, workflow runs, storage, messages, and automation executions.

## 2026-05-07 Backend Update

- Changed: roadmap and docs now reflect Light/Pro/Premium and operational usage categories.
- Completed: no billing runtime behavior changed in this implementation.
- Pending: Stripe backend integration, entitlement checks, module purchases, usage meters, and billing-period aggregation.
- Risks: Pulse queue processing can incur AI/transcription costs before meters and limits exist.
- Next recommended step: implement the billing core schema for plans, feature flags, entitlements, and usage meter events before production AI workloads.

## 2026-05-07 Naming Update

- Changed: billing risk references now use Pulse as the first module.
- Completed: no billing business logic changed.
- Pending: Pulse usage events still need billing meter integration.
- Risks: AI/transcription costs remain unmetered until usage billing lands.
- Next recommended step: define usage event names for Pulse processing stages.

## 2026-05-07 RBAC + Route Protection Update

- Changed: no billing runtime behavior changed; Pulse route protections are now tested before entitlement gates are added.
- Completed: RBAC baseline reduces risk when billing gates are introduced at Pulse queue and AI boundaries.
- Pending: entitlement checks and usage meters still need implementation.
- Risks: billing enforcement without tested route permissions can create bypasses or false denials.
- Next recommended step: after module registry persistence, add entitlement checks around Pulse entry creation and processing.

## 2026-05-07 Pulse Tenant Isolation Test Update

- Changed: no billing behavior changed; tenant-boundary tests reduce risk before usage billing records are added.
- Completed: Pulse repository query-shape tests can inform future usage-meter repository tests.
- Pending: usage meter writes must include tenant, module slug, usage type, quantity, and billing period context.
- Risks: usage events without tenant scoping would create billing leakage.
- Next recommended step: include tenant-isolation tests with the upcoming usage metering repositories.

## 2026-05-07 Module Registry Store Update

- Changed: module enablement is now durable, preparing the backend for marketplace purchases and entitlement enforcement.
- Completed: no billing enforcement yet, but the registry now has tenant/module state for billing gates to consult.
- Completed: only `PUBLIC` module records are tenant-visible/activatable, which prepares for commercial activation flags.
- Pending: Light/Pro/Premium plan records, admin feature flags, module purchase records, Stripe lifecycle, and operational usage meters.
- Risks: paid module enablement is not yet blocked by subscription or purchase state.
- Next recommended step: implement billing core schema and an entitlement service before exposing module enablement commercially.

## 2026-05-07 Billing Core Update

- Changed: implemented billing core schema and service behavior for plans, feature flags, plan/module entitlements, and a-la-carte module purchases.
- Completed: Light/Pro/Premium plans seed automatically; commercial activation checks feature flags and public module counts; Pulse is included in Light; module enablement is blocked without entitlement or active purchase; billing read/admin endpoints exist.
- Pending: Stripe lifecycle, checkout, webhooks, usage meters, billing-period aggregation, invoices, and customer portal.
- Risks: plan flags are local admin state until an admin workflow and audit review process exist.
- Next recommended step: implement operational usage meters before enabling production AI/transcription workloads.

## 2026-05-07 Operational Usage Metering Update

- Changed: added append-only operational usage events and summary API.
- Completed: meters exist for AI calls, audio transcription, workflow runs, storage, messages, and automation executions; first instrumentation records Pulse/message/workflow usage.
- Pending: storage byte instrumentation, rating/pricing tables, billing-period rollups, Stripe usage reporting, invoice reconciliation, and dashboards.
- Risks: raw event collection can diverge from invoice totals until aggregation/reconciliation exists.
- Next recommended step: implement usage pricing and billing-period aggregation.

## 2026-05-07 Usage Rating Update

- Changed: added usage rate cards and billing-period aggregate snapshots.
- Completed: admin-managed rates price usage by metric/unit/currency; rated summaries calculate total amount cents and preserve unrated lines when rates are missing.
- Pending: Stripe meter reporting, invoice finalization, rate-change audit events, and reconciliation workflows.
- Risks: local rated aggregates are not invoices until Stripe reporting and reconciliation are complete.
- Next recommended step: implement Stripe usage reporting from rated aggregate lines.

## 2026-05-07 Stripe Usage Reporting Update

- Changed: added Stripe meter mappings and reporting from rated aggregate lines.
- Completed: Stripe meter events use configured event names, tenant Stripe customer ids, integer values, timestamps, and stable identifiers; report state is stored locally for reconciliation.
- Pending: signed webhook reconciliation, Stripe customer/subscription creation, checkout/customer portal, and retry scheduling.
- Risks: Stripe meter event processing is asynchronous, so local `SENT` means accepted by the API, not necessarily reflected on an invoice yet.
- Next recommended step: implement webhook reconciliation for subscriptions, invoices, and meter event failures.

## 2026-05-07 Stripe Webhook Reconciliation Update

- Changed: added signed Stripe webhook processing under `POST /v1/billing/stripe/webhook` and persisted webhook processing state in `stripe_webhook_events`.
- Completed: signature verification, timestamp tolerance, duplicate event handling, audit recording, subscription lifecycle reconciliation, invoice paid reconciliation, and invoice payment-failed reconciliation.
- Pending: checkout session creation, customer portal, module purchase payments, webhook retry jobs, and meter event failure reconciliation beyond local report state.
- Risks: failed reconciliation is recorded but not automatically retried yet; missing Stripe metadata can leave subscription events unmatched.
- Next recommended step: implement Stripe customer and checkout session provisioning with required tenant metadata.

## 2026-05-07 Stripe Checkout Provisioning Update

- Changed: added subscription checkout backend API and Stripe customer provisioning.
- Completed: `POST /v1/billing/checkout/subscription` creates a Stripe customer when needed, stores `stripeCustomerId`, creates a subscription Checkout Session, and returns `{ id, url, stripeCustomerId, planKey }`.
- Pending: customer portal, checkout retrieval, module purchase checkout, retry jobs, and live-mode validation.
- Risks: price ids are intentionally required; missing plan metadata/env price ids return service unavailable instead of using fake pricing.
- Next recommended step: implement customer portal sessions and redirect URL allowlisting.

## 2026-05-07 Stripe Portal + Redirect Allowlist Update

- Changed: added customer portal session API and billing redirect origin checks.
- Completed: `POST /v1/billing/portal/session` creates a Stripe Billing Portal Session for the tenant-owned customer and returns `{ id, url, stripeCustomerId }`.
- Pending: checkout session retrieval, portal configuration management, module purchase checkout, and production live-mode validation.
- Risks: portal session creation requires an existing Stripe customer, so tenants must complete checkout provisioning first.
- Next recommended step: implement checkout session retrieval and reconciliation.

## 2026-05-07 Stage 1 Backend Refinement + Pulse Foundation Update

- Changed: module tier metadata is now persisted for future subscription enforcement and plan limits.
- Completed: Pulse is cataloged as a Light-tier operational module; execution requests and operational events can become usage/billing boundaries.
- Pending: concrete plan/module limits, runtime execution quota checks, channel/number limits, and workflow-run limit enforcement.
- Risks: schemas exist before enforcement; do not expose new execution APIs commercially until limits are checked.
- Next recommended step: add a subscription limit service that evaluates plan limits before Pulse workflow execution.

## 2026-05-07 Pulse Operational Lifecycle Wiring Update

- Changed: Pulse validation now creates operational tickets, which can become a workflow-run/automation billing boundary later.
- Completed: existing entry creation usage metering remains intact.
- Pending: usage events for ticket creation, flow transitions, and operator review actions.
- Risks: ticket/event creation is not yet rate-limited by plan usage limits.
- Next recommended step: add usage metering for ticket and flow lifecycle events once limits are defined.

## 2026-05-07 Pulse Channel + Conversation Ingestion Update

- Changed: Pulse channel/conversation resolution creates future billing boundaries for numbers/channels and conversations.
- Completed: no new billable counters were added in this slice; existing entry automation usage remains unchanged.
- Pending: usage metrics for conversations and channels/numbers limits.
- Risks: tenants could create many channel/conversation records once provider webhooks are exposed unless plan limits are enforced.
- Next recommended step: add subscription limit checks for channel count and conversation volume.

## 2026-05-07 Pulse Direct Conversation Validation Update

- Changed: no billing behavior changed; ingestion validation reduces risk of cross-tenant usage attribution.
- Completed: rejected direct conversation ids do not create usage records.
- Pending: conversation/channel usage limits.
- Risks: resolved provider-context ingestion can still create new conversations until limits exist.
- Next recommended step: enforce conversation and channel limits before provider webhooks are enabled.

## 2026-05-07 Pulse Channel + Conversation Read API Update

- Changed: no billing runtime behavior changed.
- Completed: operational channel/conversation data is now readable for future limit/usage review.
- Pending: plan limit enforcement for channel count and conversation volume.
- Risks: read APIs may reveal operational volume and should remain protected by `pulse:read`.
- Next recommended step: define channel/conversation usage summaries for billing/admin views.

## 2026-05-07 Pulse Ticket + Timeline Read API Update

- Changed: no billing runtime behavior changed.
- Completed: ticket and event read data can support future admin review of workflow-run and operator-review usage.
- Pending: usage metrics for ticket lifecycle and operator review actions.
- Risks: read APIs expose operational volume and should remain permission-protected.
- Next recommended step: add metering for ticket creation and flow transitions after limits are defined.

## 2026-05-07 Pulse Read Pagination Update

- Changed: no billing runtime behavior changed.
- Completed: paged operational reads make future usage/admin review safer.
- Pending: usage filters and billing-period views.
- Risks: pagination does not enforce plan limits.
- Next recommended step: add plan limit checks for channel/conversation/ticket growth.

## 2026-05-07 Pulse Read Filtering Update

- Changed: no billing runtime behavior changed.
- Completed: filtered operational reads can support future billing/admin review by status/type/date.
- Pending: billing-period filters and usage-limit enforcement.
- Risks: filtered visibility is not billing enforcement.
- Next recommended step: add plan limit checks before provider webhook ingestion is enabled.

## 2026-05-07 Pulse Read Contract Test Update

- Changed: added tests around the filter dimensions likely to support future billing/admin summaries.
- Completed: provider/status/type/date validation is covered before these dimensions are reused for reporting.
- Pending: quota enforcement and metered workflow execution limits.
- Risks: validation tests do not enforce commercial entitlements.
- Next recommended step: implement plan limit checks before provider webhook ingestion.

## 2026-05-07 Pulse HTTP Read E2E Harness Update

- Changed: no billing runtime behavior changed.
- Completed: HTTP validation protects future operational/billing filter dimensions from unsupported values at the route boundary.
- Pending: plan limit enforcement and billing-period usage filters.
- Risks: route validation is not quota enforcement.
- Next recommended step: add plan limit checks before provider webhook ingestion.

## 2026-05-08 Pulse Ticket Lifecycle Mutation Update

- Changed: lifecycle events now mark ticket operations as future usage-metering candidates.
- Completed: Pulse operational events include `usageCandidate: ticket_operation` metadata.
- Pending: actual `UsageMeteringService` writes for ticket operations and workflow executions.
- Risks: usage-candidate metadata is not billing enforcement or rated usage.
- Next recommended step: define usage event names for ticket lifecycle and flow transitions.

## 2026-05-08 Pulse Event Catalog + Timeline Aggregation Update

- Changed: event categories make future usage-metering candidates easier to identify.
- Completed: ticket lifecycle, operator action, escalation, confidence, and workflow-state event groups are explicit.
- Pending: concrete usage event writes and billing-period aggregations.
- Risks: timeline categories are reporting aids, not billable usage records.
- Next recommended step: map lifecycle and workflow-state categories to usage-metering event names.

## 2026-05-08 Pulse Guided Flow State Machine Update

- Changed: workflow state transitions are now structured enough to become future usage-metering candidates.
- Completed: completion, escalation, review, and waiting states can be identified through lifecycle events and metadata.
- Pending: actual `UsageMeteringService` writes for workflow executions and automation executions.
- Risks: state transitions remain operational records, not billable records, until metering writes are implemented.
- Next recommended step: define metering event names for workflow transitions after confidence rules are added.

## 2026-05-08 Pulse Confidence + Human Review Layer Update

- Changed: review/escalation outcomes can now be identified as future usage/automation candidates.
- Completed: confidence decisions are present in operational event payloads for later aggregation.
- Pending: usage metering writes for AI executions, workflow transitions, and operator review events.
- Risks: confidence metadata is not a rated usage record.
- Next recommended step: map confidence-triggered reviews to usage candidates after knowledge context lands.

## 2026-05-08 Pulse Knowledge Context Foundation Update

- Changed: knowledge publish/archive events are marked as future operational usage candidates only through event history.
- Completed: no billing runtime behavior changed.
- Pending: storage usage metering for knowledge content and retrieval/query usage metrics.
- Risks: knowledge content size is not yet metered.
- Next recommended step: define storage and retrieval usage metrics after provider contracts are finalized.

## 2026-05-08 Pulse Scheduling Integration Contracts Update

- Changed: scheduling prepare/booking intent contracts identify future usage-metering points.
- Completed: no billing runtime behavior changed and no provider calls are made.
- Pending: usage events for scheduling availability checks, booking attempts, and successful bookings.
- Risks: prepared requests are not billable provider executions yet.
- Next recommended step: implement Pulse usage metering candidates before provider adapters.

## 2026-05-08 Pulse Usage Metering Foundation Update

- Changed: Pulse operational usage candidates now create usage ledger events.
- Completed: units added through existing metric types: `message`, `ticket_operation`, `flow_transition`, `byte`, `knowledge_operation`, `scheduling_availability_prepare`, and `scheduling_booking_prepare`.
- Pending: rate cards, Stripe meter mappings, and plan-limit checks for these Pulse-specific units.
- Risks: metered events are not automatically billable until admin rate cards and Stripe meter mappings are configured.
- Next recommended step: define default Pulse unit pricing/rating policy after runtime contracts.

## 2026-05-08 Runtime Execution Lifecycle Contract Update

- Changed: no billing runtime behavior changed.
- Completed: execution lifecycle records can later anchor runtime/workflow usage events.
- Pending: usage metering for queued/running/completed runtime executions.
- Risks: execution lifecycle records are not usage events by themselves.
- Next recommended step: map runtime lifecycle transitions to usage events after service actor auth is defined.

## 2026-05-08 Runtime AppSec Hardening Update

- Changed: no billing behavior changed.
- Completed: runtime lifecycle transitions are now structured enough to become future metering boundaries after service-actor auth.
- Pending: usage writes for queued/running/completed/cancelled runtime state transitions.
- Risks: lifecycle audit records are not billable usage events and should not be rated directly.
- Next recommended step: map runtime lifecycle transitions to usage events only after service actors and tenant fixtures are in place.

## 2026-05-08 Database Fixture Foundation Update

- Changed: no billing contract changed.
- Completed: Pulse ticket lifecycle database fixtures verify workflow usage events remain tenant-scoped and are not written when mutations are rejected.
- Pending: rated usage, billing summary, Stripe report, and plan-limit database fixtures.
- Risks: usage fixture coverage is narrow and currently limited to Pulse ticket operation side effects.
- Next recommended step: add usage summary and plan-limit fixtures after route-level RBAC coverage.

## 2026-05-08 Platform Runtime Client Signer Update

- Changed: no billing behavior changed.
- Completed: runtime HTTP response mapping preserves provider, model, usage, and latency metadata for future metering.
- Pending: billing/usage writes around runtime submission, completion, failure, cancellation, and timeout.
- Risks: runtime provider usage metadata is not billable until transformed into governed usage events.
- Next recommended step: define usage metering boundaries in the runtime submission use case.

## 2026-05-08 Frontend Contract Pack Update

- Changed: billing and usage frontend contracts are documented in the handoff pack.
- Completed: documented billing account/plans, checkout, portal, usage summary, rated summary, rates, Stripe meters, and usage metric types.
- Pending: response examples and plan-limit display contracts.
- Risks: frontend must not display usage as charged unless backend rated/metered data indicates it.
- Next recommended step: add billing response examples after seeded billing fixtures exist.

## 2026-05-08 Admin Bootstrap Billing Plan Fix

- Changed: superseded by platform-admin bootstrap; `admin:create` no longer creates a `BillingAccount`.
- Completed: removed retired `starter` reference from tenant/customer billing creation paths.
- Pending: smoke test for platform-admin bootstrap against a migrated database.
- Risks: tenant/customer provisioning still requires valid billing plan seed data.
- Next recommended step: rerun platform-admin bootstrap after rebuilding the API image.

## 2026-05-08 Platform Admin Bootstrap Foundation

- Changed: `admin:create` no longer creates billing accounts or chooses a customer plan.
- Completed: platform-admin bootstrap is independent from billing-plan seed data; tenant billing remains attached to tenant/customer creation flows.
- Pending: audited platform billing administration APIs for support operations and customer plan changes.
- Risks: older docs/runbooks that expect `ADMIN_TENANT_*` variables are obsolete.
- Next recommended step: keep customer tenant provisioning and platform-admin provisioning as separate operational runbook steps.

## 2026-05-08 Granular Platform Administration Foundation

- Changed: granular platform admins can create tenant customer users but cannot grant other admin roles.
- Completed: platform-created customer users attach to an explicit tenant and role; no billing account is created by platform user creation.
- Pending: billing support APIs that distinguish customer billing visibility from platform sensitive financial metrics.
- Risks: admin-visible customer metrics must redact sensitive fields unless the actor is `super_admin`.
- Next recommended step: apply sensitive metric masking to future platform billing/metrics summaries.

## 2026-05-08 Platform Governance Scope Enforcement

- Changed: platform usage metrics are now aggregated through a redacted governance endpoint.
- Completed: non-super platform roles receive sensitive metric fields masked; current response is usage-oriented and avoids raw Stripe/provider values.
- Pending: platform billing metrics endpoint with rated/revenue summaries and explicit sensitive-field policy.
- Risks: rated financial data should not be exposed through generic usage metrics without a separate permission and redaction review.
- Next recommended step: design `platform:metrics:sensitive.read` usage before adding financial summaries.

## 2026-05-08 Platform Governance Mutations

- Changed: policy toggles can update billing feature flags through platform governance.
- Completed: `PATCH /v1/platform/policies/:policy` can enable/disable a feature flag and update metadata with policy-scope enforcement.
- Pending: dedicated commercial-plan policy model and stricter metadata schema.
- Risks: billing feature flags are commercially sensitive; production use should require strong audit review.
- Next recommended step: add policy-specific DTOs for plan activation and module entitlement changes.

## 2026-05-08 Platform Governance Test Fixtures

- Changed: policy/feature-flag governance now has service fixture coverage.
- Completed: tests assert policy updates write audit events for `BillingFeatureFlag` resources.
- Pending: commercial-plan policy DTOs.
- Risks: generic policy metadata remains flexible until domain-specific schemas are added.
- Next recommended step: add policy-specific DTOs for commercial plan activation.

## 2026-05-08 Platform Governance Database Fixtures

- Changed: persisted billing feature-flag policy updates now have opt-in DB coverage.
- Completed: DB fixture verifies scoped policy update, persisted enabled state, and forbidden audit for out-of-scope policy attempts.
- Pending: plan-specific policy validation.
- Risks: flexible metadata remains intentionally broad for now; local reset flow clears billing state before migrations/seeders recreate it.
- Next recommended step: constrain metadata per policy domain.

## 2026-05-09 Stage 1 — Context Governance Billing Review

- Changed: reviewed billing/usage responsibilities for future module context and runtime execution.
- Completed: Synapse remains owner of plan checks, module entitlements, usage metering, and usage-limit enforcement; Pulse must only attach `usageHints` to its context/execution request.
- Pending: Stage 2/5 contracts must define how Pulse declares expected metering dimensions without owning billing logic.
- Risks: letting modules directly rate usage or check commercial plan state would couple modules to platform billing.
- Next recommended step: add `usageHints` to Pulse Context Pack and validate them in platform execution governance.

## 2026-05-09 Stage 2 — Pulse Usage Hints

- Changed: `PulseContextPack` now includes module-owned `usageHints` for future metering candidates.
- Completed: hints identify module `pulse`, tenant id, optional conversation/ticket ids, and expected candidates such as `ai_execution` and `workflow_run`. Pulse does not rate, bill, or enforce plan limits.
- Pending: Synapse execution governance must validate plan/module entitlement and convert approved execution results into durable usage events.
- Risks: hints are advisory until the governed execution request flow consumes them.
- Next recommended step: Stage 5 should formalize execution request metadata so usage metering can be recorded after runtime completion.

## 2026-05-09 Stage 3 — Queue Usage Metering Boundary

- Changed: Pulse queue publication is separated from billing/rating logic.
- Completed: existing entry creation still records message/automation usage; current inbound processing still records AI call and audio transcription usage when those operations occur.
- Pending: future `pulse.context` and `pulse.execution` processors must convert approved execution outcomes into durable usage events through Synapse usage metering.
- Risks: enqueueing a job is not billable by itself; metering should happen on accepted operational usage or completed execution, with idempotency keys.
- Next recommended step: define usage event idempotency keys for context assembly, execution request, and workflow action completion.

## 2026-05-09 Stage 3B — Execution Request Usage Boundary

- Changed: Pulse context jobs persist execution requests with context `usageHints`, but do not meter AI execution yet.
- Completed: `pulse.context.assembled` events include `usageCandidate: ai_execution` for future billing integration.
- Pending: usage metering should occur when execution is approved/queued/completed, depending on final billing policy.
- Risks: billing on prepared requests could overcharge failed or denied executions.
- Next recommended step: decide whether AI execution is metered at queue acceptance, provider call start, or provider completion.

## 2026-05-09 Stage 3C — Store Visibility Billing Impact

- Changed: commercial plan activation counts now use public modules that are also `storeVisible`.
- Completed: hidden/internal modules do not satisfy public-module thresholds for Light/Pro/Premium commercial activation and cannot be enabled through store-based billing checks.
- Pending: usage-limit governance before runtime execution and a policy for billing internal modules.
- Risks: hiding a module from store can make commercial plans inactive if public module thresholds are no longer met.
- Next recommended step: add admin warning/preview before changing `storeVisible` on modules that affect plan activation.

## 2026-05-09 Stage 3D — Execution Worker Billing Boundary

- Changed: `pulse.execution` currently records no billable provider usage.
- Completed: placeholder dispatch output explicitly sets `providerCalls: false`.
- Pending: meter AI executions only when the future provider/runtime boundary accepts or completes a real provider call.
- Risks: billing the placeholder execution would overcount usage.
- Next recommended step: add usage metering at provider-call start/completion, not at no-provider dispatch preparation.

## 2026-05-09 Stage 3E — Timeline Billing Boundary

- Changed: timeline projection records operational events only; it does not meter usage.
- Completed: no billing side effects were added to `pulse.timeline`.
- Pending: usage metering remains tied to operational usage and future provider/runtime events.
- Risks: using timeline event count as billing proxy would be inaccurate.
- Next recommended step: keep billing metrics explicit and idempotent, separate from timeline projection.

## 2026-05-09 Stage 3F — Actions Billing Boundary

- Changed: `pulse.actions` does not meter usage while side effects are disabled.
- Completed: no billing events are emitted for prepared action lifecycle.
- Pending: meter automation/workflow usage when a real action handler accepts or completes an action.
- Risks: billing prepared actions would overcount usage.
- Next recommended step: define idempotency keys per action handler before enabling usage metering.

## 2026-05-09 Stage 3G — Real Action Billing Boundary

- Changed: `ticket.advance_flow` uses existing ticket lifecycle usage metering for workflow transitions.
- Completed: no duplicate action-level billing was added.
- Pending: decide whether future action handlers should meter separately from workflow lifecycle.
- Risks: double-billing if both action handler and lifecycle use case meter the same operation.
- Next recommended step: centralize action metering policy before adding more real handlers.

## 2026-05-09 Stage 3H — Governed Action Billing Boundary

- Changed: action governance does not meter enqueue by itself.
- Completed: usage remains tied to the lifecycle handler for `ticket.advance_flow`.
- Pending: action acceptance/completion metering policy for future handlers.
- Risks: enqueue-time billing would overcount denied or failed actions.
- Next recommended step: meter only after handler acceptance/completion with idempotency keys.

## 2026-05-09 Stage 3I — Planned Action Usage Boundary

- Changed: runtime action planning creates a clearer pre-billing boundary.
- Completed: malformed, low-confidence, unsupported, and unauthorized runtime suggestions are rejected/skipped before any action job can become a usage candidate.
- Pending: decide whether successful planned actions meter at enqueue, handler completion, or both; add usage writes after real action completion only.
- Risks: counting runtime suggestions as executions would overbill; only governed, accepted, and completed work should become billable usage.
- Next recommended step: map `pulse.action.completed` with `sideEffectsApplied=true` to future automation/workflow usage events.

## 2026-05-09 Stage 3J — Runtime Result Billing Boundary

- Changed: runtime result ingestion records lifecycle/timeline state but does not meter provider usage yet.
- Completed: successful results can become the future point where provider usage, latency, and accepted actions are mapped to usage events.
- Pending: provider metadata contract, usage idempotency keys, and plan-limit reconciliation after real runtime calls.
- Risks: billing at ingestion without trusted provider usage metadata would be inaccurate.
- Next recommended step: add usage writes only after signed runtime results include normalized provider usage.

## 2026-05-09 Stage 3K — Signed Callback Billing Boundary

- Changed: runtime result callbacks are now authenticated before any future provider usage metadata could be accepted.
- Completed: no billing writes were added; signed transport is only a prerequisite for trustworthy usage ingestion.
- Pending: normalized provider usage DTO, idempotent usage writes, and plan-limit reconciliation.
- Risks: signed callbacks can still carry malformed usage metadata until a strict provider-usage schema exists.
- Next recommended step: define provider usage schema before metering runtime results.

## 2026-05-09 Stage 3L — Actor Snapshot Billing Boundary

- Changed: runtime-result action planning now uses the original execution actor snapshot, which also gives future usage events stable attribution.
- Completed: no billing writes were added; this is attribution groundwork for future automation/workflow usage.
- Pending: usage metadata should include execution id, actor snapshot id/user id, tenant id, and action idempotency key.
- Risks: billing should not depend on callback-provided actor fields.
- Next recommended step: include stored execution actor metadata in future usage event mapping.

## 2026-05-09 Stage 3M — Runtime Result Fixture Billing Note

- Changed: runtime result DB fixtures do not add billing writes.
- Completed: fixture confirms action planning attribution can come from stored execution actor metadata, which is required before future usage attribution.
- Pending: provider usage schema and idempotent usage event fixture.
- Risks: billing remains intentionally disconnected from runtime result ingestion until provider usage is normalized.
- Next recommended step: define provider usage metadata before runtime metering.

## 2026-05-09 Stage 3N — Action Worker Billing Guard

- Changed: worker-side permission rejection prevents unauthorized action jobs from becoming completed side-effect usage candidates.
- Completed: failed permission revalidation emits failure timeline/failure queue state, not completed action usage.
- Pending: usage metering policy for real action completion.
- Risks: future billing must avoid counting rejected worker jobs.
- Next recommended step: meter only `pulse.action.completed` events with `sideEffectsApplied=true` and idempotent handler metadata.

## 2026-05-09 Stage 3O — Non-Retryable Action Billing Note

- Changed: non-retryable governance failures are explicitly marked so they cannot be mistaken for completed automation usage.
- Completed: failed governance jobs carry `retryable: false` and do not emit action completion.
- Pending: usage mapping for completed side-effect handlers.
- Risks: billing pipelines must ignore `pulse.action.failed` regardless of retryability.
- Next recommended step: define action completion usage mapper.

## 2026-05-09 Stage 3P — Action Validation Billing Note

- Changed: invalid action payloads are terminal failures and cannot become billable completed automation usage.
- Completed: validation failures do not emit action completion with side effects.
- Pending: usage mapper for valid completed action handlers.
- Risks: billing must not count validation failures.
- Next recommended step: map only completed side-effect handler results to usage.

## 2026-05-09 Stage 3Q — Action Registry Billing Note

- Changed: real action handlers now resolve through a registry before side effects and future usage boundaries.
- Completed: no billing behavior changed.
- Pending: usage metadata should eventually be declared with action handler metadata.
- Risks: billing rules should not live in the processor.
- Next recommended step: include future usage candidate metadata in action definitions.

## 2026-05-09 Stage 3R — Action Definition Usage Metadata

- Changed: action definitions can now declare a future usage candidate.
- Completed: `ticket.advance_flow` declares `workflow_run` as advisory metadata.
- Pending: usage mapper for completed side-effect handlers.
- Risks: usage candidate metadata is not billing behavior by itself.
- Next recommended step: map completed handler results to usage events using action definitions.

## 2026-05-09 Stage 3S — Context Pack Usage Metadata Note

- Changed: Context Pack action derivation can now see registered action definitions with usage candidates.
- Completed: no billing writes changed.
- Pending: include usage candidates in runtime/action telemetry only after metering policy is defined.
- Risks: exposing usage hints to runtime must remain advisory, not billing authority.
- Next recommended step: map usage candidates server-side on completed handler results.

## 2026-05-09 Stage 3T — Runtime Output Billing Safety

- Changed: invalid runtime outputs are rejected before lifecycle success and before action planning.
- Completed: malformed successful callbacks cannot enqueue action jobs that might later become usage-metering candidates.
- Pending: usage metering mapper for completed, valid side-effect handlers.
- Risks: validation failures are not billable usage events and should remain visible only through audit/operational telemetry.
- Next recommended step: map usage candidates server-side only after successful handler completion.

## 2026-05-14 Stage 4A — Plan/Quota Governance

- Changed: Billing plans now seed configurable entitlement templates for Trial, Light, Pro, and Premium.
- Completed: entitlement JSON carries `maxTenants`, `monthlyCredits`, `maxUsersPerTenant`, `maxModules`, `maxActiveChannelSets`, and allowed module tiers.
- Completed: admin-managed plan CRUD exists through backend billing plan endpoints; deletion is blocked when tenants are assigned to the plan.
- Pending: promotions/discounts/credit packs remain future billing models unless added explicitly.
- Risks: quota templates are configurable but not yet surfaced in frontend admin UI.
- Next recommended step: expose admin plan/quota forms and add usage counter Redis hotpath after policy stabilizes.

## 2026-05-14 Stage 4B — Membership Billing Boundary

- Changed: membership CRUD does not own plan, quota, credit, or billing policy.
- Completed: membership changes are RBAC/audit operations only; tenant limits and plan limits remain in billing/platform governance.
- Pending: enforce `maxUsersPerTenant` from plan limits during membership creation.
- Risks: without the user-count quota check, memberships can exceed plan policy.
- Next recommended step: call `getTenantPlanLimits` from membership creation to enforce `maxUsersPerTenant`.

## 2026-05-14 Stage 4C — Authorization Cache Billing Note

- Changed: no billing behavior changed.
- Completed: permission cache is scoped to authorization only and does not cache credits, quotas, or usage counters.
- Pending: separate Redis hotpaths for plan/quota and usage counters.
- Risks: do not reuse membership permission cache for billing decisions.
- Next recommended step: add dedicated plan/quota cache in platform governance.

## 2026-05-14 Stage 4D — Billing Test Boundary Note

- Changed: no billing behavior changed.
- Completed: authorization DB fixtures remain RBAC-only and do not exercise plan/credit decisions.
- Pending: DB fixtures for plan/quota enforcement remain separate work.
- Risks: mixing RBAC fixtures with billing assertions would blur ownership boundaries.
- Next recommended step: add billing quota DB fixtures independently.

## 2026-05-14 Stage 4E — Runtime Authorization Billing Boundary

- Changed: no billing behavior changed.
- Completed: runtime actor revalidation uses RBAC only; credits/usage remain platform billing/governance responsibilities.
- Pending: connect runtime usage consumption to `consumeUsageOrReject`.
- Risks: action skips due to RBAC must not be counted as completed billable automations.
- Next recommended step: enforce `maxUsersPerTenant` and then add runtime usage consumption boundaries.

## 2026-05-14 Stage 4F — User Quota Billing Enforcement

- Changed: `maxUsersPerTenant` is now enforced during membership creation.
- Completed: membership creation consumes `BillingService.getTenantPlanLimits` and blocks when the plan quota is exhausted.
- Pending: plan/quota cache and DB fixture.
- Risks: quota reads currently hit Postgres through billing account/plan lookup.
- Next recommended step: add Redis cache for tenant plan limits with safe invalidation on plan/account changes.

## 2026-05-14 Stage 4G — Tenant Plan Limits Cache

- Changed: tenant plan limits now use Redis cache with PostgreSQL fallback.
- Completed: cache keys are `billing:tenant-plan-limits:<tenantId>` with 60 second TTL.
- Completed: cache invalidates best-effort on plan updates/deletes, feature flag changes, Stripe customer provisioning, subscription reconciliation, and invoice status reconciliation.
- Pending: usage counter cache and DB invalidation fixtures.
- Risks: manual DB edits require TTL expiry or explicit operational invalidation.
- Next recommended step: wire runtime usage consumption through billing governance and add usage counter hotpath.

## 2026-05-14 Stage 4H — Pulse Action Usage Consumption

- Changed: completed real Pulse action side effects now record `WORKFLOW_RUN` usage through platform billing governance.
- Completed: `BillingService.consumeUsageOrReject` is idempotent when an idempotency key is supplied, preventing duplicate usage rows on action retries.
- Completed: prepared-only, skipped, failed, validation-denied, and no-side-effect actions are not billed.
- Pending: configurable usage costs per action definition and provider-backed AI call usage once runtime provider dispatch is real.
- Risks: usage is recorded after the side-effect handler completes; handlers must remain idempotent if the usage write or timeline projection fails.
- Next recommended step: add action-side-effect idempotency fixtures and introduce configurable action usage cost metadata.

## 2026-05-14 Stage 4I — Usage Idempotency Quota Safety

- Changed: duplicate idempotent usage calls return the existing event before credit quota evaluation.
- Completed: retrying the same operation cannot be rejected just because its first attempt consumed the final available credit.
- Completed: added unit tests plus an opt-in database fixture for tenant-scoped idempotency.
- Pending: run DB fixture with local Postgres and add usage counter cache later.
- Risks: concurrent first writes still rely on PostgreSQL unique constraints.
- Next recommended step: add action side-effect idempotency fixtures and then usage counter hotpath.

## 2026-05-14 Stage 4J — Action Usage Side-Effect Boundary

- Changed: action-driven flow transition usage keys now include the action idempotency key.
- Completed: duplicate `ticket.advance_flow` delivery does not create lifecycle usage records after the first successful side effect.
- Pending: DB fixture execution with local Postgres.
- Risks: action processor-level usage remains separately idempotent through `pulse-action-usage:<jobKey>`.
- Next recommended step: consolidate action lifecycle and billing usage under a durable action execution ledger.

## 2026-05-14 Stage 4K — Action Ledger Billing Boundary

- Changed: action execution ledger gates operational side effects before lifecycle usage writes.
- Completed: billing remains platform-owned; the ledger only decides whether Pulse should apply the operational action.
- Pending: transaction boundary between action ledger success and usage write.
- Risks: if usage write fails after side effects, ledger status can still require reconciliation.
- Next recommended step: make action side effects, operational events, audit, usage, and ledger completion transaction-aware.

## 2026-05-14 Stage 4L — Transactional Usage Boundary

- Changed: action-driven lifecycle usage writes now share the same transaction as ticket mutation and ledger success.
- Completed: `WORKFLOW_RUN` usage for `ticket.advance_flow` cannot commit without the ticket update and action execution success marker.
- Pending: DB fixture execution and future platform-governed credit pre-reservation.
- Risks: this covers lifecycle usage, while action-processor-level governed usage remains separately idempotent.
- Next recommended step: design credit reservation/commit semantics before external paid actions.
