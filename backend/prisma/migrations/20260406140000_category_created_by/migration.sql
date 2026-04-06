-- AlterTable
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_createdById_fkey'
  ) THEN
    ALTER TABLE "categories" ADD CONSTRAINT "categories_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
