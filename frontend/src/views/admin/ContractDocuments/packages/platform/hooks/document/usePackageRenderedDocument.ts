'use client';

import { useMemo } from 'react';

import type {
  ContractDocumentPackageKind,
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { applyTemplate } from '../../../../core/applyTemplate';
import { prepareContractTemplateHtmlForPreview } from '../../../../core/typography/contractTemplateTypography';
import { packageUsesLineSpecification } from '../../../config';
import { ensureDoorsDeliveryNoteProductsHtml } from '../../../families/product-like/specification/doorsSpecification';
import type { PackageDocumentTemplateTabId } from '../../form/formDataTemplateStorage';
import type { PackageFormData } from '../../form/packageForm';
import { packageFormForTemplate } from '../../form/packageForm';
import {
  isPackageActA4PreviewTab,
  isPackagePlainCustomerTab,
} from '../../tabs/packageActPrintTabs';
import {
  type PackageDocumentTabId,
  isPackageAddendumTab,
  isPackageWorkOrderAddendumTab,
} from '../../tabs/packageDocumentTabs';

export type UsePackageRenderedDocumentOptions = {
  activeTab: PackageDocumentTabId;
  form: PackageFormData;
  packageKind: ContractDocumentPackageKind;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  windowsWorkOrderMarkupPercent: number;
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  resolveTemplateHtml: (tab: PackageDocumentTemplateTabId) => string;
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
  const formForActiveTemplate = useMemo(
    () =>
      packageFormForTemplate(form, {
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
    if (
      activeTab === 'data' ||
      activeTab === 'measurement' ||
      activeTab === 'drawings' ||
      activeTab === 'payments'
    ) {
      return '';
    }
    if (
      activeTab === 'finalEstimate' ||
      activeTab === 'specification' ||
      activeTab === 'interactiveFinalEstimate' ||
      activeTab === 'finalWorkOrder'
    ) {
      return '';
    }
    const tab = activeTab as PackageDocumentTemplateTabId;
    let tpl: string;
    if (tab === 'contract') {
      tpl = resolveTemplateHtml('contract');
    } else {
      tpl = templateOverrides[tab] ?? resolveTemplateHtml(tab);
    }
    let html = prepareContractTemplateHtmlForPreview(
      applyTemplate(tpl, formForActiveTemplate, {
        autoInsertContractSignatures: activeTab === 'contract',
        plainCustomerPlaceholders: isPackagePlainCustomerTab(activeTab),
      })
    );
    if (activeTab === 'deliveryNote' && packageUsesLineSpecification(packageKind)) {
      html = ensureDoorsDeliveryNoteProductsHtml(
        html,
        formForActiveTemplate.deliveryNote?.productsHtml ?? ''
      );
    }
    return html;
  }, [activeTab, formForActiveTemplate, templateOverrides, resolveTemplateHtml, packageKind]);
}

export function usePackageFormForTemplate(
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
      packageFormForTemplate(form, {
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
export function isPackageTemplateA4SheetTab(activeTab: PackageDocumentTabId): boolean {
  return (
    activeTab === 'contract' ||
    activeTab === 'consent' ||
    isPackageActA4PreviewTab(activeTab) ||
    activeTab === 'productionLog' ||
    activeTab === 'memo' ||
    activeTab === 'deliveryNote' ||
    isPackageAddendumTab(activeTab) ||
    isPackageWorkOrderAddendumTab(activeTab)
  );
}
