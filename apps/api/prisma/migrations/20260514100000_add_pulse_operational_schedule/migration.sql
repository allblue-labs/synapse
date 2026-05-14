CREATE TABLE "pulse_operational_schedules" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "businessHours" JSONB NOT NULL DEFAULT '{}',
  "temporaryClosures" JSONB NOT NULL DEFAULT '[]',
  "holidayOverrides" JSONB NOT NULL DEFAULT '[]',
  "vacationPeriods" JSONB NOT NULL DEFAULT '[]',
  "operationalPause" BOOLEAN NOT NULL DEFAULT false,
  "pauseReason" TEXT,
  "closedMessage" TEXT,
  "nextOpeningAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pulse_operational_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pulse_operational_schedules_tenantId_key"
  ON "pulse_operational_schedules"("tenantId");

CREATE INDEX "pulse_operational_schedules_tenantId_operationalPause_nextOpeningAt_idx"
  ON "pulse_operational_schedules"("tenantId", "operationalPause", "nextOpeningAt");

ALTER TABLE "pulse_operational_schedules"
  ADD CONSTRAINT "pulse_operational_schedules_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
