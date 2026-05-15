-- Split Pulse operational persistence into its own PostgreSQL schema.
--
-- Synapse governance remains in public:
-- tenants, users, RBAC, billing, subscriptions, quotas, module registry,
-- audit, usage metering, and runtime execution request governance.
--
-- Pulse operational data moves to pulse:
-- channels, conversations, tickets, timeline/events, playbooks, knowledge,
-- skills, schedules, action ledger, and Pulse-owned integration settings.
--
-- Cross-schema foreign keys to public."Tenant" are intentionally preserved.

CREATE SCHEMA IF NOT EXISTS pulse;

ALTER TYPE "PulseStatus" SET SCHEMA pulse;
ALTER TYPE "PulseChannelProvider" SET SCHEMA pulse;
ALTER TYPE "PulseChannelStatus" SET SCHEMA pulse;
ALTER TYPE "PulseConversationState" SET SCHEMA pulse;
ALTER TYPE "PulseOperationalStatus" SET SCHEMA pulse;
ALTER TYPE "PulseTicketType" SET SCHEMA pulse;
ALTER TYPE "PulseTicketStatus" SET SCHEMA pulse;
ALTER TYPE "PulseActorType" SET SCHEMA pulse;
ALTER TYPE "PulsePlaybookStatus" SET SCHEMA pulse;
ALTER TYPE "PulseKnowledgeContextType" SET SCHEMA pulse;
ALTER TYPE "PulseKnowledgeContextStatus" SET SCHEMA pulse;
ALTER TYPE "PulseSkillType" SET SCHEMA pulse;
ALTER TYPE "PulseSkillStatus" SET SCHEMA pulse;
ALTER TYPE "PulseActionExecutionStatus" SET SCHEMA pulse;
ALTER TYPE "IntegrationProvider" SET SCHEMA pulse;
ALTER TYPE "IntegrationStatus" SET SCHEMA pulse;

ALTER TABLE "pulse_entries" SET SCHEMA pulse;
ALTER TABLE "pulse_channels" SET SCHEMA pulse;
ALTER TABLE "pulse_conversations" SET SCHEMA pulse;
ALTER TABLE "pulse_tickets" SET SCHEMA pulse;
ALTER TABLE "pulse_operational_events" SET SCHEMA pulse;
ALTER TABLE "pulse_action_executions" SET SCHEMA pulse;
ALTER TABLE "pulse_playbooks" SET SCHEMA pulse;
ALTER TABLE "pulse_operational_schedules" SET SCHEMA pulse;
ALTER TABLE "pulse_knowledge_contexts" SET SCHEMA pulse;
ALTER TABLE "pulse_skills" SET SCHEMA pulse;
ALTER TABLE "integration_settings" SET SCHEMA pulse;

-- Runtime execution requests stay in public because Synapse owns execution
-- governance and persistence, even when a module creates the request.
