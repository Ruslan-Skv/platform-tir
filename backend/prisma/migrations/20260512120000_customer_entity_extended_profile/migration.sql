-- AlterTable
ALTER TABLE "customers" ADD COLUMN "entity_type" VARCHAR(32),
ADD COLUMN "extended_profile" JSONB;
