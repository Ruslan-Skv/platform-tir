-- DropForeignKey
ALTER TABLE "contract_advances" DROP CONSTRAINT "contract_advances_contractId_fkey";

-- DropForeignKey
ALTER TABLE "contract_amendments" DROP CONSTRAINT "contract_amendments_contractId_fkey";

-- DropForeignKey
ALTER TABLE "contract_document_packages" DROP CONSTRAINT "contract_document_packages_crmContractId_fkey";

-- DropForeignKey
ALTER TABLE "contract_history" DROP CONSTRAINT "contract_history_changedById_fkey";

-- DropForeignKey
ALTER TABLE "contract_history" DROP CONSTRAINT "contract_history_contractId_fkey";

-- DropForeignKey
ALTER TABLE "contract_payments" DROP CONSTRAINT "contract_payments_contractId_fkey";

-- DropForeignKey
ALTER TABLE "contract_payments" DROP CONSTRAINT "contract_payments_managerId_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_complexObjectId_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_customerId_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_directionId_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_managerId_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_measurementId_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_officeId_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_surveyorId_fkey";

-- DropForeignKey
ALTER TABLE "furniture_schedule_projects" DROP CONSTRAINT "furniture_schedule_projects_contractId_fkey";

-- DropForeignKey
ALTER TABLE "installation_schedule_entries" DROP CONSTRAINT "installation_schedule_entries_contractId_fkey";

-- DropForeignKey
ALTER TABLE "repair_schedule_projects" DROP CONSTRAINT "repair_schedule_projects_contractId_fkey";

-- DropForeignKey
ALTER TABLE "waybill_tasks" DROP CONSTRAINT "waybill_tasks_contractId_fkey";

-- DropIndex
DROP INDEX "contract_document_packages_crmContractId_idx";

-- DropIndex
DROP INDEX "furniture_schedule_projects_contractId_idx";

-- DropIndex
DROP INDEX "installation_schedule_entries_contractId_idx";

-- DropIndex
DROP INDEX "repair_schedule_projects_contractId_idx";

-- DropIndex
DROP INDEX "waybill_tasks_contractId_idx";

-- AlterTable
ALTER TABLE "contract_document_package_versions" DROP COLUMN "crmContractId";

-- AlterTable
ALTER TABLE "contract_document_packages" DROP COLUMN "crmContractId";

-- AlterTable
ALTER TABLE "furniture_schedule_projects" DROP COLUMN "contractId";

-- AlterTable
ALTER TABLE "installation_schedule_entries" DROP COLUMN "contractId";

-- AlterTable
ALTER TABLE "installer_masters" ALTER COLUMN "directions" DROP DEFAULT;

-- AlterTable
ALTER TABLE "money_movements" DROP COLUMN "contractId";

-- AlterTable
ALTER TABLE "repair_schedule_projects" DROP COLUMN "contractId";

-- AlterTable
ALTER TABLE "waybill_tasks" DROP COLUMN "contractId";

-- DropTable
DROP TABLE "contract_advances";

-- DropTable
DROP TABLE "contract_amendments";

-- DropTable
DROP TABLE "contract_history";

-- DropTable
DROP TABLE "contract_payments";

-- DropTable
DROP TABLE "contracts";

-- RenameIndex
ALTER INDEX "contract_document_number_holds_managerUserId_directionId_releas" RENAME TO "contract_document_number_holds_managerUserId_directionId_re_idx";

