'use client';

import { PackageDocumentEditorPage } from '../../../pages/PackageDocumentEditorPage';

export type PackageInvoicesHubListModalProps = {
  packageId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

/** Счета из списка договоров: загрузка пакета и модалка «Счета» без UI редактора. */
export function PackageInvoicesHubListModal({
  packageId,
  isOpen,
  onClose,
  onUpdated,
}: PackageInvoicesHubListModalProps) {
  return (
    <PackageDocumentEditorPage
      packageId={packageId}
      invoicesHubListSurface
      invoicesHubListSurfaceOpen={isOpen}
      onInvoicesHubListClose={onClose}
      onInvoicesHubListUpdated={onUpdated}
    />
  );
}
