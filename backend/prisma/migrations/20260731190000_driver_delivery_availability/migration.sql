-- CreateTable
CREATE TABLE IF NOT EXISTS "driver_delivery_availability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cycleAnchorDate" DATE NOT NULL,
    "cycleDays" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_delivery_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "driver_delivery_availability_userId_key" ON "driver_delivery_availability"("userId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "driver_delivery_availability"
    ADD CONSTRAINT "driver_delivery_availability_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
