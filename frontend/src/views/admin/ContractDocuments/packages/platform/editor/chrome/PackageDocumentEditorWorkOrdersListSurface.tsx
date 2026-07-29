'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import type { PackageFormData } from '../../form/packageForm';
import type { PackageWorkOrderHubContextValue } from '../../hub/workOrders/PackageWorkOrderHubContext';
import { PackageWorkOrdersHubModal } from '../../hub/workOrders/PackageWorkOrdersHubModal';
import type { PackageWorkOrderHubTabId } from '../../hub/workOrders/packageWorkOrderHubTabs';

export type PackageDocumentEditorWorkOrdersListSurfaceProps = {
  loading: boolean;
  error: string | null;
  workOrdersHubOpen: boolean;
  workOrdersHubPanelTab: PackageWorkOrderHubTabId;
  onWorkOrdersHubPanelTabChange: (tab: PackageWorkOrderHubTabId) => void;
  onClose: () => void;
  workOrderHubContextValue: PackageWorkOrderHubContextValue;
  form: PackageFormData;
  packageKind: ContractDocumentPackageKind;
  unassignedInteractiveRowsCount: number;
  headerContractNumberLabel: string;
  headerContractConcludedDateLabel: string | null;
};

export function PackageDocumentEditorWorkOrdersListSurface({
  loading,
  error,
  workOrdersHubOpen,
  workOrdersHubPanelTab,
  onWorkOrdersHubPanelTabChange,
  onClose,
  workOrderHubContextValue,
  form,
  packageKind,
  unassignedInteractiveRowsCount,
  headerContractNumberLabel,
  headerContractConcludedDateLabel,
}: PackageDocumentEditorWorkOrdersListSurfaceProps) {
  return (
    <PackageWorkOrdersHubModal
      isOpen={workOrdersHubOpen}
      onClose={onClose}
      panelTab={workOrdersHubPanelTab}
      onPanelTabChange={onWorkOrdersHubPanelTabChange}
      addendumSlotCount={form.addendumSlotCount}
      packageKind={packageKind}
      unassignedInteractiveRowsCount={unassignedInteractiveRowsCount}
      headerContractNumberLabel={headerContractNumberLabel}
      headerContractDateLabel={headerContractConcludedDateLabel ?? undefined}
      loading={loading}
      error={error}
      workOrderHubContextValue={loading ? null : workOrderHubContextValue}
    />
  );
}
