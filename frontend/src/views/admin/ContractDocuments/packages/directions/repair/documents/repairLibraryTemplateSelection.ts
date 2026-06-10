import type {
  ContractDocumentPackageKind,
  ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import { libraryTemplateFallbackHtml } from '../../../templates';
import {
  type RepairLibraryTemplateTabId,
  repairLibraryTemplateTabIdFromPreset,
} from './repairLibraryTemplateTabs';

export type LibraryTemplateSelection = {
  id: string;
  title: string;
  html: string;
  /** Нет сохранённого пресета на вкладке — показан резервный HTML (ещё не в items). */
  isFallback: boolean;
};

export function listActiveLibraryTemplatesForTab(
  items: ContractTemplatePreset[],
  tab: RepairLibraryTemplateTabId,
  archived: boolean
): ContractTemplatePreset[] {
  return items.filter((it) => {
    if (Boolean(it.archived) !== archived) return false;
    return repairLibraryTemplateTabIdFromPreset(it.tabId) === tab;
  });
}

/** Выбор шаблона для вкладки библиотеки; при отсутствии пресетов — резервный HTML вкладки. */
export function resolveLibraryTemplateSelection(
  items: ContractTemplatePreset[],
  kind: ContractDocumentPackageKind,
  tab: RepairLibraryTemplateTabId,
  options?: { preferredId?: string; archived?: boolean }
): LibraryTemplateSelection {
  const archived = options?.archived ?? false;
  const tabItems = listActiveLibraryTemplatesForTab(items, tab, archived);
  const preferredId = options?.preferredId?.trim();
  const picked =
    (preferredId ? tabItems.find((it) => it.id === preferredId) : undefined) ??
    tabItems.find((it) => it.isDefault) ??
    tabItems[0];

  if (picked) {
    return {
      id: picked.id,
      title: picked.title ?? '',
      html: picked.html ?? '',
      isFallback: false,
    };
  }

  return {
    id: '',
    title: '',
    html: libraryTemplateFallbackHtml(kind, tab),
    isFallback: true,
  };
}

/** Autosave только если редактируемый пресет принадлежит текущей вкладке. */
/** Исправление: «Памятка» сохранена с tabId contract при создании на другой вкладке. */
export function repairMisassignedWindowsLibraryPresetTabId(
  preset: ContractTemplatePreset,
  kind: ContractDocumentPackageKind
): ContractTemplatePreset {
  if (!isProductDirectionPackageKind(kind)) return preset;
  const title = (preset.title ?? '').trim();
  if (!/^памятка$/i.test(title)) return preset;
  if (repairLibraryTemplateTabIdFromPreset(preset.tabId) === 'contract') {
    return { ...preset, tabId: 'memo' };
  }
  return preset;
}

export function repairMisassignedWindowsLibraryPresets(
  items: ContractTemplatePreset[],
  kind: ContractDocumentPackageKind
): ContractTemplatePreset[] {
  return items.map((it) => repairMisassignedWindowsLibraryPresetTabId(it, kind));
}

export function canAutosaveLibraryTemplatePreset(
  items: ContractTemplatePreset[],
  editingId: string,
  activeTab: RepairLibraryTemplateTabId
): boolean {
  if (!editingId.trim()) return false;
  const preset = items.find((it) => it.id === editingId);
  if (!preset) return true;
  const presetTab = repairLibraryTemplateTabIdFromPreset(preset.tabId);
  if (!presetTab) return true;
  return presetTab === activeTab;
}
