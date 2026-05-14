# Synapse API Terminal Test Checklist

Use any terminal HTTP client or Postman. Examples below use `curl`.

Base setup:

```bash
API_URL="https://synapse.allblue-labs.com/v1"
COOKIE_JAR="/tmp/synapse-cookie.txt"
JSON="Content-Type: application/json"
```

For local Docker/dev API, replace `API_URL` with `http://localhost:3000/v1`.

## Postman Authentication

Base URL:

```text
https://synapse.allblue-labs.com/v1
```

Recommended Postman environment variables:

```text
baseUrl = https://synapse.allblue-labs.com/v1
tenantId = <filled after workspace creation>
membershipId = <filled after membership creation>
```

Synapse uses a secure HttpOnly cookie named `synapse_session`.

1. Send `POST {{baseUrl}}/auth/login` or `POST {{baseUrl}}/auth/register`.
2. Check the response `Set-Cookie` header.
3. Postman should store `synapse_session` automatically in its Cookie Jar for `synapse.allblue-labs.com`.
4. For the next requests, do not manually add `Authorization`; keep using the same Postman workspace/environment.

Login request:

```http
POST {{baseUrl}}/auth/login
Content-Type: application/json
```

Payload:

```json
{
  "email": "qa-tenant@allblue-labs.com",
  "password": "StrongPassword123!"
}
```

Expected: `201 Created`; response body contains `user`; response headers include `Set-Cookie: synapse_session=...`.

Workspace selection request:

```http
POST {{baseUrl}}/auth/workspace
Content-Type: application/json
```

Payload:

```json
{
  "tenantId": "{{tenantId}}"
}
```

Expected: `201 Created`; response has `user.tenantId`; Postman updates the `synapse_session` cookie.

Tenant header:

- Normal tenant users: do not add `x-tenant-id`; the selected cookie session carries tenant context.
- Platform admin acting inside a tenant: add `x-tenant-id: {{tenantId}}`.
- Cross-tenant negative tests may intentionally send another `x-tenant-id`.

## Auth

### Register User Without Workspace

Objective: create a user without automatically creating a tenant.

```bash
curl -i -c "$COOKIE_JAR" -H "$JSON" \
  -d '{"name":"QA Tenantless","email":"qa-tenantless@example.com","password":"StrongPassword123!"}' \
  "$API_URL/auth/register"
```

Expected: `201 Created`; body has `user.id`, `user.email`, no `tenantId`; session cookie is set.

### Login Tenantless User

Objective: verify tenantless users can authenticate.

```bash
curl -i -c "$COOKIE_JAR" -H "$JSON" \
  -d '{"email":"qa-tenantless@example.com","password":"StrongPassword123!"}' \
  "$API_URL/auth/login"
```

Expected: `201 Created`; body has user without `tenantId`.

### Get Current User

Objective: verify current session and available memberships.

```bash
curl -i -b "$COOKIE_JAR" "$API_URL/users/me"
```

Expected: `200 OK`; tenantless user returns `memberships: []`.

## Tenants / Workspaces

### Create Workspace

Objective: create the first workspace for a tenantless user.

```bash
curl -i -b "$COOKIE_JAR" -H "$JSON" \
  -d '{"name":"QA Workspace","slug":"qa-workspace"}' \
  "$API_URL/tenant"
```

Expected: `201 Created`; body has tenant `id`, `slug`, `billingAccount.planKey: "trial"`, and owner membership.

Save tenant id:

```bash
TENANT_ID="<created-tenant-id>"
```

### Select Workspace

Objective: switch session into a tenant-scoped workspace.

```bash
curl -i -b "$COOKIE_JAR" -c "$COOKIE_JAR" -H "$JSON" \
  -d "{\"tenantId\":\"$TENANT_ID\"}" \
  "$API_URL/auth/workspace"
```

Expected: `201 Created`; body has `user.tenantId: $TENANT_ID`; session cookie is updated.

### Reject Extra Workspace Over Trial Limit

Objective: confirm plan-owned tenant limit enforcement.

```bash
curl -i -b "$COOKIE_JAR" -H "$JSON" \
  -d '{"name":"QA Workspace Two","slug":"qa-workspace-two"}' \
  "$API_URL/tenant"
```

Expected: `403 Forbidden`; message includes `Workspace limit reached`.

## Memberships

Before these tests, create a normal user without workspace:

```bash
curl -i -c /tmp/synapse-member-cookie.txt -H "$JSON" \
  -d '{"name":"QA Member","email":"qa-member@example.com","password":"StrongPassword123!"}' \
  "$API_URL/auth/register"
```

### List Memberships

Objective: list tenant memberships with pagination.

```bash
curl -i -b "$COOKIE_JAR" "$API_URL/tenant/memberships?page=1&pageSize=10"
```

Expected: `200 OK`; body has `items`, `page`, `pageSize`, `total`.

### Add Tenant Member

Objective: add an existing non-platform user to the selected tenant.

```bash
curl -i -b "$COOKIE_JAR" -H "$JSON" \
  -d '{"email":"qa-member@example.com","role":"OPERATOR"}' \
  "$API_URL/tenant/memberships"
```

