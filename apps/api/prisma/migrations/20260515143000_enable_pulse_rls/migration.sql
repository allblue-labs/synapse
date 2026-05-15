-- Enable Row Level Security for Pulse-owned operational tables.
--
-- Preconditions implemented in the API before this migration:
-- - Pulse data lives in schema `pulse`
-- - Pulse repositories use transaction-scoped app.current_tenant_id
-- - controlled platform/system maintenance paths can use app.platform_bypass
--
-- Synapse remains the governance owner in `public`; RLS here is a database
-- safety layer for module-owned tenant operational data.

CREATE OR REPLACE FUNCTION app_security.install_tenant_policy(schema_name text, table_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'DROP POLICY IF EXISTS tenant_isolation ON %I.%I',
    schema_name,
    table_name
  );
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %I.%I USING (app_security.tenant_visible("tenantId")) WITH CHECK (app_security.tenant_visible("tenantId"))',
    schema_name,
    table_name
  );
END;
$$;

SELECT app_security.install_tenant_policy('pulse', 'pulse_entries');
SELECT app_security.install_tenant_policy('pulse', 'pulse_channels');
SELECT app_security.install_tenant_policy('pulse', 'pulse_conversations');
SELECT app_security.install_tenant_policy('pulse', 'pulse_tickets');
SELECT app_security.install_tenant_policy('pulse', 'pulse_operational_events');
SELECT app_security.install_tenant_policy('pulse', 'pulse_action_executions');
SELECT app_security.install_tenant_policy('pulse', 'pulse_playbooks');
SELECT app_security.install_tenant_policy('pulse', 'pulse_operational_schedules');
SELECT app_security.install_tenant_policy('pulse', 'pulse_knowledge_contexts');
SELECT app_security.install_tenant_policy('pulse', 'pulse_skills');
SELECT app_security.install_tenant_policy('pulse', 'integration_settings');

ALTER TABLE pulse.pulse_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse.pulse_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE pulse.pulse_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse.pulse_channels FORCE ROW LEVEL SECURITY;

ALTER TABLE pulse.pulse_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse.pulse_conversations FORCE ROW LEVEL SECURITY;

ALTER TABLE pulse.pulse_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse.pulse_tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE pulse.pulse_operational_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse.pulse_operational_events FORCE ROW LEVEL SECURITY;

ALTER TABLE pulse.pulse_action_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse.pulse_action_executions FORCE ROW LEVEL SECURITY;

ALTER TABLE pulse.pulse_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse.pulse_playbooks FORCE ROW LEVEL SECURITY;

ALTER TABLE pulse.pulse_operational_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse.pulse_operational_schedules FORCE ROW LEVEL SECURITY;

ALTER TABLE pulse.pulse_knowledge_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse.pulse_knowledge_contexts FORCE ROW LEVEL SECURITY;

ALTER TABLE pulse.pulse_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse.pulse_skills FORCE ROW LEVEL SECURITY;

ALTER TABLE pulse.integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse.integration_settings FORCE ROW LEVEL SECURITY;

DROP FUNCTION app_security.install_tenant_policy(text, text);
