-- Ручная сверка теперь не только для наличных: переводы на ЛК (LC_TRANSFER)
-- исключены из банковской сверки и сверяются супер-админом так же вручную.
-- Колонка переименована соответственно.
ALTER TABLE "money_movements" RENAME COLUMN "cashReconciledAt" TO "manualReconciledAt";
