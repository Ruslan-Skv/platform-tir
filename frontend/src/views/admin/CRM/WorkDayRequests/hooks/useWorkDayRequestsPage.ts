'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import {
  type WorkDayRequest,
  type WorkDayRequestStatus,
  type WorkDayRequestType,
  approveWorkDayRequest,
  getAdminWorkDayRequests,
  getWorkDaySettings,
  rejectWorkDayRequest,
  updateWorkDaySettings,
} from '@/shared/api/crm/admin-work-days';

export function useWorkDayRequestsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');
  const [statusFilter, setStatusFilter] = useState<WorkDayRequestStatus | 'ALL'>('PENDING');
  const [rows, setRows] = useState<WorkDayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoApprovedTypes, setAutoApprovedTypes] = useState<WorkDayRequestType[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsBusyType, setSettingsBusyType] = useState<WorkDayRequestType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminWorkDayRequests(
        statusFilter === 'ALL' ? undefined : { status: statusFilter }
      );
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const settings = await getWorkDaySettings();
      setAutoApprovedTypes(settings.autoApprovedRequestTypes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить настройки запросов');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!highlightId || loading || rows.length === 0) return;
    const el = document.getElementById(`work-day-request-${highlightId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, loading, rows]);

  const approve = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await approveWorkDayRequest(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось подтвердить');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await rejectWorkDayRequest(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отклонить');
    } finally {
      setBusyId(null);
    }
  };

  /** Включить/выключить автоудовлетворение запросов одного типа. */
  const toggleAutoApprove = async (type: WorkDayRequestType) => {
    setSettingsBusyType(type);
    setError(null);
    const next = autoApprovedTypes.includes(type)
      ? autoApprovedTypes.filter((t) => t !== type)
      : [...autoApprovedTypes, type];
    try {
      const settings = await updateWorkDaySettings({
        autoApprovedRequestTypes: next,
      });
      setAutoApprovedTypes(settings.autoApprovedRequestTypes ?? next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить настройку');
    } finally {
      setSettingsBusyType(null);
    }
  };

  return {
    rows,
    loading,
    error,
    busyId,
    statusFilter,
    setStatusFilter,
    highlightId,
    load,
    approve,
    reject,
    autoApprovedTypes,
    settingsLoading,
    settingsBusyType,
    toggleAutoApprove,
  };
}

export type WorkDayRequestsPageModel = ReturnType<typeof useWorkDayRequestsPage>;
