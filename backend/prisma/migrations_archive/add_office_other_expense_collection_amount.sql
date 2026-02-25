-- Добавляет колонку collection_amount (инкассация) в office_other_expenses
-- Выполните: psql $DATABASE_URL -f prisma/migrations_archive/add_office_other_expense_collection_amount.sql

ALTER TABLE "office_other_expenses"
ADD COLUMN IF NOT EXISTS "collectionAmount" DECIMAL(12,2);
