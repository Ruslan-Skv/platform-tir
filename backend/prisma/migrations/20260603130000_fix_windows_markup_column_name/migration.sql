-- Исправление имени колонки: в 20260603120000 ошибочно использован snake_case.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'contract_document_repair_settings'
      AND column_name = 'windows_work_order_markup_percent'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'contract_document_repair_settings'
      AND column_name = 'windowsWorkOrderMarkupPercent'
  ) THEN
    ALTER TABLE "contract_document_repair_settings"
    RENAME COLUMN "windows_work_order_markup_percent" TO "windowsWorkOrderMarkupPercent";
  END IF;
END $$;
