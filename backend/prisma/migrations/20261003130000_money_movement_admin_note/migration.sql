-- Примечание супер-админа к записи журнала ДП и признак «решено».
ALTER TABLE "money_movements" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "money_movements" ADD COLUMN "adminNoteResolvedAt" TIMESTAMP(3);
