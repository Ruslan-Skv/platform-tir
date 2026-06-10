'use client';

import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { Modal } from '@/shared/ui/Modal';

import cdBase from '../../../styles/base.module.css';
import cdChrome from '../../../styles/editor-chrome.module.css';
import cdInteractiveEstimate from '../../../styles/interactive-estimate.module.css';
import cdWindows from '../../../styles/windows-package.module.css';
import { RepairContractWorkOrdersPanels } from '../../directions/repair/workOrders/RepairContractWorkOrdersPanels';
import { printRepairWorkOrderHubTab } from '../../directions/repair/workOrders/repairWorkOrderHubPrint';
import {
  type RepairWorkOrderHubTabId,
  formatRepairWorkOrderHubModalTitle,
  repairWorkOrderHubTabLabel,
  repairWorkOrderHubTabsForPackage,
} from '../../directions/repair/workOrders/repairWorkOrderHubTabs';
import { useRepairContractWorkOrderHub } from './RepairContractWorkOrderHubContext';
import hubStyles from './RepairContractWorkOrdersHubModal.module.css';

export type RepairContractWorkOrdersHubModalProps = {
  isOpen: boolean;
  onClose: () => void;
  panelTab: RepairWorkOrderHubTabId;
  onPanelTabChange: (tab: RepairWorkOrderHubTabId) => void;
  addendumSlotCount: number;
  packageKind?: ContractDocumentPackageKind;
  unassignedInteractiveRowsCount: number;
  headerContractNumberLabel?: string;
  headerContractDateLabel?: string;
};

export function RepairContractWorkOrdersHubModal({
  isOpen,
  onClose,
  panelTab,
  onPanelTabChange,
  addendumSlotCount,
  packageKind = 'REPAIR',
  unassignedInteractiveRowsCount,
  headerContractNumberLabel,
  headerContractDateLabel,
}: RepairContractWorkOrdersHubModalProps) {
  const hubCtx = useRepairContractWorkOrderHub();
  const hubTabs = repairWorkOrderHubTabsForPackage(addendumSlotCount, packageKind);

  const modalTitle = (
    <div className={hubStyles.modalHeaderRow}>
      <span className={hubStyles.modalHeaderTitle}>
        {formatRepairWorkOrderHubModalTitle(headerContractNumberLabel, headerContractDateLabel)}
      </span>
      <div className={hubStyles.modalHeaderActions}>
        <button
          type="button"
          className={hubStyles.headerIconBtn}
          title="Печать"
          aria-label="Печать"
          onClick={() => printRepairWorkOrderHubTab(panelTab, hubCtx)}
        >
          <PrinterIcon className={hubStyles.headerIcon} aria-hidden />
        </button>
        <button
          type="button"
          className={hubStyles.headerIconBtn}
          onClick={onClose}
          aria-label="Закрыть модальное окно"
        >
          <XMarkIcon className={hubStyles.headerIcon} aria-hidden />
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      titleClassName={hubStyles.modalTitle}
      size="lg"
      showCloseButton={false}
    >
      <div className={hubStyles.modalBody} data-repair-work-orders-hub-modal>
        <div
          className={`${cdChrome.tabBar} ${cdChrome.blockTabs} ${cdChrome.repairPackageTabBarCompact} ${cdBase.blockTabs} ${cdBase.repairPackageTabBarCompact} ${hubStyles.hubTabBar}`}
          role="tablist"
        >
          {hubTabs.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={panelTab === id}
              title={repairWorkOrderHubTabLabel(id, false, packageKind)}
              className={`${cdChrome.tab} ${panelTab === id ? `${cdChrome.tabActive} ${hubStyles.hubTabActive}` : ''} ${
                id === 'interactiveFinalEstimate' || id === 'finalWorkOrder'
                  ? cdChrome.summaryTab
                  : ''
              } ${id === 'interactiveFinalEstimate' ? cdChrome.summaryTabFirst : ''} ${
                id === 'finalWorkOrder' ? cdChrome.summaryTabLast : ''
              }`}
              onClick={() => onPanelTabChange(id)}
            >
              <span className={cdWindows.repairTabLabelInner}>
                <span>{repairWorkOrderHubTabLabel(id, true, packageKind)}</span>
                {id === 'interactiveFinalEstimate' ? (
                  <span
                    className={`${cdInteractiveEstimate.repairTabUnassignedBadge} ${
                      unassignedInteractiveRowsCount === 0
                        ? cdInteractiveEstimate.repairTabUnassignedBadgeDone
                        : cdInteractiveEstimate.repairTabUnassignedBadgePending
                    }`}
                    title="Количество неприкреплённых позиций"
                  >
                    {unassignedInteractiveRowsCount}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
        <RepairContractWorkOrdersPanels panelTab={panelTab} />
      </div>
    </Modal>
  );
}
