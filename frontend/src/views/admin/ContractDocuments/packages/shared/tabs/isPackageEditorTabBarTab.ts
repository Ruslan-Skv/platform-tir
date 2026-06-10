import { isRepairQuestionnaireHubTabHiddenFromPackageEditor } from '../../directions/repair/questionnaires/repairQuestionnaireHubTabs';
import { isRepairWorkOrderHubTabHiddenFromPackageEditor } from '../../directions/repair/workOrders/repairWorkOrderHubTabs';

/** Вкладки, показываемые в строке табов редактора (без hub-only и payments). */
export function isPackageEditorTabBarTab(id: string): boolean {
  return (
    !isRepairWorkOrderHubTabHiddenFromPackageEditor(id) &&
    !isRepairQuestionnaireHubTabHiddenFromPackageEditor(id)
  );
}
