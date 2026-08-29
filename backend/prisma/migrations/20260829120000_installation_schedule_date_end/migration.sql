-- AlterTable
ALTER TABLE "installation_schedule_entries" ADD COLUMN "dateEnd" DATE;

-- CreateIndex
CREATE INDEX "installation_schedule_entries_dateEnd_idx" ON "installation_schedule_entries"("dateEnd");
