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
