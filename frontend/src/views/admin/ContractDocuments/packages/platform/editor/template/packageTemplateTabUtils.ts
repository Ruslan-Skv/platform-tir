import {
  type ContractTemplatePreset,
  sanitizeContractTemplatePresetForApi,
} from '@/shared/api/admin-contract-document-packages';

import {
  type PackageWorkOrderHubTabId,
  isPackageWorkOrderHubTabHiddenFromPackageEditor,
} from '../../hub/workOrders/packageWorkOrderHubTabs';
import {
  PACKAGE_DOCUMENT_TAB_IDS,
  type PackageDocumentTabId,
  normalizeLegacyPackageTabId,
} from '../../tabs/packageDocumentTabs';
import { packageLibraryTemplateTabIdFromPreset } from '../../tabs/packageLibraryTemplateTabs';
import { packageTemplatePresetEditorTabId } from '../../tabs/packageTemplatePresetTab';

export type PackageTemplateTabId = Exclude<
  PackageDocumentTabId,
  'data' | 'payments' | 'estimate' | PackageWorkOrderHubTabId
>;

export const PACKAGE_TEMPLATE_TAB_IDS = PACKAGE_DOCUMENT_TAB_IDS.filter(
  (id) =>
    id !== 'data' &&
    id !== 'payments' &&
    id !== 'estimate' &&
    !isPackageWorkOrderHubTabHiddenFromPackageEditor(id)
) as PackageTemplateTabId[];

export function normalizePackageTemplateTabId(value: string | undefined): PackageTemplateTabId {
  if (!value) return 'contract';
  const v = normalizeLegacyPackageTabId(value);
  return (PACKAGE_TEMPLATE_TAB_IDS as string[]).includes(v)
    ? (v as PackageTemplateTabId)
    : 'contract';
}

export function normalizePackageContractTemplatePreset(
  it: ContractTemplatePreset
): ContractTemplatePreset {
  const tabId =
    packageLibraryTemplateTabIdFromPreset(it.tabId) ??
    packageTemplatePresetEditorTabId(it) ??
    normalizePackageTemplateTabId(it.tabId);
  return sanitizeContractTemplatePresetForApi({
    ...it,
    tabId,
    archived: Boolean(it.archived),
  });
}
