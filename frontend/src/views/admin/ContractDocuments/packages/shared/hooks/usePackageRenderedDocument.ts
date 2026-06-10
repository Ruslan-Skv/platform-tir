'use client';

import { useMemo } from 'react';

import type {
  ContractDocumentPackageKind,
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { applyTemplate } from '../../../shared/applyTemplate';
import { prepareContractTemplateHtmlForPreview } from '../../../shared/typography/contractTemplateTypography';
import {
  isRepairActA4PreviewTab,
  isRepairPlainCustomerTab,
} from '../../directions/repair/documents/repairActTwinCopiesOnOnePageHtml';
import {
  type RepairDocumentTabId,
  isRepairAddendumTab,
  isRepairWorkOrderAddendumTab,
} from '../../directions/repair/documents/repairDocumentTemplates';
import type { RepairDocumentTemplateTabId } from '../../directions/repair/formDataTemplateStorage';
import type { RepairPackageFormData } from '../../directions/repair/repairPackageForm';
import { repairPackageFormForTemplate } from '../../directions/repair/repairPackageForm';

export type UsePackageRenderedDocumentOptions = {
  activeTab: RepairDocumentTabId;
  form: RepairPackageFormData;
  packageKind: ContractDocumentPackageKind;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  windowsWorkOrderMarkupPercent: number;
  templateOverrides: Partial<Record<RepairDocumentTemplateTabId, string>>;
  resolveTemplateHtml: (tab: RepairDocumentTemplateTabId) => string;
};

export function usePackageRenderedDocument({
  activeTab,
  form,
  packageKind,
  estimatePresets,
  estimateGroups,
  windowsWorkOrderMarkupPercent,
  templateOverrides,
  resolveTemplateHtml,
}: UsePackageRenderedDocumentOptions): string {
  const repairFormForActiveTemplate = useMemo(
    () =>
      repairPackageFormForTemplate(form, {
        templateTab:
          activeTab === 'finalEstimate' || activeTab === 'interactiveFinalEstimate'
            ? 'estimate'
            : activeTab === 'finalWorkOrder'
              ? 'workOrder'
              : activeTab,
        estimatePresets,
        estimateGroups,
        packageKind,
        windowsWorkOrderMarkupPercent,
      }),
    [form, activeTab, estimatePresets, estimateGroups, packageKind, windowsWorkOrderMarkupPercent]
  );

  return useMemo(() => {
    if (activeTab === 'data' || activeTab === 'payments') return '';
    if (
      activeTab === 'finalEstimate' ||
      activeTab === 'specification' ||
      activeTab === 'interactiveFinalEstimate' ||
      activeTab === 'finalWorkOrder'
    ) {
      return '';
    }
    const tab = activeTab as RepairDocumentTemplateTabId;
    let tpl: string;
    if (tab === 'contract') {
      tpl = resolveTemplateHtml('contract');
    } else {
      tpl = templateOverrides[tab] ?? resolveTemplateHtml(tab);
    }
    return prepareContractTemplateHtmlForPreview(
      applyTemplate(tpl, repairFormForActiveTemplate, {
        autoInsertContractSignatures: activeTab === 'contract',
        plainCustomerPlaceholders: isRepairPlainCustomerTab(activeTab),
      })
    );
  }, [activeTab, repairFormForActiveTemplate, templateOverrides, resolveTemplateHtml]);
}

export function usePackageRepairFormForTemplate(
  options: Omit<UsePackageRenderedDocumentOptions, 'templateOverrides' | 'resolveTemplateHtml'>
) {
  const {
    activeTab,
    form,
    packageKind,
    estimatePresets,
    estimateGroups,
    windowsWorkOrderMarkupPercent,
  } = options;

  return useMemo(
    () =>
      repairPackageFormForTemplate(form, {
        templateTab:
          activeTab === 'finalEstimate' || activeTab === 'interactiveFinalEstimate'
            ? 'estimate'
            : activeTab === 'finalWorkOrder'
              ? 'workOrder'
              : activeTab,
        estimatePresets,
        estimateGroups,
        packageKind,
        windowsWorkOrderMarkupPercent,
      }),
    [form, activeTab, estimatePresets, estimateGroups, packageKind, windowsWorkOrderMarkupPercent]
  );
}

/** Tabs that use A4 sheet layout instead of generic doc pane. */
export function isPackageTemplateA4SheetTab(activeTab: RepairDocumentTabId): boolean {
  return (
    activeTab === 'contract' ||
    isRepairActA4PreviewTab(activeTab) ||
    activeTab === 'productionLog' ||
    activeTab === 'memo' ||
    isRepairAddendumTab(activeTab) ||
    isRepairWorkOrderAddendumTab(activeTab)
  );
}
