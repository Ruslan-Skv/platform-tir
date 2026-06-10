import type {
  ContractDocumentPackageKind,
  ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { libraryTemplateFallbackHtml, packageDocumentTemplateFallbackHtml } from '../../templates';
import { isPackageLibraryTemplateTabId } from '../tabs/packageLibraryTemplateTabs';
import {
  isPackageLibraryTemplatePreset,
  packageTemplatePresetEditorTabId,
} from '../tabs/packageTemplatePresetTab';
import type { PackageDocumentTemplateTabId } from './formDataTemplateStorage';

export function resolvePackageTemplateHtml(
  tab: PackageDocumentTemplateTabId,
  presets: ContractTemplatePreset[],
  selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>,
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): string {
  const override = templateOverrides[tab]?.trim();
  if (override) return override;

  const libraryTab = isPackageLibraryTemplateTabId(tab) ? tab : null;

  const list = presets
    .filter((item) => {
      if (item.archived) return false;
      if (libraryTab) {
        return isPackageLibraryTemplatePreset(item) && item.tabId === libraryTab;
      }
      return packageTemplatePresetEditorTabId(item) === tab;
    })
    .map((item) => {
      const editorTab = packageTemplatePresetEditorTabId(item);
      return editorTab ? { ...item, tabId: editorTab } : item;
    });

  const selectedId = selectedTemplateIds[tab] ?? '';
  const selected = list.find((it) => it.id === selectedId);
  if (selected?.html?.trim()) return selected.html;

  const fallback = list.find((it) => it.isDefault) ?? list[0];
  if (fallback?.html?.trim()) return fallback.html;

  if (libraryTab) {
    return libraryTemplateFallbackHtml(packageKind, libraryTab);
  }
  return packageDocumentTemplateFallbackHtml(packageKind, tab);
}
