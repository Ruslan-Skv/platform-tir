import type { ContractDocumentPackageStatus } from '@/shared/api/admin-contract-document-packages';

import type { PackageFormData } from '../../form/packageForm';
import { PACKAGE_HUB_MODAL_TITLE } from './packageHubConstants';

export function getPackageAddendumTabAddState(
  form: PackageFormData,
  packageFlowStatus: ContractDocumentPackageStatus
): {
  blockedReason: string | null;
  disabled: boolean;
  addTitle: string;
} {
  let blockedReason: string | null = null;
  if (packageFlowStatus === 'REFUSED') {
    blockedReason = `Отказ по проекту договора: вкладки Д/с недоступны. При необходимости снимите отказ в «${PACKAGE_HUB_MODAL_TITLE}».`;
  } else if (packageFlowStatus !== 'CONTRACT_CONCLUDED') {
    blockedReason = `Вкладки «Д/с №1»…«Д/с №5» доступны после подписания договора. Отметьте «Договор подписан» в «${PACKAGE_HUB_MODAL_TITLE}».`;
  } else if (
    form.addendumSlotCount > 0 &&
    form.addendumSlots[form.addendumSlotCount - 1]?.status !== 'SIGNED'
  ) {
    blockedReason = `Сначала отметьте Д/с №${form.addendumSlotCount} как подписанное в «${PACKAGE_HUB_MODAL_TITLE}».`;
  }

  const addTitle =
    blockedReason ??
    (form.addendumSlotCount === 0
      ? 'Добавить вкладку дополнительного соглашения (до пяти)'
      : 'Показать ещё одну вкладку дополнительного соглашения (до пяти)');

  return {
    blockedReason,
    disabled: blockedReason !== null,
    addTitle,
  };
}
