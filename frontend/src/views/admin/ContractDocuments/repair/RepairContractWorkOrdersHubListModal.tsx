'use client';

import { RepairContractDocumentEditorPage } from './RepairContractDocumentEditorPage';

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
    <RepairContractDocumentEditorPage
      packageId={packageId}
      workOrdersHubListSurface
      onWorkOrdersHubListClose={onClose}
      onWorkOrdersHubListUpdated={onUpdated}
    />
  );
}
