-- AlterTable
ALTER TABLE "installation_schedule_entries" ADD COLUMN "contactPersons" JSONB NOT NULL DEFAULT '[]';
