import { useCallback, useMemo } from 'react';

import type {
  ContractDocumentPackageKind,
  ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { FurnitureActiveDocLeg } from '../../../directions/furniture/furnitureLegs';
import { packageDocumentTemplateFallbackHtml } from '../../../templates';
import { libraryTemplateFallbackHtml } from '../../../templates';
import { furnitureDocumentTemplateHtml } from '../../../templates/furniture';
import { PACKAGE_TEMPLATE_TAB_IDS } from '../../editor/template/packageTemplateTabUtils';
import type { PackageDocumentTemplateTabId } from '../../form/formDataTemplateStorage';
import { isPackageLibraryTemplateTabId } from '../../tabs/packageLibraryTemplateTabs';
import { packageTemplatePresetEditorTabId } from '../../tabs/packageTemplatePresetTab';

export type UsePackageTemplatePresetResolutionOptions = {
  packageKind: ContractDocumentPackageKind;
  contractTemplatePresets: ContractTemplatePreset[];
  selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>;
};

export function usePackageTemplatePresetResolution({
  packageKind,
  contractTemplatePresets,
  selectedTemplateIds,
  furnitureActiveDocLeg = 'manufacture',
}: UsePackageTemplatePresetResolutionOptions & {
  furnitureActiveDocLeg?: FurnitureActiveDocLeg;
}) {
  const templatePresetsByTab = useMemo(() => {
    const map = new Map<PackageDocumentTemplateTabId, ContractTemplatePreset[]>();
    for (const tab of PACKAGE_TEMPLATE_TAB_IDS) map.set(tab, []);
    for (const item of contractTemplatePresets) {
      if (item.archived) continue;
      const tab = packageTemplatePresetEditorTabId(item);
      if (!tab) continue;
      map.set(tab, [...(map.get(tab) ?? []), { ...item, tabId: tab }]);
    }
    return map;
  }, [contractTemplatePresets]);

  const resolveTemplateHtml = useCallback(
    (tab: PackageDocumentTemplateTabId): string => {
      const list = templatePresetsByTab.get(tab) ?? [];
      const selectedId = selectedTemplateIds[tab] ?? '';
      const selected = list.find((it) => it.id === selectedId);
      if (selected?.html?.trim()) return selected.html;
      const fallback = list.find((it) => it.isDefault) ?? list[0];
      if (fallback?.html?.trim()) return fallback.html;
      if (packageKind === 'FURNITURE') {
        const furnitureHtml = furnitureDocumentTemplateHtml(tab, furnitureActiveDocLeg);
        if (furnitureHtml) return furnitureHtml;
      }
      if (isPackageLibraryTemplateTabId(tab)) {
        return libraryTemplateFallbackHtml(packageKind, tab);
      }
      return packageDocumentTemplateFallbackHtml(packageKind, tab);
    },
    [templatePresetsByTab, selectedTemplateIds, packageKind, furnitureActiveDocLeg]
  );

  return { templatePresetsByTab, resolveTemplateHtml };
}
