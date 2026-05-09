ALTER TABLE "module_catalog_items"
  ADD COLUMN "storeVisible" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "module_catalog_items_storeVisible_active_visibility_idx"
  ON "module_catalog_items"("storeVisible", "active", "visibility");
