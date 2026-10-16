-- Начальный остаток кассы (центра): тип записи кассы MANUAL | OPENING.
-- OPENING — якорь остатков центральной кассы: фиксируется супер-админом,
-- в обороты периода не входит, в остатки на дату — входит.

-- AlterTable
ALTER TABLE "cash_book_entries" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "cash_book_entries_kind_idx" ON "cash_book_entries"("kind");
