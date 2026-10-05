-- Ручная сверка наличных: супер-админ отмечает наличную оплату сверенной
-- (золотая галочка в журнале ДП). Наличные с банком не сверяются.
ALTER TABLE "money_movements" ADD COLUMN "cashReconciledAt" TIMESTAMP(3);
