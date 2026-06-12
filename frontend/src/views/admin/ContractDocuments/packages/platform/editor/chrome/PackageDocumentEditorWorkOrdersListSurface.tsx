'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { Modal } from '@/shared/ui/Modal';

import cdTemplates from '../../../../styles/templates-library.module.css';
import type { PackageFormData } from '../../form/packageForm';
import { PackageWorkOrderHubProvider } from '../../hub/workOrders/PackageWorkOrderHubContext';
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
  if (loading) {
    return (
      <Modal isOpen onClose={onClose} title="Заказ-наряды" size="lg">
        <p className={cdTemplates.hint} style={{ margin: 0 }}>
          Загрузка…
        </p>
      </Modal>
    );
  }

  return (
    <PackageWorkOrderHubProvider value={workOrderHubContextValue}>
      {error ? (
        <Modal isOpen onClose={onClose} title="Заказ-наряды" size="lg">
          <p data-modal-form-error style={{ margin: 0 }}>
            {error}
          </p>
        </Modal>
      ) : (
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
        />
      )}
    </PackageWorkOrderHubProvider>
  );
}
