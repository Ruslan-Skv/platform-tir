-- Optional link from installer master to User (bell notifications when set).
ALTER TABLE "installer_masters" ADD COLUMN "userId" TEXT;

CREATE INDEX "installer_masters_userId_idx" ON "installer_masters"("userId");

ALTER TABLE "installer_masters" ADD CONSTRAINT "installer_masters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
