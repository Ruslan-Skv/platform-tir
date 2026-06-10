'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { DoorsSpecificationTab } from '../../directions/doors/DoorsSpecificationTab';
import { WindowsSpecificationTab } from '../../directions/windows/WindowsSpecificationTab';

export type ProductSpecificationTabProps = {
  packageKind: ContractDocumentPackageKind;
  packageId: string;
  contractNumberLabel: string;
  contractDateLabel: string;
  disabled?: boolean;
  windowsSpecificationAmount: string;
  windowsSpecificationFileUrl: string;
  windowsSpecificationFileName: string;
  onWindowsAmountChange: (value: string) => void;
  onWindowsFileAttached: (payload: { fileUrl: string; fileName: string }) => void;
  onWindowsFileClear: () => void;
  onError: (message: string) => void;
};

/** Вкладка «Спецификация» для товарных направлений (Окна, Двери, …). */
export function ProductSpecificationTab({
  packageKind,
  packageId,
  contractNumberLabel,
  contractDateLabel,
  disabled = false,
  windowsSpecificationAmount,
  windowsSpecificationFileUrl,
  windowsSpecificationFileName,
  onWindowsAmountChange,
  onWindowsFileAttached,
  onWindowsFileClear,
  onError,
}: ProductSpecificationTabProps) {
  switch (packageKind) {
    case 'WINDOWS':
      return (
        <WindowsSpecificationTab
          packageId={packageId}
          amount={windowsSpecificationAmount}
          fileUrl={windowsSpecificationFileUrl}
          fileName={windowsSpecificationFileName}
          contractNumberLabel={contractNumberLabel}
          contractDateLabel={contractDateLabel}
          disabled={disabled}
          onAmountChange={onWindowsAmountChange}
          onFileAttached={onWindowsFileAttached}
          onFileClear={onWindowsFileClear}
          onError={onError}
        />
      );
    case 'DOORS':
      return (
        <DoorsSpecificationTab
          contractNumberLabel={contractNumberLabel}
          contractDateLabel={contractDateLabel}
          disabled={disabled}
        />
      );
    default:
      return null;
  }
}
