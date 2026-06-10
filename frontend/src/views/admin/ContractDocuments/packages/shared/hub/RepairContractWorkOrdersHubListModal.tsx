'use client';

import { PackageDocumentEditorPage } from '../../pages/PackageDocumentEditorPage';

export type RepairContractWorkOrdersHubListModalProps = {
  packageId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

/** Заказ-наряды из списка договоров: загрузка пакета и модалка hub без UI редактора. */
export function RepairContractWorkOrdersHubListModal({
  packageId,
  isOpen,
  onClose,
  onUpdated,
}: RepairContractWorkOrdersHubListModalProps) {
  if (!isOpen) return null;
  return (
    <PackageDocumentEditorPage
      packageId={packageId}
      workOrdersHubListSurface
      onWorkOrdersHubListClose={onClose}
      onWorkOrdersHubListUpdated={onUpdated}
    />
  );
}
