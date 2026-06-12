'use client';

import { useEffect, useState } from 'react';

import {
  type ContractDocumentPackageKind,
  getContractDocumentPackage,
  getContractDocumentTemplatePresets,
} from '@/shared/api/admin-contract-document-packages';
import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import { isProductDirectionPackageKind } from '@/views/admin/ContractDocuments/packages/config/productDirectionPackageKind';
import { mergeFormDataFromStorage } from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import { PackageInvoicesModal } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageInvoicesModal';

type PackageInvoicesModalLoaderProps = {
  packageId: string;
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onInvoicesChanged?: () => void;
};

/** Загружает данные пакета для модалки счетов из раздела бухгалтерии. */
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
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await getContractDocumentPackage(packageId);
        const presetsKind: ContractDocumentPackageKind = isProductDirectionPackageKind(row.kind)
          ? row.kind
          : 'REPAIR';
        const presetsRes = await getContractDocumentTemplatePresets(presetsKind);
        if (cancelled) return;
        const merged = mergeFormDataFromStorage(row.formData);
        setPackageKind(presetsKind);
        setForm(merged.form);
        setTemplateOverrides(merged.templateOverrides);
        setSelectedTemplateIds(merged.templatePresetIds);
        setPresets(presetsRes.items ?? []);
        setReady(true);
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Не удалось загрузить договор');
      }
    })();
    return () => {
      cancelled = true;
      setReady(false);
    };
  }, [isOpen, packageId, onError]);

  if (!ready) return null;

  return (
    <PackageInvoicesModal
      packageId={packageId}
      packageKind={packageKind}
      form={form}
      isOpen={isOpen}
      onClose={onClose}
      onError={onError}
      onInvoicesChanged={onInvoicesChanged}
      contractTemplatePresets={presets}
      templateOverrides={templateOverrides}
      selectedTemplateIds={selectedTemplateIds}
    />
  );
}
