import {
  REPAIR_DOCUMENT_TAB_LABELS,
  REPAIR_DOCUMENT_TAB_LABELS_SHORT,
  type RepairDocumentTabId,
} from './repairDocumentTabs';

/** Вкладки анкет — в модалке «Анкеты», не в строке вкладок редактора пакета. */
export const REPAIR_QUESTIONNAIRE_HUB_TAB_IDS = ['questionnaire1', 'questionnaire2'] as const;

export type RepairQuestionnaireHubTabId = (typeof REPAIR_QUESTIONNAIRE_HUB_TAB_IDS)[number];

export const REPAIR_QUESTIONNAIRE_HUB_MODAL_TITLE = 'Анкеты';

export function formatRepairQuestionnaireHubModalTitle(
  contractNumberLabel?: string,
  contractDateLabel?: string | null
): string {
  const num = contractNumberLabel?.trim();
  if (!num) return REPAIR_QUESTIONNAIRE_HUB_MODAL_TITLE;
  const dateSuffix = contractDateLabel ? ` от ${contractDateLabel}` : '';
  return `Анкеты договора №${num}${dateSuffix}`;
}

export function isRepairQuestionnaireHubTab(id: string): id is RepairQuestionnaireHubTabId {
  return (REPAIR_QUESTIONNAIRE_HUB_TAB_IDS as readonly string[]).includes(id);
}

/** Не показывать во вкладках редактора пакета (только в модалке). */
export function isRepairQuestionnaireHubTabHiddenFromPackageEditor(id: string): boolean {
  return isRepairQuestionnaireHubTab(id);
}

export function repairQuestionnaireHubTabLabel(
  id: RepairQuestionnaireHubTabId,
  short = true
): string {
  return short ? REPAIR_DOCUMENT_TAB_LABELS_SHORT[id] : REPAIR_DOCUMENT_TAB_LABELS[id];
}

export function defaultRepairQuestionnaireHubTab(
  preferred: RepairDocumentTabId | null
): RepairQuestionnaireHubTabId {
  if (preferred && isRepairQuestionnaireHubTab(preferred)) {
    return preferred;
  }
  return 'questionnaire1';
}
