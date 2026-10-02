-- Банк: «тип зачисления» → «способ оплаты» в терминологии ДП.
-- Значения приводятся к трём: TERMINAL_QR (терминал, СБП, QR), INVOICE_PAYMENT, LC_TRANSFER.
-- Enum в Postgres нельзя изменить — пересоздаём тип с маппингом старых значений.

CREATE TYPE "BankEntryType_new" AS ENUM ('TERMINAL_QR', 'INVOICE_PAYMENT', 'LC_TRANSFER');

ALTER TABLE "bank_entries" ALTER COLUMN "entryType" DROP DEFAULT;
ALTER TABLE "bank_entries" ALTER COLUMN "entryType" TYPE "BankEntryType_new" USING (
  CASE "entryType"::text
    WHEN 'ACQUIRING' THEN 'TERMINAL_QR'
    WHEN 'SBP' THEN 'TERMINAL_QR'
    WHEN 'DEPOSIT' THEN 'INVOICE_PAYMENT'
    WHEN 'PERSONAL_CARD' THEN 'LC_TRANSFER'
    ELSE "entryType"::text
  END::"BankEntryType_new"
);

DROP TYPE "BankEntryType";
ALTER TYPE "BankEntryType_new" RENAME TO "BankEntryType";
