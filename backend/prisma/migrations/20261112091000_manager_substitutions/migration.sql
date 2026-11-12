-- Подмена менеджера на период отпуска или длительного больничного:
-- создаёт супер-админ вручную. В период подмены з/п по договорам
-- отсутствующего менеджера и его личные продажи по платежам ДП
-- начисляются подменяющему.
CREATE TABLE "manager_substitutions" (
    "id" TEXT NOT NULL,
    "absentManagerId" TEXT NOT NULL,
    "substituteManagerId" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "comment" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE INDEX "manager_substitutions_absentManagerId_idx" ON "manager_substitutions"("absentManagerId");
CREATE INDEX "manager_substitutions_substituteManagerId_idx" ON "manager_substitutions"("substituteManagerId");
CREATE INDEX "manager_substitutions_dateFrom_idx" ON "manager_substitutions"("dateFrom");
CREATE INDEX "manager_substitutions_dateTo_idx" ON "manager_substitutions"("dateTo");

-- AddForeignKey
ALTER TABLE "manager_substitutions" ADD CONSTRAINT "manager_substitutions_absentManagerId_fkey" FOREIGN KEY ("absentManagerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manager_substitutions" ADD CONSTRAINT "manager_substitutions_substituteManagerId_fkey" FOREIGN KEY ("substituteManagerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manager_substitutions" ADD CONSTRAINT "manager_substitutions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
