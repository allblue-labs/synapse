-- CreateEnum
CREATE TYPE "PulseActionExecutionStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "pulse_action_executions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "ticketId" TEXT,
    "conversationId" TEXT,
    "status" "PulseActionExecutionStatus" NOT NULL DEFAULT 'STARTED',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pulse_action_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pulse_action_executions_tenantId_idempotencyKey_key" ON "pulse_action_executions"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "pulse_action_executions_tenantId_status_updatedAt_idx" ON "pulse_action_executions"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "pulse_action_executions_tenantId_ticketId_updatedAt_idx" ON "pulse_action_executions"("tenantId", "ticketId", "updatedAt");

-- CreateIndex
CREATE INDEX "pulse_action_executions_tenantId_action_status_idx" ON "pulse_action_executions"("tenantId", "action", "status");

-- AddForeignKey
ALTER TABLE "pulse_action_executions" ADD CONSTRAINT "pulse_action_executions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
