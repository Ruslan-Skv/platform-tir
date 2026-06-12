'use client';

import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { useMemo } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { Modal } from '@/shared/ui/Modal';

import cdBase from '../../../../styles/base.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import type {
  PackageFormData,
  PackageManagerQuestionnaire1Block,
  PackagePostWorkQuestionnaire2Block,
} from '../../form/packageForm';
import { buildManagerQuestionnaire1PrintHtml } from '../../questionnaires/managerQuestionnaire1Print';
import { printPackageQuestionnaireHubTab } from '../../questionnaires/packageQuestionnaireHubPrint';
import { buildPostWorkQuestionnaire2PrintHtml } from '../../questionnaires/postWorkQuestionnaire2Print';
import hubStyles from '../workOrders/PackageWorkOrdersHubModal.module.css';
import { PackageQuestionnairesHubPanels } from './PackageQuestionnairesHubPanels';
import {
  PACKAGE_QUESTIONNAIRE_HUB_TAB_IDS,
  type PackageQuestionnaireHubTabId,
  formatPackageQuestionnaireHubModalTitle,
  packageQuestionnaireHubTabLabel,
} from './packageQuestionnaireHubTabs';

export type PackageQuestionnairesHubModalProps = {
  isOpen: boolean;
  onClose: () => void;
  panelTab: PackageQuestionnaireHubTabId;
  onPanelTabChange: (tab: PackageQuestionnaireHubTabId) => void;
  form: PackageFormData;
  packageKind?: ContractDocumentPackageKind;
  headerContractNumberLabel?: string;
  headerContractDateLabel?: string;
  linkedCrmCustomerId?: string | null;
  onPatchManagerQuestionnaire1: (patch: Partial<PackageManagerQuestionnaire1Block>) => void;
  onToggleManagerQuestionnaire1Traffic: (id: string) => void;
  onToggleManagerQuestionnaire1WhyChosen: (id: string) => void;
  onToggleManagerQuestionnaire1Need: (id: string) => void;
  onPatchPostWorkQuestionnaire2: (patch: Partial<PackagePostWorkQuestionnaire2Block>) => void;
};

export function PackageQuestionnairesHubModal({
  isOpen,
  onClose,
  panelTab,
  onPanelTabChange,
  form,
  packageKind,
  headerContractNumberLabel,
  headerContractDateLabel,
  linkedCrmCustomerId,
  onPatchManagerQuestionnaire1,
  onToggleManagerQuestionnaire1Traffic,
  onToggleManagerQuestionnaire1WhyChosen,
  onToggleManagerQuestionnaire1Need,
  onPatchPostWorkQuestionnaire2,
}: PackageQuestionnairesHubModalProps) {
  const previewHtml = useMemo(() => {
    return panelTab === 'questionnaire1'
      ? buildManagerQuestionnaire1PrintHtml(form)
      : buildPostWorkQuestionnaire2PrintHtml(form, { packageKind });
  }, [form, panelTab, packageKind]);

  const modalTitle = (
    <div className={hubStyles.modalHeaderRow}>
      <span className={hubStyles.modalHeaderTitle}>
        {formatPackageQuestionnaireHubModalTitle(
          headerContractNumberLabel,
          headerContractDateLabel
        )}
      </span>
      <div className={hubStyles.modalHeaderActions}>
        <button
          type="button"
          className={hubStyles.headerIconBtn}
          title="Печать"
          aria-label="Печать"
          onClick={() => printPackageQuestionnaireHubTab(panelTab, form, { packageKind })}
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
      <div className={hubStyles.modalBody} data-repair-questionnaires-hub-modal>
        <div
          className={`${cdChrome.tabBar} ${cdChrome.blockTabs} ${cdChrome.packageTabBarCompact} ${cdBase.blockTabs} ${cdBase.packageTabBarCompact} ${hubStyles.hubTabBar}`}
          role="tablist"
        >
          {PACKAGE_QUESTIONNAIRE_HUB_TAB_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={panelTab === id}
              title={packageQuestionnaireHubTabLabel(id, false)}
              className={`${cdChrome.tab} ${panelTab === id ? `${cdChrome.tabActive} ${hubStyles.hubTabActive}` : ''}`}
              onClick={() => onPanelTabChange(id)}
            >
              <span className={cdProduct.packageTabLabelInner}>
                <span>{packageQuestionnaireHubTabLabel(id)}</span>
              </span>
            </button>
          ))}
        </div>
        <PackageQuestionnairesHubPanels
          panelTab={panelTab}
          form={form}
          previewHtml={previewHtml}
          packageKind={packageKind}
          linkedCrmCustomerId={linkedCrmCustomerId}
          onPatchManagerQuestionnaire1={onPatchManagerQuestionnaire1}
          onToggleManagerQuestionnaire1Traffic={onToggleManagerQuestionnaire1Traffic}
          onToggleManagerQuestionnaire1WhyChosen={onToggleManagerQuestionnaire1WhyChosen}
          onToggleManagerQuestionnaire1Need={onToggleManagerQuestionnaire1Need}
          onPatchPostWorkQuestionnaire2={onPatchPostWorkQuestionnaire2}
        />
      </div>
    </Modal>
  );
}
