'use client';

import { useEffect, useState } from 'react';

import {
  type ContractDocumentPackageKind,
  getContractDocumentExecutorProfiles,
  getContractDocumentPackage,
  getContractDocumentTemplatePresets,
} from '@/shared/api/admin-contract-document-packages';
import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import { isProductDirectionPackageKind } from '@/views/admin/ContractDocuments/packages/config/productDirectionPackageKind';
import { mergeFormDataFromStorage } from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import { formWithExecutorProfileSync } from '@/views/admin/ContractDocuments/packages/platform/form/packageEditorProfileFields';
import { PackageInvoicesModal } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageInvoicesModal';

type PackageInvoicesModalLoaderProps = {
  packageId: string;
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onInvoicesChanged?: () => void;
};

/**
 * Загружает данные пакета для модалки счетов из раздела бухгалтерии.
 * Модалка рендерится сразу (с «Загрузка…») и не размонтируется при закрытии —
 * чтобы анимации открытия/закрытия Dialog отыгрывались плавно.
 */
export function PackageInvoicesModalLoader({
  packageId,
  isOpen,
  onClose,
  onError,
  onInvoicesChanged,
}: PackageInvoicesModalLoaderProps) {
  const [ready, setReady] = useState(false);
  const [packageKind, setPackageKind] = useState<ContractDocumentPackageKind>('REPAIR');
  const [form, setForm] = useState(() => mergeFormDataFromStorage({}).form);
  const [templateOverrides, setTemplateOverrides] = useState({});
  const [selectedTemplateIds, setSelectedTemplateIds] = useState({});
  const [presets, setPresets] = useState<ContractTemplatePreset[]>([]);

  useEffect(() => {
    if (!isOpen || !packageId) return;
    let cancelled = false;
    setReady(false);
    void (async () => {
      try {
        const row = await getContractDocumentPackage(packageId);
        const presetsKind: ContractDocumentPackageKind = isProductDirectionPackageKind(row.kind)
          ? row.kind
          : 'REPAIR';
        const [presetsRes, profilesRes] = await Promise.all([
          getContractDocumentTemplatePresets(presetsKind),
          // Реквизиты исполнителя — дефолтный вариант из справочника.
          getContractDocumentExecutorProfiles('REPAIR').catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        const merged = mergeFormDataFromStorage(row.formData);
        setPackageKind(presetsKind);
        setForm(formWithExecutorProfileSync(merged.form, profilesRes.items ?? [], row.status));
        setTemplateOverrides(merged.templateOverrides);
        setSelectedTemplateIds(merged.templatePresetIds);
        setPresets(presetsRes.items ?? []);
        setReady(true);
      } catch (e) {
        if (!cancelled) onError(e instanceof Error ? e.message : 'Не удалось загрузить договор');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, packageId, onError]);

  return (
    <PackageInvoicesModal
      packageId={packageId}
      packageKind={packageKind}
      form={form}
      isOpen={isOpen}
      preparing={!ready}
      onClose={onClose}
      onError={onError}
      onInvoicesChanged={onInvoicesChanged}
      contractTemplatePresets={presets}
      templateOverrides={templateOverrides}
      selectedTemplateIds={selectedTemplateIds}
    />
  );
}
