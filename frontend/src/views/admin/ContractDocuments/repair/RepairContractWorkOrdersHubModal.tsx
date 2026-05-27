'use client';

import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { Modal } from '@/shared/ui/Modal';

import styles from '../ContractDocuments.module.css';
import { useRepairContractWorkOrderHub } from './RepairContractWorkOrderHubContext';
import hubStyles from './RepairContractWorkOrdersHubModal.module.css';
import { RepairContractWorkOrdersPanels } from './RepairContractWorkOrdersPanels';
import { printRepairWorkOrderHubTab } from './repairWorkOrderHubPrint';
import {
  type RepairWorkOrderHubTabId,
  formatRepairWorkOrderHubModalTitle,
  repairWorkOrderHubTabLabel,
  repairWorkOrderHubTabsForPackage,
} from './repairWorkOrderHubTabs';

export type RepairContractWorkOrdersHubModalProps = {
  isOpen: boolean;
  onClose: () => void;
  panelTab: RepairWorkOrderHubTabId;
  onPanelTabChange: (tab: RepairWorkOrderHubTabId) => void;
  addendumSlotCount: number;
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
  unassignedInteractiveRowsCount,
  headerContractNumberLabel,
  headerContractDateLabel,
}: RepairContractWorkOrdersHubModalProps) {
  const hubCtx = useRepairContractWorkOrderHub();
  const hubTabs = repairWorkOrderHubTabsForPackage(addendumSlotCount);

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
          className={`${styles.tabBar} ${styles.blockTabs} ${styles.repairPackageTabBarCompact} ${hubStyles.hubTabBar}`}
          role="tablist"
        >
          {hubTabs.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={panelTab === id}
              title={repairWorkOrderHubTabLabel(id, false)}
              className={`${styles.tab} ${panelTab === id ? `${styles.tabActive} ${hubStyles.hubTabActive}` : ''} ${
                id === 'interactiveFinalEstimate' || id === 'finalWorkOrder'
                  ? styles.summaryTab
                  : ''
              } ${id === 'interactiveFinalEstimate' ? styles.summaryTabFirst : ''} ${
                id === 'finalWorkOrder' ? styles.summaryTabLast : ''
              }`}
              onClick={() => onPanelTabChange(id)}
            >
              <span className={styles.repairTabLabelInner}>
                <span>{repairWorkOrderHubTabLabel(id)}</span>
                {id === 'interactiveFinalEstimate' ? (
                  <span
                    className={`${styles.repairTabUnassignedBadge} ${
                      unassignedInteractiveRowsCount === 0
                        ? styles.repairTabUnassignedBadgeDone
                        : styles.repairTabUnassignedBadgePending
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
