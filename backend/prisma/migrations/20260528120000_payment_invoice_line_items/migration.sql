-- AlterTable
ALTER TABLE "contract_document_payment_invoices" ADD COLUMN "lineItems" JSONB NOT NULL DEFAULT '[]';
