'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Contract } from '@/shared/api/admin-crm';
import { getContracts } from '@/shared/api/admin-crm';

import { contractToRow, getDefaultPeriod } from './payroll-management-page.utils';

export function usePayrollManagementPage() {
  const [dateFrom, setDateFrom] = useState(() => getDefaultPeriod().dateFrom);
  const [dateTo, setDateTo] = useState(() => getDefaultPeriod().dateTo);
  const [prepaymentPct, setPrepaymentPct] = useState('70');

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      contracts.map((c) =>
        contractToRow(c, {
          dateFrom: dateFrom || '',
          dateTo: dateTo || '',
          prepaymentPct,
        })
      ),
    [contracts, dateFrom, dateTo, prepaymentPct]
  );

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getContracts({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page: 1,
        limit: 500,
      });
      setContracts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки договоров');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    prepaymentPct,
    setPrepaymentPct,
    rows,
    loading,
    error,
    loadContracts,
  };
}

export type PayrollManagementPageModel = ReturnType<typeof usePayrollManagementPage>;
