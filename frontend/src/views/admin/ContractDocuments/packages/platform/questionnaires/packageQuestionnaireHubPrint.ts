import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { printDocumentHtml } from '../../../core/printDocument';
import type { PackageFormData } from '../form/packageForm';
import {
  type PackageQuestionnaireHubTabId,
  packageQuestionnaireHubTabLabel,
} from '../hub/packageQuestionnaireHubTabs';
import { buildManagerQuestionnaire1PrintHtml } from './managerQuestionnaire1Print';
import { buildPostWorkQuestionnaire2PrintHtml } from './postWorkQuestionnaire2Print';

/** Печать активной вкладки модалки «Анкеты». */
export function printPackageQuestionnaireHubTab(
  panelTab: PackageQuestionnaireHubTabId,
  form: PackageFormData,
  options?: { packageKind?: ContractDocumentPackageKind }
): void {
  const html =
    panelTab === 'questionnaire1'
      ? buildManagerQuestionnaire1PrintHtml(form)
      : buildPostWorkQuestionnaire2PrintHtml(form, options);
  if (!html.trim()) {
    window.alert('Нет данных для печати этой анкеты.');
    return;
  }
  printDocumentHtml(html, packageQuestionnaireHubTabLabel(panelTab, false));
}
