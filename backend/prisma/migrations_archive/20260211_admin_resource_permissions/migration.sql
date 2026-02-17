-- CreateTable
CREATE TABLE "admin_resource_permissions" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_resource_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_resource_permissions_resourceId_idx" ON "admin_resource_permissions"("resourceId");

-- CreateIndex
CREATE INDEX "admin_resource_permissions_userId_idx" ON "admin_resource_permissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_resource_permissions_resourceId_userId_key" ON "admin_resource_permissions"("resourceId", "userId");

-- AddForeignKey
ALTER TABLE "admin_resource_permissions" ADD CONSTRAINT "admin_resource_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
