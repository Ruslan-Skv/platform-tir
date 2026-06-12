import { isPackageQuestionnaireHubTabHiddenFromPackageEditor } from '../hub/questionnaires/packageQuestionnaireHubTabs';
import { isPackageWorkOrderHubTabHiddenFromPackageEditor } from '../hub/workOrders/packageWorkOrderHubTabs';

/** Вкладки, показываемые в строке табов редактора (без hub-only и payments). */
export function isPackageEditorTabBarTab(id: string): boolean {
  return (
    !isPackageWorkOrderHubTabHiddenFromPackageEditor(id) &&
    !isPackageQuestionnaireHubTabHiddenFromPackageEditor(id)
  );
}