Expected: `201 Created`; body has `email: "qa-member@example.com"` and `role: "OPERATOR"`.

Save membership id:

```bash
MEMBERSHIP_ID="<created-membership-id>"
```

### Update Member Role

Objective: change a member role without role escalation.

```bash
curl -i -b "$COOKIE_JAR" -H "$JSON" -X PATCH \
  -d '{"role":"VIEWER"}' \
  "$API_URL/tenant/memberships/$MEMBERSHIP_ID/role"
```

Expected: `200 OK`; body has `role: "VIEWER"`.

### Remove Member

Objective: remove a non-owner membership.

```bash
curl -i -b "$COOKIE_JAR" -X DELETE \
  "$API_URL/tenant/memberships/$MEMBERSHIP_ID"
```

Expected: `200 OK`; body has `deleted: true`.

### Reject Last Owner Removal

Objective: prevent deleting the last tenant owner.

```bash
OWNER_MEMBERSHIP_ID="<owner-membership-id>"
curl -i -b "$COOKIE_JAR" -X DELETE \
  "$API_URL/tenant/memberships/$OWNER_MEMBERSHIP_ID"
```

Expected: `409 Conflict`; message includes `Cannot remove the last tenant owner`.

## Billing Plans

Requires a platform admin/super admin session.

### List Plans

Objective: read commercially configured plans.

```bash
curl -i -b "$COOKIE_JAR" "$API_URL/billing/plans"
```

Expected: `200 OK`; includes `trial`, `light`, `pro`, `premium` if seeded.

### Get Plan

Objective: inspect one plan template.

```bash
curl -i -b "$COOKIE_JAR" "$API_URL/billing/plans/light"
```

Expected: `200 OK`; includes `key`, `displayName`, `entitlements`.

### Update Plan Entitlements

Objective: verify admin-controlled quota template update.

```bash
curl -i -b "$COOKIE_JAR" -H "$JSON" -X PATCH \
  -d '{"displayName":"Light","status":"ACTIVE","requiredPublicModules":1,"entitlements":{"allowedModuleTiers":["FREE","LIGHT"],"quotas":{"maxTenants":1,"monthlyCredits":3000,"maxUsersPerTenant":3,"maxModules":3,"maxActiveChannelSets":1},"custom":{}}}' \
  "$API_URL/billing/plans/light"
```

Expected: `200 OK`; returned plan has updated `entitlements`.

## Modules

### List Store Modules

Objective: verify tenant-visible modules.

```bash
curl -i -b "$COOKIE_JAR" "$API_URL/modules"
```

Expected: `200 OK`; includes public, active, store-visible modules only.

### Enable Pulse

Objective: enable module through Synapse governance.

```bash
curl -i -b "$COOKIE_JAR" -X POST "$API_URL/modules/pulse/enable"
```

Expected: `201 Created` or `200 OK`; body has `name: "pulse"` and `enabled: true`.

### Reject Module Activation Without Workspace

Objective: confirm tenantless module activation business error.

```bash
curl -i -b /tmp/synapse-member-cookie.txt -X POST "$API_URL/modules/pulse/enable"
```

Expected: `401 Unauthorized`; message equals `You must create at least one workspace before activating modules.`

## Pulse

### Create Pulse Entry

Objective: create an operational inbound entry.

```bash
curl -i -b "$COOKIE_JAR" -H "$JSON" \
  -d '{"contactPhone":"+15551234567","contactName":"QA Customer","originalMessage":"Need help","provider":"WHATSAPP","channelIdentifier":"+15550001111"}' \
  "$API_URL/pulse/queue"
```

Expected: `201 Created`; body has `id`, `tenantId`, `status`.

### List Pulse Queue

Objective: verify tenant-scoped Pulse entries.

```bash
curl -i -b "$COOKIE_JAR" "$API_URL/pulse/queue"
```

Expected: `200 OK`; list contains only current tenant entries.

### List Pulse Tickets

Objective: verify tenant-scoped ticket read API.

```bash
curl -i -b "$COOKIE_JAR" "$API_URL/pulse/tickets?page=1&pageSize=10"
```

Expected: `200 OK`; body returns paginated ticket data or an empty list.

## Negative Access Checks

### Cross-Tenant Header Rejection

Objective: ensure tenant users cannot force another tenant id.

```bash
curl -i -b "$COOKIE_JAR" -H "x-tenant-id: other-tenant-id" "$API_URL/tenant"
```

Expected: `401 Unauthorized`; message includes `cannot access this tenant`.

### Viewer Mutation Rejection

Objective: verify live membership permission enforcement after downgrade.

Steps:
1. Owner changes a member to `VIEWER`.
2. Member selects workspace.
3. Member attempts Pulse write:

```bash
curl -i -b /tmp/synapse-member-cookie.txt -c /tmp/synapse-member-cookie.txt -H "$JSON" \
  -d "{\"tenantId\":\"$TENANT_ID\"}" \
  "$API_URL/auth/workspace"

curl -i -b /tmp/synapse-member-cookie.txt -H "$JSON" \
  -d '{"contactPhone":"+15550000000","originalMessage":"Should fail"}' \
  "$API_URL/pulse/queue"
```

Expected: `403 Forbidden`; missing permission includes `pulse:write`.
