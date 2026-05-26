import { buildManagerQuestionnaire1PrintHtml } from './managerQuestionnaire1Print';
import { buildPostWorkQuestionnaire2PrintHtml } from './postWorkQuestionnaire2Print';
import { printDocumentHtml } from './printDocument';
import type { RepairPackageFormData } from './repairPackageForm';
import {
  type RepairQuestionnaireHubTabId,
  repairQuestionnaireHubTabLabel,
} from './repairQuestionnaireHubTabs';

/** Печать активной вкладки модалки «Анкеты». */
export function printRepairQuestionnaireHubTab(
  panelTab: RepairQuestionnaireHubTabId,
  form: RepairPackageFormData
): void {
  const html =
    panelTab === 'questionnaire1'
      ? buildManagerQuestionnaire1PrintHtml(form)
      : buildPostWorkQuestionnaire2PrintHtml(form);
  if (!html.trim()) {
    window.alert('Нет данных для печати этой анкеты.');
    return;
  }
  printDocumentHtml(html, repairQuestionnaireHubTabLabel(panelTab, false));
}
