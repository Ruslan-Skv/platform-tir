'use client';

import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { Modal } from '@/shared/ui/Modal';

import cdBase from '../../../styles/base.module.css';
import cdChrome from '../../../styles/editor-chrome.module.css';
import cdInteractiveEstimate from '../../../styles/interactive-estimate.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import { printPackageWorkOrderHubTab } from '../workOrders/packageWorkOrderHubPrint';
import { usePackageWorkOrderHub } from './PackageWorkOrderHubContext';
import hubStyles from './PackageWorkOrdersHubModal.module.css';
import { PackageWorkOrdersHubPanels } from './PackageWorkOrdersHubPanels';
import {
  type PackageWorkOrderHubTabId,
  formatPackageWorkOrderHubModalTitle,
  packageWorkOrderHubTabLabel,
  packageWorkOrderHubTabsForPackage,
} from './packageWorkOrderHubTabs';

export type PackageWorkOrdersHubModalProps = {
  isOpen: boolean;
  onClose: () => void;
  panelTab: PackageWorkOrderHubTabId;
  onPanelTabChange: (tab: PackageWorkOrderHubTabId) => void;
  addendumSlotCount: number;
  packageKind?: ContractDocumentPackageKind;
  unassignedInteractiveRowsCount: number;
  headerContractNumberLabel?: string;
  headerContractDateLabel?: string;
};

export function PackageWorkOrdersHubModal({
  isOpen,
  onClose,
  panelTab,
  onPanelTabChange,
  addendumSlotCount,
  packageKind = 'REPAIR',
  unassignedInteractiveRowsCount,
  headerContractNumberLabel,
  headerContractDateLabel,
}: PackageWorkOrdersHubModalProps) {
  const hubCtx = usePackageWorkOrderHub();
  const hubTabs = packageWorkOrderHubTabsForPackage(addendumSlotCount, packageKind);

  const modalTitle = (
    <div className={hubStyles.modalHeaderRow}>
      <span className={hubStyles.modalHeaderTitle}>
        {formatPackageWorkOrderHubModalTitle(headerContractNumberLabel, headerContractDateLabel)}
      </span>
      <div className={hubStyles.modalHeaderActions}>
        <button
          type="button"
          className={hubStyles.headerIconBtn}
          title="Печать"
          aria-label="Печать"
          onClick={() => printPackageWorkOrderHubTab(panelTab, hubCtx)}
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
          className={`${cdChrome.tabBar} ${cdChrome.blockTabs} ${cdChrome.packageTabBarCompact} ${cdBase.blockTabs} ${cdBase.packageTabBarCompact} ${hubStyles.hubTabBar}`}
          role="tablist"
        >
          {hubTabs.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={panelTab === id}
              title={packageWorkOrderHubTabLabel(id, false, packageKind)}
              className={`${cdChrome.tab} ${panelTab === id ? `${cdChrome.tabActive} ${hubStyles.hubTabActive}` : ''} ${
                id === 'interactiveFinalEstimate' || id === 'finalWorkOrder'
                  ? cdChrome.summaryTab
                  : ''
              } ${id === 'interactiveFinalEstimate' ? cdChrome.summaryTabFirst : ''} ${
                id === 'finalWorkOrder' ? cdChrome.summaryTabLast : ''
              }`}
              onClick={() => onPanelTabChange(id)}
            >
              <span className={cdProduct.packageTabLabelInner}>
                <span>{packageWorkOrderHubTabLabel(id, true, packageKind)}</span>
                {id === 'interactiveFinalEstimate' ? (
                  <span
                    className={`${cdInteractiveEstimate.packageTabUnassignedBadge} ${
                      unassignedInteractiveRowsCount === 0
                        ? cdInteractiveEstimate.packageTabUnassignedBadgeDone
                        : cdInteractiveEstimate.packageTabUnassignedBadgePending
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
        <PackageWorkOrdersHubPanels panelTab={panelTab} />
      </div>
    </Modal>
  );
}
