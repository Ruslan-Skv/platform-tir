-- Backfill responsibleManagerId from formData.executor.signatoryCrmUserId
-- so "Мои" scope works even when responsibleManagerId wasn't explicitly stored.
UPDATE "contract_document_packages"
SET "responsibleManagerId" = NULLIF(
  TRIM("formData" #>> '{executor,signatoryCrmUserId}'),
  ''
)
WHERE "responsibleManagerId" IS NULL
  AND NULLIF(TRIM("formData" #>> '{executor,signatoryCrmUserId}'), '') IS NOT NULL;

