-- Usage rate cards and billing-period aggregate snapshots.

CREATE TABLE "usage_rates" (
    "id" TEXT NOT NULL,
    "metricType" "UsageMetricType" NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPriceCents" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_rates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_period_aggregates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "metricType" "UsageMetricType" NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "events" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "unitPriceCents" DECIMAL(18,6),
    "amountCents" DECIMAL(18,6),
    "rated" BOOLEAN NOT NULL DEFAULT false,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_period_aggregates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usage_rates_metricType_unit_currency_key" ON "usage_rates"("metricType", "unit", "currency");
CREATE INDEX "usage_rates_active_metricType_idx" ON "usage_rates"("active", "metricType");

CREATE UNIQUE INDEX "usage_period_aggregates_tenantId_billingPeriod_metricType_unit_currency_key" ON "usage_period_aggregates"("tenantId", "billingPeriod", "metricType", "unit", "currency");
CREATE INDEX "usage_period_aggregates_tenantId_billingPeriod_idx" ON "usage_period_aggregates"("tenantId", "billingPeriod");

ALTER TABLE "usage_period_aggregates" ADD CONSTRAINT "usage_period_aggregates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
