-- Operational usage metering ledger.

CREATE TYPE "UsageMetricType" AS ENUM (
  'AI_CALL',
  'AUDIO_TRANSCRIPTION',
  'WORKFLOW_RUN',
  'STORAGE',
  'MESSAGE',
  'AUTOMATION_EXECUTION'
);

CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleSlug" TEXT,
    "metricType" "UsageMetricType" NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "idempotencyKey" TEXT,
    "billingPeriod" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usage_events_tenantId_idempotencyKey_key" ON "usage_events"("tenantId", "idempotencyKey");
CREATE INDEX "usage_events_tenantId_billingPeriod_metricType_idx" ON "usage_events"("tenantId", "billingPeriod", "metricType");
CREATE INDEX "usage_events_tenantId_moduleSlug_occurredAt_idx" ON "usage_events"("tenantId", "moduleSlug", "occurredAt");

ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
