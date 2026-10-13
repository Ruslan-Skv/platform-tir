-- Бэкфилл признаков подписания по уже подписанным (SIGNED) сессиям ЭП.
--
-- Автосохранение редактора пакета перезаписывало formData целиком устаревшей
-- формой и могло затереть то, что записал ЭП-флоу: contractConcludedAt,
-- статусы Д/с и отметки актов — при этом сессия в contract_document_signing_sessions
-- оставалась подписанной. Подпись заказчика — первоисточник, восстанавливаем по ней:
--
-- - договор: contractConcludedAt (если пусто) и статус CONTRACT_CONCLUDED (с IN_PROGRESS);
-- - Д/с №N: слот возвращается в SIGNED с датой подписи сессии (если слот OPEN);
-- - акты: дата (по Москве, как в ЭП-флоу) и подписанная копия (если дата пуста);
--   для акта сдачи-приёмки — признаки закрытия договора.
--
-- Значения не перезаписываются, если уже заполнены; сессии обрабатываются по
-- возрастанию даты подписи — как это делал бы ЭП-флоу (первая подпись фиксируется).
DO $$
DECLARE
  doc RECORD;
  f JSONB;
  pkg_status TEXT;
  new_status TEXT;
  ordinal INT;
  signed_iso TEXT;
  signed_date TEXT;
  changed BOOLEAN;
BEGIN
  FOR doc IN
    SELECT
      ss."packageId" AS package_id,
      ss."signedAt" AS signed_at,
      d->>'tabId' AS tab_id,
      d->>'signedFileUrl' AS signed_file_url,
      d->>'unsignedAttachment' AS unsigned_attachment
    FROM "contract_document_signing_sessions" ss
    CROSS JOIN LATERAL jsonb_array_elements(ss."documents") AS d
    WHERE ss."status" = 'SIGNED'
      AND ss."documents" IS NOT NULL
    ORDER BY ss."signedAt" ASC
  LOOP
    IF doc.tab_id IS NULL OR doc.unsigned_attachment = 'true' THEN
      CONTINUE;
    END IF;

    signed_iso := to_char(doc.signed_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    -- Дата акта — по московскому времени (аналог moscowDateOnly в ЭП-флоу, UTC+3).
    signed_date := to_char(doc.signed_at + INTERVAL '3 hours', 'YYYY-MM-DD');
    changed := FALSE;
    new_status := NULL;

    SELECT p."formData", p."status"::text INTO f, pkg_status
    FROM "contract_document_packages" p
    WHERE p.id = doc.package_id;
    IF f IS NULL THEN
      CONTINUE;
    END IF;

    IF doc.tab_id = 'contract' THEN
      IF COALESCE(btrim(f->>'contractConcludedAt'), '') = '' THEN
        f := jsonb_set(f, '{contractConcludedAt}', to_jsonb(signed_iso), true);
        changed := TRUE;
      END IF;
      IF pkg_status = 'IN_PROGRESS' THEN
        new_status := 'CONTRACT_CONCLUDED';
      END IF;
    ELSIF doc.tab_id ~ '^addendum[1-5]$' THEN
      ordinal := substring(doc.tab_id FROM 'addendum([1-5])')::int;
      IF jsonb_typeof(f->'addendumSlots') = 'array'
        AND f->'addendumSlots'->(ordinal - 1) IS NOT NULL
        AND f->'addendumSlots'->(ordinal - 1)->>'status' = 'OPEN'
      THEN
        f := jsonb_set(
          f,
          ARRAY['addendumSlots', (ordinal - 1)::text],
          f->'addendumSlots'->(ordinal - 1)
            || jsonb_build_object('status', 'SIGNED', 'signedAt', signed_iso, 'paidAt', ''),
          false
        );
        changed := TRUE;
      END IF;
    ELSIF doc.tab_id = 'actStart' THEN
      IF COALESCE(btrim(f->>'repairWorkStartActSignedAt'), '') = '' THEN
        f := jsonb_set(f, '{repairWorkStartActSignedAt}', to_jsonb(signed_date), true);
        IF COALESCE(doc.signed_file_url, '') <> '' THEN
          f := jsonb_set(f, '{repairWorkStartActPhotoUrl}', to_jsonb(doc.signed_file_url), true);
        END IF;
        changed := TRUE;
      END IF;
    ELSIF doc.tab_id = 'actAcceptance' THEN
      IF COALESCE(btrim(f->>'repairContractCloseActSignedAt'), '') = '' THEN
        f := jsonb_set(f, '{repairContractCloseActSignedAt}', to_jsonb(signed_date), true);
        IF COALESCE(doc.signed_file_url, '') <> '' THEN
          f := jsonb_set(
            f,
            '{repairContractCloseActPhotoUrl}',
            to_jsonb(doc.signed_file_url),
            true
          );
        END IF;
        f := jsonb_set(f, '{repairContractClosed}', 'true'::jsonb, true);
        f := jsonb_set(f, '{contractClosed}', 'true'::jsonb, true);
        changed := TRUE;
      END IF;
    END IF;

    IF changed OR new_status IS NOT NULL THEN
      UPDATE "contract_document_packages" p
      SET
        "formData" = f,
        "status" = COALESCE(new_status::"ContractDocumentPackageStatus", p."status")
      WHERE p.id = doc.package_id;
    END IF;
  END LOOP;
END $$;
