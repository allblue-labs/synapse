-- Billing core: commercial plans, admin feature flags, plan/module entitlements,
-- and a-la-carte module purchases.

CREATE TYPE "BillingPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED');
CREATE TYPE "ModulePurchaseStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED');

ALTER TABLE "BillingAccount" ALTER COLUMN "planKey" SET DEFAULT 'light';

CREATE TABLE "billing_plans" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "BillingPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "commercialFeatureFlag" TEXT,
    "requiredPublicModules" INTEGER NOT NULL DEFAULT 0,
    "entitlements" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_plan_module_entitlements" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_plan_module_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "module_purchases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" "ModulePurchaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_plans_key_key" ON "billing_plans"("key");
CREATE INDEX "billing_plans_status_displayName_idx" ON "billing_plans"("status", "displayName");

CREATE UNIQUE INDEX "billing_plan_module_entitlements_planId_moduleId_key" ON "billing_plan_module_entitlements"("planId", "moduleId");
CREATE INDEX "billing_plan_module_entitlements_moduleId_included_idx" ON "billing_plan_module_entitlements"("moduleId", "included");

CREATE UNIQUE INDEX "billing_feature_flags_key_key" ON "billing_feature_flags"("key");
CREATE INDEX "billing_feature_flags_enabled_key_idx" ON "billing_feature_flags"("enabled", "key");

CREATE UNIQUE INDEX "module_purchases_tenantId_moduleId_key" ON "module_purchases"("tenantId", "moduleId");
CREATE INDEX "module_purchases_tenantId_status_idx" ON "module_purchases"("tenantId", "status");
CREATE INDEX "module_purchases_moduleId_status_idx" ON "module_purchases"("moduleId", "status");

UPDATE "BillingAccount" SET "planKey" = 'light' WHERE "planKey" = 'starter';

INSERT INTO "billing_plans" ("id", "key", "displayName", "status", "commercialFeatureFlag", "requiredPublicModules", "entitlements", "metadata", "updatedAt")
VALUES
  ('billing_plan_light', 'light', 'Light', 'ACTIVE', 'billing.plan.light.commercial', 1, '{}', '{}', CURRENT_TIMESTAMP),
  ('billing_plan_pro', 'pro', 'Pro', 'ACTIVE', 'billing.plan.pro.commercial', 2, '{}', '{}', CURRENT_TIMESTAMP),
  ('billing_plan_premium', 'premium', 'Premium', 'ACTIVE', 'billing.plan.premium.commercial', 3, '{}', '{}', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "billing_feature_flags" ("id", "key", "enabled", "metadata", "updatedAt")
VALUES
  ('billing_flag_light_commercial', 'billing.plan.light.commercial', true, '{}', CURRENT_TIMESTAMP),
  ('billing_flag_pro_commercial', 'billing.plan.pro.commercial', false, '{}', CURRENT_TIMESTAMP),
  ('billing_flag_premium_commercial', 'billing.plan.premium.commercial', false, '{}', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_planKey_fkey" FOREIGN KEY ("planKey") REFERENCES "billing_plans"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "BillingAccount_planKey_status_idx" ON "BillingAccount"("planKey", "status");

ALTER TABLE "billing_plan_module_entitlements" ADD CONSTRAINT "billing_plan_module_entitlements_planId_fkey" FOREIGN KEY ("planId") REFERENCES "billing_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_plan_module_entitlements" ADD CONSTRAINT "billing_plan_module_entitlements_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "module_purchases" ADD CONSTRAINT "module_purchases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "module_purchases" ADD CONSTRAINT "module_purchases_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
