import {
  PACKAGE_DOCUMENT_TAB_LABELS,
  PACKAGE_DOCUMENT_TAB_LABELS_SHORT,
  type PackageDocumentTabId,
} from '../tabs/packageDocumentTabs';

/** Вкладки анкет — в модалке «Анкеты», не в строке вкладок редактора пакета. */
export const PACKAGE_QUESTIONNAIRE_HUB_TAB_IDS = ['questionnaire1', 'questionnaire2'] as const;

export type PackageQuestionnaireHubTabId = (typeof PACKAGE_QUESTIONNAIRE_HUB_TAB_IDS)[number];

export const PACKAGE_QUESTIONNAIRE_HUB_MODAL_TITLE = 'Анкеты';

export function formatPackageQuestionnaireHubModalTitle(
  contractNumberLabel?: string,
  contractDateLabel?: string | null
): string {
  const num = contractNumberLabel?.trim();
  if (!num) return PACKAGE_QUESTIONNAIRE_HUB_MODAL_TITLE;
  const dateSuffix = contractDateLabel ? ` от ${contractDateLabel}` : '';
  return `Анкеты договора №${num}${dateSuffix}`;
}

export function isPackageQuestionnaireHubTab(id: string): id is PackageQuestionnaireHubTabId {
  return (PACKAGE_QUESTIONNAIRE_HUB_TAB_IDS as readonly string[]).includes(id);
}

/** Не показывать во вкладках редактора пакета (только в модалке). */
export function isPackageQuestionnaireHubTabHiddenFromPackageEditor(id: string): boolean {
  return isPackageQuestionnaireHubTab(id);
}

export function packageQuestionnaireHubTabLabel(
  id: PackageQuestionnaireHubTabId,
  short = true
): string {
  return short ? PACKAGE_DOCUMENT_TAB_LABELS_SHORT[id] : PACKAGE_DOCUMENT_TAB_LABELS[id];
}

export function defaultPackageQuestionnaireHubTab(
  preferred: PackageDocumentTabId | null
): PackageQuestionnaireHubTabId {
  if (preferred && isPackageQuestionnaireHubTab(preferred)) {
    return preferred;
  }
  return 'questionnaire1';
}
