-- Связь договора расчёта з/п с пакетом договора (contract-documents):
-- записи, созданные автоматической синхронизацией, ссылаются на исходный пакет.
ALTER TABLE "salary_contracts" ADD COLUMN "sourcePackageId" TEXT;
CREATE UNIQUE INDEX "salary_contracts_sourcePackageId_key" ON "salary_contracts"("sourcePackageId");
