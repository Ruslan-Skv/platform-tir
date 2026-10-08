'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth';
import { type CrmUser, type Office, getCrmUsers, getOffices } from '@/shared/api/admin-crm';
import { type SalarySettings, getSalarySettings } from '@/shared/api/admin-salary';

import { useSalaryCalc } from './useSalaryCalc';
import { useSalaryContracts } from './useSalaryContracts';
import { useSalarySettings } from './useSalarySettings';

export type SalaryTab = 'calc' | 'contracts' | 'settings';

/** Модель раздела «Расчёт з/п»: справочники, вкладки и модели трёх вкладок. */
export function useSalaryPage() {
  const { user } = useAuth();
  /** Настройки видит только суперадмин (бекенд тоже ограничивает мутации). */
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { canEdit } = useAdminSectionCanEdit();

  const [tab, setTab] = useState<SalaryTab>('calc');
  const [offices, setOffices] = useState<Office[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [settings, setSettings] = useState<SalarySettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const reloadSettings = useCallback(async () => {
    try {
      setSettings(await getSalarySettings());
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

  const calc = useSalaryCalc();
  const contracts = useSalaryContracts(settings);
  const settingsModel = useSalarySettings(settings, reloadSettings);

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
