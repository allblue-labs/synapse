# Tenant Context Profile

## Purpose

Tenant Context Profile is a Synapse-owned global operational profile for a tenant/workspace. It is not module onboarding and must not contain Pulse-specific or future module-specific operational settings.

Modules consume the approved profile through `TenantContextService.getTenantContext()` and merge it with their own isolated module context.

## Ownership

- Synapse owns: business identity, generic communication preferences, generic operational behavior, lifecycle, approval, versioning, audit, and bypass prevention.
- Modules own: module-specific schemas, workflows, playbooks, escalation rules, schedules, campaigns, and operational memory.
- Pulse data remains isolated in the `pulse` schema. Tenant Context Profile remains in the platform `public` schema.

## Lifecycle

Statuses:

- `PENDING`
- `IN_PROGRESS`
- `AWAITING_VALIDATION`
- `APPROVED`
- `REJECTED`

Flow:

1. User logs in and selects/creates a tenant.
2. Subscription/module purchase can complete through Synapse governance.
3. Backend checks whether an approved tenant context profile exists.
4. If missing or not approved, normal module usage is blocked.
5. User completes LLM-guided interview or manual form.
6. Backend generates a summary and contract draft.
7. User approves or rejects manually.
8. Approval creates an immutable profile version and activates it.

The interview is forced only until the first approval. Later edits are optional and create a new draft/summary/version cycle.

## Required Contract

Current schema version: `1`.

```json
{
  "tenantId": "tenant_id",
  "profileVersion": 1,
  "schemaVersion": 1,
  "business": {
    "businessName": "Example",
    "businessType": "Services",
    "businessDescription": "What the business does",
    "productsServices": ["Service A"],
    "targetAudience": "Target customers",
    "website": "https://example.com",
    "socialMedia": [],
    "notes": "Optional"
  },
  "communication": {
    "communicationTone": "Direct and helpful",
    "preferredLanguages": ["pt-BR"]
  },
  "operational": {
    "customerSupportStyle": "Structured triage",
    "salesBehavior": "Consultative",
    "generalGoals": ["Reduce response time"]
  },
  "metadata": {
    "source": "tenant_context_profile",
    "approvedAt": "ISO-8601"
  }
}
```

## Persistence

Tables:

- `tenant_context_profiles`
- `tenant_context_profile_versions`
- `tenant_context_drafts`
- `tenant_context_answers`
- `tenant_context_summaries`

Drafts and answers are persisted incrementally before validation so users do not lose progress after disconnects or client failures. No immutable profile version is created until explicit approval.

## Runtime Boundary

`TenantProfileInterviewExecutor` defines the future runtime-facing boundary:

- `generateNextQuestion()`
- `normalizeAnswer()`
- `generateSummary()`
- `validateProfile()`

The current implementation is deterministic and local. Controllers do not call providers directly and no prompt or chain-of-thought is persisted.

## Security

- Tenant context routes require server-side tenant context and `tenant:read` or `tenant:update`.
- `getTenantContext()` blocks usage until profile status is `APPROVED`.
- Bypass attempts write `tenant_profile_bypass_blocked`.
- Profile operations emit audit events for start, answer saved, summary generated, approval, update, rejection, and bypass.
- Module code must request the contract through Synapse service contracts instead of querying platform tables directly.

## Pending

- Wire frontend interview/manual form screens to the backend endpoints.
- Add real runtime-backed interview executor after Go Runtime integration is available.
- Add database-backed tests for tenant context once the dev PostgreSQL fixture is available.
