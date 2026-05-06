-- Migration: add AuditEvent (append-only security ledger)
--
-- Additive only:
--   - new enum: "AuditStatus"
--   - new table: "AuditEvent"
--   - new indexes on (tenantId, createdAt), (actorUserId, createdAt), (action, createdAt)
--
-- No existing tables, columns, or rows are touched. Safe to apply with
-- `prisma migrate deploy` against any environment that already holds the
-- baseline.

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id"           TEXT          NOT NULL,
    "tenantId"     TEXT,
    "actorUserId"  TEXT,
    "action"       TEXT          NOT NULL,
    "resourceType" TEXT,
    "resourceId"   TEXT,
    "status"       "AuditStatus" NOT NULL DEFAULT 'SUCCESS',
    "ipAddress"    TEXT,
    "userAgent"    TEXT,
    "requestId"    TEXT,
    "metadata"     JSONB,
    "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_createdAt_idx"    ON "AuditEvent"("tenantId",    "createdAt");
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent"("actorUserId", "createdAt");
CREATE INDEX "AuditEvent_action_createdAt_idx"      ON "AuditEvent"("action",      "createdAt");

-- AddForeignKey (SetNull on tenant deletion — keep the audit trail even
-- after the tenant goes away, but null the link so we can't accidentally
-- access a deleted parent).
ALTER TABLE "AuditEvent"
    ADD CONSTRAINT "AuditEvent_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
