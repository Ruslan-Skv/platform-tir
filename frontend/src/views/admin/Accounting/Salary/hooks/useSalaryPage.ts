'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth';
import { type CrmUser, type Office, getCrmUsers, getOffices } from '@/shared/api/admin-crm';
import { type SalarySettings, getSalarySettings } from '@/shared/api/admin-salary';

import { useSalaryCalc } from './useSalaryCalc';
import { useSalaryContracts } from './useSalaryContracts';
import { useSalarySettings } from './useSalarySettings';

export type SalaryTab = 'calc' | 'contracts' | 'settings';

/** Ключ хранения последней открытой вкладки раздела (переживает перезагрузку). */
const TAB_STORAGE_KEY = 'admin_salary_tab_v1';

/** Последняя открытая вкладка; некорректное значение — «Расчёт за период». */
function readStoredTab(): SalaryTab {
  if (typeof window === 'undefined') return 'calc';
  try {
    const value = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (value === 'calc' || value === 'contracts' || value === 'settings') return value;
  } catch {
    /* приватный режим и т.п. — вкладка по умолчанию */
  }
  return 'calc';
}

/** Модель раздела «Расчёт з/п»: справочники, вкладки и модели трёх вкладок. */
export function useSalaryPage() {
  const { user, isLoading: authLoading } = useAuth();
  /** Настройки видит только суперадмин (бекенд тоже ограничивает мутации). */
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { canEdit } = useAdminSectionCanEdit();

  const [tab, setTab] = useState<SalaryTab>(readStoredTab);
  const [offices, setOffices] = useState<Office[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [settings, setSettings] = useState<SalarySettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  /** Ревизия настроек: растёт после каждой перезагрузки — живой расчёт по ней пересчитывается. */
  const [settingsRevision, setSettingsRevision] = useState(0);

  const reloadSettings = useCallback(async () => {
    try {
      setSettings(await getSalarySettings());
      setSettingsRevision((v) => v + 1);
    } catch {
      /* без настроек вкладка «Настройки» покажет ошибку, расчёт работает на дефолтах бекенда */
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadSettings();
    void (async () => {
      try {
        const [officesData, usersData] = await Promise.all([getOffices(), getCrmUsers()]);
        setOffices(officesData);
        setUsers(usersData);
      } catch {
        /* справочники не критичны для первого рендера */
      }
    })();
  }, [reloadSettings]);

  // Вкладка переживает перезагрузку страницы: запоминаем каждую смену.
  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /* приватный режим — вкладка просто не сохранится */
    }
  }, [tab]);

  // «Настройки» восстановилась с чужого аккаунта (localStorage общий на браузер) —
  // когда данные пользователя загружены, возвращаемся к расчёту.
  useEffect(() => {
    if (!authLoading && tab === 'settings' && !isSuperAdmin) setTab('calc');
  }, [authLoading, tab, isSuperAdmin]);

  const contracts = useSalaryContracts(settings);
  const calc = useSalaryCalc(contracts.dataRevision, settingsRevision);
  const settingsModel = useSalarySettings(settings, reloadSettings);

  // Автосинхронизация договоров з/п с разделом «Договоры» — один раз за сессию браузера.
  const autoSyncRef = useRef(false);
  useEffect(() => {
    if (!canEdit || autoSyncRef.current) return;
    if (window.sessionStorage.getItem('admin_salary_autosync_v1') === '1') {
      autoSyncRef.current = true;
      return;
    }
    autoSyncRef.current = true;
    window.sessionStorage.setItem('admin_salary_autosync_v1', '1');
    void contracts.sync(true);
  }, [canEdit, contracts]);

  return {
    tab,
    setTab,
    isSuperAdmin,
    canEdit,
    offices,
    users,
    settings,
    settingsLoading,
    reloadSettings,
    calc,
    contracts,
    settingsModel,
  };
}

export type SalaryPageModel = ReturnType<typeof useSalaryPage>;
