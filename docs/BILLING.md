# Billing

Last updated: 2026-05-07

Synapse billing is platform-level. Modules are purchased or enabled through marketplace and entitlement rules; modules must not own subscription lifecycle logic.

## Current State

- `BillingAccount` exists in Prisma.
- Billing plans, commercial feature flags, module entitlements, and module purchases exist in Prisma.
- Stripe customer/subscription lifecycle can be reconciled from signed Stripe webhooks; customer creation and subscription checkout are wired; customer portal flows are not wired yet.
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
