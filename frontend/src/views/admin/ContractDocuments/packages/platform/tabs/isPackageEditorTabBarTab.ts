import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { isPackageQuestionnaireHubTabHiddenFromPackageEditor } from '../hub/questionnaires/packageQuestionnaireHubTabs';
import { isPackageWorkOrderHubTabHiddenFromPackageEditor } from '../hub/workOrders/packageWorkOrderHubTabs';

/** Вкладки, показываемые в строке табов редактора (без hub-only и payments). */
export function isPackageEditorTabBarTab(
  id: string,
  packageKind?: ContractDocumentPackageKind | null
): boolean {
  /** Мебель: заказ-наряд — в строке вкладок (Excel «З-Н»), не только в hub. */
  if (packageKind === 'FURNITURE' && id === 'workOrder') return true;
  return (
    !isPackageWorkOrderHubTabHiddenFromPackageEditor(id) &&
    !isPackageQuestionnaireHubTabHiddenFromPackageEditor(id)
  );
}
