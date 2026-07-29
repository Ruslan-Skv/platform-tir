'use client';

import { useEffect, useRef } from 'react';

import type {
  ContractDocumentPackageKind,
  ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { PackageDocumentTemplateTabId } from '../../form/formDataTemplateStorage';
import type { PackageFormData } from '../../form/packageForm';
import { PackageInvoicesModal } from '../../hub/invoices/PackageInvoicesModal';

export type PackageDocumentEditorInvoicesListSurfaceProps = {
  loading: boolean;
  error: string | null;
  invoicesHubOpen: boolean;
  invoicesHubVisible: boolean;
  onCloseInvoicesHub: () => void;
  onAfterClose?: () => void;
  onInvoicesChanged?: () => void;
  packageId: string;
  packageKind: ContractDocumentPackageKind;
  form: PackageFormData;
  onError: (message: string) => void;
  contractTemplatePresets: ContractTemplatePreset[];
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>;
};

export function PackageDocumentEditorInvoicesListSurface({
  loading: _loading,
  error: _error,
  invoicesHubOpen,
  invoicesHubVisible,
  onCloseInvoicesHub,
  onAfterClose,
  onInvoicesChanged,
  packageId,
  packageKind,
  form,
  onError,
  contractTemplatePresets,
  templateOverrides,
  selectedTemplateIds,
}: PackageDocumentEditorInvoicesListSurfaceProps) {
  const wasOpenRef = useRef(invoicesHubOpen);

  useEffect(() => {
    if (!wasOpenRef.current && invoicesHubOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current && !invoicesHubOpen) {
      const timer = window.setTimeout(() => {
        onAfterClose?.();
      }, 190);
      return () => window.clearTimeout(timer);
    }
  }, [invoicesHubOpen, onAfterClose]);

  return (
    <PackageInvoicesModal
      packageId={packageId}
      packageKind={packageKind}
      form={form}
      isOpen={invoicesHubVisible}
      onClose={onCloseInvoicesHub}
      onError={onError}
      onInvoicesChanged={onInvoicesChanged}
      contractTemplatePresets={contractTemplatePresets}
      templateOverrides={templateOverrides}
      selectedTemplateIds={selectedTemplateIds}
    />
  );
}
