-- Rename the first product module persistence surface to Pulse.
-- This preserves existing entry data while aligning API/module naming to slug `pulse`.

ALTER TYPE "ClinicFlowStatus" RENAME TO "PulseStatus";

ALTER TABLE "clinic_flow_entries" RENAME TO "pulse_entries";
ALTER TABLE "pulse_entries" RENAME CONSTRAINT "clinic_flow_entries_pkey" TO "pulse_entries_pkey";
ALTER TABLE "pulse_entries" RENAME CONSTRAINT "clinic_flow_entries_tenantId_fkey" TO "pulse_entries_tenantId_fkey";

ALTER INDEX "clinic_flow_entries_tenantId_status_idx" RENAME TO "pulse_entries_tenantId_status_idx";
ALTER INDEX "clinic_flow_entries_tenantId_createdAt_idx" RENAME TO "pulse_entries_tenantId_createdAt_idx";
