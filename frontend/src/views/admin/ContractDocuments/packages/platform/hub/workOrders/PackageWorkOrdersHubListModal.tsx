'use client';

import { PackageDocumentEditorPage } from '../../../pages/PackageDocumentEditorPage';

export type PackageWorkOrdersHubListModalProps = {
  packageId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

/** Заказ-наряды из списка договоров: загрузка пакета и модалка hub без UI редактора. */
export function PackageWorkOrdersHubListModal({
  packageId,
  isOpen,
  onClose,
  onUpdated,
}: PackageWorkOrdersHubListModalProps) {
  return (
    <PackageDocumentEditorPage
      packageId={packageId}
      workOrdersHubListSurface
      workOrdersHubListSurfaceOpen={isOpen}
      onWorkOrdersHubListClose={onClose}
      onWorkOrdersHubListUpdated={onUpdated}
    />
  );
}
