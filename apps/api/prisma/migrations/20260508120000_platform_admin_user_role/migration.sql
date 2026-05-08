ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole";

CREATE INDEX "User_platformRole_idx" ON "User"("platformRole");
