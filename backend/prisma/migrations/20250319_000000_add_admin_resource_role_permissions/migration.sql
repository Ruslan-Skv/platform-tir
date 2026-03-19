-- CreateTable
CREATE TABLE "admin_resource_role_permissions" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_resource_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_resource_role_permissions_resourceId_idx" ON "admin_resource_role_permissions"("resourceId");

-- CreateIndex
CREATE INDEX "admin_resource_role_permissions_role_idx" ON "admin_resource_role_permissions"("role");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "admin_resource_role_permissions_resourceId_role_key" ON "admin_resource_role_permissions"("resourceId", "role");
