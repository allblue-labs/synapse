# Frontend Contract Pack

Last updated: 2026-05-08

This pack is for the frontend owner/LLM. It documents backend-owned contracts only. Do not call the isolated Go Runtime directly from Next.js; frontend calls the NestJS platform API only.

## Global Rules

- API prefix: `/v1`
- Module name: Pulse
- Module slug: `pulse`
- Do not use retired module/product names or old messaging-module naming.
- Synapse is not a chatbot app.
- Pulse is an operational communication module: queue, tickets, timelines, workflows, knowledge context, scheduling readiness, and human review.
- Backend remains the authority for auth, RBAC, tenant isolation, billing, entitlements, audit, and runtime governance.
- Do not render raw operational payloads blindly. Prefer summarized/timeline fields and audit-safe summaries.
- Runtime records are governance/lifecycle state only until backend orchestration/callbacks are wired.

## Session And Permissions

`GET /v1/users/me`

- Authenticated route.
- Returns current user/member context from the backend.
- Frontend should use returned user/permission information for UI gating, while still handling backend `401` and `403`.

Important UI permission gates:

| Permission | Frontend use |
| --- | --- |
| `pulse:read` | Pulse queue, channels, conversations, knowledge reads |
| `pulse:write` | Pulse entry creation and knowledge publish/archive |
| `pulse:validate` | Validate queue entry |
| `pulse:reject` | Reject queue entry |
| `pulse:retry` | Retry failed/rejected entry |
| `tickets:read` | Ticket list/detail/timeline |
| `tickets:assign` | Assign/escalate ticket |
| `tickets:resolve` | Resolve ticket |
| `tickets:write` | Reopen/cancel/operator-review/flow-advance |
| `integrations:read` | Scheduling integration readiness and availability prepare |
| `integrations:manage` | Scheduling booking prepare |
| `modules:read` | Module store/list |
| `modules:enable` | Enable module |
| `modules:disable` | Disable module |
| `billing:read` | Billing account/plans/usage reads |
| `billing:manage` | Checkout, portal, usage rates/meters/reporting |
| `runtime:executions:read` | Runtime execution detail |
| `runtime:executions:create` | Runtime execution request record |
| `runtime:executions:transition` | Runtime lifecycle transition |
| `runtime:executions:cancel` | Runtime lifecycle cancellation |

## Common Pagination

Pulse list endpoints generally support:

```json
{
  "page": 1,
  "pageSize": 20
}
```

`pageSize` max is `100`, except knowledge query `limit` max is `20`.

List responses use:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

## Pulse Queue

Routes:

| Method | Path | Permission |
| --- | --- | --- |
| `GET` | `/v1/pulse/queue` | `pulse:read` |
| `GET` | `/v1/pulse/queue/:id` | `pulse:read` |
| `POST` | `/v1/pulse/entries` | `pulse:write` |
| `POST` | `/v1/pulse/queue/:id/validate` | `pulse:validate` |
| `POST` | `/v1/pulse/queue/:id/reject` | `pulse:reject` |
| `POST` | `/v1/pulse/queue/:id/retry` | `pulse:retry` |
| `GET` | `/v1/pulse/errors` | `pulse:read` |

Queue status values:

- `PROCESSING`
- `PENDING_VALIDATION`
- `READY_TO_CONFIRM`
- `SCHEDULED`
- `FAILED`

Create entry example:

```json
{
  "originalMessage": "Customer wants a quote for Monday morning.",
  "contactPhone": "+15551234567",
  "contactName": "Ana",
  "provider": "WHATSAPP",
  "channelIdentifier": "+15557654321",
  "participantRef": "+15551234567",
  "participantLabel": "Ana"
}
```

Validate entry example:

```json
{
  "extractedData": {
    "intent": "scheduling",
    "customerNeed": "quote"
  },
  "scheduledAt": "2026-05-08T15:00:00.000Z"
}
```

Reject entry example:

```json
{
  "reason": "Insufficient operational context."
}
```

## Pulse Channels And Conversations

Routes:

