import {
  type ContractTemplatePreset,
  sanitizeContractTemplatePresetForApi,
} from '@/shared/api/admin-contract-document-packages';

import {
  REPAIR_DOCUMENT_TAB_IDS,
  type RepairDocumentTabId,
  normalizeLegacyRepairTabId,
} from '../../directions/repair/documents/repairDocumentTemplates';
import {
  isRepairLibraryTemplateTabId,
  repairLibraryTemplateTabIdFromPreset,
} from '../../directions/repair/documents/repairLibraryTemplateTabs';
import { repairTemplatePresetEditorTabId } from '../../directions/repair/documents/repairTemplatePresetTab';
import {
  type RepairWorkOrderHubTabId,
  isRepairWorkOrderHubTabHiddenFromPackageEditor,
} from '../../directions/repair/workOrders/repairWorkOrderHubTabs';

export type PackageTemplateTabId = Exclude<
  RepairDocumentTabId,
  'data' | 'payments' | 'estimate' | RepairWorkOrderHubTabId
>;

export const PACKAGE_TEMPLATE_TAB_IDS = REPAIR_DOCUMENT_TAB_IDS.filter(
  (id) =>
    id !== 'data' &&
    id !== 'payments' &&
    id !== 'estimate' &&
    !isRepairWorkOrderHubTabHiddenFromPackageEditor(id)
) as PackageTemplateTabId[];

export function normalizePackageTemplateTabId(value: string | undefined): PackageTemplateTabId {
  if (!value) return 'contract';
  const v = normalizeLegacyRepairTabId(value);
  return (PACKAGE_TEMPLATE_TAB_IDS as string[]).includes(v)
    ? (v as PackageTemplateTabId)
    : 'contract';
}

export function normalizePackageContractTemplatePreset(
  it: ContractTemplatePreset
): ContractTemplatePreset {
  const tabId =
    repairLibraryTemplateTabIdFromPreset(it.tabId) ??
    repairTemplatePresetEditorTabId(it) ??
    normalizePackageTemplateTabId(it.tabId);
  return sanitizeContractTemplatePresetForApi({
    ...it,
    tabId,
    archived: Boolean(it.archived),
  });
}
