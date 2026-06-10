'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type CrmCustomerDetail, getCrmCustomer } from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/AddCrmCustomerModal.module.css';
import {
  type PackageManagerQuestionnaire1Block,
  defaultPackageFormData,
} from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import { PackageManagerQuestionnaire1Tab } from '@/views/admin/ContractDocuments/packages/platform/hub/PackageManagerQuestionnaire1Tab';
import { mergePackageFormFromCrmCustomerDetail } from '@/views/admin/ContractDocuments/packages/platform/questionnaires/applyCrmContractToForm';
import {
  persistManagerQuestionnaire1ToCrmCustomer,
  readManagerQuestionnaire1FromCrmDetail,
} from '@/views/admin/ContractDocuments/packages/platform/questionnaires/crmManagerQuestionnaire1';

const MQ1_CRM_SAVE_DEBOUNCE_MS = 400;

export type CrmCustomerManagerQuestionnaire1ModalProps = {
  customerId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

export function CrmCustomerManagerQuestionnaire1Modal({
  customerId,
  isOpen,
  onClose,
  onUpdated,
}: CrmCustomerManagerQuestionnaire1ModalProps) {
  const [detail, setDetail] = useState<CrmCustomerDetail | null>(null);
  const [questionnaire, setQuestionnaire] = useState<PackageManagerQuestionnaire1Block>(
    () => defaultPackageFormData().managerQuestionnaire1
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveDebounceRef = useRef<number | null>(null);
  const detailRef = useRef<CrmCustomerDetail | null>(null);
  detailRef.current = detail;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getCrmCustomer(customerId);
      setDetail(row);
      setQuestionnaire(readManagerQuestionnaire1FromCrmDetail(row));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить анкету');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (!isOpen || !customerId) return;
    void load();
  }, [isOpen, customerId, load]);

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current !== null) {
        window.clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  const formForTab = useMemo(() => {
    const base = detail
      ? mergePackageFormFromCrmCustomerDetail(detail, defaultPackageFormData())
      : defaultPackageFormData();
    return { ...base, managerQuestionnaire1: questionnaire };
  }, [detail, questionnaire]);

  const scheduleSave = useCallback(
    (nextBlock: PackageManagerQuestionnaire1Block) => {
      if (saveDebounceRef.current !== null) {
        window.clearTimeout(saveDebounceRef.current);
      }
      saveDebounceRef.current = window.setTimeout(() => {
        saveDebounceRef.current = null;
        setSaving(true);
        setSaveError(null);
        void persistManagerQuestionnaire1ToCrmCustomer(
          customerId,
          nextBlock,
          detailRef.current ?? undefined
        )
          .then(() => {
            onUpdated?.();
          })
          .catch((e) => {
            setSaveError(e instanceof Error ? e.message : 'Не удалось сохранить анкету');
          })
          .finally(() => {
            setSaving(false);
          });
      }, MQ1_CRM_SAVE_DEBOUNCE_MS);
    },
    [customerId, onUpdated]
  );

  const onPatch = useCallback(
    (patch: Partial<PackageManagerQuestionnaire1Block>) => {
      setQuestionnaire((prev) => {
        const next = { ...prev, ...patch };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const onToggleTrafficSource = useCallback(
    (id: string) => {
      setQuestionnaire((prev) => {
        const ids = [...prev.trafficSourceCheckedIds];
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(id);
        const next = { ...prev, trafficSourceCheckedIds: ids };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const onToggleWhyChosen = useCallback(
    (id: string) => {
      setQuestionnaire((prev) => {
        const ids = [...prev.whyChosenCheckedIds];
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(id);
        const next = { ...prev, whyChosenCheckedIds: ids };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const onToggleClientNeed = useCallback(
    (id: string) => {
      setQuestionnaire((prev) => {
        const ids = [...prev.clientNeedsCheckedIds];
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(id);
        const next = { ...prev, clientNeedsCheckedIds: ids };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Анкета (опросник)"
      size="lg"
      className={crmFormStyles.modalPanel}
      showCloseButton
    >
      {loading ? <p data-modal-form-hint>Загрузка…</p> : null}
      {error ? <p data-modal-form-error>{error}</p> : null}
      {!loading && !error ? (
        <div data-modal-form data-modal-density="compact">
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Общая анкета клиента: изменения сохраняются в карточке CRM и автоматически подставляются
            во все договоры этого заказчика. Поля можно редактировать в любое время.
          </p>
          {saving ? <p data-modal-form-hint>Сохранение…</p> : null}
          {saveError ? <p data-modal-form-error>{saveError}</p> : null}
          <PackageManagerQuestionnaire1Tab
            form={formForTab}
            onPatch={onPatch}
            onToggleTrafficSource={onToggleTrafficSource}
            onToggleWhyChosen={onToggleWhyChosen}
            onToggleClientNeed={onToggleClientNeed}
            syncSourceLabel="crm"
          />
        </div>
      ) : null}
    </Modal>
  );
}
