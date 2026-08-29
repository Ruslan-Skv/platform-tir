-- AlterTable
ALTER TABLE "installer_masters" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "installer_masters" ADD COLUMN IF NOT EXISTS "phones" TEXT[] DEFAULT ARRAY[]::TEXT[];
