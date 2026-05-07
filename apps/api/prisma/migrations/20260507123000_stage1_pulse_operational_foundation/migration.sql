CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN');
CREATE TYPE "ModuleTier" AS ENUM ('FREE', 'LIGHT', 'PRO', 'PREMIUM');
CREATE TYPE "ModuleVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'HIDDEN');
CREATE TYPE "ModuleRolloutState" AS ENUM ('DRAFT', 'PILOT', 'GA', 'DEPRECATED');
CREATE TYPE "PulseChannelProvider" AS ENUM ('WHATSAPP', 'TELEGRAM');
CREATE TYPE "PulseChannelStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'NEEDS_ATTENTION', 'DISABLED');
CREATE TYPE "PulseConversationState" AS ENUM ('NEW', 'IN_FLOW', 'WAITING_CUSTOMER', 'WAITING_OPERATOR', 'RESOLVED', 'CANCELLED');
CREATE TYPE "PulseOperationalStatus" AS ENUM ('ACTIVE', 'NEEDS_REVIEW', 'ESCALATED', 'CLOSED');
CREATE TYPE "PulseTicketType" AS ENUM ('SUPPORT', 'SALES', 'SCHEDULING', 'MARKETING', 'OPERATOR_REVIEW', 'KNOWLEDGE_REQUEST');
CREATE TYPE "PulseTicketStatus" AS ENUM ('OPEN', 'PENDING_REVIEW', 'WAITING_CUSTOMER', 'RESOLVED', 'CANCELLED');
CREATE TYPE "PulseActorType" AS ENUM ('SYSTEM', 'USER', 'CUSTOMER', 'AI', 'INTEGRATION');
CREATE TYPE "PulsePlaybookStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "PulseKnowledgeContextType" AS ENUM ('FAQ', 'BUSINESS_DESCRIPTION', 'OPERATIONAL_INSTRUCTION', 'PRODUCT_SERVICE', 'CAMPAIGN_PROMOTION');
CREATE TYPE "PulseKnowledgeContextStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "PulseSkillType" AS ENUM ('SCHEDULER', 'SALES', 'SUPPORT', 'KNOWLEDGE', 'MARKETING', 'OPERATOR');
CREATE TYPE "PulseSkillStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE_CALENDAR', 'OUTLOOK_CALENDAR', 'CALENDLY');
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'NEEDS_ATTENTION', 'DISABLED');
CREATE TYPE "ExecutionStatus" AS ENUM ('REQUESTED', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT');

ALTER TABLE "module_catalog_items"
  ADD COLUMN "tier" "ModuleTier" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "visibility" "ModuleVisibility" NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN "rolloutState" "ModuleRolloutState" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "featureFlag" TEXT,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT false;

UPDATE "module_catalog_items"
SET "tier" = 'LIGHT',
    "visibility" = 'PUBLIC',
    "rolloutState" = 'GA',
    "active" = true
WHERE "slug" = 'pulse';

CREATE INDEX "module_catalog_items_tier_visibility_rolloutState_idx" ON "module_catalog_items"("tier", "visibility", "rolloutState");
CREATE INDEX "module_catalog_items_active_visibility_idx" ON "module_catalog_items"("active", "visibility");

CREATE TABLE "pulse_channels" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "provider" "PulseChannelProvider" NOT NULL,
  "identifier" TEXT NOT NULL,
  "status" "PulseChannelStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "limits" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pulse_channels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pulse_conversations" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "participantRef" TEXT NOT NULL,
  "participantLabel" TEXT,
  "state" "PulseConversationState" NOT NULL DEFAULT 'NEW',
  "operationalStatus" "PulseOperationalStatus" NOT NULL DEFAULT 'ACTIVE',
  "confidence" DOUBLE PRECISION,
  "lastActivityAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pulse_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pulse_tickets" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT,
  "type" "PulseTicketType" NOT NULL,
  "status" "PulseTicketStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "confidence" DOUBLE PRECISION,
  "assignedUserId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "pulse_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pulse_operational_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "actorType" "PulseActorType" NOT NULL DEFAULT 'SYSTEM',
  "actorUserId" TEXT,
  "channelId" TEXT,
  "conversationId" TEXT,
  "ticketId" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pulse_operational_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pulse_playbooks" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "PulsePlaybookStatus" NOT NULL DEFAULT 'DRAFT',
  "skill" "PulseSkillType",
  "flow" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pulse_playbooks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pulse_knowledge_contexts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "PulseKnowledgeContextType" NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" "PulseKnowledgeContextStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pulse_knowledge_contexts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pulse_skills" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "PulseSkillType" NOT NULL,
  "status" "PulseSkillStatus" NOT NULL DEFAULT 'ACTIVE',
  "config" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pulse_skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_settings" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "displayName" TEXT NOT NULL,
  "externalRef" TEXT,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "credentialsRef" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "execution_requests" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "moduleSlug" TEXT NOT NULL,
  "requestType" TEXT NOT NULL,
  "status" "ExecutionStatus" NOT NULL DEFAULT 'REQUESTED',
  "idempotencyKey" TEXT,
  "context" JSONB NOT NULL DEFAULT '{}',
  "input" JSONB NOT NULL DEFAULT '{}',
  "output" JSONB,
  "errorMessage" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "queuedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "execution_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pulse_channels_tenantId_provider_identifier_key" ON "pulse_channels"("tenantId", "provider", "identifier");
CREATE INDEX "pulse_channels_tenantId_provider_status_idx" ON "pulse_channels"("tenantId", "provider", "status");
CREATE UNIQUE INDEX "pulse_conversations_tenantId_channelId_participantRef_key" ON "pulse_conversations"("tenantId", "channelId", "participantRef");
CREATE INDEX "pulse_conversations_tenantId_operationalStatus_lastActivityAt_idx" ON "pulse_conversations"("tenantId", "operationalStatus", "lastActivityAt");
CREATE INDEX "pulse_conversations_tenantId_state_idx" ON "pulse_conversations"("tenantId", "state");
CREATE INDEX "pulse_tickets_tenantId_status_updatedAt_idx" ON "pulse_tickets"("tenantId", "status", "updatedAt");
CREATE INDEX "pulse_tickets_tenantId_type_status_idx" ON "pulse_tickets"("tenantId", "type", "status");
CREATE INDEX "pulse_operational_events_tenantId_occurredAt_idx" ON "pulse_operational_events"("tenantId", "occurredAt");
CREATE INDEX "pulse_operational_events_tenantId_eventType_occurredAt_idx" ON "pulse_operational_events"("tenantId", "eventType", "occurredAt");
CREATE INDEX "pulse_operational_events_tenantId_conversationId_occurredAt_idx" ON "pulse_operational_events"("tenantId", "conversationId", "occurredAt");
CREATE INDEX "pulse_operational_events_tenantId_ticketId_occurredAt_idx" ON "pulse_operational_events"("tenantId", "ticketId", "occurredAt");
CREATE UNIQUE INDEX "pulse_playbooks_tenantId_key_key" ON "pulse_playbooks"("tenantId", "key");
CREATE INDEX "pulse_playbooks_tenantId_status_skill_idx" ON "pulse_playbooks"("tenantId", "status", "skill");
CREATE INDEX "pulse_knowledge_contexts_tenantId_type_status_idx" ON "pulse_knowledge_contexts"("tenantId", "type", "status");
CREATE INDEX "pulse_knowledge_contexts_tenantId_updatedAt_idx" ON "pulse_knowledge_contexts"("tenantId", "updatedAt");
CREATE UNIQUE INDEX "pulse_skills_tenantId_type_key" ON "pulse_skills"("tenantId", "type");
CREATE INDEX "pulse_skills_tenantId_status_idx" ON "pulse_skills"("tenantId", "status");
CREATE UNIQUE INDEX "integration_settings_tenantId_provider_externalRef_key" ON "integration_settings"("tenantId", "provider", "externalRef");
CREATE INDEX "integration_settings_tenantId_provider_status_idx" ON "integration_settings"("tenantId", "provider", "status");
CREATE UNIQUE INDEX "execution_requests_tenantId_idempotencyKey_key" ON "execution_requests"("tenantId", "idempotencyKey");
CREATE INDEX "execution_requests_tenantId_moduleSlug_status_idx" ON "execution_requests"("tenantId", "moduleSlug", "status");
CREATE INDEX "execution_requests_tenantId_requestType_requestedAt_idx" ON "execution_requests"("tenantId", "requestType", "requestedAt");

ALTER TABLE "pulse_channels" ADD CONSTRAINT "pulse_channels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pulse_conversations" ADD CONSTRAINT "pulse_conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pulse_conversations" ADD CONSTRAINT "pulse_conversations_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "pulse_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pulse_tickets" ADD CONSTRAINT "pulse_tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pulse_tickets" ADD CONSTRAINT "pulse_tickets_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "pulse_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pulse_operational_events" ADD CONSTRAINT "pulse_operational_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pulse_operational_events" ADD CONSTRAINT "pulse_operational_events_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "pulse_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pulse_operational_events" ADD CONSTRAINT "pulse_operational_events_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "pulse_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pulse_operational_events" ADD CONSTRAINT "pulse_operational_events_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "pulse_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pulse_playbooks" ADD CONSTRAINT "pulse_playbooks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pulse_knowledge_contexts" ADD CONSTRAINT "pulse_knowledge_contexts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pulse_skills" ADD CONSTRAINT "pulse_skills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "integration_settings" ADD CONSTRAINT "integration_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "execution_requests" ADD CONSTRAINT "execution_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
