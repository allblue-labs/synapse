-- Stripe usage reporting state. Stripe meter events are sent from rated
-- aggregate snapshots and each aggregate has at most one report record.

CREATE TYPE "UsageStripeReportStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "usage_stripe_meters" (
    "id" TEXT NOT NULL,
    "metricType" "UsageMetricType" NOT NULL,
    "unit" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripeEventName" TEXT NOT NULL,
    "valueMultiplier" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_stripe_meters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_stripe_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "status" "UsageStripeReportStatus" NOT NULL,
    "stripeEventName" TEXT,
    "stripeIdentifier" TEXT,
    "stripeCustomerId" TEXT,
    "value" INTEGER,
    "errorMessage" TEXT,
    "reportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_stripe_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usage_stripe_meters_metricType_unit_currency_key" ON "usage_stripe_meters"("metricType", "unit", "currency");
CREATE INDEX "usage_stripe_meters_active_metricType_idx" ON "usage_stripe_meters"("active", "metricType");

CREATE UNIQUE INDEX "usage_stripe_reports_aggregateId_key" ON "usage_stripe_reports"("aggregateId");
CREATE UNIQUE INDEX "usage_stripe_reports_stripeIdentifier_key" ON "usage_stripe_reports"("stripeIdentifier");
CREATE INDEX "usage_stripe_reports_tenantId_status_createdAt_idx" ON "usage_stripe_reports"("tenantId", "status", "createdAt");

ALTER TABLE "usage_stripe_reports" ADD CONSTRAINT "usage_stripe_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_stripe_reports" ADD CONSTRAINT "usage_stripe_reports_aggregateId_fkey" FOREIGN KEY ("aggregateId") REFERENCES "usage_period_aggregates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
