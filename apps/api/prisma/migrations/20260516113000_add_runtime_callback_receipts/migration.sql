-- Synapse-owned replay/idempotency ledger for Runtime callbacks.
-- Runtime callbacks terminate in Synapse core, not module HTTP controllers.

CREATE TYPE "RuntimeCallbackReceiptStatus" AS ENUM (
  'RECEIVED',
  'PROCESSED',
  'FAILED'
);

CREATE TABLE "runtime_callback_receipts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "executionRequestId" TEXT NOT NULL,
  "callbackKey" TEXT NOT NULL,
  "status" "RuntimeCallbackReceiptStatus" NOT NULL DEFAULT 'RECEIVED',
  "signatureKeyId" TEXT NOT NULL,
  "signatureTimestamp" TIMESTAMP(3) NOT NULL,
  "signatureHash" TEXT NOT NULL,
  "bodyHash" TEXT NOT NULL,
  "resultStatus" "ExecutionStatus" NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "replayCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "runtime_callback_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "runtime_callback_receipts_callbackKey_key"
  ON "runtime_callback_receipts"("callbackKey");

CREATE INDEX "runtime_callback_receipts_tenantId_executionRequestId_receivedAt_idx"
  ON "runtime_callback_receipts"("tenantId", "executionRequestId", "receivedAt");

CREATE INDEX "runtime_callback_receipts_tenantId_status_receivedAt_idx"
  ON "runtime_callback_receipts"("tenantId", "status", "receivedAt");

ALTER TABLE "runtime_callback_receipts"
  ADD CONSTRAINT "runtime_callback_receipts_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "runtime_callback_receipts"
  ADD CONSTRAINT "runtime_callback_receipts_executionRequestId_fkey"
  FOREIGN KEY ("executionRequestId") REFERENCES "execution_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
