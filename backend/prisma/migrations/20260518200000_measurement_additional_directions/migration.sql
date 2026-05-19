-- CreateTable
CREATE TABLE "measurement_additional_directions" (
    "measurementId" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurement_additional_directions_pkey" PRIMARY KEY ("measurementId","directionId")
);

-- CreateIndex
CREATE INDEX "measurement_additional_directions_measurementId_idx" ON "measurement_additional_directions"("measurementId");

-- AddForeignKey
ALTER TABLE "measurement_additional_directions" ADD CONSTRAINT "measurement_additional_directions_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "measurements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_additional_directions" ADD CONSTRAINT "measurement_additional_directions_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "crm_directions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
