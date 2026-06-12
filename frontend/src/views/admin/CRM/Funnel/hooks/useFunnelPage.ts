'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type CrmUser,
  type FunnelStageStat,
  getCrmUsers,
  getFunnelStats,
} from '@/shared/api/admin-crm';

import { STAGE_ORDER } from '../funnel-page.constants';

export function useFunnelPage() {
  const [managers, setManagers] = useState<CrmUser[]>([]);
  const [managerId, setManagerId] = useState<string>('');
  const [stats, setStats] = useState<FunnelStageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadManagers = useCallback(async () => {
    try {
      const list = await getCrmUsers();
      setManagers(list);
    } catch {
      setManagers([]);
    }
  }, []);

  const loadFunnel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFunnelStats(managerId || undefined);
      const ordered = STAGE_ORDER.map((stage) => data.find((s) => s.stage === stage)).filter(
        (s): s is FunnelStageStat => !!s
      );
      setStats(ordered.length ? ordered : data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки воронки');
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  useEffect(() => {
    loadFunnel();
  }, [loadFunnel]);

  const totalDeals = stats.reduce((acc, s) => acc + s.count, 0);
  const totalValue = stats.reduce((acc, s) => {
    const v = typeof s.totalValue === 'string' ? parseFloat(s.totalValue) : s.totalValue;
    return acc + (Number.isNaN(v) ? 0 : v);
  }, 0);

  return {
    managers,
    managerId,
    setManagerId,
    stats,
    loading,
    error,
    loadFunnel,
    totalDeals,
    totalValue,
  };
}

export type FunnelPageModel = ReturnType<typeof useFunnelPage>;
