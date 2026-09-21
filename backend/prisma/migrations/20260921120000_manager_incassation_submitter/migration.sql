-- Менеджер, фактически сдавший инкассацию (когда один менеджер сдаёт за другого).
ALTER TABLE "manager_incassations" ADD COLUMN "submitterId" TEXT;

-- AddForeignKey
ALTER TABLE "manager_incassations" ADD CONSTRAINT "manager_incassations_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