| Method | Path | Permission |
| --- | --- | --- |
| `GET` | `/v1/pulse/channels` | `pulse:read` |
| `GET` | `/v1/pulse/channels/:id` | `pulse:read` |
| `GET` | `/v1/pulse/conversations` | `pulse:read` |
| `GET` | `/v1/pulse/conversations/:id` | `pulse:read` |
| `GET` | `/v1/pulse/conversations/:id/events` | `pulse:read` |
| `GET` | `/v1/pulse/conversations/:id/timeline` | `pulse:read` |

Channel filters:

- `provider`: `WHATSAPP`, `TELEGRAM`
- `status`: `ACTIVE`, `DISCONNECTED`, `NEEDS_ATTENTION`, `DISABLED`

Conversation filters:

- `state`: `NEW`, `IN_FLOW`, `WAITING_CUSTOMER`, `WAITING_OPERATOR`, `RESOLVED`, `CANCELLED`
- `operationalStatus`: `ACTIVE`, `NEEDS_REVIEW`, `ESCALATED`, `CLOSED`

## Pulse Tickets

Routes:

| Method | Path | Permission |
| --- | --- | --- |
| `GET` | `/v1/pulse/tickets` | `tickets:read` |
| `GET` | `/v1/pulse/tickets/:id` | `tickets:read` |
| `GET` | `/v1/pulse/tickets/:id/events` | `tickets:read` |
| `GET` | `/v1/pulse/tickets/:id/timeline` | `tickets:read` |
| `POST` | `/v1/pulse/tickets/:id/assign` | `tickets:assign` |
| `POST` | `/v1/pulse/tickets/:id/resolve` | `tickets:resolve` |
| `POST` | `/v1/pulse/tickets/:id/reopen` | `tickets:write` |
| `POST` | `/v1/pulse/tickets/:id/escalate` | `tickets:assign` |
| `POST` | `/v1/pulse/tickets/:id/cancel` | `tickets:write` |
| `POST` | `/v1/pulse/tickets/:id/operator-review` | `tickets:write` |
| `POST` | `/v1/pulse/tickets/:id/flow/advance` | `tickets:write` |

Ticket filters:

- `type`: `SUPPORT`, `SALES`, `SCHEDULING`, `MARKETING`, `OPERATOR_REVIEW`, `KNOWLEDGE_REQUEST`
- `status`: `OPEN`, `PENDING_REVIEW`, `WAITING_CUSTOMER`, `RESOLVED`, `CANCELLED`

Lifecycle request examples:

```json
// assign
{
  "assignedUserId": "user_123",
  "note": "Taking ownership for review."
}
```

```json
// resolve
{
  "resolutionSummary": "Customer request was completed."
}
```

```json
// reopen
{
  "reason": "Customer replied with new details."
}
```

```json
// escalate
{
  "reason": "Low confidence extraction needs senior review.",
  "priority": 75
}
```

```json
// cancel
{
  "reason": "Duplicate ticket."
}
```

```json
// operator review
{
  "summary": "Operator confirmed intent and corrected product name.",
  "confidence": 0.92,
  "decision": {
    "approved": true,
    "category": "sales"
  }
}
```

```json
// flow advance
{
  "nextState": "execute_action",
  "transitionSource": "manual",
  "confidence": 0.88,
  "note": "Ready to run the next operational step.",
  "aiDecisionSummary": {
    "summary": "Intent is sales-qualified."
  }
}
```

Flow states:

- `intake`
- `classify_intent`
- `collect_context`
- `waiting_customer`
- `execute_action`
- `review_required`
- `operator_takeover`
- `escalated`
- `completed`
- `cancelled`

Do not invent extra flow states in the UI.

## Pulse Timeline

Timeline/event query params:

- `page`
- `pageSize`
- `eventType`
- `category`
- `occurredFrom`
- `occurredTo`

Timeline categories:

- `entry`
- `ticket_lifecycle`
- `operator_action`
- `escalation`
- `confidence`
- `workflow_state`

Event types:

