'use client';

import { useCallback, useMemo } from 'react';

import type {
  ContractDocumentPackageKind,
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import type { InstallerMaster } from '@/shared/api/admin-crm';

import { buildPackageTemplatePreviewHtml } from '../editor/buildPackageTemplatePreviewHtml';
import { formatPackageMoneyValue } from '../editor/estimateTabUi';
import {
  formatInstallerGradeShort,
  formatInstallerNameShort,
  formatMoneyRubShort,
} from '../editor/finalEstimateSummary';
import type { EstimateEmbedSection } from '../estimates/packageEstimateDocPrintEmbedHtml';
import type { PackageDocumentTemplateTabId } from '../form/formDataTemplateStorage';
import type { PackageFormData } from '../form/packageForm';
import type { PackageWorkOrderHubContextValue } from '../hub/PackageWorkOrderHubContext';
import type { PackageDocumentTabId } from '../tabs/packageDocumentTabs';
import { usePackageContractInstallers } from './usePackageContractInstallers';
import { usePackageFinalEstimateWorkOrders } from './usePackageFinalEstimateWorkOrders';

export type UsePackageWorkOrderHubContextOptions = {
  packageKind: ContractDocumentPackageKind;
  isProductDirectionPackage: boolean;
  windowsWorkOrderMarkupPercent: number;
  form: PackageFormData;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
  contractInstallers: InstallerMaster[];
  activeInstallerId: string;
  setActiveInstallerId: (installerId: string) => void;
  activeFinalWorkOrderDocId: string;
  setActiveFinalWorkOrderDocId: (id: string) => void;
  selectedEstimateSections: EstimateEmbedSection[];
  estimateAppendixContractRef: { num: string; date: string };
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  resolveTemplateHtml: (tab: PackageDocumentTemplateTabId) => string;
  updateWorkOrder: <K extends keyof PackageFormData['workOrder']>(
    key: K,
    value: PackageFormData['workOrder'][K]
  ) => void;
};

export function usePackageWorkOrderHubContext(options: UsePackageWorkOrderHubContextOptions) {
  const {
    packageKind,
    isProductDirectionPackage,
    windowsWorkOrderMarkupPercent,
    form,
    setForm,
    touchPackageData,
    contractInstallers,
    activeInstallerId,
    setActiveInstallerId,
    activeFinalWorkOrderDocId,
    setActiveFinalWorkOrderDocId,
    selectedEstimateSections,
    estimateAppendixContractRef,
    estimatePresets,
    estimateGroups,
    templateOverrides,
    resolveTemplateHtml,
    updateWorkOrder,
  } = options;

  const installers = usePackageContractInstallers({
    packageKind,
    contractInstallers,
    form,
    setForm,
    activeInstallerId,
    setActiveInstallerId,
    touchPackageData,
  });

  const finalEstimate = usePackageFinalEstimateWorkOrders({
    form,
    selectedEstimateSections,
    isProductDirectionPackage,
    windowsWorkOrderMarkupPercent,
    selectedInstallers: installers.selectedInstallers,
    selectedInstallersById: installers.selectedInstallersById,
    activeFinalWorkOrderDocId,
    setActiveFinalWorkOrderDocId,
  });

  const getTemplatePreviewHtml = useCallback(
    (tab: PackageDocumentTabId): string =>
      buildPackageTemplatePreviewHtml(tab, {
        form,
        packageKind,
        windowsWorkOrderMarkupPercent,
        estimatePresets,
        estimateGroups,
        templateOverrides,
        resolveTemplateHtml,
      }),
    [
      form,
      packageKind,
      windowsWorkOrderMarkupPercent,
      estimatePresets,
      estimateGroups,
      templateOverrides,
      resolveTemplateHtml,
    ]
  );

  const workOrderHubContextValue = useMemo((): PackageWorkOrderHubContextValue => {
    return {
      packageKind,
      isWindowsPackage: isProductDirectionPackage,
      windowsWorkOrderMarkupPercent,
      form,
      updateWorkOrder,
      getTemplatePreviewHtml,
      contractInstallers: installers.installersForContract,
      selectedInstallers: installers.selectedInstallers,
      selectedInstallersById: installers.selectedInstallersById,
      activeInstallerId,
      addInstallerToContract: installers.addInstallerToContract,
      removeInstallerFromContract: installers.removeInstallerFromContract,
      setActiveInstallerId,
      activateOrToggleInstaller: installers.activateOrToggleInstaller,
      assignInstallerToFinalEstimateRow: installers.assignInstallerToFinalEstimateRow,
      assignInstallerToFinalEstimateRows: installers.assignInstallerToFinalEstimateRows,
      interactiveFinalEstimateSections: finalEstimate.interactiveFinalEstimateSections,
      unassignedInteractiveRowsCount: finalEstimate.unassignedInteractiveRowsCount,
      activeFinalWorkOrderDocId,
      setActiveFinalWorkOrderDocId,
      finalWorkOrderComputed: finalEstimate.finalWorkOrderComputed,
      finalWorkOrderCategorySections: finalEstimate.finalWorkOrderCategorySections,
      perInstallerWorkOrders: finalEstimate.perInstallerWorkOrders,
      activeInstallerWorkOrder: finalEstimate.activeInstallerWorkOrder,
      estimateAppendixContractRef,
      formatMoneyValue: formatPackageMoneyValue,
      formatMoneyRubShort,
      formatInstallerNameShort,
      formatInstallerGradeShort: (grade: string | null | undefined) =>
        formatInstallerGradeShort(grade ?? ''),
    };
  }, [
    packageKind,
    isProductDirectionPackage,
    windowsWorkOrderMarkupPercent,
    form,
    updateWorkOrder,
    getTemplatePreviewHtml,
    installers,
    activeInstallerId,
    setActiveInstallerId,
    finalEstimate,
    activeFinalWorkOrderDocId,
    setActiveFinalWorkOrderDocId,
    estimateAppendixContractRef,
  ]);

  return {
    workOrderHubContextValue,
    getTemplatePreviewHtml,
    ...installers,
    ...finalEstimate,
  };
}
