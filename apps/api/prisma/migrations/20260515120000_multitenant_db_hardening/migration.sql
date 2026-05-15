-- Multitenant database hardening foundation.
--
-- This migration is intentionally additive:
-- - indexes map to existing tenant-scoped query patterns
-- - RLS helper functions and policies are prepared but RLS is not enabled yet
--   because every tenant-scoped Prisma path must use transaction-scoped
--   `SET LOCAL app.current_tenant_id` before enforcement can be safely turned on.

-- Hotpath indexes for tenant-scoped authorization, audit, usage, Pulse queues,
-- timelines, action execution, and runtime execution lookups.
CREATE INDEX IF NOT EXISTS "AuditEvent_tenantId_action_createdAt_idx"
  ON "AuditEvent"("tenantId", "action", "createdAt");

CREATE INDEX IF NOT EXISTS "UserMembership_tenantId_userId_role_idx"
  ON "UserMembership"("tenantId", "userId", "role");

CREATE INDEX IF NOT EXISTS "usage_events_tenantId_billingPeriod_moduleSlug_metricType_unit_idx"
  ON "usage_events"("tenantId", "billingPeriod", "moduleSlug", "metricType", "unit");

CREATE INDEX IF NOT EXISTS "usage_events_tenantId_resourceType_resourceId_idx"
  ON "usage_events"("tenantId", "resourceType", "resourceId");

CREATE INDEX IF NOT EXISTS "usage_period_aggregates_tenantId_billingPeriod_rated_idx"
  ON "usage_period_aggregates"("tenantId", "billingPeriod", "rated");

CREATE INDEX IF NOT EXISTS "pulse_entries_tenantId_status_updatedAt_idx"
  ON "pulse_entries"("tenantId", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "pulse_entries_tenantId_contactPhone_createdAt_idx"
  ON "pulse_entries"("tenantId", "contactPhone", "createdAt");

CREATE INDEX IF NOT EXISTS "pulse_conversations_tenantId_channelId_lastActivityAt_idx"
  ON "pulse_conversations"("tenantId", "channelId", "lastActivityAt");

CREATE INDEX IF NOT EXISTS "pulse_conversations_tenantId_updatedAt_idx"
  ON "pulse_conversations"("tenantId", "updatedAt");

CREATE INDEX IF NOT EXISTS "pulse_tickets_tenantId_assignedUserId_status_updatedAt_idx"
  ON "pulse_tickets"("tenantId", "assignedUserId", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "pulse_tickets_tenantId_priority_status_updatedAt_idx"
  ON "pulse_tickets"("tenantId", "priority", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "pulse_tickets_tenantId_conversationId_updatedAt_idx"
  ON "pulse_tickets"("tenantId", "conversationId", "updatedAt");

CREATE INDEX IF NOT EXISTS "pulse_operational_events_tenantId_actorUserId_occurredAt_idx"
  ON "pulse_operational_events"("tenantId", "actorUserId", "occurredAt");

CREATE INDEX IF NOT EXISTS "pulse_action_executions_tenantId_conversationId_updatedAt_idx"
  ON "pulse_action_executions"("tenantId", "conversationId", "updatedAt");

CREATE INDEX IF NOT EXISTS "pulse_action_executions_tenantId_status_action_updatedAt_idx"
  ON "pulse_action_executions"("tenantId", "status", "action", "updatedAt");

CREATE INDEX IF NOT EXISTS "integration_settings_tenantId_status_updatedAt_idx"
  ON "integration_settings"("tenantId", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "execution_requests_tenantId_status_updatedAt_idx"
  ON "execution_requests"("tenantId", "status", "updatedAt");

-- RLS foundation.
-- The policies below are production-grade once RLS is enabled per table and
-- every request/worker transaction sets app.current_tenant_id with SET LOCAL.
-- Until then they are inert policy definitions and do not affect Prisma.
CREATE SCHEMA IF NOT EXISTS app_security;

CREATE OR REPLACE FUNCTION app_security.current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_security.is_platform_bypass()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.platform_bypass', true), ''), 'false') = 'true'
$$;

CREATE OR REPLACE FUNCTION app_security.tenant_visible(row_tenant_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT app_security.is_platform_bypass()
    OR (app_security.current_tenant_id() IS NOT NULL AND row_tenant_id = app_security.current_tenant_id())
$$;

CREATE OR REPLACE FUNCTION app_security.install_tenant_policy(table_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'DROP POLICY IF EXISTS tenant_isolation ON %I',
    table_name
  );
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %I USING (app_security.tenant_visible("tenantId")) WITH CHECK (app_security.tenant_visible("tenantId"))',
    table_name
  );
END;
$$;

SELECT app_security.install_tenant_policy('UserMembership');
SELECT app_security.install_tenant_policy('Agent');
SELECT app_security.install_tenant_policy('Conversation');
SELECT app_security.install_tenant_policy('Message');
SELECT app_security.install_tenant_policy('ChannelAccount');
SELECT app_security.install_tenant_policy('KnowledgeItem');
SELECT app_security.install_tenant_policy('BillingAccount');
SELECT app_security.install_tenant_policy('module_purchases');
SELECT app_security.install_tenant_policy('tenant_module_installations');
SELECT app_security.install_tenant_policy('usage_events');
SELECT app_security.install_tenant_policy('usage_period_aggregates');
SELECT app_security.install_tenant_policy('usage_stripe_reports');
SELECT app_security.install_tenant_policy('pulse_entries');
SELECT app_security.install_tenant_policy('pulse_channels');
SELECT app_security.install_tenant_policy('pulse_conversations');
SELECT app_security.install_tenant_policy('pulse_tickets');
SELECT app_security.install_tenant_policy('pulse_operational_events');
SELECT app_security.install_tenant_policy('pulse_action_executions');
SELECT app_security.install_tenant_policy('pulse_playbooks');
SELECT app_security.install_tenant_policy('pulse_operational_schedules');
SELECT app_security.install_tenant_policy('pulse_knowledge_contexts');
SELECT app_security.install_tenant_policy('pulse_skills');
SELECT app_security.install_tenant_policy('integration_settings');
SELECT app_security.install_tenant_policy('execution_requests');

DROP FUNCTION app_security.install_tenant_policy(text);

-- RLS activation runbook, superseded by 20260515143000_enable_pulse_rls:
-- ALTER TABLE pulse.pulse_tickets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pulse.pulse_tickets FORCE ROW LEVEL SECURITY;
-- Repeat table-by-table after the API sets app.current_tenant_id in every
-- tenant-scoped transaction and app.platform_bypass only for controlled
-- platform-admin/system jobs.
