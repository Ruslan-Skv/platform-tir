import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';

import type { RepairDocumentTemplateTabId } from '../formDataTemplateStorage';
import { normalizeLegacyRepairTabId } from './repairDocumentTabs';
import {
  type RepairLibraryTemplateTabId,
  repairLibraryTemplateTabIdFromPreset,
} from './repairLibraryTemplateTabs';

/** Вкладки пакета, для которых может быть HTML-пресет (без data / payments / estimate). */
export const REPAIR_EDITOR_TEMPLATE_TAB_IDS = [
  'contract',
  'actStart',
  'actAcceptance',
  'memo',
  'cashOrder',
  'paymentInvoice',
  'questionnaire1',
  'questionnaire2',
  'addendum1',
  'addendum2',
  'addendum3',
  'addendum4',
  'addendum5',
  'workOrder',
  'workOrderAddendum1',
  'workOrderAddendum2',
  'workOrderAddendum3',
  'workOrderAddendum4',
  'workOrderAddendum5',
  'productionLog',
] as const satisfies readonly RepairDocumentTemplateTabId[];

export type RepairEditorTemplateTabId = (typeof REPAIR_EDITOR_TEMPLATE_TAB_IDS)[number];

export function isRepairLibraryTemplatePreset(
  item: Pick<ContractTemplatePreset, 'tabId'>
): item is ContractTemplatePreset & { tabId: RepairLibraryTemplateTabId } {
  return repairLibraryTemplateTabIdFromPreset(item.tabId) !== null;
}

/** Вкладка пресета в пакете; устаревшие tabId (estimate, questionnaire и т.п.) — null. */
export function repairTemplatePresetEditorTabId(
  item: Pick<ContractTemplatePreset, 'tabId'>
): RepairEditorTemplateTabId | null {
  const library = repairLibraryTemplateTabIdFromPreset(item.tabId);
  if (library) return library;

  const raw = item.tabId?.trim();
  if (!raw) return null;
  if (raw === 'addendum') return 'addendum1';
  if (raw === 'workOrderAddendum') return 'workOrderAddendum1';

  const normalized = normalizeLegacyRepairTabId(raw);
  if ((REPAIR_EDITOR_TEMPLATE_TAB_IDS as readonly string[]).includes(normalized)) {
    return normalized as RepairEditorTemplateTabId;
  }
  return null;
}
