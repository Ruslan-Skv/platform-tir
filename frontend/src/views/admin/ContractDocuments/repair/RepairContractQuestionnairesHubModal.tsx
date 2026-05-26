'use client';

import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { useMemo } from 'react';

import { Modal } from '@/shared/ui/Modal';

import styles from '../ContractDocuments.module.css';
import { RepairContractQuestionnairesPanels } from './RepairContractQuestionnairesPanels';
import hubStyles from './RepairContractWorkOrdersHubModal.module.css';
import { buildManagerQuestionnaire1PrintHtml } from './managerQuestionnaire1Print';
import { buildPostWorkQuestionnaire2PrintHtml } from './postWorkQuestionnaire2Print';
import type {
  RepairManagerQuestionnaire1Block,
  RepairPackageFormData,
  RepairPostWorkQuestionnaire2Block,
} from './repairPackageForm';
import { printRepairQuestionnaireHubTab } from './repairQuestionnaireHubPrint';
import {
  REPAIR_QUESTIONNAIRE_HUB_MODAL_TITLE,
  REPAIR_QUESTIONNAIRE_HUB_TAB_IDS,
  type RepairQuestionnaireHubTabId,
  repairQuestionnaireHubTabLabel,
} from './repairQuestionnaireHubTabs';

export type RepairContractQuestionnairesHubModalProps = {
  isOpen: boolean;
  onClose: () => void;
  panelTab: RepairQuestionnaireHubTabId;
  onPanelTabChange: (tab: RepairQuestionnaireHubTabId) => void;
  form: RepairPackageFormData;
  headerContractNumberLabel?: string;
  headerContractDateLabel?: string;
  onPatchManagerQuestionnaire1: (patch: Partial<RepairManagerQuestionnaire1Block>) => void;
  onToggleManagerQuestionnaire1Traffic: (id: string) => void;
  onToggleManagerQuestionnaire1WhyChosen: (id: string) => void;
  onToggleManagerQuestionnaire1Need: (id: string) => void;
  onPatchPostWorkQuestionnaire2: (patch: Partial<RepairPostWorkQuestionnaire2Block>) => void;
};

export function RepairContractQuestionnairesHubModal({
  isOpen,
  onClose,
  panelTab,
  onPanelTabChange,
  form,
  headerContractNumberLabel,
  headerContractDateLabel,
  onPatchManagerQuestionnaire1,
  onToggleManagerQuestionnaire1Traffic,
  onToggleManagerQuestionnaire1WhyChosen,
  onToggleManagerQuestionnaire1Need,
  onPatchPostWorkQuestionnaire2,
}: RepairContractQuestionnairesHubModalProps) {
  const previewHtml = useMemo(() => {
    return panelTab === 'questionnaire1'
      ? buildManagerQuestionnaire1PrintHtml(form)
      : buildPostWorkQuestionnaire2PrintHtml(form);
  }, [form, panelTab]);

  const modalTitle = (
    <div className={hubStyles.modalHeaderRow}>
      <span className={hubStyles.modalHeaderTitle}>
        <span>{REPAIR_QUESTIONNAIRE_HUB_MODAL_TITLE}</span>
        {headerContractNumberLabel ? (
          <span className={hubStyles.modalHeaderContractRef}>
            {headerContractNumberLabel}
            {headerContractDateLabel != null ? ` от ${headerContractDateLabel}` : null}
          </span>
        ) : null}
      </span>
      <div className={hubStyles.modalHeaderActions}>
        <button
          type="button"
          className={hubStyles.headerIconBtn}
          title="Печать"
          aria-label="Печать"
          onClick={() => printRepairQuestionnaireHubTab(panelTab, form)}
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
          className={`${styles.tabBar} ${styles.blockTabs} ${styles.repairPackageTabBarCompact} ${hubStyles.hubTabBar}`}
          role="tablist"
        >
          {REPAIR_QUESTIONNAIRE_HUB_TAB_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={panelTab === id}
              title={repairQuestionnaireHubTabLabel(id, false)}
              className={`${styles.tab} ${panelTab === id ? `${styles.tabActive} ${hubStyles.hubTabActive}` : ''}`}
              onClick={() => onPanelTabChange(id)}
            >
              <span className={styles.repairTabLabelInner}>
                <span>{repairQuestionnaireHubTabLabel(id)}</span>
              </span>
            </button>
          ))}
        </div>
        <RepairContractQuestionnairesPanels
          panelTab={panelTab}
          form={form}
          previewHtml={previewHtml}
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
