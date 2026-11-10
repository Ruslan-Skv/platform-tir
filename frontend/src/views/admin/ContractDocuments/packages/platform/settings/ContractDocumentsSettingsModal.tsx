'use client';

import { Modal } from '@/shared/ui/Modal';
import { ExecutorProfilesPanel } from '@/views/admin/ContractDocuments/packages/pages/requisites/ExecutorProfilesPanel';
import { MarkupSettingsPanel } from '@/views/admin/ContractDocuments/packages/pages/settings/MarkupSettingsPanel';
import { NumberingSettingsPanel } from '@/views/admin/ContractDocuments/packages/pages/settings/NumberingSettingsPanel';
import { PackageWorkPeriodSettingsPanel } from '@/views/admin/ContractDocuments/packages/pages/settings/PackageWorkPeriodSettingsPanel';
import { WorkStartMinPaySettingsPanel } from '@/views/admin/ContractDocuments/packages/pages/settings/WorkStartMinPaySettingsPanel';
import { SignatoriesPanel } from '@/views/admin/ContractDocuments/packages/pages/signatories/SignatoriesPanel';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';

import styles from './ContractDocumentsSettingsModal.module.css';

export const CONTRACT_DOCUMENTS_SETTINGS_MODAL_TITLE = 'Настройки договоров';

export type ContractDocumentsSettingsTabId =
  | 'workStart'
  | 'workPeriod'
  | 'markups'
  | 'numbering'
  | 'executors'
  | 'signatories';

const SETTINGS_TABS: { id: ContractDocumentsSettingsTabId; label: string }[] = [
  { id: 'workStart', label: 'Акт начала работ' },
  { id: 'workPeriod', label: 'Сроки' },
  { id: 'markups', label: 'Наценки' },
  { id: 'numbering', label: 'Нумерация' },
  { id: 'executors', label: 'Исполнители' },
  { id: 'signatories', label: 'Менеджеры' },
];

/**
 * Модалка «Настройки договоров» (только супер-админ): порог оплаты Акта начала
 * работ и настройки, перенесённые из подразделов «Оформления договоров».
 * Состояние вкладки управляется снаружи (кнопкой) — чтобы открыть нужную вкладку
 * из других мест страницы, см. openContractDocumentsSettings().
 */
export function ContractDocumentsSettingsModal({
  isOpen,
  onClose,
  tab,
  onTabChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  tab: ContractDocumentsSettingsTabId;
  onTabChange: (tab: ContractDocumentsSettingsTabId) => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={CONTRACT_DOCUMENTS_SETTINGS_MODAL_TITLE}
      size="xl"
      compactOnMobile
      alignTop
      contentClassName={styles.modalContent}
    >
      <div className={styles.modalBody}>
        <div
          className={`${cdChrome.tabBar} ${cdChrome.blockTabs} ${cdChrome.packageTabBarCompact} ${cdBase.blockTabs} ${cdBase.packageTabBarCompact} ${styles.tabBar}`}
          role="tablist"
        >
          {SETTINGS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`${cdChrome.tab} ${tab === t.id ? cdChrome.tabActive : ''}`}
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.tabContent}>
          {tab === 'workStart' ? <WorkStartMinPaySettingsPanel /> : null}
          {tab === 'workPeriod' ? <PackageWorkPeriodSettingsPanel /> : null}
          {tab === 'markups' ? <MarkupSettingsPanel /> : null}
          {tab === 'numbering' ? <NumberingSettingsPanel /> : null}
          {tab === 'executors' ? <ExecutorProfilesPanel /> : null}
          {tab === 'signatories' ? <SignatoriesPanel /> : null}
        </div>
      </div>
    </Modal>
  );
}
