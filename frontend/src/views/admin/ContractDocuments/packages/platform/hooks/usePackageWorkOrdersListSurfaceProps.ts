import { useMemo } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { PackageDocumentEditorWorkOrdersListSurfaceProps } from '../editor/PackageDocumentEditorWorkOrdersListSurface';
import type { PackageFormData } from '../form/packageForm';
import type { PackageWorkOrderHubContextValue } from '../hub/PackageWorkOrderHubContext';
import type { PackageWorkOrderHubTabId } from '../hub/packageWorkOrderHubTabs';

export type UsePackageWorkOrdersListSurfacePropsOptions = {
  error: string | null;
  workOrdersHubOpen: boolean;
  workOrdersHubPanelTab: PackageWorkOrderHubTabId;
  setWorkOrdersHubPanelTab: React.Dispatch<React.SetStateAction<PackageWorkOrderHubTabId>>;
  closeWorkOrdersHub: () => void;
  workOrderHubContextValue: PackageWorkOrderHubContextValue;
  form: PackageFormData;
  packageKind: ContractDocumentPackageKind;
  unassignedInteractiveRowsCount: number;
  headerContractNumberLabel: string;
  headerContractConcludedDateLabel: string | null;
};

export function usePackageWorkOrdersListSurfaceProps({
  error,
  workOrdersHubOpen,
  workOrdersHubPanelTab,
  setWorkOrdersHubPanelTab,
  closeWorkOrdersHub,
  workOrderHubContextValue,
  form,
  packageKind,
  unassignedInteractiveRowsCount,
  headerContractNumberLabel,
  headerContractConcludedDateLabel,
}: UsePackageWorkOrdersListSurfacePropsOptions): Omit<
  PackageDocumentEditorWorkOrdersListSurfaceProps,
  'loading'
> {
  return useMemo(
    () => ({
      error,
      workOrdersHubOpen,
      workOrdersHubPanelTab,
      onWorkOrdersHubPanelTabChange: setWorkOrdersHubPanelTab,
      onClose: closeWorkOrdersHub,
      workOrderHubContextValue,
      form,
      packageKind,
      unassignedInteractiveRowsCount,
      headerContractNumberLabel,
      headerContractConcludedDateLabel,
    }),
    [
      error,
      workOrdersHubOpen,
      workOrdersHubPanelTab,
      setWorkOrdersHubPanelTab,
      closeWorkOrdersHub,
      workOrderHubContextValue,
      form,
      packageKind,
      unassignedInteractiveRowsCount,
      headerContractNumberLabel,
      headerContractConcludedDateLabel,
    ]
  );
}
