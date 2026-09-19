-- Инкассация наличных менеджером (сдача выручки по журналу ДП).
CREATE TABLE "manager_incassations" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "incassator" VARCHAR(500) NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_incassations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE INDEX "manager_incassations_managerId_idx" ON "manager_incassations"("managerId");
CREATE INDEX "manager_incassations_performedAt_idx" ON "manager_incassations"("performedAt");

-- AddForeignKey
ALTER TABLE "manager_incassations" ADD CONSTRAINT "manager_incassations_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manager_incassations" ADD CONSTRAINT "manager_incassations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
