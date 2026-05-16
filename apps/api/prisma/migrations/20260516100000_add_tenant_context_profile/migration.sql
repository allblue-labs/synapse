-- Synapse-owned tenant context profile foundation.
-- This is global tenant operational context, not module onboarding.

CREATE TYPE "TenantContextProfileStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'AWAITING_VALIDATION',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "TenantContextQuestionMode" AS ENUM (
  'LLM',
  'MANUAL_FORM'
);

CREATE TYPE "TenantContextSummaryStatus" AS ENUM (
  'GENERATED',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE "tenant_context_profiles" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "status" "TenantContextProfileStatus" NOT NULL DEFAULT 'PENDING',
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "activeVersionNumber" INTEGER,
  "completedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectedByUserId" TEXT,
  "rejectionReason" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_context_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_context_profile_versions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "contract" JSONB NOT NULL,
  "business" JSONB NOT NULL,
  "communication" JSONB NOT NULL,
  "operational" JSONB NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_context_profile_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_context_drafts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "mode" "TenantContextQuestionMode" NOT NULL DEFAULT 'LLM',
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "answers" JSONB NOT NULL DEFAULT '{}',
  "currentQuestion" TEXT,
  "progress" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_context_drafts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_context_answers" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "questionKey" TEXT NOT NULL,
  "answer" JSONB NOT NULL,
  "normalized" JSONB,
  "mode" "TenantContextQuestionMode" NOT NULL DEFAULT 'LLM',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "actorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_context_answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_context_summaries" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "versionId" TEXT,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "summary" JSONB NOT NULL,
  "contractDraft" JSONB NOT NULL,
  "status" "TenantContextSummaryStatus" NOT NULL DEFAULT 'GENERATED',
  "generatedBy" TEXT NOT NULL DEFAULT 'internal',
  "actorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_context_summaries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_context_profiles_tenantId_key" ON "tenant_context_profiles"("tenantId");
CREATE INDEX "tenant_context_profiles_tenantId_status_updatedAt_idx" ON "tenant_context_profiles"("tenantId", "status", "updatedAt");

CREATE UNIQUE INDEX "tenant_context_profile_versions_profileId_versionNumber_key" ON "tenant_context_profile_versions"("profileId", "versionNumber");
CREATE INDEX "tenant_context_profile_versions_tenantId_versionNumber_idx" ON "tenant_context_profile_versions"("tenantId", "versionNumber");

CREATE UNIQUE INDEX "tenant_context_drafts_profileId_key" ON "tenant_context_drafts"("profileId");
CREATE INDEX "tenant_context_drafts_tenantId_updatedAt_idx" ON "tenant_context_drafts"("tenantId", "updatedAt");

CREATE UNIQUE INDEX "tenant_context_answers_profileId_questionKey_key" ON "tenant_context_answers"("profileId", "questionKey");
CREATE INDEX "tenant_context_answers_tenantId_profileId_updatedAt_idx" ON "tenant_context_answers"("tenantId", "profileId", "updatedAt");

CREATE INDEX "tenant_context_summaries_tenantId_profileId_createdAt_idx" ON "tenant_context_summaries"("tenantId", "profileId", "createdAt");
CREATE INDEX "tenant_context_summaries_profileId_status_createdAt_idx" ON "tenant_context_summaries"("profileId", "status", "createdAt");

ALTER TABLE "tenant_context_profiles"
  ADD CONSTRAINT "tenant_context_profiles_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_context_profile_versions"
  ADD CONSTRAINT "tenant_context_profile_versions_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_context_profile_versions"
  ADD CONSTRAINT "tenant_context_profile_versions_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "tenant_context_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_context_drafts"
  ADD CONSTRAINT "tenant_context_drafts_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_context_drafts"
  ADD CONSTRAINT "tenant_context_drafts_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "tenant_context_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_context_answers"
  ADD CONSTRAINT "tenant_context_answers_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_context_answers"
  ADD CONSTRAINT "tenant_context_answers_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "tenant_context_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_context_summaries"
  ADD CONSTRAINT "tenant_context_summaries_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_context_summaries"
  ADD CONSTRAINT "tenant_context_summaries_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "tenant_context_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_context_summaries"
  ADD CONSTRAINT "tenant_context_summaries_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "tenant_context_profile_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
