'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { KnowledgePlatformSettingsIcon } from '@/shared/ui/icons';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import {
  CONTRACT_DOCUMENTS_SETTINGS_MODAL_TITLE,
  ContractDocumentsSettingsModal,
  type ContractDocumentsSettingsTabId,
} from './ContractDocumentsSettingsModal';

const SETTINGS_OPEN_EVENT = 'contract-documents-settings:open';

/**
 * Открыть «Настройки договоров» на нужной вкладке (например, из подсказки
 * номера договора). Работает, только если кнопка смонтирована (супер-админ).
 */
export function openContractDocumentsSettings(tab: ContractDocumentsSettingsTabId) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SETTINGS_OPEN_EVENT, { detail: { tab } }));
}

/**
 * Кнопка «Настройки договоров» в шапке редактора пакета — только для супер-админа.
 * Порождающий паттерн — «Настройки дашборда» (иконка + собственная модалка).
 */
export function ContractDocumentsSettingsButton() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ContractDocumentsSettingsTabId>('workStart');

  useEffect(() => {
    if (!isSuperAdmin) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: ContractDocumentsSettingsTabId }>).detail;
      if (detail?.tab) setTab(detail.tab);
      setOpen(true);
    };
    window.addEventListener(SETTINGS_OPEN_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_OPEN_EVENT, handler);
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  return (
    <>
      <button
        type="button"
        className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn}`}
        onClick={() => setOpen(true)}
        title={CONTRACT_DOCUMENTS_SETTINGS_MODAL_TITLE}
        aria-label={CONTRACT_DOCUMENTS_SETTINGS_MODAL_TITLE}
      >
        <KnowledgePlatformSettingsIcon size={18} />
      </button>
      <ContractDocumentsSettingsModal
        isOpen={open}
        onClose={() => setOpen(false)}
        tab={tab}
        onTabChange={setTab}
      />
    </>
  );
}