- `pulse.conversation.linked`
- `pulse.conversation.resolved`
- `pulse.entry.received`
- `pulse.entry.validated`
- `pulse.entry.rejected`
- `pulse.entry.retry_requested`
- `pulse.ticket.created`
- `pulse.ticket.assign_ticket`
- `pulse.ticket.resolve_ticket`
- `pulse.ticket.reopen_ticket`
- `pulse.ticket.escalate_ticket`
- `pulse.ticket.cancel_ticket`
- `pulse.ticket.submit_operator_review`
- `pulse.ticket.advance_flow_state`
- `pulse.knowledge.published`
- `pulse.knowledge.archived`
- `pulse.unsupported_message_type`
- `pulse.flow.transitioned`

Timeline UI guidance:

- Prefer operator-facing labels over raw event type strings.
- Show actor, timestamp, event category, status movement, confidence movement, and safe summaries.
- Do not expose raw provider payloads, secrets, chain-of-thought, or unrestricted JSON.

## Pulse Knowledge Context

Routes:

| Method | Path | Permission |
| --- | --- | --- |
| `GET` | `/v1/pulse/knowledge` | `pulse:read` |
| `GET` | `/v1/pulse/knowledge/:id` | `pulse:read` |
| `POST` | `/v1/pulse/knowledge/query` | `pulse:read` |
| `POST` | `/v1/pulse/knowledge` | `pulse:write` |
| `POST` | `/v1/pulse/knowledge/:id/archive` | `pulse:write` |

Knowledge types:

- `FAQ`
- `BUSINESS_DESCRIPTION`
- `OPERATIONAL_INSTRUCTION`
- `PRODUCT_SERVICE`
- `CAMPAIGN_PROMOTION`

Knowledge statuses:

- `ACTIVE`
- `ARCHIVED`

Publish example:

```json
{
  "type": "FAQ",
  "title": "Opening hours",
  "content": "Support operates Monday to Friday, 9am to 6pm.",
  "metadata": {
    "source": "operator"
  }
}
```

Query example:

```json
{
  "query": "opening hours",
  "type": "FAQ",
  "limit": 5
}
```

Important: current query is backend filtering, not semantic retrieval. UI must not claim semantic search yet.

## Pulse Scheduling Integrations

Routes:

| Method | Path | Permission |
| --- | --- | --- |
| `GET` | `/v1/pulse/integrations/scheduling` | `integrations:read` |
| `GET` | `/v1/pulse/integrations/scheduling/:id` | `integrations:read` |
| `POST` | `/v1/pulse/scheduling/availability/prepare` | `integrations:read` |
| `POST` | `/v1/pulse/scheduling/bookings/prepare` | `integrations:manage` |

Providers:

- `GOOGLE_CALENDAR`
- `OUTLOOK_CALENDAR`
- `CALENDLY`

Integration statuses:

- `ACTIVE`
- `DISCONNECTED`
- `NEEDS_ATTENTION`
- `DISABLED`

Availability prepare example:

```json
{
  "provider": "GOOGLE_CALENDAR",
  "integrationId": "integration_123",
  "windowStart": "2026-05-08T13:00:00.000Z",
  "windowEnd": "2026-05-08T18:00:00.000Z",
  "durationMinutes": 30,
  "timezone": "America/New_York",
  "metadata": {
    "ticketId": "ticket_123"
  }
}
```

Booking prepare example:

```json
{
  "provider": "GOOGLE_CALENDAR",
  "integrationId": "integration_123",
  "windowStart": "2026-05-08T13:00:00.000Z",
  "windowEnd": "2026-05-08T18:00:00.000Z",
  "durationMinutes": 30,
  "timezone": "America/New_York",
  "slotStartsAt": "2026-05-08T14:00:00.000Z",
  "participant": {
    "name": "Ana",
    "email": "ana@example.com",
    "phone": "+15551234567"
  }
}
```

Important: prepare responses are not confirmed bookings or provider calls.

## Module Registry

Routes:

| Method | Path | Permission |
| --- | --- | --- |
| `GET` | `/v1/modules` | `modules:read` |
| `POST` | `/v1/modules/:name/enable` | `modules:enable` |
| `POST` | `/v1/modules/:name/disable` | `modules:disable` |

Frontend rules:

- Use backend state for active/inactive, visibility, tier, rollout, and entitlement.
- Do not invent module availability.
- Pulse slug is `pulse`.

## Billing And Usage

Billing routes:

