-- Создание типа и добавление колонки "Способ оплаты" в журнал авансов мастеров.
-- Nullable: у записей, выданных до появления поля, способ не указан.
CREATE TYPE "InstallerAdvancePaymentMethod" AS ENUM ('CASH', 'BANK');

-- AddColumn
ALTER TABLE "contract_document_package_installer_advances" ADD COLUMN "paymentMethod" "InstallerAdvancePaymentMethod";
