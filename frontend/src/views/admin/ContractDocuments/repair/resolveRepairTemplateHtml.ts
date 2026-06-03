import type {
  ContractDocumentPackageKind,
  ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { RepairDocumentTemplateTabId } from './formDataTemplateStorage';
import {
  isRepairLibraryTemplateTabId,
  repairLibraryTemplateTabIdFromPreset,
} from './repairLibraryTemplateTabs';
import {
  isRepairLibraryTemplatePreset,
  repairTemplatePresetEditorTabId,
} from './repairTemplatePresetTab';
import { REPAIR_DOCUMENT_TEMPLATES, libraryTemplateFallbackHtml } from './templates';

export function resolveRepairTemplateHtml(
  tab: RepairDocumentTemplateTabId,
  presets: ContractTemplatePreset[],
  selectedTemplateIds: Partial<Record<RepairDocumentTemplateTabId, string>>,
  templateOverrides: Partial<Record<RepairDocumentTemplateTabId, string>>,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): string {
  const override = templateOverrides[tab]?.trim();
  if (override) return override;

  const libraryTab = isRepairLibraryTemplateTabId(tab) ? tab : null;

  const list = presets
    .filter((item) => {
      if (item.archived) return false;
      if (libraryTab) {
        return isRepairLibraryTemplatePreset(item) && item.tabId === libraryTab;
      }
      return repairTemplatePresetEditorTabId(item) === tab;
    })
    .map((item) => {
      const editorTab = repairTemplatePresetEditorTabId(item);
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
  return REPAIR_DOCUMENT_TEMPLATES[tab];
}
