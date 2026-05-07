-- Persist the module registry/store and per-tenant module installation state.

CREATE TYPE "ModuleCatalogStatus" AS ENUM ('DRAFT', 'PUBLIC', 'PRIVATE', 'DISABLED');
CREATE TYPE "TenantModuleStatus" AS ENUM ('ENABLED', 'DISABLED');

CREATE TABLE "module_catalog_items" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ModuleCatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "events" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_catalog_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_module_installations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" "TenantModuleStatus" NOT NULL DEFAULT 'DISABLED',
    "config" JSONB NOT NULL DEFAULT '{}',
    "enabledAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_module_installations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "module_catalog_items_slug_key" ON "module_catalog_items"("slug");
CREATE INDEX "module_catalog_items_status_displayName_idx" ON "module_catalog_items"("status", "displayName");

CREATE UNIQUE INDEX "tenant_module_installations_tenantId_moduleId_key" ON "tenant_module_installations"("tenantId", "moduleId");
CREATE INDEX "tenant_module_installations_tenantId_status_idx" ON "tenant_module_installations"("tenantId", "status");
CREATE INDEX "tenant_module_installations_moduleId_status_idx" ON "tenant_module_installations"("moduleId", "status");

ALTER TABLE "tenant_module_installations" ADD CONSTRAINT "tenant_module_installations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_module_installations" ADD CONSTRAINT "tenant_module_installations_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
