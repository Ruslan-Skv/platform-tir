import { useMemo } from 'react';

import type {
  ContractDocumentPackageKind,
  ContractSignatoryProfile,
  ContractTemplatePreset,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';
import { applyTemplate } from '@/views/admin/ContractDocuments/core/applyTemplate';
import { prepareContractTemplateHtmlForPreview } from '@/views/admin/ContractDocuments/core/typography/contractTemplateTypography';
import {
  type PackageTemplatePreviewCustomerKind,
  buildPackageTemplatePreviewFallbackData,
  packageFormForTemplate,
} from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import {
  isPackageActTwinOneSheetTab,
  isPackagePlainCustomerTab,
  wrapPackageActTwinCopiesOnOnePageHtml,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageActPrintTabs';
import {
  PACKAGE_LIBRARY_TEMPLATE_TAB_IDS,
  type PackageLibraryTemplateTabId,
  packageLibraryTemplateTabIdFromPreset,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';
import { isPackageLibraryTemplatePreset } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageTemplatePresetTab';

type UseTemplatesLibraryDerivedDataArgs = {
  items: ContractTemplatePreset[];
  activeTemplateTab: PackageLibraryTemplateTabId;
  activeLibraryKind: ContractDocumentPackageKind;
  showArchivedTemplates: boolean;
  editingId: string;
  html: string;
  firstExecutorProfile: ExecutorRequisiteProfile | null;
  firstSignatoryProfile: ContractSignatoryProfile | null;
  previewCustomerKind: PackageTemplatePreviewCustomerKind;
};

export function useTemplatesLibraryDerivedData({
  items,
  activeTemplateTab,
  activeLibraryKind,
  showArchivedTemplates,
  editingId,
  html,
  firstExecutorProfile,
  firstSignatoryProfile,
  previewCustomerKind,
}: UseTemplatesLibraryDerivedDataArgs) {
  const templateData = useMemo(
    () =>
      packageFormForTemplate(
        buildPackageTemplatePreviewFallbackData(
          firstExecutorProfile,
          firstSignatoryProfile,
          previewCustomerKind
        ),
        { templateTab: activeTemplateTab }
      ),
    [firstExecutorProfile, firstSignatoryProfile, activeTemplateTab, previewCustomerKind]
  );

  const renderedPreview = useMemo(
    () =>
      applyTemplate(html || '', templateData, {
        autoInsertContractSignatures: activeTemplateTab === 'contract',
        plainCustomerPlaceholders: isPackagePlainCustomerTab(activeTemplateTab),
      }),
    [html, templateData, activeTemplateTab]
  );

  const renderedPreviewDisplay = useMemo(() => {
    const withTypography = prepareContractTemplateHtmlForPreview(renderedPreview);
    return isPackageActTwinOneSheetTab(activeTemplateTab, activeLibraryKind)
      ? wrapPackageActTwinCopiesOnOnePageHtml(withTypography)
      : withTypography;
  }, [renderedPreview, activeTemplateTab, activeLibraryKind]);

  const itemsByActiveTab = useMemo(
    () =>
      items.filter((it) => {
        if (packageLibraryTemplateTabIdFromPreset(it.tabId) !== activeTemplateTab) return false;
        return showArchivedTemplates ? Boolean(it.archived) : !it.archived;
      }),
    [items, activeTemplateTab, showArchivedTemplates]
  );

  const templatesCountByTab = useMemo(() => {
    const out = Object.fromEntries(
      PACKAGE_LIBRARY_TEMPLATE_TAB_IDS.map((tab) => [tab, 0])
    ) as Record<PackageLibraryTemplateTabId, number>;
    for (const it of items) {
      if (it.archived) continue;
      const tab = packageLibraryTemplateTabIdFromPreset(it.tabId);
      if (tab && tab in out) out[tab] += 1;
    }
    return out;
  }, [items]);

  const archivedCountOnTab = useMemo(
    () =>
      items.filter(
        (it) => it.archived && packageLibraryTemplateTabIdFromPreset(it.tabId) === activeTemplateTab
      ).length,
    [items, activeTemplateTab]
  );

  const archivedTemplatesCount = useMemo(
    () => items.filter((it) => isPackageLibraryTemplatePreset(it) && it.archived).length,
    [items]
  );

  const editingTemplate = useMemo(
    () => (editingId ? items.find((it) => it.id === editingId) : undefined),
    [items, editingId]
  );

  return {
    templateData,
    renderedPreview,
    renderedPreviewDisplay,
    itemsByActiveTab,
    templatesCountByTab,
    archivedCountOnTab,
    archivedTemplatesCount,
    editingTemplate,
  };
}
