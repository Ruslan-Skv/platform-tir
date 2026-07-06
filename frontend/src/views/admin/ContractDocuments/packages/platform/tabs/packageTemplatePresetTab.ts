import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';

import type { PackageDocumentTemplateTabId } from '../form/formDataTemplateStorage';
import { normalizeLegacyPackageTabId } from './packageDocumentTabs';
import {
  type PackageLibraryTemplateTabId,
  packageLibraryTemplateTabIdFromPreset,
} from './packageLibraryTemplateTabs';

/** Вкладки пакета, для которых может быть HTML-пресет (без data / payments / estimate). */
export const PACKAGE_EDITOR_TEMPLATE_TAB_IDS = [
  'contract',
  'consent',
  'actStart',
  'actAcceptance',
  'deliveryNote',
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
] as const satisfies readonly PackageDocumentTemplateTabId[];

export type PackageEditorTemplateTabId = (typeof PACKAGE_EDITOR_TEMPLATE_TAB_IDS)[number];

export function isPackageLibraryTemplatePreset(
  item: Pick<ContractTemplatePreset, 'tabId'>
): item is ContractTemplatePreset & { tabId: PackageLibraryTemplateTabId } {
  return packageLibraryTemplateTabIdFromPreset(item.tabId) !== null;
}

/** Вкладка пресета в пакете; устаревшие tabId (estimate, questionnaire и т.п.) — null. */
export function packageTemplatePresetEditorTabId(
  item: Pick<ContractTemplatePreset, 'tabId'>
): PackageEditorTemplateTabId | null {
  const library = packageLibraryTemplateTabIdFromPreset(item.tabId);
  if (library) return library;

  const raw = item.tabId?.trim();
  if (!raw) return null;
  if (raw === 'addendum') return 'addendum1';
  if (raw === 'workOrderAddendum') return 'workOrderAddendum1';

  const normalized = normalizeLegacyPackageTabId(raw);
  if ((PACKAGE_EDITOR_TEMPLATE_TAB_IDS as readonly string[]).includes(normalized)) {
    return normalized as PackageEditorTemplateTabId;
  }
  return null;
}
