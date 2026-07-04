-- AlterTable
ALTER TABLE "mission_page_block" ADD COLUMN "introText" TEXT;

UPDATE "mission_page_block"
SET "introText" = 'Создавать надёжные интерьерные решения «под ключ» — от отделки до мебели — на принципах честности, открытости и ответственности, чтобы людям было спокойно и удобно в собственном доме.'
WHERE "id" = 'main';
