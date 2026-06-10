import { isPackageQuestionnaireHubTabHiddenFromPackageEditor } from '../hub/packageQuestionnaireHubTabs';
import { isPackageWorkOrderHubTabHiddenFromPackageEditor } from '../hub/packageWorkOrderHubTabs';

/** Вкладки, показываемые в строке табов редактора (без hub-only и payments). */
export function isPackageEditorTabBarTab(id: string): boolean {
  return (
    !isPackageWorkOrderHubTabHiddenFromPackageEditor(id) &&
    !isPackageQuestionnaireHubTabHiddenFromPackageEditor(id)
  );
}
