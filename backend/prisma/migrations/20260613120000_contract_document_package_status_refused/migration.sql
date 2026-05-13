-- Добавить стадию «Отказ» для пакета документов (ремонт и др.).
ALTER TYPE "ContractDocumentPackageStatus" ADD VALUE 'REFUSED';