| Method | Path | Permission |
| --- | --- | --- |
| `GET` | `/v1/billing/account` | `billing:read` |
| `GET` | `/v1/billing/plans` | `billing:read` |
| `POST` | `/v1/billing/checkout/subscription` | `billing:manage` |
| `POST` | `/v1/billing/portal/session` | `billing:manage` |
| `POST` | `/v1/billing/feature-flags/:key` | `billing:manage` |

Checkout example:

```json
{
  "planKey": "pro",
  "successUrl": "https://app.example.com/billing/success",
  "cancelUrl": "https://app.example.com/billing/cancel"
}
```

Portal example:

```json
{
  "returnUrl": "https://app.example.com/billing"
}
```

Usage routes:

| Method | Path | Permission |
| --- | --- | --- |
| `GET` | `/v1/usage/summary?billingPeriod=2026-05` | `billing:read` |
| `GET` | `/v1/usage/rated-summary?billingPeriod=2026-05&currency=usd` | `billing:read` |
| `GET` | `/v1/usage/rates` | `billing:manage` |
| `POST` | `/v1/usage/rates` | `billing:manage` |
| `GET` | `/v1/usage/stripe-meters` | `billing:manage` |
| `POST` | `/v1/usage/stripe-meters` | `billing:manage` |
| `POST` | `/v1/usage/stripe-report?billingPeriod=2026-05&currency=usd` | `billing:manage` |

Usage metric types:

- `AI_CALL`
- `AUDIO_TRANSCRIPTION`
- `WORKFLOW_RUN`
- `STORAGE`
- `MESSAGE`
- `AUTOMATION_EXECUTION`

Frontend rules:

- Show usage as charged only when backend rated/metered data says so.
- Plans are `light`, `pro`, `premium`.
- Plan activation and feature flags are backend-controlled.

## Runtime Governance

Routes:

| Method | Path | Permission |
| --- | --- | --- |
| `POST` | `/v1/runtime/executions` | `runtime:executions:create` |
| `GET` | `/v1/runtime/executions/:id` | `runtime:executions:read` |
| `POST` | `/v1/runtime/executions/:id/transition` | `runtime:executions:transition` |
| `POST` | `/v1/runtime/executions/:id/cancel` | `runtime:executions:cancel` |

Execution statuses:

- `REQUESTED`
- `QUEUED`
- `RUNNING`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`
- `TIMED_OUT`

Request example:

```json
{
  "moduleSlug": "pulse",
  "requestType": "pulse.knowledge.query",
  "idempotencyKey": "frontend-visible-operation-id",
  "input": {
    "input": {
      "prompt": "Summarize the operational context."
    },
    "providerPreference": ["openai"],
    "timeoutMs": 30000
  },
  "metadata": {
    "ticketId": "ticket_123"
  }
}
```

Transition example:

```json
{
  "status": "RUNNING"
}
```

Cancel example:

```json
{
  "reason": "Operator cancelled before execution."
}
```

Frontend rules:

- These are lifecycle governance APIs, not direct Go Runtime APIs.
- Do not call the isolated Go Runtime from Next.js.
- Do not imply provider execution is live unless backend orchestration/callbacks are wired.
- Most users should see read-only state; transition/cancel surfaces should be restricted.

## Error Handling

Expected backend errors:

- `400`: validation failure, invalid flow transition, invalid runtime transition
- `401`: unauthenticated/session expired
- `403`: missing permission
- `404`: tenant-scoped resource not found or cross-tenant access blocked
- `429`: rate limited
- `503`: external service/config unavailable

Frontend should:

- Use honest loading/empty/error/forbidden states.
- Avoid retry storms.
- Clear tenant-scoped query cache on tenant/session change.
- Treat `404` on tenant resources as not found, not as evidence another tenant owns it.

## Recommended First Frontend Milestone

Build Pulse ticket detail:

1. `GET /v1/pulse/tickets/:id`
2. `GET /v1/pulse/tickets/:id/timeline`
3. Lifecycle actions:
   - assign
   - resolve
   - reopen
   - escalate
   - cancel
   - operator review
   - flow advance
4. Permission-gated buttons.
5. Timeline categories and safe event rendering.
6. Empty/error/forbidden states.

This milestone exercises the highest-value backend contracts without requiring direct Runtime integration.
