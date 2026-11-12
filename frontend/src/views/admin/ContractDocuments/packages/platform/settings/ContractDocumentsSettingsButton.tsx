'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { AdminToolbarIconButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { KnowledgePlatformSettingsIcon } from '@/shared/ui/icons';

import {
  CONTRACT_DOCUMENTS_SETTINGS_MODAL_TITLE,
  ContractDocumentsSettingsModal,
  type ContractDocumentsSettingsTabId,
} from './ContractDocumentsSettingsModal';

const SETTINGS_OPEN_EVENT = 'contract-documents-settings:open';

/**
 * Открыть «Настройки договоров» на нужной вкладке (например, из подсказки
 * номера договора). Работает, только если смонтирован слушатель (супер-админ):
 * кнопка на странице списка договоров или хост в редакторе договора.
 */
export function openContractDocumentsSettings(tab: ContractDocumentsSettingsTabId) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SETTINGS_OPEN_EVENT, { detail: { tab } }));
}

/** Общее состояние кнопки/хоста: супер-админ, вкладка и слушатель open-события. */
function useContractDocumentsSettingsState() {
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

  return { isSuperAdmin, open, tab, setTab, setOpen };
}

/**
 * Кнопка «Настройки договоров» в шапке списка договоров — только для супер-админа.
 * Настройки общие для всех договоров, поэтому живут на списке, а не в каждом договоре.
 * Порождающий паттерн — «Настройки дашборда» (иконка + собственная модалка).
 */
export function ContractDocumentsSettingsButton() {
  const { isSuperAdmin, open, tab, setTab, setOpen } = useContractDocumentsSettingsState();
  if (!isSuperAdmin) return null;

  return (
    <>
      <AdminToolbarIconButton
        onClick={() => setOpen(true)}
        title={CONTRACT_DOCUMENTS_SETTINGS_MODAL_TITLE}
        aria-label={CONTRACT_DOCUMENTS_SETTINGS_MODAL_TITLE}
      >
        <KnowledgePlatformSettingsIcon size={18} />
      </AdminToolbarIconButton>
      <ContractDocumentsSettingsModal
        isOpen={open}
        onClose={() => setOpen(false)}
        tab={tab}
        onTabChange={setTab}
      />
    </>
  );
}

/**
 * Скрытый слушатель `openContractDocumentsSettings()` + модалка, без кнопки:
 * монтируется в редакторе договора, где остались контекстные ссылки
 * на настройки (например, «Настроить» в подсказке номера договора).
 */
export function ContractDocumentsSettingsModalHost() {
  const { isSuperAdmin, open, tab, setTab, setOpen } = useContractDocumentsSettingsState();
  if (!isSuperAdmin) return null;

  return (
    <ContractDocumentsSettingsModal
      isOpen={open}
      onClose={() => setOpen(false)}
      tab={tab}
      onTabChange={setTab}
    />
  );
}
