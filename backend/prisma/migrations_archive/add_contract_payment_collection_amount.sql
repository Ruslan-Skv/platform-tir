-- Добавляет колонку collection_amount (инкассация) в contract_payments
-- Выполните: psql $DATABASE_URL -f prisma/migrations_archive/add_contract_payment_collection_amount.sql

ALTER TABLE "contract_payments"
ADD COLUMN IF NOT EXISTS "collectionAmount" DECIMAL(12,2);
